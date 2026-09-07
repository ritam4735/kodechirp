// gateway/src/services/testGen/engine.js
'use strict';

const db = require('../../config/database');
const logger = require('../../utils/logger');
const referenceSolutionService = require('../referenceSolutionService');
const { stringToSeed, createPRNG } = require('./prng');
const { parseConstraintsBounds } = require('./constraintParser');
const { generateStrategyInput, CATEGORIES } = require('./strategies');
const { inferLineStructure } = require('./generators/stdinGenerators');
const { validateInput, validateExecution, validateOutput } = require('./validator');

/**
 * Plans distribution across all 6 mandatory categories for test case generation.
 *
 * @param {number} totalCount
 * @returns {Array<{ category: string, count: number }>}
 */
function planCategoryDistribution(totalCount) {
  const targetTotal = Math.max(12, totalCount || 30);
  // Default ratio across 6 categories:
  // normal: ~25%, boundary: ~15%, corner: ~15%, randomized: ~25%, stress: ~10%, pathological: ~10%
  const distribution = [
    { category: 'normal', count: Math.max(2, Math.round(targetTotal * 0.25)) },
    { category: 'boundary', count: Math.max(2, Math.round(targetTotal * 0.15)) },
    { category: 'corner', count: Math.max(2, Math.round(targetTotal * 0.15)) },
    { category: 'randomized', count: Math.max(2, Math.round(targetTotal * 0.25)) },
    { category: 'stress', count: Math.max(2, Math.round(targetTotal * 0.10)) },
    { category: 'pathological', count: Math.max(2, Math.round(targetTotal * 0.10)) },
  ];

  let currentSum = distribution.reduce((acc, d) => acc + d.count, 0);
  let diff = targetTotal - currentSum;
  let idx = 0;
  while (diff !== 0) {
    if (diff > 0) {
      distribution[idx % distribution.length].count++;
      diff--;
    } else {
      if (distribution[idx % distribution.length].count > 1) {
        distribution[idx % distribution.length].count--;
        diff++;
      }
    }
    idx++;
  }

  return distribution;
}

/**
 * Deterministically generates candidate inputs across all 6 categories.
 *
 * @param {Object} problem
 * @param {Array} existingExamples
 * @param {string|number|null} customSeed
 * @param {number} totalCount
 * @returns {Array<{ input_json?: Object, input?: string, category: string, description: string }>}
 */
function generateDeterministicSuite(problem, existingExamples = [], customSeed = null, totalCount = 30) {
  const seed = customSeed ? stringToSeed(String(customSeed)) : stringToSeed(problem.id || problem.title || 'kodechirp-default-seed');
  const rng = createPRNG(seed);
  const bounds = parseConstraintsBounds(problem.constraints_json, problem.constraints);
  const isFunctionMode = problem.judge_mode === 'FUNCTION';

  const sig = typeof problem.signature_metadata === 'string'
    ? JSON.parse(problem.signature_metadata || '{}')
    : (problem.signature_metadata || {});
  const params = Array.isArray(sig.params) ? sig.params : [];

  let lineStructure = null;
  if (!isFunctionMode) {
    const exampleStrings = existingExamples.map(e => (typeof e === 'string' ? e : e.input)).filter(Boolean);
    lineStructure = inferLineStructure(exampleStrings);
  }

  const distribution = planCategoryDistribution(totalCount);
  const candidates = [];
  const seenFingerprints = new Set();

  for (const { category, count } of distribution) {
    let generatedForCat = 0;
    let attempts = 0;
    const maxAttempts = count * 8;

    while (generatedForCat < count && attempts < maxAttempts) {
      const candidate = generateStrategyInput(category, params, isFunctionMode, attempts, rng, bounds, lineStructure);
      attempts++;

      // Deduplication check
      const fingerprint = isFunctionMode
        ? JSON.stringify(candidate.input_json)
        : candidate.input;

      if (!seenFingerprints.has(fingerprint)) {
        seenFingerprints.add(fingerprint);
        candidates.push(candidate);
        generatedForCat++;
      }
    }
  }

  return candidates;
}

/**
 * Runs quality checks on a set of generated test cases.
 *
 * @param {Array} tests
 * @returns {Object} Quality metrics report
 */
