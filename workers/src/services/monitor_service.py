# workers/src/services/monitor_service.py
# ─────────────────────────────────────────────────────────────────────────────
# System Monitoring Service — tracks all operations and detects failures
# ─────────────────────────────────────────────────────────────────────────────
#
# Records events to:
#   1. system_events table (persistent audit log)
#   2. In-memory counters (Prometheus-compatible metrics endpoint)
#   3. Structured logs (JSON to stdout)
# ─────────────────────────────────────────────────────────────────────────────

import time
import asyncio
import traceback
from datetime import datetime, timezone
from typing import Optional, Dict, Any
from collections import defaultdict
from dataclasses import dataclass, field

from src.utils.logger import logger


# ── Event Types ──────────────────────────────────────────────────────────────

class EventType:
    """All trackable system event types."""
    # Container lifecycle
    CONTAINER_START       = "container.start"
    CONTAINER_START_FAIL  = "container.start_fail"
    CONTAINER_STOP        = "container.stop"
    CONTAINER_TIMEOUT     = "container.timeout"
    CONTAINER_OOM         = "container.oom"

    # Compilation
    COMPILE_SUCCESS       = "compile.success"
    COMPILE_FAIL          = "compile.fail"
    COMPILE_TIMEOUT       = "compile.timeout"

    # Execution
    EXEC_SUCCESS          = "execution.success"
    EXEC_FAIL             = "execution.fail"
    EXEC_TIMEOUT          = "execution.timeout"
    EXEC_OOM              = "execution.oom"

    # Judging / Evaluation
    JUDGE_ACCEPTED        = "judge.accepted"
    JUDGE_WRONG_ANSWER    = "judge.wrong_answer"
    JUDGE_TLE             = "judge.tle"
    JUDGE_MLE             = "judge.mle"
    JUDGE_RUNTIME_ERROR   = "judge.runtime_error"
    JUDGE_COMPILE_ERROR   = "judge.compile_error"
    JUDGE_INTERNAL_ERROR  = "judge.internal_error"

    # Queue operations
    QUEUE_JOB_RECEIVED    = "queue.job_received"
    QUEUE_JOB_COMPLETED   = "queue.job_completed"
    QUEUE_JOB_FAILED      = "queue.job_failed"
    QUEUE_JOB_RETRIED     = "queue.job_retried"
    QUEUE_JOB_STALLED     = "queue.job_stalled"
    QUEUE_JOB_DEAD        = "queue.job_dead"

    # Service health
    SERVICE_START         = "service.start"
    SERVICE_STOP          = "service.stop"
    SERVICE_HEALTH_CHECK  = "service.health_check"
    SERVICE_DEGRADED      = "service.degraded"
    SERVICE_RECOVERED     = "service.recovered"

    # Run mode (non-judging)
    RUN_CODE_SUCCESS      = "run.success"
    RUN_CODE_FAIL         = "run.fail"

    # Docker proxy
    DOCKER_PROXY_DOWN     = "docker_proxy.down"
    DOCKER_PROXY_UP       = "docker_proxy.up"

    # Wrapper generation
    WRAPPER_SUCCESS       = "wrapper.success"
    WRAPPER_FAIL          = "wrapper.fail"


class Severity:
    DEBUG    = "debug"
    INFO     = "info"
    WARNING  = "warning"
    ERROR    = "error"
    CRITICAL = "critical"


# ── Metrics Counters ────────────────────────────────────────────────────────

@dataclass
class MetricsSnapshot:
    """In-memory metrics counters for the /monitoring/metrics endpoint."""
    event_counts: Dict[str, int] = field(default_factory=lambda: defaultdict(int))
    severity_counts: Dict[str, int] = field(default_factory=lambda: defaultdict(int))
    language_exec_counts: Dict[str, int] = field(default_factory=lambda: defaultdict(int))
    language_exec_durations: Dict[str, list] = field(default_factory=lambda: defaultdict(list))
    total_exec_time_ms: int = 0
    total_executions: int = 0
    total_failures: int = 0
    started_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    last_event_at: Optional[str] = None


