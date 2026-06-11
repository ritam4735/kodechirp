// gateway/src/services/testGenerationService.js
// ─────────────────────────────────────────────────────────────────────────────
// Automated Test Generation Service
// Generates test inputs via AI, runs reference solution to get expected outputs,
// categorizes tests, performs quality checks, and stores results.
// ─────────────────────────────────────────────────────────────────────────────

const db = require('../config/database');
const referenceSolutionService = require('./referenceSolutionService');
const logger = require('../utils/logger');

// ── AI Configuration ────────────────────────────────────────────────────────

const AI_CONFIG = {
  apiUrl: process.env.AI_API_URL || '',
  apiKey: process.env.AI_API_KEY || '',
  model: process.env.AI_MODEL || 'gpt-4o-mini',
};

function isAIConfigured() {
  return !!(AI_CONFIG.apiUrl && AI_CONFIG.apiKey);
}

// ── AI Request Helper ───────────────────────────────────────────────────────

async function callAI(systemPrompt, userPrompt) {
  if (!isAIConfigured()) {
    throw new Error('AI service is not configured. Set AI_API_URL and AI_API_KEY.');
  }

  const fetch = require('node-fetch');

  const response = await fetch(AI_CONFIG.apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${AI_CONFIG.apiKey}`,
    },
    body: JSON.stringify({
      model: AI_CONFIG.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 8192,
      temperature: 0.7,
      response_format: { type: 'json_object' },
    }),
    signal: AbortSignal.timeout(60000),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`AI API error ${response.status}: ${errorBody}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error('AI returned empty response');

  return JSON.parse(content);
}

// ── Test Input Generation Prompt ────────────────────────────────────────────

const TEST_GENERATION_PROMPT = `You are a competitive programming test case generator. Your task is to generate diverse, high-quality test inputs for a programming problem.

Generate test inputs in JSON format. Each test case must:
1. Be a valid input matching the problem's input format
2. Respect all constraints
3. Be a raw string that can be passed directly as stdin

You must return a JSON object with this structure:
{
  "test_cases": [
    {
      "input": "the raw stdin input as a string",
      "category": "one of: min_edge, max_edge, random_small, random_medium, random_large, duplicate_heavy, adversarial, corner_case",
      "visibility": "visible or hidden",
      "description": "brief description of what this tests"
    }
  ]
}

Generate exactly the number of test cases requested. Ensure good coverage:
- min_edge: minimum constraint values (empty arrays, single elements, zero, etc.)
- max_edge: maximum constraint values (largest arrays, extreme numbers)
- random_small: small random inputs
- random_medium: medium-sized random inputs
- random_large: larger random inputs (but still within constraints)
- duplicate_heavy: inputs with many duplicates
- adversarial: worst-case inputs designed to break naive solutions
- corner_case: tricky edge cases commonly missed

CRITICAL: Each "input" field must be the exact raw text that would be fed to stdin. Use newlines within the string where needed. Do NOT use arrays or objects for input values.`;

// ── Main Generation Pipeline ────────────────────────────────────────────────

/**
 * Generate test cases for a problem using AI + reference solution.
 *
 * @param {string} problemId
 * @param {Object} options
 * @param {number} options.visibleCount - Number of visible tests (default: 10)
 * @param {number} options.hiddenCount - Number of hidden tests (default: 50)
 * @param {boolean} options.dryRun - If true, don't save to DB
 * @returns {Object} Generation result with tests and coverage report
 */
async function generateTests(problemId, options = {}) {
  const {
    visibleCount = 10,
    hiddenCount = 50,
    dryRun = false,
  } = options;

  const totalCount = visibleCount + hiddenCount;

  // ── Step 1: Gather problem context ──────────────────────────────────────

  const problemResult = await db.query(
    `SELECT id, title, description, description_md, constraints, constraints_json,
            examples_json, input_format, output_format, reference_solution_id
     FROM problems WHERE id = $1`,
    [problemId]
  );

  if (problemResult.rowCount === 0) {
    throw new Error('Problem not found');
  }

  const problem = problemResult.rows[0];

  if (!problem.reference_solution_id) {
    throw new Error('Problem has no reference solution. Add and verify one before generating tests.');
  }

  // Verify reference solution is in good standing
  const refSolution = await referenceSolutionService.get(problem.reference_solution_id);
  if (!refSolution) {
    throw new Error('Reference solution not found');
  }

  if (refSolution.compile_status !== 'verified') {
    throw new Error(`Reference solution is not verified (status: ${refSolution.compile_status}). Verify it first.`);
  }

  // Get existing examples for context
  const existingExamples = await db.query(
    'SELECT input, expected_output FROM test_cases WHERE problem_id = $1 AND is_sample = TRUE ORDER BY order_index LIMIT 5',
    [problemId]
  );

  // ── Step 2: Generate candidate inputs via AI ────────────────────────────

  const description = problem.description_md || problem.description || '';
  const constraints = problem.constraints_json
    ? JSON.stringify(problem.constraints_json)
    : (problem.constraints || 'No constraints specified');

  const userPrompt = `Problem: ${problem.title}

Description:
${description}

Input Format:
${problem.input_format || 'See description'}

Output Format:
${problem.output_format || 'See description'}

Constraints:
${constraints}

${existingExamples.rowCount > 0 ? `Examples (for format reference):
${existingExamples.rows.map((e, i) => `Example ${i + 1}:\nInput:\n${e.input}\nOutput:\n${e.expected_output}`).join('\n\n')}` : ''}

Generate ${totalCount} test cases with this distribution:
- ${visibleCount} visible (for users to see): mix of simple edge cases and small inputs
- ${hiddenCount} hidden (for judging): distributed as follows:
  * 5 minimum edge cases
  * 5 maximum edge cases
  * 10 random small
  * 10 random medium
  * 10 random large
  * 5 duplicate-heavy
  * 5 adversarial`;

  let candidateTests;
  try {
    const aiResult = await callAI(TEST_GENERATION_PROMPT, userPrompt);
    candidateTests = aiResult.test_cases || [];
  } catch (err) {
    throw new Error(`AI test generation failed: ${err.message}`);
  }

  if (!Array.isArray(candidateTests) || candidateTests.length === 0) {
    throw new Error('AI returned no test cases');
  }

  logger.info({ problemId, generated: candidateTests.length }, '[TestGen] AI generated candidate inputs');

  // ── Step 3: Validate and deduplicate inputs ─────────────────────────────

  const seenInputs = new Set();
  const validTests = [];

  for (const tc of candidateTests) {
    if (!tc.input || typeof tc.input !== 'string') continue;

    const normalizedInput = tc.input.trim();
    if (!normalizedInput) continue;

    // Deduplicate
    if (seenInputs.has(normalizedInput)) continue;
    seenInputs.add(normalizedInput);

    validTests.push({
      input: normalizedInput,
      category: tc.category || 'random_small',
      visibility: tc.visibility || 'hidden',
      description: tc.description || '',
    });
  }

  logger.info({ problemId, valid: validTests.length, dropped: candidateTests.length - validTests.length },
    '[TestGen] Input validation complete');

  // ── Step 4: Run reference solution to generate expected outputs ─────────

  const processedTests = [];
  const failures = [];

  for (const tc of validTests) {
    try {
      const result = await referenceSolutionService.runAgainstInput(
        problem.reference_solution_id,
        tc.input
      );

      if (result.timedOut) {
        failures.push({ input: tc.input.substring(0, 100), error: 'Timed out' });
        continue;
      }

      if (result.exitCode !== 0 && !result.stdout) {
        failures.push({ input: tc.input.substring(0, 100), error: result.stderr || 'Non-zero exit' });
        continue;
      }

      processedTests.push({
        ...tc,
        expectedOutput: result.stdout,
        verified: true,
      });
    } catch (err) {
      failures.push({ input: tc.input.substring(0, 100), error: err.message });
    }
  }

  logger.info({ problemId, processed: processedTests.length, failed: failures.length },
    '[TestGen] Reference solution execution complete');

  // ── Step 5: Quality checks ──────────────────────────────────────────────

  const qualityReport = runQualityChecks(processedTests);

  // ── Step 6: Categorize as visible/hidden ────────────────────────────────

  // Separate into visible and hidden
  const visibleTests = processedTests
    .filter(t => t.visibility === 'visible')
    .slice(0, visibleCount);

  const hiddenTests = processedTests
    .filter(t => t.visibility === 'hidden')
    .slice(0, hiddenCount);

  // If we don't have enough visible, promote some hidden
  if (visibleTests.length < visibleCount) {
    const remaining = processedTests
      .filter(t => !visibleTests.includes(t) && !hiddenTests.includes(t));
    while (visibleTests.length < visibleCount && remaining.length > 0) {
      const t = remaining.shift();
      t.visibility = 'visible';
      visibleTests.push(t);
    }
  }

  // ── Step 7: Persist to database ─────────────────────────────────────────

  if (!dryRun && (visibleTests.length > 0 || hiddenTests.length > 0)) {
    const allTests = [...visibleTests, ...hiddenTests];

    // Get current max order_index
    const maxOrderRes = await db.query(
      'SELECT COALESCE(MAX(order_index), -1) + 1 as next_idx FROM test_cases WHERE problem_id = $1',
      [problemId]
    );
    let orderIdx = maxOrderRes.rows[0].next_idx;

    const values = [];
    const placeholders = [];
    let paramIdx = 1;

    for (const tc of allTests) {
      placeholders.push(
        `($${paramIdx}, $${paramIdx + 1}, $${paramIdx + 2}, $${paramIdx + 3}, $${paramIdx + 4}, $${paramIdx + 5}, $${paramIdx + 6}, $${paramIdx + 7})`
      );
      values.push(
        problemId,
        tc.input,
        tc.expectedOutput,
        tc.visibility === 'visible',
        orderIdx++,
        tc.category,
        'ai_generated',
        true
      );
      paramIdx += 8;
    }

    if (placeholders.length > 0) {
      await db.query(`
        INSERT INTO test_cases (problem_id, input, expected_output, is_sample, order_index, category, generated_by, verified)
        VALUES ${placeholders.join(', ')}
      `, values);
    }

    logger.info({
      problemId,
      visible: visibleTests.length,
      hidden: hiddenTests.length,
    }, '[TestGen] Test cases saved to database');
  }

  // ── Return full report ────────────────────────────────────────────────

  return {
    problemId,
    summary: {
      totalGenerated: candidateTests.length,
      totalValid: validTests.length,
      totalProcessed: processedTests.length,
      visibleSaved: visibleTests.length,
      hiddenSaved: hiddenTests.length,
      failures: failures.length,
      dryRun,
    },
    quality: qualityReport,
    failures: failures.slice(0, 10), // Limit for response size
    visibleTests: visibleTests.map(t => ({
      input: t.input.substring(0, 500),
      output: t.expectedOutput.substring(0, 500),
      category: t.category,
    })),
    hiddenTests: hiddenTests.map(t => ({
      input: t.input.substring(0, 200),
      output: t.expectedOutput.substring(0, 200),
      category: t.category,
    })),
  };
}

// ── Quality Checks ──────────────────────────────────────────────────────────

function runQualityChecks(tests) {
  const report = {
    totalTests: tests.length,
    duplicateInputs: 0,
    allOutputsIdentical: false,
    categoryDistribution: {},
    coverageFlags: {
      hasMinEdge: false,
      hasMaxEdge: false,
      hasRandom: false,
      hasAdversarial: false,
      hasDuplicateHeavy: false,
    },
  };

  // Category distribution
  for (const tc of tests) {
    const cat = tc.category || 'unknown';
    report.categoryDistribution[cat] = (report.categoryDistribution[cat] || 0) + 1;

    if (cat === 'min_edge' || cat === 'corner_case') report.coverageFlags.hasMinEdge = true;
    if (cat === 'max_edge') report.coverageFlags.hasMaxEdge = true;
    if (cat.startsWith('random')) report.coverageFlags.hasRandom = true;
    if (cat === 'adversarial') report.coverageFlags.hasAdversarial = true;
    if (cat === 'duplicate_heavy') report.coverageFlags.hasDuplicateHeavy = true;
  }

  // Output diversity check
  if (tests.length > 1) {
    const outputs = new Set(tests.map(t => t.expectedOutput));
    report.allOutputsIdentical = outputs.size === 1;
    report.uniqueOutputs = outputs.size;
  }

  // Input dedup count (should be 0 if we already deduped)
  const inputs = tests.map(t => t.input);
  const uniqueInputs = new Set(inputs);
  report.duplicateInputs = inputs.length - uniqueInputs.size;

  return report;
}

module.exports = {
  generateTests,
  isAIConfigured,
};
