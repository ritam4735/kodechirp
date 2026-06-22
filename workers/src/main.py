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
from src.worker.consumer import QueueConsumer
from src.api.health import router as health_router
from src.api.metrics import router as metrics_router
from src.models.submission import RunCodeRequest
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


@app.post("/api/execute")
async def execute_code(request: RunCodeRequest):
    """
    Synchronous code execution endpoint.
    Used by the "Run Code" button — NOT for judging.

    Executes code in a Docker sandbox and returns raw output.
    """
    from src.utils.constants import LANGUAGE_CONFIG
    from src.worker.wrapper_generator import WrapperGenerator

    if request.language not in LANGUAGE_CONFIG:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported language: {request.language}. "
                   f"Supported: {', '.join(LANGUAGE_CONFIG.keys())}",
        )

    execution_code = request.code
    
    if request.judgeMode in ("FUNCTION", "CLASS") and request.signatureMetadata:
        try:
            execution_code = WrapperGenerator.generate(
                language=request.language,
                signature=request.signatureMetadata,
                user_code=request.code
            )
            logger.info(f"Generated wrapper source code:\n{execution_code}")
        except Exception as e:
            logger.error(f"Wrapper generation failed: {e}")
            raise HTTPException(
                status_code=500,
                detail=f"Wrapper generation failed: {str(e)}"
            )

    result = await docker_service.execute_code(
        code=execution_code,
        language=request.language,
        stdin=request.stdin,
        timeout_ms=10000,  # 10s max for run mode
    )

    logger.info(f"Raw stdout returned by sandbox:\n{result.stdout}")
    logger.info(f"Raw stderr returned by sandbox:\n{result.stderr}")
    logger.info(f"Raw verification result returned by worker: exitCode={result.exitCode}, timedOut={result.timedOut}")

    return {
        "stdout": result.stdout,
        "stderr": result.stderr,
        "exitCode": result.exitCode,
        "timedOut": result.timedOut,
        "runtimeMs": result.runtimeMs,
    }


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "service": "kodechirp-worker",
        "version": "2.0.0",
        "status": "running",
    }