function runQualityChecks(tests) {
  const report = {
    totalTests: tests.length,
    duplicateInputs: 0,
    allOutputsIdentical: false,
    uniqueOutputs: 0,
    diversityScore: 0,
    categoryDistribution: {},
    coverageFlags: {
      hasNormal: false,
      hasBoundary: false,
      hasCorner: false,
      hasRandomized: false,
      hasStress: false,
      hasPathological: false,
      // Backwards-compatible flags:
      hasMinEdge: false,
      hasMaxEdge: false,
      hasRandom: false,
      hasAdversarial: false,
      hasDuplicateHeavy: false,
    },
  };

  for (const tc of tests) {
    const cat = tc.category || 'unknown';
    report.categoryDistribution[cat] = (report.categoryDistribution[cat] || 0) + 1;

    if (cat === 'normal') report.coverageFlags.hasNormal = true;
    if (cat === 'boundary' || cat === 'min_edge' || cat === 'max_edge') {
      report.coverageFlags.hasBoundary = true;
      if (cat === 'min_edge') report.coverageFlags.hasMinEdge = true;
      if (cat === 'max_edge') report.coverageFlags.hasMaxEdge = true;
    }
    if (cat === 'corner' || cat === 'corner_case') {
      report.coverageFlags.hasCorner = true;
      report.coverageFlags.hasMinEdge = true;
    }
    if (cat === 'randomized' || cat.startsWith('random')) {
      report.coverageFlags.hasRandomized = true;
      report.coverageFlags.hasRandom = true;
    }
    if (cat === 'stress') report.coverageFlags.hasStress = true;
    if (cat === 'pathological' || cat === 'adversarial' || cat === 'duplicate_heavy') {
      report.coverageFlags.hasPathological = true;
      if (cat === 'adversarial') report.coverageFlags.hasAdversarial = true;
      if (cat === 'duplicate_heavy') report.coverageFlags.hasDuplicateHeavy = true;
    }
  }

  if (tests.length > 0) {
    const outputs = new Set(tests.map(t => t.expectedOutput || JSON.stringify(t.expectedJson)));
    report.uniqueOutputs = outputs.size;
    report.diversityScore = parseFloat((outputs.size / tests.length).toFixed(2));
    report.allOutputsIdentical = tests.length > 1 && outputs.size === 1;
  }

  const inputs = tests.map(t => t.input || JSON.stringify(t.input_json));
  const uniqueInputs = new Set(inputs);
  report.duplicateInputs = inputs.length - uniqueInputs.size;

  return report;
}

/**
 * Main engine entrypoint: executes deterministic generation, multi-stage validation,
 * reference evaluation, and database persistence.
 *
 * @param {string} problemId
 * @param {Object} options
 * @returns {Promise<Object>}
 */
