# workers/src/worker/evaluator.py
# ─────────────────────────────────────────────────────────────────────────────
# Test case evaluator — runs code against all test cases and determines verdict
# ─────────────────────────────────────────────────────────────────────────────

import socket
from typing import Optional

from src.models.submission import (
    SubmissionJob,
    ExecutionResult,
    TestCaseResult,
    SubmissionResult,
)
from src.services.docker_service import docker_service
from src.services.redis_service import redis_service
from src.services.db_service import db_service
from src.utils.constants import Verdict
from src.utils.sanitizer import normalise_output, truncate
from src.utils.logger import logger


WORKER_ID = f"worker-{socket.gethostname()}"


async def evaluate_submission(job: SubmissionJob) -> SubmissionResult:
    """
    Evaluate a submission against all test cases.

    For each test case:
    1. Execute code in Docker sandbox with the test input as stdin
    2. Compare actual output vs expected output
    3. Return first failure or Accepted if all pass

    Publishes progress updates via Redis Pub/Sub.
    """
    submission_id = job.submissionId
    total = len(job.testCases)
    passed = 0
    max_runtime_ms = 0
    max_memory_kb = 0

    logger.info(
        f"Evaluating submission {submission_id}: "
        f"language={job.language}, testCases={total}"
    )

    # Mark as running
    await db_service.update_submission_status(
        submission_id, Verdict.RUNNING, worker_id=WORKER_ID
    )

    for idx, tc in enumerate(job.testCases):
        # Publish progress
        await redis_service.publish_progress({
            "submissionId": submission_id,
            "userId": job.userId,
            "testCaseIndex": idx + 1,
            "testCasesTotal": total,
            "status": "running",
        })

        # Execute code
        result = await docker_service.execute_code(
            submission_id=submission_id,
            code=job.code,
            language=job.language,
            stdin=tc.input,
            timeout_ms=job.constraints.timeoutMs,
            memory_mb=job.constraints.memoryMb,
        )

        runtime_ms = result.runtimeMs or 0
        memory_kb = result.memoryKb or 0
        max_runtime_ms = max(max_runtime_ms, runtime_ms)
        max_memory_kb = max(max_memory_kb, memory_kb)

        # ── Time Limit Exceeded ──────────────────────────────────────────
        if result.timedOut:
            await _save_metric(submission_id, tc.id, idx, result, Verdict.TLE)

            return SubmissionResult(
                submissionId=submission_id,
                userId=job.userId,
                verdict=Verdict.TLE,
                testCasesPassed=passed,
                testCasesTotal=total,
                runtimeMs=runtime_ms,
                memoryKb=memory_kb,
                failedTestCase={
                    "input": tc.input,
                    "expectedOutput": tc.expectedOutput,
                    "actualOutput": result.stdout,
                    "isSample": tc.isSample,
                },
                workerId=WORKER_ID,
            )

        # ── Compilation / Runtime Error ──────────────────────────────────
        if result.exitCode != 0:
            # Detect compilation vs runtime error
            stderr_lower = result.stderr.lower()
            if any(kw in stderr_lower for kw in ["error:", "undefined reference", "cannot find"]):
                verdict = Verdict.COMPILATION_ERROR
            else:
                verdict = Verdict.RUNTIME_ERROR

            await _save_metric(submission_id, tc.id, idx, result, verdict)

            return SubmissionResult(
                submissionId=submission_id,
                userId=job.userId,
                verdict=verdict,
                testCasesPassed=passed,
                testCasesTotal=total,
                runtimeMs=runtime_ms,
                memoryKb=memory_kb,
                error=truncate(result.stderr, 1000),
                failedTestCase={
                    "input": tc.input,
                    "expectedOutput": tc.expectedOutput,
                    "actualOutput": result.stderr,
                    "isSample": tc.isSample,
                },
                workerId=WORKER_ID,
            )

        # ── Wrong Answer ─────────────────────────────────────────────────
        actual = normalise_output(result.stdout)
        expected = normalise_output(tc.expectedOutput)

        if actual != expected:
            await _save_metric(submission_id, tc.id, idx, result, Verdict.WRONG_ANSWER)

            return SubmissionResult(
                submissionId=submission_id,
                userId=job.userId,
                verdict=Verdict.WRONG_ANSWER,
                testCasesPassed=passed,
                testCasesTotal=total,
                runtimeMs=runtime_ms,
                memoryKb=memory_kb,
                failedTestCase={
                    "input": tc.input,
                    "expectedOutput": tc.expectedOutput,
                    "actualOutput": result.stdout,
                    "isSample": tc.isSample,
                },
                workerId=WORKER_ID,
            )

        # ── Passed ───────────────────────────────────────────────────────
        await _save_metric(submission_id, tc.id, idx, result, Verdict.ACCEPTED)
        passed += 1

    # ── All Passed → Accepted ────────────────────────────────────────────
    logger.info(f"Submission {submission_id}: Accepted ({passed}/{total})")

    return SubmissionResult(
        submissionId=submission_id,
        userId=job.userId,
        verdict=Verdict.ACCEPTED,
        testCasesPassed=passed,
        testCasesTotal=total,
        runtimeMs=max_runtime_ms,
        memoryKb=max_memory_kb,
        workerId=WORKER_ID,
    )


async def _save_metric(
    submission_id: str,
    test_case_id: str,
    test_index: int,
    result: ExecutionResult,
    status: str,
):
    """Save execution metric for a single test case."""
    try:
        await db_service.save_execution_metric(
            submission_id=submission_id,
            test_case_id=test_case_id,
            test_index=test_index,
            runtime_ms=result.runtimeMs,
            memory_kb=result.memoryKb,
            exit_code=result.exitCode,
            status=status,
            stdout_preview=truncate(result.stdout),
            stderr_preview=truncate(result.stderr),
        )
    except Exception as e:
        logger.error(f"Failed to save execution metric: {e}")
