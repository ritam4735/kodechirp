# workers/src/main.py
# ─────────────────────────────────────────────────────────────────────────────
# KodeChirp Worker — FastAPI + Redis Queue Consumer
# ─────────────────────────────────────────────────────────────────────────────
#
# This service serves two roles:
# 1. HTTP API — sync code execution endpoint (for "Run Code" button)
#               + health checks + metrics
# 2. Queue Consumer — async BullMQ-compatible job processor
#                     (for "Submit" judging pipeline)
# ─────────────────────────────────────────────────────────────────────────────

import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from src.config import settings
from src.services.redis_service import redis_service
from src.services.db_service import db_service
from src.services.docker_service import docker_service
from src.services.monitor_service import monitor
from src.worker.consumer import QueueConsumer
from src.api.health import router as health_router
from src.api.metrics import router as metrics_router
from src.api.monitoring import router as monitoring_router
from src.models.submission import RunCodeRequest
from src.utils.sanitizer import normalise_output
from src.utils.batch_parser import parse_batch_outputs, parse_batch_segment, BATCH_DELIMITER
from src.utils.assignment_parser import parse_assignment_input
from src.utils.logger import logger


# Queue consumer instance
consumer = QueueConsumer(concurrency=settings.worker_concurrency)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan — startup and shutdown."""

    # ── Startup ─────────────────────────────────────────────────────────
    logger.info("Starting KodeChirp Worker...")

    # Connect to Redis
    await redis_service.connect()

    # Connect to PostgreSQL
    await db_service.connect()

    # Start monitoring service
    await monitor.start(db_service.pool)
    await monitor.service_started()

    # Start queue consumer in background
    consumer_task = asyncio.create_task(consumer.start())

    logger.info(
        f"Worker ready: concurrency={settings.worker_concurrency}, "
        f"queue={settings.submission_queue}"
    )

    yield

    # ── Shutdown ────────────────────────────────────────────────────────
    logger.info("Shutting down KodeChirp Worker...")

    await consumer.stop()
    consumer_task.cancel()

    await monitor.service_stopped()
    await monitor.stop()

    await redis_service.close()
    await db_service.close()

    logger.info("Worker shutdown complete")


# ── FastAPI App ──────────────────────────────────────────────────────────────

app = FastAPI(
    title="KodeChirp Worker",
    description="Code execution worker with Docker sandbox isolation",
    version="2.0.0",
    lifespan=lifespan,
)

# CORS (for direct HTTP calls from gateway)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Internal service, restricted by network
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routes ───────────────────────────────────────────────────────────────────

app.include_router(health_router, tags=["Health"])
app.include_router(metrics_router, tags=["Metrics"])
app.include_router(monitoring_router)


@app.post("/api/execute")
async def execute_code(request: RunCodeRequest):
    """
    Synchronous code execution endpoint for "Run Code".
    Evaluates solution against all provided sample testcases individually.
    """
    import json
    from src.utils.constants import LANGUAGE_CONFIG
    from src.worker.wrapper_generator import WrapperGenerator
    from src.worker.evaluator import normalise_output

    if request.language not in LANGUAGE_CONFIG:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported language: {request.language}. "
                   f"Supported: {', '.join(LANGUAGE_CONFIG.keys())}",
        )

    # Check if test cases are provided for per-testcase execution
    if request.testCases and len(request.testCases) > 0:
        is_wrapper_mode = request.judgeMode == "FUNCTION" and request.signatureMetadata is not None

        if is_wrapper_mode:
            try:
                execution_code = WrapperGenerator.generate_batch(
                    language=request.language,
                    signature=request.signatureMetadata,
                    user_code=request.code
                )
            except Exception as e:
                logger.error(f"Wrapper generation failed: {e}")
                raise HTTPException(
                    status_code=500,
                    detail=f"Wrapper generation failed: {str(e)}"
                )

            # Build batch stdin (NDJSON)
            stdin_lines = []
            for tc in request.testCases:
                raw_input = tc.get("input", "")
                parsed = parse_assignment_input(raw_input if isinstance(raw_input, str) else json.dumps(raw_input), request.signatureMetadata)
                if parsed is not None:
                    stdin_lines.append(json.dumps(parsed))
                elif isinstance(raw_input, dict):
                    stdin_lines.append(json.dumps(raw_input))
                else:
                    stdin_lines.append(str(raw_input).strip())
            batch_stdin = "\n".join(stdin_lines) + "\n"
        else:
            execution_code = request.code
            batch_stdin = request.stdin or "\n".join(str(tc.get("input", "")).strip() for tc in request.testCases) + "\n"

        result = await docker_service.execute_code(
            code=execution_code,
            language=request.language,
            stdin=batch_stdin,
            timeout_ms=max(10000, 3000 * len(request.testCases)),
        )

        await monitor.run_code_completed(
            language=request.language,
            exit_code=result.exitCode,
            duration_ms=result.runtimeMs or 0,
            success=(result.exitCode == 0 and not result.timedOut),
        )

        if result.exitCode != 0:
            return {
                "success": False,
                "stdout": result.stdout,
                "stderr": result.stderr,
                "compileError": result.stderr,
                "exitCode": result.exitCode,
                "timedOut": result.timedOut,
                "runtimeMs": result.runtimeMs,
                "testCaseResults": []
            }

        parsed_results = parse_batch_outputs(result.stdout, len(request.testCases))
        raw_outputs = result.stdout.split(BATCH_DELIMITER)
        test_case_results = []
        all_passed = True

        for idx, tc in enumerate(request.testCases):
            tc_id = tc.get("id", str(idx + 1))
            tc_input = str(tc.get("input", ""))
            tc_expected = str(tc.get("expectedOutput", ""))
            tc_output, user_console = parsed_results[idx]
            status = "Failed"

            if result.timedOut and idx >= len(raw_outputs) - 1:
                status = "Time Limit Exceeded"
                all_passed = False
            elif normalise_output(tc_output) == normalise_output(tc_expected):
                status = "Passed"
            else:
                status = "Failed"
                all_passed = False

            test_case_results.append({
                "id": tc_id,
                "input": tc_input,
                "expectedOutput": tc_expected,
                "yourOutput": tc_output,
                "status": status,
                "consoleOutput": user_console
            })

        return {
            "success": True,
            "stdout": result.stdout,
            "stderr": result.stderr,
            "exitCode": result.exitCode,
            "timedOut": result.timedOut,
            "runtimeMs": result.runtimeMs,
            "allPassed": all_passed,
            "testCaseResults": test_case_results,
        }

    # Fallback for single stdin execution (legacy / no testcases supplied)
    execution_code = request.code
    if request.judgeMode == "FUNCTION" and request.signatureMetadata:
        try:
            execution_code = WrapperGenerator.generate(
                language=request.language,
                signature=request.signatureMetadata,
                user_code=request.code
            )
        except Exception as e:
            logger.error(f"Wrapper generation failed: {e}")
            raise HTTPException(
                status_code=500,
                detail=f"Wrapper generation failed: {str(e)}"
            )

    single_stdin = request.stdin
    if request.judgeMode == "FUNCTION" and request.stdin:
        parsed_single = parse_assignment_input(str(request.stdin), request.signatureMetadata)
        if parsed_single is not None:
            single_stdin = json.dumps(parsed_single)

    result = await docker_service.execute_code(
        code=execution_code,
        language=request.language,
        stdin=single_stdin,
        timeout_ms=10000,
    )

    await monitor.run_code_completed(
        language=request.language,
        exit_code=result.exitCode,
        duration_ms=result.runtimeMs or 0,
        success=(result.exitCode == 0 and not result.timedOut),
    )

    stdout_out = result.stdout
    if request.judgeMode == "FUNCTION" and request.signatureMetadata:
        actual_output, user_console = parse_batch_segment(result.stdout)
        stdout_out = actual_output

    return {
        "stdout": stdout_out,
        "stderr": result.stderr,
        "exitCode": result.exitCode,
        "timedOut": result.timedOut,
        "runtimeMs": result.runtimeMs,
        "testCaseResults": []
    }



@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "service": "kodechirp-worker",
        "version": "2.0.0",
        "status": "running",
    }