async function generateAndValidateSuite(problemId, options = {}) {
  const {
    totalCount = 36,
    dryRun = false,
    mode = 'append',
    seed = null,
    concurrency = 4,
  } = options;

  // 1. Gather problem details
  const probRes = await db.query(
    `SELECT id, title, description, description_md, constraints, constraints_json,
            examples_json, input_format, output_format, reference_solution_id,
            judge_mode, signature_metadata
     FROM problems WHERE id = $1`,
    [problemId]
  );
  if (probRes.rowCount === 0) {
    throw new Error('Problem not found');
  }
  const problem = probRes.rows[0];

  if (!problem.reference_solution_id) {
    throw new Error('Problem has no reference solution. Add and verify one before generating tests.');
  }

  // Verify reference solution status
  const refSolution = await referenceSolutionService.get(problem.reference_solution_id);
  if (!refSolution) {
    throw new Error('Reference solution not found');
  }
  if (refSolution.compile_status !== 'verified') {
    throw new Error(`Reference solution is not verified (status: ${refSolution.compile_status}). Verify it first.`);
  }

  // Retrieve existing sample examples for context
  const examplesRes = await db.query(
    `SELECT input, expected_output, input_json, expected_json
     FROM test_cases WHERE problem_id = $1 AND is_sample = TRUE
     ORDER BY order_index ASC LIMIT 5`,
    [problemId]
  );
  const existingExamples = examplesRes.rows;

  // 2. Generate deterministic candidate inputs (100% deterministic, ZERO AI)
  const candidates = generateDeterministicSuite(problem, existingExamples, seed, totalCount);
  logger.info({ problemId, candidateCount: candidates.length }, '[TestGenEngine] Generated candidate inputs deterministically');

  const bounds = parseConstraintsBounds(problem.constraints_json, problem.constraints);
  const isFunctionMode = problem.judge_mode === 'FUNCTION';

  // 3. Multi-stage validation and execution against reference solution
  const validatedTests = [];
  const failures = [];
  let candidateIndex = 0;

  async function validationWorker() {
    while (candidateIndex < candidates.length) {
      const idx = candidateIndex++;
      const candidate = candidates[idx];

      // Stage 1: Input Schema & Bounds Validation
      const inputCheck = validateInput(candidate, problem, bounds);
      if (!inputCheck.valid) {
        failures.push({ stage: 'input_validation', error: inputCheck.error, candidate });
        continue;
      }

      // Stage 2: Reference Solution Execution Integrity
      const inputToRun = isFunctionMode ? JSON.stringify(candidate.input_json) : candidate.input;
      const execResult = await validateExecution(problem.reference_solution_id, inputToRun, referenceSolutionService);
      if (!execResult.valid) {
        failures.push({ stage: 'execution_integrity', error: execResult.error, input: inputToRun });
        continue;
      }

      // Stage 3: Output Type & Integrity Validation
      const outputCheck = validateOutput(execResult.output, problem);
      if (!outputCheck.valid) {
        failures.push({ stage: 'output_validation', error: outputCheck.error, output: execResult.output });
        continue;
      }

      validatedTests.push({
        input: isFunctionMode ? JSON.stringify(candidate.input_json) : candidate.input,
        expectedOutput: outputCheck.expectedOutput,
        input_json: candidate.input_json || null,
        expected_json: outputCheck.expectedJson || null,
        category: candidate.category,
        description: candidate.description,
        is_sample: false, // All generated tests are hidden judges
        verified: true,
      });
    }
  }

  const workerCount = Math.min(concurrency, candidates.length);
  await Promise.all(Array.from({ length: workerCount }, () => validationWorker()));

  logger.info(
    { problemId, validatedCount: validatedTests.length, failedCount: failures.length },
    '[TestGenEngine] Completed multi-stage validation'
  );

  // 4. Quality checks & diversity report
  const qualityReport = runQualityChecks(validatedTests);

  // 5. Database persistence (unless dryRun)
  let savedCount = 0;
  if (!dryRun && validatedTests.length > 0) {
    if (mode === 'replace') {
      // Delete existing hidden test cases, keeping sample verification cases intact
      await db.query(
        'DELETE FROM test_cases WHERE problem_id = $1 AND is_sample = FALSE',
        [problemId]
      );
    }

    const maxOrderRes = await db.query(
      'SELECT COALESCE(MAX(order_index), -1) + 1 AS next_idx FROM test_cases WHERE problem_id = $1',
      [problemId]
    );
    let orderIndex = maxOrderRes.rows[0].next_idx;

    for (const tc of validatedTests) {
      await db.query(
        `INSERT INTO test_cases (
          problem_id, input, expected_output, input_json, expected_json,
          is_sample, explanation, order_index, category, generated_by, verified
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [
          problemId,
          tc.input,
          tc.expectedOutput,
          tc.input_json ? JSON.stringify(tc.input_json) : null,
          tc.expected_json !== null && tc.expected_json !== undefined ? JSON.stringify(tc.expected_json) : null,
          false, // Hidden test case
          tc.description,
          orderIndex++,
          tc.category,
          'deterministic_engine',
          true,
        ]
      );
      savedCount++;
    }
  }

  return {
    success: true,
    totalGenerated: candidates.length,
    totalValidated: validatedTests.length,
    savedCount,
    failuresCount: failures.length,
    failures,
    qualityReport,
    tests: validatedTests,
    summary: {
      mode,
      dryRun,
      hiddenSaved: savedCount,
      visibleSaved: 0,
      totalSaved: savedCount,
    },
  };
}

module.exports = {
  planCategoryDistribution,
  generateDeterministicSuite,
  runQualityChecks,
  generateAndValidateSuite,
};
