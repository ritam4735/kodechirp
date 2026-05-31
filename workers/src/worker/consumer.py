# workers/src/worker/consumer.py
# ─────────────────────────────────────────────────────────────────────────────
# Redis Queue Consumer — BullMQ-compatible job processor
# ─────────────────────────────────────────────────────────────────────────────
#
# BullMQ stores jobs in Redis using specific key patterns:
#   - bull:<queueName>:wait     (list of waiting job IDs)
#   - bull:<queueName>:<jobId>  (hash with job data)
#
# This consumer uses BRPOPLPUSH to dequeue jobs atomically,
# compatible with BullMQ's queue format.
# ─────────────────────────────────────────────────────────────────────────────

import json
import asyncio
import traceback
from typing import Optional

from src.config import settings
from src.models.submission import SubmissionJob, SubmissionResult
from src.services.redis_service import redis_service
from src.services.db_service import db_service
from src.worker.evaluator import evaluate_submission
from src.utils.constants import Verdict
from src.utils.logger import logger


class QueueConsumer:
    """
    Consumes submission jobs from Redis queue (BullMQ-compatible).

    Processes jobs concurrently up to the configured concurrency limit.
    Failed jobs are retried up to max_retries times.
    """

    def __init__(self, concurrency: int = 4):
        self.concurrency = concurrency
        self._running = False
        self._semaphore: Optional[asyncio.Semaphore] = None
        self._queue_key = f"bull:{settings.submission_queue}:wait"
        self._active_key = f"bull:{settings.submission_queue}:active"
        self._tasks: set = set()

    async def start(self):
        """Start consuming jobs from the queue."""
        self._running = True
        self._semaphore = asyncio.Semaphore(self.concurrency)

        logger.info(
            f"Queue consumer started: queue={settings.submission_queue}, "
            f"concurrency={self.concurrency}"
        )

        while self._running:
            try:
                await self._semaphore.acquire()

                # Block-wait for a job ID from the queue (5s timeout)
                redis = redis_service.client
                result = await redis.brpoplpush(
                    self._queue_key,
                    self._active_key,
                    timeout=5,
                )

                if result is None:
                    # No job available, release semaphore and continue
                    self._semaphore.release()
                    continue

                job_id = result

                # Fetch job data from Redis hash
                job_data_raw = await redis.hgetall(
                    f"bull:{settings.submission_queue}:{job_id}"
                )

                if not job_data_raw or "data" not in job_data_raw:
                    logger.warning(f"Job {job_id} has no data, skipping")
                    await redis.lrem(self._active_key, 1, job_id)
                    self._semaphore.release()
                    continue

                # Parse job data
                job_data = json.loads(job_data_raw["data"])

                # Process in background
                task = asyncio.create_task(
                    self._process_job(job_id, job_data)
                )
                self._tasks.add(task)
                task.add_done_callback(self._tasks.discard)

            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Consumer loop error: {e}")
                self._semaphore.release()
                await asyncio.sleep(1)

    async def stop(self):
        """Stop consuming and wait for active jobs."""
        self._running = False

        if self._tasks:
            logger.info(f"Waiting for {len(self._tasks)} active jobs to complete...")
            await asyncio.gather(*self._tasks, return_exceptions=True)

        logger.info("Queue consumer stopped")

    async def _process_job(self, job_id: str, job_data: dict):
        """Process a single job."""
        try:
            job = SubmissionJob(**job_data)
            logger.info(f"Processing job {job_id}: submission={job.submissionId}")

            # Evaluate the submission
            result = await evaluate_submission(job)

            # Update submission in DB
            await db_service.update_submission_status(
                submission_id=result.submissionId,
                status=result.verdict,
                runtime_ms=result.runtimeMs,
                memory_kb=result.memoryKb,
                test_cases_passed=result.testCasesPassed,
                worker_id=result.workerId,
                error_message=result.error,
                failed_test_input=result.failedTestCase.get("input") if result.failedTestCase else None,
                failed_test_expected=result.failedTestCase.get("expectedOutput") if result.failedTestCase else None,
                failed_test_actual=result.failedTestCase.get("actualOutput") if result.failedTestCase else None,
            )

            # Publish result to Redis Pub/Sub → Gateway → WebSocket → Frontend
            await redis_service.publish_result(result.model_dump())

            # Mark job as completed in BullMQ
            redis = redis_service.client
            await redis.lrem(self._active_key, 1, job_id)

            # Move to completed set
            await redis.zadd(
                f"bull:{settings.submission_queue}:completed",
                {job_id: asyncio.get_event_loop().time()},
            )

            logger.info(
                f"Job {job_id} completed: verdict={result.verdict}, "
                f"passed={result.testCasesPassed}/{result.testCasesTotal}"
            )

        except Exception as e:
            logger.error(f"Job {job_id} failed: {e}\n{traceback.format_exc()}")

            # Handle retry or move to failed
            await self._handle_failure(job_id, job_data, str(e))

        finally:
            self._semaphore.release()

    async def _handle_failure(self, job_id: str, job_data: dict, error: str):
        """Handle a failed job — retry or move to dead letter queue."""
        redis = redis_service.client

        try:
            # Get attempt count
            job_meta = await redis.hgetall(
                f"bull:{settings.submission_queue}:{job_id}"
            )
            attempt = int(job_meta.get("attemptsMade", "0")) + 1

            if attempt < settings.max_retries:
                # Retry: increment attempts and re-queue
                await redis.hset(
                    f"bull:{settings.submission_queue}:{job_id}",
                    "attemptsMade", str(attempt),
                )
                await redis.lrem(self._active_key, 1, job_id)
                await redis.lpush(self._queue_key, job_id)

                logger.info(f"Job {job_id} re-queued (attempt {attempt}/{settings.max_retries})")
            else:
                # Move to failed set (dead letter queue)
                await redis.lrem(self._active_key, 1, job_id)
                await redis.zadd(
                    f"bull:{settings.submission_queue}:failed",
                    {job_id: asyncio.get_event_loop().time()},
                )

                # Update submission status
                submission_id = job_data.get("submissionId")
                if submission_id:
                    await db_service.update_submission_status(
                        submission_id, Verdict.INTERNAL_ERROR,
                        error_message=f"Execution failed after {settings.max_retries} attempts: {error}",
                    )

                    # Notify user
                    await redis_service.publish_result({
                        "submissionId": submission_id,
                        "userId": job_data.get("userId"),
                        "verdict": Verdict.INTERNAL_ERROR,
                        "testCasesPassed": 0,
                        "testCasesTotal": len(job_data.get("testCases", [])),
                        "error": f"Internal error after {settings.max_retries} retries",
                    })

                logger.error(f"Job {job_id} permanently failed after {settings.max_retries} attempts")

        except Exception as e:
            logger.error(f"Failed to handle failure for job {job_id}: {e}")
