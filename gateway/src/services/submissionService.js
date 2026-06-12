// gateway/src/services/submissionService.js
// ─────────────────────────────────────────────────────────────────────────────
// Submission Service — Enqueues code execution jobs to Redis
// ─────────────────────────────────────────────────────────────────────────────

const { v4: uuidv4 } = require('uuid');
const fetch = require('node-fetch');
const db = require('../config/database');
const config = require('../config');
const { enqueueSubmission } = require('../queue/producer');
const logger = require('../utils/logger');
const { STATUS } = require('../utils/constants');

/**
 * Submit code for judging (async — enqueue to worker).
 * Returns immediately with a submission ID for tracking.
 */
async function submitCode({ problemId, code, language, userId }) {
  // 1. Verify problem exists and fetch test cases
  const problemResult = await db.query(
    "SELECT id, time_limit_ms, memory_limit_mb, judge_mode, signature_metadata FROM problems WHERE id = $1 AND status = 'Published'",
    [problemId]
  );

  if (problemResult.rows.length === 0) {
    const err = new Error('Problem not found');
    err.status = 404;
    throw err;
  }

  const problem = problemResult.rows[0];

  // Fetch ALL test cases (sample + hidden)
  const tcResult = await db.query(
    `SELECT id, input, expected_output, input_json, expected_json, is_sample, order_index
     FROM test_cases
     WHERE problem_id = $1
     ORDER BY order_index ASC`,
    [problemId]
  );

  if (tcResult.rows.length === 0) {
    const err = new Error('No test cases found for this problem');
    err.status = 404;
    throw err;
  }

  // 2. Create submission record (status: queued)
  const submissionId = uuidv4();
  const queueId = `job:${submissionId}`;

  await db.query(
    `INSERT INTO submissions
       (id, user_id, problem_id, language, code, status, queue_id, test_cases_total, queued_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
    [submissionId, userId || null, problemId, language, code, STATUS.QUEUED, queueId, tcResult.rows.length]
  );

  // 3. Enqueue job to Redis for Python worker
  const job = {
    submissionId,
    userId: userId || null,
    problemId,
    language,
    code,
    testCases: tcResult.rows.map(tc => {
      let inputStr = tc.input;
      let expectedStr = tc.expected_output;
      if (problem.judge_mode === 'FUNCTION' || problem.judge_mode === 'CLASS') {
        inputStr = typeof tc.input_json === 'string' ? tc.input_json : JSON.stringify(tc.input_json || {});
        expectedStr = typeof tc.expected_json === 'string' ? tc.expected_json : JSON.stringify(tc.expected_json || null);
      }
      return {
        id: tc.id,
        input: inputStr || '',
        expectedOutput: expectedStr || '',
        isSample: tc.is_sample,
      };
    }),
    judgeMode: problem.judge_mode || 'STDIN_STDOUT',
    signatureMetadata: typeof problem.signature_metadata === 'string' ? JSON.parse(problem.signature_metadata || '{}') : problem.signature_metadata,
    constraints: {
      timeoutMs: problem.time_limit_ms || 5000,
      memoryMb: problem.memory_limit_mb || 256,
    },
  };

  await enqueueSubmission(job);

  logger.info({
    submissionId,
    userId,
    problemId,
    language,
    testCases: tcResult.rows.length,
  }, '[Submission] Job enqueued');

  return {
    submissionId,
    status: STATUS.QUEUED,
    testCasesTotal: tcResult.rows.length,
    queueId,
  };
}

/**
 * Run code once with stdin (non-judging, for "Run" button).
 * This is still synchronous via HTTP to the worker service.
 */
async function runCode({ code, language, stdin }) {
  // Strategy: try the Python worker HTTP API first.
  // If it's unavailable (local dev without worker), fall back to
  // direct Docker/Podman sandbox execution via codeRunner.

  try {
    const response = await fetch(`${config.worker.apiUrl}/api/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, language, stdin }),
      signal: AbortSignal.timeout(15000), // 15s timeout
    });

    if (!response.ok) {
      throw new Error(`Worker returned ${response.status}`);
    }

    return await response.json();
  } catch (err) {
    // If worker is not reachable, fall back to local execution
    const isNetworkError = err.code === 'ECONNREFUSED' || err.type === 'system'
      || err.message?.includes('reason:') || err.message?.includes('ECONNREFUSED')
      || err.message?.includes('fetch failed');

    if (isNetworkError) {
      logger.info('[Submission] Worker unavailable, falling back to local Docker execution');
      const { executeLocal } = require('./codeRunner');
      const result = await executeLocal(code, language, stdin);
      return result;
    }

    logger.error({ err }, '[Submission] Run code failed');
    return {
      stdout: '',
      stderr: err.message || 'Execution service unavailable',
      exitCode: -1,
      timedOut: false,
    };
  }
}

/**
 * Get submissions for a user.
 */
async function getUserSubmissions(userId, { limit = 50, offset = 0 } = {}) {
  const result = await db.query(
    `SELECT s.id, s.problem_id, s.language, s.status, s.runtime_ms, s.memory_kb,
            s.test_cases_passed, s.test_cases_total, s.created_at,
            p.title AS problem_title, p.slug AS problem_slug, p.difficulty
     FROM submissions s
     JOIN problems p ON p.id = s.problem_id
     WHERE s.user_id = $1
     ORDER BY s.created_at DESC
     LIMIT $2 OFFSET $3`,
    [userId, limit, offset]
  );

  return result.rows;
}

/**
 * Get a single submission by ID.
 */
async function getSubmission(submissionId, user = null) {
  let queryText = `
    SELECT s.*,
      (SELECT tc.is_sample
       FROM execution_metrics em
       JOIN test_cases tc ON em.test_case_id = tc.id
       WHERE em.submission_id = s.id AND em.status != 'Accepted'
       ORDER BY em.test_index ASC
       LIMIT 1
      ) as failed_test_is_sample
    FROM submissions s WHERE s.id = $1
  `;
  const params = [submissionId];

  // Admin can access any submission
  if (user && user.role === 'admin') {
    // No additional filters
  } else if (user && user.id) {
    // Authenticated user can only access their own submissions
    queryText += ' AND user_id = $2';
    params.push(user.id);
  } else {
    // Guest can only access guest submissions
    queryText = `
      SELECT s.*,
        (SELECT tc.is_sample
         FROM execution_metrics em
         JOIN test_cases tc ON em.test_case_id = tc.id
         WHERE em.submission_id = s.id AND em.status != 'Accepted'
         ORDER BY em.test_index ASC
         LIMIT 1
        ) as failed_test_is_sample
      FROM submissions s WHERE s.id = $1 AND s.user_id IS NULL
    `;
  }

  const result = await db.query(queryText, params);

  if (result.rows.length === 0) {
    const err = new Error('Submission not found');
    err.status = 404;
    throw err;
  }

  const submission = result.rows[0];

  // Redact private information if user is not admin and the failed test case is hidden
  const isAdmin = user && user.role === 'admin';
  if (!isAdmin && submission.failed_test_is_sample === false) {
    submission.failed_test_input = null;
    submission.failed_test_expected = null;
    submission.failed_test_actual = null;
    submission.error_message = 'Hidden execution trace';
  }

  // Remove the temporary column
  delete submission.failed_test_is_sample;

  return submission;
}

module.exports = {
  submitCode,
  runCode,
  getUserSubmissions,
  getSubmission,
};
