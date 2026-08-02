// gateway/src/services/testGenerationService.js
// ─────────────────────────────────────────────────────────────────────────────
// Automated Test Generation Service
// Generates test inputs deterministically (or via AI if configured),
// runs reference solution to compute expected outputs, categorizes tests,
// performs quality checks, and stores results.
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

// ── Deterministic Generator Helpers ─────────────────────────────────────────

function stringToSeed(str) {
  let hash = 0;
  if (!str) return 42;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) || 42;
}

function createPRNG(seed) {
  let s = Math.abs(seed) || 12345;
  return function random() {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function parseConstraintsBounds(constraintsJson, constraintsStr) {
  const bounds = {
    minVal: -100,
    maxVal: 100,
    minLen: 0,
    maxLen: 100,
  };

  const text = (Array.isArray(constraintsJson) ? constraintsJson.join(' ') : '') + ' ' + (constraintsStr || '');
  if (!text.trim()) return bounds;

  const rangeMatch = text.match(/(-?\d+(?:\^\d+)?)\s*(?:<=|<)\s*[^<=\n]+?\s*(?:<=|<)\s*(-?\d+(?:\^\d+)?)/i);
  if (rangeMatch) {
    const parseNum = (s) => {
      if (s.includes('^')) {
        const [b, e] = s.split('^').map(Number);
        return Math.pow(b, e);
      }
      return parseInt(s, 10);
    };
    const low = parseNum(rangeMatch[1]);
    const high = parseNum(rangeMatch[2]);
    if (!isNaN(low) && !isNaN(high)) {
      bounds.minVal = low;
      bounds.maxVal = high;
    }
  }

  const lenMatch = text.match(/(?:length|len|nodes|n|size|s)\s*(?:<=|<)\s*(\d+(?:\^\d+)?)/i);
  if (lenMatch) {
    const parseNum = (s) => {
      if (s.includes('^')) {
        const [b, e] = s.split('^').map(Number);
        return Math.pow(b, e);
      }
      return parseInt(s, 10);
    };
    const maxL = parseNum(lenMatch[1]);
    if (!isNaN(maxL) && maxL > 0) bounds.maxLen = maxL;
  }

  return bounds;
}

function generateParamValue(type, category, idx, rng, bounds) {
  const normType = type ? type.trim() : 'Integer';
  const minV = bounds.minVal ?? -100;
  const maxV = bounds.maxVal ?? 100;
  const maxL = Math.min(bounds.maxLen ?? 100, 300);

  const randInt = (min, max) => Math.floor(rng() * (max - min + 1)) + min;
  const randChoice = (arr) => arr[Math.floor(rng() * arr.length)];

  if (normType === 'Integer' || normType === 'Int') {
    if (category === 'min_edge') return [0, 1, -1, Math.max(minV, -1000), 2][idx % 5];
    if (category === 'max_edge') return [Math.min(maxV, 1000), Math.min(maxV, 1000) - 1, Math.floor(maxV / 2)][idx % 3];
    if (category === 'corner_case') return [0, 1, -1, 2, 1024, -1024, 42][idx % 7];
    if (category === 'duplicate_heavy') return [5, 5, 0, 0, 1][idx % 5];
    if (category === 'adversarial') return [Math.min(maxV, 10000), Math.max(minV, -10000), 0][idx % 3];
    if (category === 'random_small') return randInt(-10, 10);
    if (category === 'random_medium') return randInt(-100, 100);
    if (category === 'random_large') return randInt(Math.max(minV, -1000), Math.min(maxV, 1000));
    return randInt(-50, 50);
  }

  if (normType === 'Float') {
    if (category === 'min_edge') return [0.0, 1.0, -1.0, 0.001][idx % 4];
    if (category === 'max_edge') return parseFloat((Math.min(maxV, 1000) * 1.0).toFixed(2));
    if (category === 'corner_case') return [0.0, 3.14159, -1.0, 2.718][idx % 4];
    if (category === 'random_small') return parseFloat((rng() * 20 - 10).toFixed(2));
    if (category === 'random_medium') return parseFloat((rng() * 200 - 100).toFixed(2));
    return parseFloat((rng() * 200 - 100).toFixed(2));
  }

  if (normType === 'Boolean') {
    if (category === 'min_edge') return false;
    if (category === 'max_edge') return true;
    return idx % 2 === 0;
  }

  if (normType === 'Character' || normType === 'Char') {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789()[]{} ';
    if (category === 'min_edge') return 'a';
    if (category === 'corner_case') return ['(', ')', ' ', '0', 'z'][idx % 5];
    return chars[randInt(0, chars.length - 1)];
  }

  if (normType === 'String') {
    if (category === 'min_edge') return idx === 0 ? '' : 'a';
    if (category === 'corner_case') {
      const presets = ['', 'a', '()', '()[]{}', '(]', '((()))', 'a b c', '12345', '!!!', '([)]'];
      return presets[idx % presets.length];
    }
    if (category === 'duplicate_heavy') {
      const char = randChoice(['a', 'x', '(', '0']);
      return char.repeat(randInt(10, 40));
    }
    if (category === 'adversarial') {
      return '('.repeat(20) + ')'.repeat(19);
    }
    let len = 5;
    if (category === 'random_small') len = randInt(1, 10);
    else if (category === 'random_medium') len = randInt(10, 50);
    else if (category === 'random_large' || category === 'max_edge') len = randInt(50, Math.min(maxL, 200));

    const charset = 'abcdefghijklmnopqrstuvwxyz0123456789()[]{}';
    let res = '';
    for (let i = 0; i < len; i++) res += charset[randInt(0, charset.length - 1)];
    return res;
  }

  if (normType === 'Array<Integer>' || normType === 'Array<Int>') {
    if (category === 'min_edge') {
      return [[], [0], [1], [-1], [1, 2]][idx % 5];
    }
    if (category === 'corner_case') {
      const presets = [
        [1, 2, 3, 4, 5],
        [5, 4, 3, 2, 1],
        [0, 0, 0, 0],
        [1, -1, 2, -2],
        [42],
        [100, -100],
        [1, 2, 2, 1],
        [3, 3],
      ];
      return presets[idx % presets.length];
    }
    if (category === 'duplicate_heavy') {
      const len = randInt(10, 30);
      const val = randInt(-10, 10);
      return Array.from({ length: len }, () => val);
    }
    if (category === 'adversarial') {
      const len = randInt(20, 50);
      return Array.from({ length: len }, (_, i) => (i % 2 === 0 ? 100 : -100));
    }
    let len = 10;
    if (category === 'random_small') len = randInt(2, 10);
    else if (category === 'random_medium') len = randInt(10, 40);
    else if (category === 'random_large') len = randInt(40, Math.min(maxL, 150));
    else if (category === 'max_edge') len = Math.min(maxL, 200);

    return Array.from({ length: len }, () => randInt(-50, 50));
  }

  if (normType === 'Array<Float>') {
    if (category === 'min_edge') return [];
    const len = randInt(2, 15);
    return Array.from({ length: len }, () => parseFloat((rng() * 20 - 10).toFixed(2)));
  }

  if (normType === 'Array<String>') {
    if (category === 'min_edge') return [];
    if (category === 'corner_case') return [['a'], ['', ''], ['hello', 'world']][idx % 3];
    const len = randInt(2, 12);
    return Array.from({ length: len }, () => 'str' + randInt(1, 100));
  }

  if (normType === 'Array<Boolean>') {
    if (category === 'min_edge') return [];
    const len = randInt(2, 12);
    return Array.from({ length: len }, () => rng() > 0.5);
  }

  if (normType === 'Matrix<Integer>' || normType === 'Matrix<Int>') {
    if (category === 'min_edge') return [[]];
    if (category === 'corner_case') return [[[1, 0], [0, 1]], [[0]]][idx % 2];
    const rows = randInt(2, 6);
    const cols = randInt(2, 6);
    return Array.from({ length: rows }, () =>
      Array.from({ length: cols }, () => randInt(-20, 20))
    );
  }

  if (normType === 'Matrix<Float>') {
    if (category === 'min_edge') return [[]];
    const rows = randInt(2, 5);
    const cols = randInt(2, 5);
    return Array.from({ length: rows }, () =>
      Array.from({ length: cols }, () => parseFloat((rng() * 10).toFixed(2)))
    );
  }

  if (normType === 'Matrix<String>') {
    if (category === 'min_edge') return [[]];
    const rows = randInt(2, 5);
    const cols = randInt(2, 5);
    return Array.from({ length: rows }, () =>
      Array.from({ length: cols }, () => 'c' + randInt(1, 9))
    );
  }

  if (normType === 'Matrix<Boolean>') {
    if (category === 'min_edge') return [[]];
    const rows = randInt(2, 5);
    const cols = randInt(2, 5);
    return Array.from({ length: rows }, () =>
      Array.from({ length: cols }, () => rng() > 0.5)
    );
  }

  if (normType === 'LinkedList') {
    if (category === 'min_edge') return idx === 0 ? [] : [0];
    if (category === 'corner_case') return [[1, 2, 3, 4, 5], [1], [1, 2], [5, 4, 3, 2, 1]][idx % 4];
    const len = randInt(1, 20);
    return Array.from({ length: len }, () => randInt(-50, 50));
  }

  if (normType === 'BinaryTree') {
    if (category === 'min_edge') return [];
    if (category === 'corner_case') return [[1], [1, 2, 3], [1, null, 2, null, 3]][idx % 3];
    const len = randInt(3, 15);
    const tree = [randInt(1, 50)];
    for (let i = 1; i < len; i++) {
      tree.push(rng() < 0.2 ? null : randInt(-50, 50));
    }
    return tree;
  }

  return randInt(0, 100);
}

function generateDeterministicInputs(problem, existingExamples = []) {
  const seed = stringToSeed(problem.id || problem.title || 'kodechirp');
  const rng = createPRNG(seed);
  const bounds = parseConstraintsBounds(problem.constraints_json, problem.constraints);
  const candidateTests = [];

  const categoriesPlan = [
    { category: 'min_edge', count: 6, visibility: 'visible' },
    { category: 'corner_case', count: 10, visibility: 'visible' },
    { category: 'random_small', count: 12, visibility: 'visible' },
    { category: 'duplicate_heavy', count: 6, visibility: 'hidden' },
    { category: 'adversarial', count: 6, visibility: 'hidden' },
    { category: 'random_medium', count: 15, visibility: 'hidden' },
    { category: 'random_large', count: 15, visibility: 'hidden' },
    { category: 'max_edge', count: 6, visibility: 'hidden' },
  ];

  const parsedExamples = [];
  if (Array.isArray(problem.examples_json)) {
    for (const ex of problem.examples_json) {
      if (ex && ex.input) parsedExamples.push(ex.input);
    }
  }
  for (const row of existingExamples) {
    if (row.input_json) parsedExamples.push(row.input_json);
    else if (row.input) parsedExamples.push(row.input);
  }

  if (problem.judge_mode === 'FUNCTION') {
    const signature = typeof problem.signature_metadata === 'string'
      ? JSON.parse(problem.signature_metadata || '{}')
      : (problem.signature_metadata || {});

    const params = signature.params || [{ name: 'input', type: 'Integer' }];

    for (const exInput of parsedExamples) {
      if (typeof exInput === 'object' && exInput !== null) {
        candidateTests.push({
          input_json: exInput,
          category: 'corner_case',
          visibility: 'visible',
          description: 'Example case from problem specification',
        });
      } else if (typeof exInput === 'string') {
        try {
          const parsed = JSON.parse(exInput);
          candidateTests.push({
            input_json: parsed,
            category: 'corner_case',
            visibility: 'visible',
            description: 'Example case from problem specification',
          });
        } catch (e) {}
      }
    }

    for (const plan of categoriesPlan) {
      for (let i = 0; i < plan.count; i++) {
        const inputObj = {};

        for (const param of params) {
          inputObj[param.name] = generateParamValue(param.type, plan.category, i, rng, bounds);
        }

        const arrayParam = params.find(p => p.type.startsWith('Array') || p.type === 'LinkedList');
        const intParam = params.find(p => p.type === 'Integer' || p.type === 'Int');

        if (arrayParam && intParam) {
          const arrVal = inputObj[arrayParam.name];
          const paramNameLower = intParam.name.toLowerCase();

          if (['n', 'm', 'length', 'size', 'len'].includes(paramNameLower)) {
            inputObj[intParam.name] = Array.isArray(arrVal) ? arrVal.length : 0;
          } else if (['target', 'val', 'k', 'key', 'x'].includes(paramNameLower)) {
            if (Array.isArray(arrVal) && arrVal.length >= 2) {
              if (plan.category === 'random_small' || plan.category === 'random_medium' || plan.category === 'corner_case') {
                if (rng() > 0.3) {
                  const idx1 = Math.floor(rng() * arrVal.length);
                  let idx2 = Math.floor(rng() * arrVal.length);
                  if (idx1 !== idx2 && typeof arrVal[idx1] === 'number' && typeof arrVal[idx2] === 'number') {
                    inputObj[intParam.name] = arrVal[idx1] + arrVal[idx2];
                  } else if (typeof arrVal[idx1] === 'number') {
                    inputObj[intParam.name] = arrVal[idx1];
                  }
                }
              } else if (plan.category === 'adversarial') {
                inputObj[intParam.name] = 999999;
              }
            }
          }
        }

        candidateTests.push({
          input_json: inputObj,
          category: plan.category,
          visibility: plan.visibility,
          description: `Deterministic ${plan.category} test case #${i + 1}`,
        });
      }
    }
  } else {
    // STDIN_STDOUT mode
    for (const exInput of parsedExamples) {
      if (typeof exInput === 'string' && exInput.trim()) {
        candidateTests.push({
          input: exInput.trim(),
          category: 'corner_case',
          visibility: 'visible',
          description: 'Example case from problem specification',
        });
      }
    }

    let lineStructure = null;
    if (parsedExamples.length > 0 && typeof parsedExamples[0] === 'string') {
      const lines = parsedExamples[0].trim().split('\n');
      lineStructure = lines.map(l => {
        const tokens = l.trim().split(/\s+/).filter(Boolean);
        return { count: tokens.length, isNum: tokens.every(t => !isNaN(Number(t))) };
      });
    }

    for (const plan of categoriesPlan) {
      for (let i = 0; i < plan.count; i++) {
        let inputStr = '';

        if (lineStructure && lineStructure.length > 0) {
          const lines = [];
          for (let lIdx = 0; lIdx < lineStructure.length; lIdx++) {
            const spec = lineStructure[lIdx];
            if (lIdx === 0 && lineStructure.length > 1 && spec.count === 1 && spec.isNum) {
              let nVal = 5;
              if (plan.category === 'min_edge') nVal = 1;
              else if (plan.category === 'random_small') nVal = Math.floor(rng() * 8) + 2;
              else if (plan.category === 'random_medium') nVal = Math.floor(rng() * 30) + 10;
              else if (plan.category === 'random_large' || plan.category === 'max_edge') nVal = Math.floor(rng() * 100) + 50;
              lines.push(String(nVal));

              if (lineStructure[1]) {
                const arr = [];
                for (let k = 0; k < nVal; k++) {
                  let v = Math.floor(rng() * 100) - 50;
                  if (plan.category === 'duplicate_heavy') v = 5;
                  if (plan.category === 'min_edge') v = 0;
                  arr.push(v);
                }
                lines.push(arr.join(' '));
                lIdx++;
              }
            } else {
              const tokens = [];
              for (let t = 0; t < spec.count; t++) {
                if (spec.isNum) tokens.push(Math.floor(rng() * 100) - 50);
                else tokens.push('val' + t);
              }
              lines.push(tokens.join(' '));
            }
          }
          inputStr = lines.join('\n');
        } else {
          if (plan.category === 'min_edge') inputStr = '0';
          else if (plan.category === 'corner_case') inputStr = ['1', '0', '-1', '10 20 30'][i % 4];
          else {
            const n = Math.floor(rng() * 20) + 1;
            const arr = Array.from({ length: n }, () => Math.floor(rng() * 100) - 50);
            inputStr = `${n}\n${arr.join(' ')}`;
          }
        }

        candidateTests.push({
          input: inputStr,
          category: plan.category,
          visibility: plan.visibility,
          description: `Deterministic ${plan.category} test case #${i + 1}`,
        });
      }
    }
  }

  return candidateTests;
}

// ── Main Generation Pipeline ────────────────────────────────────────────────

/**
 * Generate test cases for a problem using reference solution + deterministic / AI generators.
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
            examples_json, input_format, output_format, reference_solution_id,
            judge_mode, signature_metadata
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
    'SELECT input, expected_output, input_json, expected_json FROM test_cases WHERE problem_id = $1 AND is_sample = TRUE ORDER BY order_index LIMIT 5',
    [problemId]
  );

  // ── Step 2: Generate candidate inputs ───────────────────────────────────

  let candidateTests = [];
  let aiAttempted = false;

  if (isAIConfigured()) {
    aiAttempted = true;
    try {
      const description = problem.description_md || problem.description || '';
      const constraints = problem.constraints_json
        ? JSON.stringify(problem.constraints_json)
        : (problem.constraints || 'No constraints specified');

      const userPrompt = `Problem: ${problem.title}

Description:
${description}

${problem.judge_mode === 'STDIN_STDOUT' ? `Input Format:
${problem.input_format || 'See description'}

Output Format:
${problem.output_format || 'See description'}` : `Signature:
${typeof problem.signature_metadata === 'object' ? JSON.stringify(problem.signature_metadata, null, 2) : problem.signature_metadata}
Note: Generate an 'input_json' field instead of 'input', structured as a JSON object with keys matching the parameter names.`}

Constraints:
${constraints}

${existingExamples.rowCount > 0 ? `Examples (for format reference):
${existingExamples.rows.map((e, i) => `Example ${i + 1}:\nInput:\n${e.input || JSON.stringify(e.input_json)}\nOutput:\n${e.expected_output || JSON.stringify(e.expected_json)}`).join('\n\n')}` : ''}

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

      const aiResult = await callAI(TEST_GENERATION_PROMPT, userPrompt);
      if (Array.isArray(aiResult.test_cases) && aiResult.test_cases.length > 0) {
        candidateTests = aiResult.test_cases;
        logger.info({ problemId, generated: candidateTests.length }, '[TestGen] AI generated candidate inputs');
      }
    } catch (err) {
      logger.warn({ problemId, err: err.message }, '[TestGen] AI generation failed, falling back to deterministic generator');
    }
  }

  // Generate deterministic candidates (either as primary generator or to supplement/fallback)
  const deterministicCandidates = generateDeterministicInputs(problem, existingExamples.rows);
  logger.info({ problemId, generated: deterministicCandidates.length }, '[TestGen] Deterministic candidate inputs generated');

  if (candidateTests.length > 0) {
    // Merge AI candidates with deterministic candidates for maximum test suite quality
    candidateTests = [...candidateTests, ...deterministicCandidates];
  } else {
    candidateTests = deterministicCandidates;
  }

  // ── Step 3: Validate and deduplicate inputs ─────────────────────────────

  const seenInputs = new Set();
  const validTests = [];

  for (const tc of candidateTests) {
    // Deduplicate based on whether it's STDIN or FUNCTION
    const rawInput = problem.judge_mode === 'STDIN_STDOUT' ? tc.input : JSON.stringify(tc.input_json || tc.input);
    if (!rawInput || typeof rawInput !== 'string') continue;

    const normalizedInput = rawInput.trim();
    if (!normalizedInput) continue;

    if (seenInputs.has(normalizedInput)) continue;
    seenInputs.add(normalizedInput);

    validTests.push({
      input: problem.judge_mode === 'STDIN_STDOUT' ? normalizedInput : null,
      input_json: problem.judge_mode !== 'STDIN_STDOUT' ? (tc.input_json || JSON.parse(normalizedInput)) : null,
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
    const inputToRun = problem.judge_mode === 'STDIN_STDOUT' ? tc.input : JSON.stringify(tc.input_json);
    try {
      const result = await referenceSolutionService.runAgainstInput(
        problem.reference_solution_id,
        inputToRun
      );

      if (result.timedOut) {
        failures.push({ input: inputToRun.substring(0, 100), error: 'Timed out' });
        continue;
      }

      if (result.exitCode !== 0 && !result.stdout) {
        failures.push({ input: inputToRun.substring(0, 100), error: result.stderr || 'Non-zero exit' });
        continue;
      }

      processedTests.push({
        ...tc,
        expectedOutput: problem.judge_mode === 'STDIN_STDOUT' ? result.stdout : null,
        expectedJson: problem.judge_mode !== 'STDIN_STDOUT' ? (result.stdout ? JSON.parse(result.stdout) : null) : null,
        verified: true,
      });
    } catch (err) {
      failures.push({ input: inputToRun.substring(0, 100), error: err.message });
    }
  }

  logger.info({ problemId, processed: processedTests.length, failed: failures.length },
    '[TestGen] Reference solution execution complete');

  // ── Step 5: Quality checks ──────────────────────────────────────────────

  const qualityReport = runQualityChecks(processedTests);

  // ── Step 6: Categorize as visible/hidden ────────────────────────────────

  const visibleTests = processedTests
    .filter(t => t.visibility === 'visible')
    .slice(0, visibleCount);

  const hiddenTests = processedTests
    .filter(t => t.visibility === 'hidden')
    .slice(0, hiddenCount);

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
        `($${paramIdx}, $${paramIdx + 1}, $${paramIdx + 2}, $${paramIdx + 3}, $${paramIdx + 4}, $${paramIdx + 5}, $${paramIdx + 6}, $${paramIdx + 7}, $${paramIdx + 8}, $${paramIdx + 9})`
      );
      values.push(
        problemId,
        tc.input,
        tc.expectedOutput,
        tc.input_json ? JSON.stringify(tc.input_json) : null,
        tc.expectedJson ? JSON.stringify(tc.expectedJson) : null,
        tc.visibility === 'visible',
        orderIdx++,
        tc.category,
        'auto_generated',
        true
      );
      paramIdx += 10;
    }

    if (placeholders.length > 0) {
      await db.query(`
        INSERT INTO test_cases (problem_id, input, expected_output, input_json, expected_json, is_sample, order_index, category, generated_by, verified)
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
      aiAttempted,
    },
    quality: qualityReport,
    failures: failures.slice(0, 10),
    visibleTests: visibleTests.map(t => ({
      input: (t.input || JSON.stringify(t.input_json)).substring(0, 500),
      output: (t.expectedOutput || JSON.stringify(t.expectedJson)).substring(0, 500),
      category: t.category,
    })),
    hiddenTests: hiddenTests.map(t => ({
      input: (t.input || JSON.stringify(t.input_json)).substring(0, 200),
      output: (t.expectedOutput || JSON.stringify(t.expectedJson)).substring(0, 200),
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

  for (const tc of tests) {
    const cat = tc.category || 'unknown';
    report.categoryDistribution[cat] = (report.categoryDistribution[cat] || 0) + 1;

    if (cat === 'min_edge' || cat === 'corner_case') report.coverageFlags.hasMinEdge = true;
    if (cat === 'max_edge') report.coverageFlags.hasMaxEdge = true;
    if (cat.startsWith('random')) report.coverageFlags.hasRandom = true;
    if (cat === 'adversarial') report.coverageFlags.hasAdversarial = true;
    if (cat === 'duplicate_heavy') report.coverageFlags.hasDuplicateHeavy = true;
  }

  if (tests.length > 1) {
    const outputs = new Set(tests.map(t => t.expectedOutput || JSON.stringify(t.expectedJson)));
    report.allOutputsIdentical = outputs.size === 1;
    report.uniqueOutputs = outputs.size;
  }

  const inputs = tests.map(t => t.input || JSON.stringify(t.input_json));
  const uniqueInputs = new Set(inputs);
  report.duplicateInputs = inputs.length - uniqueInputs.size;

  return report;
}

module.exports = {
  generateTests,
  isAIConfigured,
};

