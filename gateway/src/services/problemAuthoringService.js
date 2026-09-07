// gateway/src/services/problemAuthoringService.js
'use strict';

const db = require('../config/database');
const logger = require('../utils/logger');
const { generateAllTemplates } = require('../utils/templateGenerator');
const { parseAssignmentInput } = require('../utils/assignmentParser');
const referenceSolutionService = require('./referenceSolutionService');
const { generateAndValidateSuite } = require('./testGen/engine');

/**
 * Validates problem authoring inputs.
 * Requires:
 * 1. Problem metadata (title, judge_mode, etc.)
 * 2. A complete reference solution (source_code, language)
 * 3. 2-3 manually written verification test cases
 */
function validateAuthoringPayload(payload) {
  const errors = [];

  if (!payload.title || !payload.title.trim()) {
    errors.push('Problem title is required');
  }

  if (!payload.referenceSolution || !payload.referenceSolution.source_code || !payload.referenceSolution.language) {
    errors.push('A complete reference solution (source_code, language) is required');
  }

  if (!Array.isArray(payload.verificationCases) || payload.verificationCases.length < 2) {
    errors.push(
      `At least 2-3 verification test cases are required from the author (provided: ${
        Array.isArray(payload.verificationCases) ? payload.verificationCases.length : 0
      })`
    );
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Unified Problem Authoring Pipeline
 *
 * Steps:
 * 1. Author provides metadata + reference solution + 2-3 verification test cases.
 * 2. System stores problem and verification test cases.
 * 3. System verifies reference solution against verification test cases.
 * 4. On verification pass, platform generates comprehensive hidden test suite using deterministic generators.
 * 5. Every generated test case is validated (Stage 1 schema -> Stage 2 execution -> Stage 3 output) before DB storage.
 *
 * @param {Object} payload
 * @param {string} userId
 * @returns {Promise<Object>}
 */
async function authorProblem(payload, userId) {
  const validation = validateAuthoringPayload(payload);
  if (!validation.valid) {
    const error = new Error(`Authoring validation failed: ${validation.errors.join('; ')}`);
    error.status = 400;
    error.validationErrors = validation.errors;
    throw error;
  }

  const {
    title,
    slug,
    description,
    difficulty = 'Medium',
    status = 'Draft',
    input_format,
    output_format,
    constraints,
    time_limit_ms = 2000,
    memory_limit_mb = 256,
    tags = [],
    metadata = {},
    source = 'author',
    judge_mode = 'STDIN_STDOUT',
    signature_metadata,
    referenceSolution,
    verificationCases,
    generationOptions = {},
  } = payload;

  let baseSlug = slug || title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  if (!baseSlug) baseSlug = 'problem';

  let finalSlug = baseSlug;
  let counter = 2;
  while (true) {
    const existing = await db.query('SELECT id FROM problems WHERE slug = $1', [finalSlug]);
    if (existing.rowCount === 0) break;
    finalSlug = `${baseSlug}-${counter++}`;
  }

  const effectiveJudgeMode = judge_mode || 'STDIN_STDOUT';
  const effectiveSigMeta = signature_metadata || { name: 'solve', params: [], returnType: 'Void' };

  // Step 1: Create Problem
  const problemRes = await db.query(
    `INSERT INTO problems (
      title, slug, description, description_md, difficulty, status, created_by,
      input_format, output_format, constraints, time_limit_ms, memory_limit_mb,
      tags, metadata, source, judge_mode, signature_metadata
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
    RETURNING *`,
    [
      title, finalSlug, description || title, description || title, difficulty, status, userId || null,
      input_format || null, output_format || null, constraints || null,
      time_limit_ms, memory_limit_mb,
      JSON.stringify(tags), JSON.stringify(metadata), source,
      effectiveJudgeMode, JSON.stringify(effectiveSigMeta),
    ]
  );
  const problem = problemRes.rows[0];

  // Step 2: Auto-generate templates for all 5 languages
  try {
    const templates = generateAllTemplates(effectiveJudgeMode, effectiveSigMeta);
    for (const [lang, starterCode] of Object.entries(templates)) {
      await db.query(
        `INSERT INTO problem_templates (problem_id, language, starter_code)
         VALUES ($1, $2, $3)
         ON CONFLICT (problem_id, language) DO UPDATE SET starter_code = EXCLUDED.starter_code`,
        [problem.id, lang, starterCode]
      );
    }
  } catch (tmplErr) {
    logger.warn({ err: tmplErr.message }, '[ProblemAuthoring] Starter template generation warning');
  }

  // Step 3: Insert Author Verification Test Cases (is_sample = true)
  const isFunctionMode = effectiveJudgeMode === 'FUNCTION';
  const sampleExamples = [];

  for (let idx = 0; idx < verificationCases.length; idx++) {
    const tc = verificationCases[idx];
    let inputStr = tc.input !== undefined ? String(tc.input) : '';
    let expectedStr = tc.expected_output !== undefined ? String(tc.expected_output) : '';
    let inputJson = tc.input_json || null;
    let expectedJson = tc.expected_json || null;

    if (isFunctionMode) {
      if (!inputJson && inputStr) {
        inputJson = parseAssignmentInput(inputStr, signature);
      }
      if (!expectedJson && expectedStr) {
        try { expectedJson = JSON.parse(expectedStr); } catch (_) {}
      }
      if (inputJson) {
        inputStr = typeof inputJson === 'string' ? inputJson : JSON.stringify(inputJson);
      }
      if (!expectedStr && expectedJson) {
        expectedStr = typeof expectedJson === 'string' ? expectedJson : JSON.stringify(expectedJson);
      }
    }

    await db.query(
      `INSERT INTO test_cases (
        problem_id, input, expected_output, input_json, expected_json,
        is_sample, explanation, order_index, category, generated_by, verified
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        problem.id,
        inputStr,
        expectedStr,
        inputJson != null ? JSON.stringify(inputJson) : null,
        expectedJson != null ? JSON.stringify(expectedJson) : null,
        true, // verification/sample case
        tc.explanation || `Author verification case #${idx + 1}`,
        idx,
        tc.category || 'verification',
        'author_verification',
        false, // will be verified next
      ]
    );

    sampleExamples.push({
      input: inputStr,
      output: expectedStr,
      explanation: tc.explanation || null,
    });
  }

  // Synchronize examples_json on problem
  await db.query(
    'UPDATE problems SET examples_json = $1 WHERE id = $2',
    [JSON.stringify(sampleExamples), problem.id]
  );

  // Step 4: Attach Reference Solution
  const refSol = await referenceSolutionService.upsert(
    problem.id,
    referenceSolution.language,
    referenceSolution.source_code,
    userId
  );

  // Step 5: Verify Reference Solution Against Verification Test Cases
  logger.info({ problemId: problem.id, refSolutionId: refSol.id }, '[ProblemAuthoring] Verifying reference solution');
  const verificationResult = await referenceSolutionService.verify(refSol.id);

  if (!verificationResult.examplesOk || !verificationResult.compileOk) {
    logger.warn({ problemId: problem.id, verificationResult }, '[ProblemAuthoring] Reference solution verification failed');
    return {
      success: false,
      problem,
      referenceSolution: refSol,
      verificationResult,
      message: 'Reference solution verification failed against author verification cases. Test generation halted.',
    };
  }

  // Step 6: Automatically generate and validate comprehensive hidden test suite
  logger.info({ problemId: problem.id }, '[ProblemAuthoring] Generating comprehensive hidden test suite');
  const generationResult = await generateAndValidateSuite(problem.id, {
    totalCount: generationOptions.totalCount || 36,
    seed: generationOptions.seed || null,
    mode: 'append',
    dryRun: false,
  });

  return {
    success: true,
    problem,
    referenceSolution: refSol,
    verificationResult,
    generationResult,
    message: `Problem created successfully with verified reference solution and ${generationResult.savedCount} validated hidden test cases.`,
  };
}

module.exports = {
  validateAuthoringPayload,
  authorProblem,
};
