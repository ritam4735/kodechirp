// gateway/src/services/referenceSolutionService.js
// ─────────────────────────────────────────────────────────────────────────────
// Reference Solution Service — CRUD, verification via judge, example testing
// ─────────────────────────────────────────────────────────────────────────────

const db = require('../config/database');
const { runCode } = require('./submissionService');
const logger = require('../utils/logger');

function hasCompilationError(stderr = '') {
  return Boolean(
    stderr &&
    (
      stderr.includes('error:') ||
      stderr.includes('SyntaxError') ||
      stderr.includes('IndentationError')
    )
  );
}

// ── CRUD ────────────────────────────────────────────────────────────────────

/**
 * Create or update a reference solution for a problem.
 */
async function upsert(problemId, { language, sourceCode, userId }) {
  // Check if one already exists for this problem + language
  const existing = await db.query(
    'SELECT id FROM reference_solutions WHERE problem_id = $1 AND language = $2',
    [problemId, language]
  );

  let solutionId;

  if (existing.rowCount > 0) {
    solutionId = existing.rows[0].id;
    await db.query(`
      UPDATE reference_solutions
      SET source_code = $1, compile_status = 'pending',
          verification_result = NULL, last_verified_at = NULL,
          updated_at = NOW()
      WHERE id = $2
    `, [sourceCode, solutionId]);
  } else {
    const result = await db.query(`
      INSERT INTO reference_solutions (problem_id, language, source_code, created_by)
      VALUES ($1, $2, $3, $4)
      RETURNING id
    `, [problemId, language, sourceCode, userId || null]);
    solutionId = result.rows[0].id;
  }

  // Set as the problem's reference solution
  await db.query(
    'UPDATE problems SET reference_solution_id = $1, updated_at = NOW() WHERE id = $2',
    [solutionId, problemId]
  );

  return get(solutionId);
}

/**
 * Get a reference solution by ID.
 */
async function get(solutionId) {
  const result = await db.query(
    'SELECT * FROM reference_solutions WHERE id = $1',
    [solutionId]
  );
  return result.rows[0] || null;
}

/**
 * Get the reference solution for a problem.
 */
async function getByProblem(problemId) {
  const result = await db.query(
    `SELECT rs.* FROM reference_solutions rs
     JOIN problems p ON p.reference_solution_id = rs.id
     WHERE p.id = $1`,
    [problemId]
  );
  return result.rows[0] || null;
}

/**
 * Delete a reference solution.
 */
async function remove(solutionId) {
  // Unlink from problem first
  await db.query(
    'UPDATE problems SET reference_solution_id = NULL WHERE reference_solution_id = $1',
    [solutionId]
  );
  await db.query('DELETE FROM reference_solutions WHERE id = $1', [solutionId]);
}

// ── Verification ────────────────────────────────────────────────────────────

/**
 * Verify a reference solution by:
 * 1. Checking compilation (run with empty input)
 * 2. Running against all existing example test cases
 *
 * @returns {{ compileOk, examplesOk, exampleResults, errors }}
 */
async function verify(solutionId) {
  const solution = await get(solutionId);
  if (!solution) throw new Error('Reference solution not found');

  const verification = {
    compileOk: false,
    examplesOk: false,
    exampleResults: [],
    errors: [],
    verifiedAt: new Date().toISOString(),
  };

  // Run against example test cases. This also exercises compilation for compiled
  // languages, without falsely failing input-reading solutions on empty stdin.
  const examples = await db.query(
    `SELECT id, input, expected_output FROM test_cases
     WHERE problem_id = $1 AND is_sample = TRUE
     ORDER BY order_index ASC`,
    [solution.problem_id]
  );

  if (examples.rowCount === 0) {
    try {
      const smokeResult = await runCode({
        code: solution.source_code,
        language: solution.language,
        stdin: '',
      });

      if (hasCompilationError(smokeResult.stderr)) {
        verification.errors.push(`Compilation failed: ${smokeResult.stderr.substring(0, 500)}`);
        await updateVerification(solutionId, 'compile_error', verification);
        return verification;
      }

      verification.compileOk = true;
      verification.examplesOk = true;
      verification.errors.push('No example test cases to verify against');
      await updateVerification(solutionId, 'verified', verification);
      return verification;
    } catch (err) {
      verification.errors.push(`Compile check failed: ${err.message}`);
      await updateVerification(solutionId, 'compile_error', verification);
      return verification;
    }
  }

  let allPassed = true;

  for (const tc of examples.rows) {
    try {
      const result = await runCode({
        code: solution.source_code,
        language: solution.language,
        stdin: tc.input,
      });

      if (hasCompilationError(result.stderr)) {
        verification.errors.push(`Compilation failed: ${result.stderr.substring(0, 500)}`);
        await updateVerification(solutionId, 'compile_error', verification);
        return verification;
      }

      const actualOutput = (result.stdout || '').trim();
      const expectedOutput = (tc.expected_output || '').trim();
      const passed = !result.timedOut && result.exitCode === 0 && actualOutput === expectedOutput;

      if (!passed) allPassed = false;

      verification.exampleResults.push({
        testCaseId: tc.id,
        input: tc.input.substring(0, 200),
        expected: expectedOutput.substring(0, 200),
        actual: actualOutput.substring(0, 200),
        passed,
        stderr: result.stderr ? result.stderr.substring(0, 200) : null,
        exitCode: result.exitCode,
        timedOut: result.timedOut || false,
      });
    } catch (err) {
      allPassed = false;
      verification.exampleResults.push({
        testCaseId: tc.id,
        input: tc.input.substring(0, 200),
        expected: tc.expected_output.substring(0, 200),
        actual: null,
        passed: false,
        error: err.message,
      });
    }
  }

  verification.examplesOk = allPassed;
  const status = allPassed ? 'verified' : 'example_failed';
  await updateVerification(solutionId, status, verification);

  return verification;
}

/**
 * Run the reference solution against a specific input and return the output.
 */
async function runAgainstInput(solutionId, input) {
  const solution = await get(solutionId);
  if (!solution) throw new Error('Reference solution not found');

  const result = await runCode({
    code: solution.source_code,
    language: solution.language,
    stdin: input,
  });

  return {
    stdout: (result.stdout || '').trim(),
    stderr: result.stderr || '',
    exitCode: result.exitCode,
    timedOut: result.timedOut || false,
  };
}

// ── Internal helpers ────────────────────────────────────────────────────────

async function updateVerification(solutionId, status, result) {
  await db.query(`
    UPDATE reference_solutions
    SET compile_status = $1,
        verification_result = $2,
        last_verified_at = NOW(),
        updated_at = NOW()
    WHERE id = $3
  `, [status, JSON.stringify(result), solutionId]);
}

module.exports = {
  upsert,
  get,
  getByProblem,
  remove,
  verify,
  runAgainstInput,
};
