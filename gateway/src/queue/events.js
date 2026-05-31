// gateway/src/queue/events.js
// ─────────────────────────────────────────────────────────────────────────────
// Redis Pub/Sub listener — receives execution results from Python workers
// Forwards results to clients via WebSocket
// ─────────────────────────────────────────────────────────────────────────────

const { getSubscriber } = require('../config/redis');
const config = require('../config');
const db = require('../config/database');
const logger = require('../utils/logger');
const { WS_EVENTS, STATUS } = require('../utils/constants');

let io = null;

/**
 * Initialize the event listener.
 * Called once after Socket.IO is set up.
 */
async function initResultListener(socketIo) {
  io = socketIo;
  const subscriber = getSubscriber();

  await subscriber.subscribe(config.queue.resultChannel);

  subscriber.on('message', async (channel, message) => {
    if (channel !== config.queue.resultChannel) return;

    try {
      const result = JSON.parse(message);
      await handleExecutionResult(result);
    } catch (err) {
      logger.error({ err, message }, '[Events] Failed to process result message');
    }
  });

  logger.info({ channel: config.queue.resultChannel }, '[Events] Result listener initialized');
}

/**
 * Handle an execution result from a worker.
 */
async function handleExecutionResult(result) {
  const { submissionId, userId, verdict, testCasesPassed, testCasesTotal,
          runtimeMs, memoryKb, failedTestCase, workerId, error } = result;

  logger.info({
    submissionId,
    verdict,
    testCasesPassed,
    testCasesTotal,
    runtimeMs,
  }, '[Events] Execution result received');

  // 1. Update submission in database
  try {
    await db.query(
      `UPDATE submissions
       SET status = $1, runtime_ms = $2, memory_kb = $3,
           test_cases_passed = $4, test_cases_total = $5,
           worker_id = $6, completed_at = NOW(),
           failed_test_input = $7, failed_test_expected = $8, failed_test_actual = $9,
           error_message = $10
       WHERE id = $11`,
      [
        verdict,
        runtimeMs || null,
        memoryKb || null,
        testCasesPassed || 0,
        testCasesTotal || 0,
        workerId || null,
        failedTestCase?.input || null,
        failedTestCase?.expectedOutput || null,
        failedTestCase?.actualOutput || null,
        error || null,
        submissionId,
      ]
    );

    // Update problem stats
    if (verdict === STATUS.ACCEPTED) {
      await db.query(
        `UPDATE problems
         SET total_submissions = total_submissions + 1,
             total_accepted = total_accepted + 1,
             acceptance_rate = (total_accepted + 1)::REAL / (total_submissions + 1)
         WHERE id = (SELECT problem_id FROM submissions WHERE id = $1)`,
        [submissionId]
      );
    } else {
      await db.query(
        `UPDATE problems
         SET total_submissions = total_submissions + 1,
             acceptance_rate = total_accepted::REAL / (total_submissions + 1)
         WHERE id = (SELECT problem_id FROM submissions WHERE id = $1)`,
        [submissionId]
      );
    }
  } catch (err) {
    logger.error({ err, submissionId }, '[Events] Failed to update submission in DB');
  }

  // 2. Emit to user via WebSocket
  if (io && userId) {
    io.to(`user:${userId}`).emit(WS_EVENTS.SUBMISSION_RESULT, {
      submissionId,
      verdict,
      testCasesPassed,
      testCasesTotal,
      runtimeMs,
      memoryKb,
      failedTestCase: failedTestCase || null,
      error: error || null,
    });

    logger.debug({ userId, submissionId }, '[Events] Result emitted to user via WebSocket');
  }
}

/**
 * Handle a progress update from a worker.
 */
async function handleProgressUpdate(data) {
  const { submissionId, userId, testCaseIndex, testCasesTotal, status } = data;

  if (io && userId) {
    io.to(`user:${userId}`).emit(WS_EVENTS.SUBMISSION_PROGRESS, {
      submissionId,
      testCaseIndex,
      testCasesTotal,
      status,
    });
  }
}

module.exports = {
  initResultListener,
  handleExecutionResult,
  handleProgressUpdate,
};
