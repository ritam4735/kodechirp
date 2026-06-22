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
from src.worker.wrapper_generator import WrapperGenerator


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

    # ── Wrapper Injection Phase ──────────────────────────────────────
    execution_code = job.code
    is_batch = False
    
    if job.judgeMode in ("FUNCTION", "CLASS") and job.signatureMetadata:
        try:
            execution_code = WrapperGenerator.generate_batch(
                language=job.language,
                signature=job.signatureMetadata,
                user_code=job.code
            )
            is_batch = True
            logger.info(f"Submission {submission_id}: Batch wrapper generated successfully")
        except NotImplementedError:
            try:
                # Fallback to single wrapper if batch not implemented (shouldn't happen)
                execution_code = WrapperGenerator.generate(
                    language=job.language,
                    signature=job.signatureMetadata,
                    user_code=job.code
                )
                logger.info(f"Submission {submission_id}: Single wrapper generated")
            except Exception as e:
                logger.error(f"Wrapper generation failed: {e}")
                return SubmissionResult(
                    submissionId=submission_id, userId=job.userId, verdict=Verdict.INTERNAL_ERROR,
                    testCasesPassed=0, testCasesTotal=total, error=f"Wrapper generation failed: {str(e)}", workerId=WORKER_ID
                )
        except Exception as e:
            logger.error(f"Batch wrapper generation failed: {e}")
            return SubmissionResult(
                submissionId=submission_id, userId=job.userId, verdict=Verdict.INTERNAL_ERROR,
                testCasesPassed=0, testCasesTotal=total, error=f"Batch wrapper generation failed: {str(e)}", workerId=WORKER_ID
            )

    # ── Compilation Phase ──────────────────────────────────────────
    run_dir, compile_result = await docker_service.prepare_and_compile(
        submission_id=submission_id,
        code=execution_code,
        language=job.language,
    )

    if compile_result and compile_result.exitCode != 0:
        logger.info(f"Submission {submission_id}: Compilation Error")
        if len(job.testCases) > 0:
            tc = job.testCases[0]
            await _save_metric(submission_id, tc.id, 0, compile_result, Verdict.COMPILATION_ERROR)
            failed_tc = {"input": tc.input, "expectedOutput": tc.expectedOutput, "actualOutput": compile_result.stderr, "isSample": tc.isSample}
        else:
            failed_tc = {}
        return SubmissionResult(
            submissionId=submission_id, userId=job.userId, verdict=Verdict.COMPILATION_ERROR,
            testCasesPassed=0, testCasesTotal=total, runtimeMs=compile_result.runtimeMs or 0,
            memoryKb=0, error=truncate(compile_result.stderr, 1000), failedTestCase=failed_tc, workerId=WORKER_ID
        )

    container_name = await docker_service.start_sandbox(
        run_dir=run_dir, submission_id=submission_id, language=job.language, memory_mb=job.constraints.memoryMb,
    )

    if not container_name:
        return SubmissionResult(
            submissionId=submission_id, userId=job.userId, verdict=Verdict.INTERNAL_ERROR,
            testCasesPassed=0, testCasesTotal=total, runtimeMs=0, memoryKb=0, error="Failed to start sandbox", workerId=WORKER_ID
        )

    # ── Execution Phase ────────────────────────────────────────────
    try:
        import json
        import uuid
        from src.utils.constants import LANGUAGE_CONFIG

        if is_batch:
            # --- BATCH EXECUTION ---
            # Prepare batch stdin (NDJSON)
            batch_inputs = []
            for tc in job.testCases:
                try:
                    parsed = json.loads(tc.input)
                    batch_inputs.append(json.dumps(parsed))
                except Exception:
                    batch_inputs.append(tc.input.replace("\n", ""))
            batch_stdin = "\n".join(batch_inputs) + "\n"
            use_sh_stdin = False
        else:
            # --- STDIN_STDOUT BATCH EXECUTION ---
            run_cmd = LANGUAGE_CONFIG[job.language]["run_command"]
            sh_lines = []
            for tc in job.testCases:
                marker = f"EOF_KC_{uuid.uuid4().hex}"
                sh_lines.append(f"{run_cmd} << '{marker}'")
                sh_lines.append(tc.input)
                if tc.input and not tc.input.endswith('\n'):
                    sh_lines.append("")
                sh_lines.append(marker)
                sh_lines.append("echo \"\"")
                sh_lines.append("echo \"___KC_BATCH_SEP___\"")
            
            batch_stdin = "\n".join(sh_lines) + "\n"
            use_sh_stdin = True

        # Execute batch
        result = await docker_service.execute_in_sandbox(
            container_name=container_name,
            language=job.language,
            stdin=batch_stdin,
            timeout_ms=max(job.constraints.timeoutMs * len(job.testCases), 10000), # Allow enough time for batch
            use_sh_stdin=use_sh_stdin,
        )
        
        runtime_ms = result.runtimeMs or 0
        memory_kb = result.memoryKb or 0

        # Split output by delimiter
        raw_outputs = result.stdout.split("___KC_BATCH_SEP___")

        for idx, tc in enumerate(job.testCases):
            await redis_service.publish_progress({
                "submissionId": submission_id, "userId": job.userId,
                "testCaseIndex": idx + 1, "testCasesTotal": total, "status": "running",
            })

            tc_actual_output = ""
            if idx < len(raw_outputs):
                tc_actual_output = raw_outputs[idx].strip("\n")

            is_completed = (idx < len(raw_outputs) - 1)
            
            # Check for errors if it didn't complete
            if not is_completed:
                verdict = Verdict.RUNTIME_ERROR
                is_mle = False
                if result.exitCode == 137:
                    is_mle = True
                elif result.stderr:
                    stderr_lower = result.stderr.lower()
                    if "memoryerror" in stderr_lower or "javascript heap out of memory" in stderr_lower or "fatal error: runtime: out of memory" in stderr_lower or "java.lang.outofmemoryerror" in stderr_lower:
                        is_mle = True
                elif "Runtime Error: Output exceeded 10 MB limit" in (result.stderr or ""):
                    is_mle = True

                if result.timedOut:
                    verdict = Verdict.TLE
                elif is_mle:
                    verdict = Verdict.MLE

                err_msg = truncate(result.stderr, 1000) if result.stderr else (verdict if verdict != Verdict.RUNTIME_ERROR else "Process exited unexpectedly")
                await _save_metric(submission_id, tc.id, idx, result, verdict)
                return SubmissionResult(
                    submissionId=submission_id, userId=job.userId, verdict=verdict,
                    testCasesPassed=passed, testCasesTotal=total, runtimeMs=runtime_ms, memoryKb=memory_kb,
                    error=err_msg,
                    failedTestCase={
                        "input": tc.input, "expectedOutput": tc.expectedOutput,
                        "actualOutput": tc_actual_output + ("\n" + err_msg if err_msg else ""),
                        "isSample": tc.isSample
                    }, workerId=WORKER_ID
                )

            actual = normalise_output(tc_actual_output)
            expected = normalise_output(tc.expectedOutput)

            if actual != expected:
                await _save_metric(submission_id, tc.id, idx, result, Verdict.WRONG_ANSWER)
                return SubmissionResult(
                    submissionId=submission_id, userId=job.userId, verdict=Verdict.WRONG_ANSWER,
                    testCasesPassed=passed, testCasesTotal=total, runtimeMs=runtime_ms, memoryKb=memory_kb,
                    failedTestCase={
                        "input": tc.input, "expectedOutput": tc.expectedOutput,
                        "actualOutput": tc_actual_output, "isSample": tc.isSample
                    }, workerId=WORKER_ID
                )

            await _save_metric(submission_id, tc.id, idx, result, Verdict.ACCEPTED)
            passed += 1

        logger.info(f"Submission {submission_id}: Accepted ({passed}/{total})")
        return SubmissionResult(
            submissionId=submission_id, userId=job.userId, verdict=Verdict.ACCEPTED,
            testCasesPassed=passed, testCasesTotal=total, runtimeMs=runtime_ms, memoryKb=memory_kb, workerId=WORKER_ID
        )
    finally:
        await docker_service.stop_sandbox(container_name)
        await docker_service.cleanup_submission(run_dir)

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
