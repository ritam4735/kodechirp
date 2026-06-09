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
import time
from typing import Optional

from src.config import settings
from src.models.submission import SubmissionJob, SubmissionResult
from src.services.redis_service import redis_service
from src.services.db_service import db_service
from src.worker.evaluator import evaluate_submission, WORKER_ID
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
        self._sweeper_task: Optional[asyncio.Task] = None

    async def start(self):
        """Start consuming jobs from the queue."""
        self._running = True
        self._semaphore = asyncio.Semaphore(self.concurrency)

        logger.info(
            f"Queue consumer started: queue={settings.submission_queue}, "
            f"concurrency={self.concurrency}"
        )

        # Start recovery sweeper
        self._sweeper_task = asyncio.create_task(self._recovery_sweeper())

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

        if self._sweeper_task:
            self._sweeper_task.cancel()

        if self._tasks:
            logger.info(f"Waiting for {len(self._tasks)} active jobs to complete...")
            await asyncio.gather(*self._tasks, return_exceptions=True)

        logger.info("Queue consumer stopped")

    async def _heartbeat(self, job_id: str, worker_token: str, stop_event: asyncio.Event):
        """Periodically update the job's lock key to indicate the worker is alive."""
        redis = redis_service.client
        lock_key = f"bull:{settings.submission_queue}:{job_id}:lock"
        
        while not stop_event.is_set():
            try:
                # Set lock with 15 second expiry
                await redis.set(lock_key, worker_token, ex=15)
            except Exception as e:
                logger.error(f"Heartbeat failed for job {job_id}: {e}")
            
            try:
                await asyncio.wait_for(stop_event.wait(), timeout=5.0)
            except asyncio.TimeoutError:
                pass

    async def _recovery_sweeper(self):
        """Background task to detect and recover stalled jobs."""
        redis = redis_service.client
        logger.info("Recovery sweeper started")
        
        while self._running:
            try:
                # Run sweep every 15 seconds
                await asyncio.sleep(15)
                
                # Get all active jobs
                active_jobs = await redis.lrange(self._active_key, 0, -1)
                
                for job_id in active_jobs:
                    lock_key = f"bull:{settings.submission_queue}:{job_id}:lock"
                    lock_val = await redis.get(lock_key)
                    
                    if not lock_val:
                        # Double check to prevent race conditions during job completion
                        await asyncio.sleep(1)
                        if await redis.lpos(self._active_key, job_id) is not None:
                            if await redis.get(lock_key) is None:
                                logger.warning(f"Detected stalled job {job_id}, attempting recovery...")
                                job_data_raw = await redis.hgetall(f"bull:{settings.submission_queue}:{job_id}")
                                if job_data_raw and "data" in job_data_raw:
                                    job_data = json.loads(job_data_raw["data"])
                                    await self._handle_failure(job_id, job_data, "Worker crashed (stalled job recovered)")
                                else:
                                    logger.warning(f"Orphaned job {job_id} removed from active list")
                                    await redis.lrem(self._active_key, 1, job_id)
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Recovery sweeper error: {e}")

    async def _process_job(self, job_id: str, job_data: dict):
        """Process a single job."""
        redis = redis_service.client
        lock_key = f"bull:{settings.submission_queue}:{job_id}:lock"
        completed_flag_key = f"bull:{settings.submission_queue}:{job_id}:completed_flag"
        
        stop_heartbeat = asyncio.Event()
        worker_token = f"{WORKER_ID}:{time.time()}"
        heartbeat_task = None

        try:
            # 1. Idempotency Check
            if await redis.get(completed_flag_key):
                logger.warning(f"Job {job_id} already completed. Skipping duplicate execution.")
                await redis.lrem(self._active_key, 1, job_id)
                return

            job = SubmissionJob(**job_data)
            logger.info(f"Processing job {job_id}: submission={job.submissionId} by {WORKER_ID}")

            # Set initial lock and start heartbeat
            await redis.set(lock_key, worker_token, ex=15)
            heartbeat_task = asyncio.create_task(self._heartbeat(job_id, worker_token, stop_heartbeat))

            # Evaluate the submission
            result = await evaluate_submission(job)

            # 2. Lock Verification (Idempotency Protection)
            current_lock = await redis.get(lock_key)
            if current_lock != worker_token:
                logger.warning(f"Job {job_id} lock lost (expected {worker_token}, got {current_lock}). Skipping DB write and publish.")
                return

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

            # Mark job as completed
            await redis.set(completed_flag_key, "1", ex=3600)
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

            # Lock verification before handling failure
            current_lock = await redis.get(lock_key)
            if current_lock == worker_token:
                await self._handle_failure(job_id, job_data, str(e))
            else:
                logger.warning(f"Job {job_id} failed but lock was lost. Skipping failure handling.")

        finally:
            stop_heartbeat.set()
            if heartbeat_task:
                await heartbeat_task
                
            # Clear lock if we still own it
            current_lock = await redis.get(lock_key)
            if current_lock == worker_token:
                await redis.delete(lock_key)
                
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
