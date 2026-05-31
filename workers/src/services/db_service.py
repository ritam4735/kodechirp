# workers/src/services/db_service.py
# ─────────────────────────────────────────────────────────────────────────────
# Async PostgreSQL service for the worker
# ─────────────────────────────────────────────────────────────────────────────

import asyncpg
from src.config import settings
from src.utils.logger import logger


class DatabaseService:
    """Async PostgreSQL connection pool."""

    def __init__(self):
        self._pool: asyncpg.Pool | None = None

    async def connect(self):
        """Create connection pool."""
        # Convert postgresql:// to postgresql:// for asyncpg
        dsn = settings.database_url
        self._pool = await asyncpg.create_pool(
            dsn=dsn,
            min_size=2,
            max_size=10,
            command_timeout=30,
        )
        logger.info("PostgreSQL pool created")

    async def close(self):
        """Close connection pool."""
        if self._pool:
            await self._pool.close()
            logger.info("PostgreSQL pool closed")

    @property
    def pool(self) -> asyncpg.Pool:
        if not self._pool:
            raise RuntimeError("Database not connected")
        return self._pool

    async def update_submission_status(
        self,
        submission_id: str,
        status: str,
        **kwargs,
    ):
        """Update a submission record."""
        try:
            fields = ["status = $2"]
            values = [submission_id, status]
            param_idx = 3

            field_map = {
                "runtime_ms": "runtime_ms",
                "memory_kb": "memory_kb",
                "test_cases_passed": "test_cases_passed",
                "worker_id": "worker_id",
                "error_message": "error_message",
                "failed_test_input": "failed_test_input",
                "failed_test_expected": "failed_test_expected",
                "failed_test_actual": "failed_test_actual",
            }

            for key, col in field_map.items():
                if key in kwargs and kwargs[key] is not None:
                    fields.append(f"{col} = ${param_idx}")
                    values.append(kwargs[key])
                    param_idx += 1

            if status in ("running",):
                fields.append(f"started_at = NOW()")
            elif status not in ("queued",):
                fields.append(f"completed_at = NOW()")

            query = f"UPDATE submissions SET {', '.join(fields)} WHERE id = $1"
            await self._pool.execute(query, *values)

        except Exception as e:
            logger.error(f"Failed to update submission {submission_id}: {e}")

    async def save_execution_metric(
        self,
        submission_id: str,
        test_case_id: str | None,
        test_index: int,
        runtime_ms: int | None,
        memory_kb: int | None,
        exit_code: int,
        status: str,
        stdout_preview: str = "",
        stderr_preview: str = "",
    ):
        """Save per-test-case execution metrics."""
        try:
            await self._pool.execute(
                """INSERT INTO execution_metrics
                   (submission_id, test_case_id, test_index,
                    runtime_ms, memory_kb, exit_code, status,
                    stdout_preview, stderr_preview)
                   VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)""",
                submission_id,
                test_case_id,
                test_index,
                runtime_ms,
                memory_kb,
                exit_code,
                status,
                stdout_preview[:500] if stdout_preview else "",
                stderr_preview[:500] if stderr_preview else "",
            )
        except Exception as e:
            logger.error(f"Failed to save execution metric: {e}")


# Singleton instance
db_service = DatabaseService()