class MonitorService:
    """
    Centralized monitoring service.

    Tracks every significant operation in the system,
    writes events to the system_events table,
    and maintains in-memory metrics for real-time dashboards.
    """

    def __init__(self):
        self._metrics = MetricsSnapshot()
        self._db_pool = None
        self._write_queue: asyncio.Queue = asyncio.Queue(maxsize=10000)
        self._writer_task: Optional[asyncio.Task] = None
        self._running = False

    async def start(self, db_pool):
        """Initialize the monitor with a database connection pool."""
        self._db_pool = db_pool
        self._running = True
        self._writer_task = asyncio.create_task(self._db_writer_loop())
        logger.info("MonitorService started — event writer active")

    async def stop(self):
        """Gracefully shut down the monitor, flushing pending events."""
        self._running = False
        if self._writer_task:
            # Signal writer to flush remaining events
            await self._write_queue.put(None)  # sentinel
            try:
                await asyncio.wait_for(self._writer_task, timeout=5.0)
            except asyncio.TimeoutError:
                self._writer_task.cancel()
        logger.info("MonitorService stopped")

    # ── Public API: Record Events ────────────────────────────────────────

    async def record(
        self,
        event_type: str,
        severity: str,
        service: str,
        message: str,
        component: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
        submission_id: Optional[str] = None,
        user_id: Optional[str] = None,
        duration_ms: Optional[int] = None,
        ip_address: Optional[str] = None,
    ):
        """
        Record a system event.

        This is non-blocking — events are queued for async DB writes
        so monitoring never slows down the main execution path.
        """
        now = datetime.now(timezone.utc).isoformat()

        # Update in-memory metrics (always, even if DB write fails)
        self._metrics.event_counts[event_type] += 1
        self._metrics.severity_counts[severity] += 1
        self._metrics.last_event_at = now

        if duration_ms is not None:
            self._metrics.total_exec_time_ms += duration_ms
            self._metrics.total_executions += 1

        if severity in (Severity.ERROR, Severity.CRITICAL):
            self._metrics.total_failures += 1

        # Extract language from metadata for per-language tracking
        lang = (metadata or {}).get("language")
        if lang and duration_ms is not None:
            self._metrics.language_exec_counts[lang] += 1
            durations = self._metrics.language_exec_durations[lang]
            durations.append(duration_ms)
            # Keep only last 1000 durations per language to bound memory
            if len(durations) > 1000:
                self._metrics.language_exec_durations[lang] = durations[-500:]

        # Log the event
        log_fn = logger.info
        if severity == Severity.WARNING:
            log_fn = logger.warning
        elif severity in (Severity.ERROR, Severity.CRITICAL):
            log_fn = logger.error

        log_fn(f"[MONITOR] [{event_type}] {message}")

        # Queue for async DB write
        event = {
            "event_type": event_type,
            "severity": severity,
            "service": service,
            "component": component,
            "message": message,
            "metadata": metadata or {},
            "submission_id": submission_id,
            "user_id": user_id,
            "duration_ms": duration_ms,
            "ip_address": ip_address,
        }

        try:
            self._write_queue.put_nowait(event)
        except asyncio.QueueFull:
            # Drop oldest if queue is full (backpressure)
            logger.warning("[MONITOR] Event write queue full, dropping oldest event")
            try:
                self._write_queue.get_nowait()
                self._write_queue.put_nowait(event)
            except asyncio.QueueEmpty:
                pass

    # ── Convenience Methods ──────────────────────────────────────────────

    async def container_started(self, container_name: str, language: str, submission_id: str = None, duration_ms: int = None):
        await self.record(
            EventType.CONTAINER_START, Severity.INFO, "worker",
            f"Container {container_name} started for {language}",
            component="docker_service",
            metadata={"container_name": container_name, "language": language},
            submission_id=submission_id, duration_ms=duration_ms,
        )

    async def container_start_failed(self, error: str, language: str, submission_id: str = None):
        await self.record(
            EventType.CONTAINER_START_FAIL, Severity.ERROR, "worker",
            f"Failed to start sandbox container: {error}",
            component="docker_service",
            metadata={"error": error, "language": language},
            submission_id=submission_id,
        )

    async def execution_completed(self, language: str, exit_code: int, duration_ms: int, submission_id: str = None):
        is_success = exit_code == 0
        await self.record(
            EventType.EXEC_SUCCESS if is_success else EventType.EXEC_FAIL,
            Severity.INFO if is_success else Severity.WARNING,
            "worker",
            f"Execution {'succeeded' if is_success else 'failed'} ({language}, exit={exit_code}, {duration_ms}ms)",
            component="docker_service",
            metadata={"language": language, "exit_code": exit_code},
            submission_id=submission_id, duration_ms=duration_ms,
        )

    async def execution_timeout(self, language: str, duration_ms: int, submission_id: str = None):
        await self.record(
            EventType.EXEC_TIMEOUT, Severity.WARNING, "worker",
            f"Execution timed out ({language}, {duration_ms}ms)",
            component="docker_service",
            metadata={"language": language},
            submission_id=submission_id, duration_ms=duration_ms,
        )

    async def execution_oom(self, language: str, submission_id: str = None):
        await self.record(
            EventType.EXEC_OOM, Severity.WARNING, "worker",
            f"Execution out of memory ({language})",
            component="docker_service",
            metadata={"language": language},
            submission_id=submission_id,
        )

    async def compile_completed(self, language: str, exit_code: int, duration_ms: int, submission_id: str = None):
        is_success = exit_code == 0
        await self.record(
            EventType.COMPILE_SUCCESS if is_success else EventType.COMPILE_FAIL,
            Severity.INFO if is_success else Severity.INFO,  # compile errors are user errors, not system errors
            "worker",
            f"Compilation {'succeeded' if is_success else 'failed'} ({language}, {duration_ms}ms)",
            component="docker_service",
            metadata={"language": language, "exit_code": exit_code},
            submission_id=submission_id, duration_ms=duration_ms,
        )

    async def judge_verdict(self, verdict: str, submission_id: str, language: str, passed: int, total: int, duration_ms: int = None):
        event_map = {
            "Accepted": (EventType.JUDGE_ACCEPTED, Severity.INFO),
            "Wrong Answer": (EventType.JUDGE_WRONG_ANSWER, Severity.INFO),
            "Time Limit Exceeded": (EventType.JUDGE_TLE, Severity.WARNING),
            "Memory Limit Exceeded": (EventType.JUDGE_MLE, Severity.WARNING),
            "Runtime Error": (EventType.JUDGE_RUNTIME_ERROR, Severity.WARNING),
            "Compilation Error": (EventType.JUDGE_COMPILE_ERROR, Severity.INFO),
            "Internal Error": (EventType.JUDGE_INTERNAL_ERROR, Severity.ERROR),
        }
        event_type, sev = event_map.get(verdict, (EventType.JUDGE_INTERNAL_ERROR, Severity.ERROR))
        await self.record(
            event_type, sev, "worker",
            f"Judge verdict: {verdict} ({passed}/{total}) for submission {submission_id}",
            component="evaluator",
            metadata={"verdict": verdict, "language": language, "passed": passed, "total": total},
            submission_id=submission_id, duration_ms=duration_ms,
        )

    async def queue_job_received(self, job_id: str, submission_id: str):
        await self.record(
            EventType.QUEUE_JOB_RECEIVED, Severity.INFO, "worker",
            f"Job {job_id} received (submission={submission_id})",
            component="consumer",
            submission_id=submission_id,
            metadata={"job_id": job_id},
        )

    async def queue_job_completed(self, job_id: str, submission_id: str, duration_ms: int = None):
        await self.record(
            EventType.QUEUE_JOB_COMPLETED, Severity.INFO, "worker",
            f"Job {job_id} completed (submission={submission_id})",
            component="consumer",
            submission_id=submission_id, duration_ms=duration_ms,
            metadata={"job_id": job_id},
        )

    async def queue_job_failed(self, job_id: str, error: str, attempt: int, max_retries: int):
        await self.record(
            EventType.QUEUE_JOB_FAILED, Severity.ERROR, "worker",
            f"Job {job_id} failed (attempt {attempt}/{max_retries}): {error[:200]}",
            component="consumer",
            metadata={"job_id": job_id, "error": error[:500], "attempt": attempt, "max_retries": max_retries},
        )

    async def queue_job_retried(self, job_id: str, attempt: int, max_retries: int):
        await self.record(
            EventType.QUEUE_JOB_RETRIED, Severity.WARNING, "worker",
            f"Job {job_id} retried (attempt {attempt}/{max_retries})",
            component="consumer",
            metadata={"job_id": job_id, "attempt": attempt},
        )

    async def queue_job_stalled(self, job_id: str):
        await self.record(
            EventType.QUEUE_JOB_STALLED, Severity.ERROR, "worker",
            f"Stalled job {job_id} detected",
            component="consumer",
            metadata={"job_id": job_id},
        )

    async def queue_job_dead(self, job_id: str, submission_id: str, error: str):
        await self.record(
            EventType.QUEUE_JOB_DEAD, Severity.CRITICAL, "worker",
            f"Job {job_id} permanently failed (dead letter)",
            component="consumer",
            submission_id=submission_id,
            metadata={"job_id": job_id, "error": error[:500]},
        )

    async def run_code_completed(self, language: str, exit_code: int, duration_ms: int, success: bool):
        await self.record(
            EventType.RUN_CODE_SUCCESS if success else EventType.RUN_CODE_FAIL,
            Severity.INFO if success else Severity.WARNING,
            "worker",
            f"Run code {'succeeded' if success else 'failed'} ({language}, {duration_ms}ms)",
            component="main",
            metadata={"language": language, "exit_code": exit_code},
            duration_ms=duration_ms,
        )

    async def service_started(self):
        await self.record(
            EventType.SERVICE_START, Severity.INFO, "worker",
            "KodeChirp Worker service started",
            component="main",
        )

    async def service_stopped(self):
        await self.record(
            EventType.SERVICE_STOP, Severity.INFO, "worker",
            "KodeChirp Worker service stopped",
            component="main",
        )

    async def wrapper_generated(self, language: str, mode: str, submission_id: str = None):
        await self.record(
            EventType.WRAPPER_SUCCESS, Severity.INFO, "worker",
            f"Wrapper generated ({language}, mode={mode})",
            component="wrapper_generator",
            metadata={"language": language, "mode": mode},
            submission_id=submission_id,
        )

    async def wrapper_failed(self, language: str, error: str, submission_id: str = None):
        await self.record(
            EventType.WRAPPER_FAIL, Severity.ERROR, "worker",
            f"Wrapper generation failed ({language}): {error[:200]}",
            component="wrapper_generator",
            metadata={"language": language, "error": error[:500]},
            submission_id=submission_id,
        )

    # ── Metrics Snapshot ─────────────────────────────────────────────────

    def get_metrics(self) -> Dict[str, Any]:
        """Return current metrics snapshot for the /monitoring/metrics endpoint."""
        m = self._metrics
        avg_exec = (m.total_exec_time_ms / m.total_executions) if m.total_executions > 0 else 0

        # Calculate per-language p50/p99
        lang_stats = {}
        for lang, durations in m.language_exec_durations.items():
            if durations:
                sorted_d = sorted(durations)
                p50 = sorted_d[len(sorted_d) // 2]
                p99 = sorted_d[int(len(sorted_d) * 0.99)]
                lang_stats[lang] = {
                    "count": m.language_exec_counts[lang],
                    "p50_ms": p50,
                    "p99_ms": p99,
                    "avg_ms": sum(durations) // len(durations),
                }

        return {
            "uptime_since": m.started_at,
            "last_event_at": m.last_event_at,
            "total_events": sum(m.event_counts.values()),
            "total_executions": m.total_executions,
            "total_failures": m.total_failures,
            "avg_execution_ms": round(avg_exec, 2),
            "event_counts": dict(m.event_counts),
            "severity_counts": dict(m.severity_counts),
            "language_stats": lang_stats,
        }

    # ── DB Writer Loop ───────────────────────────────────────────────────

    async def _db_writer_loop(self):
        """Background loop that batches event writes to PostgreSQL."""
        batch = []
        BATCH_SIZE = 50
        FLUSH_INTERVAL = 2.0  # seconds

        while self._running or not self._write_queue.empty():
            try:
                # Collect events with timeout
                try:
                    event = await asyncio.wait_for(
                        self._write_queue.get(), timeout=FLUSH_INTERVAL
                    )
                    if event is None:  # sentinel for shutdown
                        break
                    batch.append(event)
                except asyncio.TimeoutError:
                    pass

                # Drain more if available
                while not self._write_queue.empty() and len(batch) < BATCH_SIZE:
                    event = self._write_queue.get_nowait()
                    if event is None:
                        break
                    batch.append(event)

                # Flush batch
                if batch and self._db_pool:
                    await self._flush_batch(batch)
                    batch = []

            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"[MONITOR] DB writer error: {e}")
                await asyncio.sleep(1)

        # Final flush
        if batch and self._db_pool:
            await self._flush_batch(batch)

    async def _flush_batch(self, batch: list):
        """Write a batch of events to the system_events table."""
        import json
        try:
            async with self._db_pool.acquire() as conn:
                # Use a prepared statement for batch inserts
                await conn.executemany(
                    """INSERT INTO system_events
                       (event_type, severity, service, component, message, metadata,
                        submission_id, user_id, duration_ms, ip_address)
                       VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::uuid, $8::uuid, $9, $10::inet)""",
                    [
                        (
                            e["event_type"],
                            e["severity"],
                            e["service"],
                            e["component"],
                            e["message"],
                            json.dumps(e["metadata"]),
                            e["submission_id"],
                            e["user_id"],
                            e["duration_ms"],
                            e["ip_address"],
                        )
                        for e in batch
                    ],
                )
            logger.debug(f"[MONITOR] Flushed {len(batch)} events to system_events")
        except Exception as e:
            logger.error(f"[MONITOR] Failed to flush {len(batch)} events: {e}")


# Singleton
monitor = MonitorService()
