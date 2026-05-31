// gateway/src/queue/producer.js
// ─────────────────────────────────────────────────────────────────────────────
// BullMQ Job Producer — Enqueues submissions to Redis for Python workers
// ─────────────────────────────────────────────────────────────────────────────

const { Queue } = require('bullmq');
const { getClient } = require('../config/redis');
const config = require('../config');
const logger = require('../utils/logger');

let submissionQueue = null;

/**
 * Get or create the submission queue.
 */
function getQueue() {
  if (!submissionQueue) {
    submissionQueue = new Queue(config.queue.submissionQueue, {
      connection: getClient(),
      defaultJobOptions: config.queue.defaultJobOptions,
    });

    logger.info({ queueName: config.queue.submissionQueue }, '[Queue] Submission queue initialized');
  }
  return submissionQueue;
}

/**
 * Enqueue a submission job for execution.
 *
 * @param {Object} job - Job data
 * @param {string} job.submissionId
 * @param {string} job.userId
 * @param {string} job.problemId
 * @param {string} job.language
 * @param {string} job.code
 * @param {Array}  job.testCases
 * @param {Object} job.constraints
 * @param {Object} [options] - BullMQ job options override
 */
async function enqueueSubmission(job, options = {}) {
  const queue = getQueue();

  const bullJob = await queue.add('execute', job, {
    jobId: job.submissionId,
    priority: options.priority || 1,
    ...options,
  });

  logger.info({
    jobId: bullJob.id,
    submissionId: job.submissionId,
    language: job.language,
    testCases: job.testCases.length,
  }, '[Queue] Submission job enqueued');

  return bullJob;
}

/**
 * Get queue health metrics.
 */
async function getQueueMetrics() {
  const queue = getQueue();

  const [waiting, active, completed, failed, delayed] = await Promise.all([
    queue.getWaitingCount(),
    queue.getActiveCount(),
    queue.getCompletedCount(),
    queue.getFailedCount(),
    queue.getDelayedCount(),
  ]);

  return { waiting, active, completed, failed, delayed };
}

/**
 * Close the queue gracefully.
 */
async function closeQueue() {
  if (submissionQueue) {
    await submissionQueue.close();
    submissionQueue = null;
    logger.info('[Queue] Submission queue closed');
  }
}

module.exports = {
  getQueue,
  enqueueSubmission,
  getQueueMetrics,
  closeQueue,
};
