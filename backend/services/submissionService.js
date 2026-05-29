// backend/services/submissionService.js
// ─────────────────────────────────────────────────────────────────────────────
// BUG FIX: this file previously only exported `notImplemented`.
// Now it:
//   1. Fetches all test cases for a problem from the DB
//   2. Runs user code against each one using codeRunner
//   3. Compares actual stdout vs expected_output (trimmed, normalised)
//   4. Returns the first failure or 'Accepted' if all pass
//   5. Persists the submission result to the DB
// ─────────────────────────────────────────────────────────────────────────────

const { runCode }   = require('./codeRunner');
const db            = require('../db');

// ── Public: run code once (used by the "Run" button, no test-case loop) ───────

/**
 * Run code with a single stdin blob and return raw output.
 * Used by POST /api/submissions/run.
 */
exports.runCode = async function(code, language, stdin = '') {
  return runCode(code, language, stdin);
};

// ── Public: submit code against all test cases ────────────────────────────────

/**
 * Submit code for judging.
 *
 * Iterates over every test case for the problem (hidden + sample alike),
 * runs the user's code, and returns the first failure or Accepted.
 *
 * @returns {Promise<SubmissionResult>}
 */
exports.submitCode = async function(problemId, code, language, userId = null) {
  // 1. Fetch all test cases (both sample and hidden) ordered by index
  const tcResult = await db.query(
    `SELECT id, input, expected_output, order_index
     FROM   test_cases
     WHERE  problem_id = $1
     ORDER  BY order_index ASC`,
    [problemId]
  );

  const testCases = tcResult.rows;
  if (testCases.length === 0) {
    throw new Error(`No test cases found for problem: ${problemId}`);
  }

  let passed = 0;

  for (const tc of testCases) {
    const result = await runCode(code, language, tc.input);

    // ── Time Limit Exceeded ───────────────────────────────────────────────────
    if (result.timedOut) {
      await saveSubmission({
        userId, problemId, language, code,
        status:          'Time Limit Exceeded',
        failedInput:     tc.input,
        failedExpected:  tc.expected_output,
        failedActual:    result.stdout,
      });
      return {
        verdict:       'Time Limit Exceeded',
        passed,
        total:         testCases.length,
        failedInput:   tc.input,
        failedExpected: tc.expected_output,
        failedActual:  result.stdout,
      };
    }

    // ── Compilation / Runtime Error ───────────────────────────────────────────
    if (result.exitCode !== 0) {
      const status = result.compilationError ? 'Compilation Error' : 'Runtime Error';
      await saveSubmission({
        userId, problemId, language, code,
        status,
        failedInput:  tc.input,
        failedExpected: tc.expected_output,
        failedActual: result.stderr,
      });
      return {
        verdict:     status,
        passed,
        total:       testCases.length,
        error:       result.stderr,
        failedInput: tc.input,
      };
    }

    // ── Wrong Answer ──────────────────────────────────────────────────────────
    // Normalise: trim and collapse internal whitespace so minor formatting
    // differences (trailing newline, extra spaces) don't cause false failures.
    const actual   = normalise(result.stdout);
    const expected = normalise(tc.expected_output);

    if (actual !== expected) {
      await saveSubmission({
        userId, problemId, language, code,
        status:         'Wrong Answer',
        failedInput:    tc.input,
        failedExpected: tc.expected_output,
        failedActual:   result.stdout,
      });
      return {
        verdict:        'Wrong Answer',
        passed,
        total:          testCases.length,
        failedInput:    tc.input,
        failedExpected: tc.expected_output,
        failedActual:   result.stdout,
      };
    }

    passed++;
  }

  // ── All passed ────────────────────────────────────────────────────────────
  await saveSubmission({ userId, problemId, language, code, status: 'Accepted' });
  return {
    verdict: 'Accepted',
    passed,
    total:   testCases.length,
    runtime: 'N/A',
    memory:  'N/A',
  };
};

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Trim and normalise whitespace so that trailing newlines / extra spaces
 * in student output don't cause a Wrong Answer for otherwise correct solutions.
 */
function normalise(str) {
  return (str || '')
    .trim()
    .replace(/\r\n/g, '\n')   // normalise Windows line endings
    .replace(/ +\n/g, '\n')   // strip trailing spaces on each line
    .replace(/\n +/g, '\n');  // strip leading spaces on each line
}

/**
 * Persist a submission record.  Non-fatal — a DB write failure must never
 * crash the judging response (user still gets their verdict).
 */
async function saveSubmission({
  userId, problemId, language, code, status,
  failedInput = null, failedExpected = null, failedActual = null,
  runtimeMs = null, memoryKb = null,
}) {
  try {
    await db.query(
      `INSERT INTO submissions
         (user_id, problem_id, language, code, status,
          runtime_ms, memory_kb,
          failed_test_input, failed_test_expected, failed_test_actual)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        userId    || null,
        problemId,
        language,
        code,
        status,
        runtimeMs,
        memoryKb,
        failedInput,
        failedExpected,
        failedActual,
      ]
    );
  } catch (err) {
    // Log but never throw — verdict already computed
    console.error('[submissionService] DB write failed:', err.message);
  }
}
