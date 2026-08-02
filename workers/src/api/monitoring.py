# workers/src/api/monitoring.py
# ─────────────────────────────────────────────────────────────────────────────
# Monitoring & System Events API
# ─────────────────────────────────────────────────────────────────────────────

from fastapi import APIRouter, Query
from typing import Optional

from src.services.monitor_service import monitor
from src.services.redis_service import redis_service
from src.services.db_service import db_service
from src.config import settings

router = APIRouter(prefix="/monitoring", tags=["Monitoring"])


@router.get("/metrics")
async def get_monitoring_metrics():
    """
    Real-time system metrics — in-memory counters, execution stats,
    per-language performance, and failure rates.
    """
    metrics = monitor.get_metrics()

    # Add queue depth
    redis = redis_service.client
    queue = settings.submission_queue
    try:
        metrics["queue"] = {
            "waiting": await redis.llen(f"bull:{queue}:wait"),
            "active": await redis.llen(f"bull:{queue}:active"),
            "completed": await redis.zcard(f"bull:{queue}:completed"),
            "failed": await redis.zcard(f"bull:{queue}:failed"),
        }
    except Exception:
        metrics["queue"] = {"error": "Redis unavailable"}

    return metrics


@router.get("/events")
async def get_system_events(
    event_type: Optional[str] = Query(None, description="Filter by event type"),
    severity: Optional[str] = Query(None, description="Filter by severity (debug, info, warning, error, critical)"),
    service: Optional[str] = Query(None, description="Filter by service name"),
    submission_id: Optional[str] = Query(None, description="Filter by submission ID"),
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
):
    """
    Query persisted system events from the database.
    Supports filtering by event_type, severity, service, and submission_id.
    """
    conditions = []
    params = []
    param_idx = 1

    if event_type:
        conditions.append(f"event_type = ${param_idx}")
        params.append(event_type)
        param_idx += 1

    if severity:
        conditions.append(f"severity = ${param_idx}")
        params.append(severity)
        param_idx += 1

    if service:
        conditions.append(f"service = ${param_idx}")
        params.append(service)
        param_idx += 1

    if submission_id:
        conditions.append(f"submission_id = ${param_idx}::uuid")
        params.append(submission_id)
        param_idx += 1

    where_clause = ""
    if conditions:
        where_clause = "WHERE " + " AND ".join(conditions)

    query = f"""
        SELECT id, event_type, severity, service, component, message,
               metadata, submission_id, user_id, duration_ms, ip_address,
               created_at
        FROM system_events
        {where_clause}
        ORDER BY created_at DESC
        LIMIT ${param_idx} OFFSET ${param_idx + 1}
    """
    params.extend([limit, offset])

    count_query = f"SELECT COUNT(*) FROM system_events {where_clause}"
    count_params = params[:-2]  # exclude limit and offset

    try:
        async with db_service.pool.acquire() as conn:
            rows = await conn.fetch(query, *params)
            total = await conn.fetchval(count_query, *count_params)

        events = []
        for row in rows:
            events.append({
                "id": str(row["id"]),
                "event_type": row["event_type"],
                "severity": row["severity"],
                "service": row["service"],
                "component": row["component"],
                "message": row["message"],
                "metadata": row["metadata"],
                "submission_id": str(row["submission_id"]) if row["submission_id"] else None,
                "user_id": str(row["user_id"]) if row["user_id"] else None,
                "duration_ms": row["duration_ms"],
                "ip_address": str(row["ip_address"]) if row["ip_address"] else None,
                "created_at": row["created_at"].isoformat() if row["created_at"] else None,
            })

        return {
            "total": total,
            "limit": limit,
            "offset": offset,
            "events": events,
        }
    except Exception as e:
        return {"error": str(e), "events": []}


@router.get("/health/deep")
async def deep_health_check():
    """
    Deep health check — verifies all dependencies and reports
    system-wide status including recent error rates.
    """
    checks = {}
    overall_status = "healthy"

    # Redis
    try:
        start = __import__("time").monotonic()
        await redis_service.client.ping()
        latency = int((__import__("time").monotonic() - start) * 1000)
        checks["redis"] = {"status": "ok", "latency_ms": latency}
    except Exception as e:
        checks["redis"] = {"status": "error", "error": str(e)}
        overall_status = "degraded"

    # Database
    try:
        start = __import__("time").monotonic()
        await db_service.pool.execute("SELECT 1")
        latency = int((__import__("time").monotonic() - start) * 1000)
        checks["database"] = {"status": "ok", "latency_ms": latency}
    except Exception as e:
        checks["database"] = {"status": "error", "error": str(e)}
        overall_status = "degraded"

    # Docker connectivity
    try:
        import asyncio
        proc = await asyncio.create_subprocess_exec(
            "docker", "info", "--format", "{{.ServerVersion}}",
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=5.0)
        if proc.returncode == 0:
            checks["docker"] = {"status": "ok", "version": stdout.decode().strip()}
        else:
            checks["docker"] = {"status": "error", "error": stderr.decode().strip()}
            overall_status = "critical"
    except Exception as e:
        checks["docker"] = {"status": "error", "error": str(e)}
        overall_status = "critical"

    # Recent error rate (last 5 minutes)
    metrics = monitor.get_metrics()
    error_count = metrics["severity_counts"].get("error", 0) + metrics["severity_counts"].get("critical", 0)
    total_events = metrics["total_events"]
    error_rate = (error_count / total_events * 100) if total_events > 0 else 0

    if error_rate > 25:
        overall_status = "degraded"
    if error_rate > 50:
        overall_status = "critical"

    checks["error_rate"] = {
        "status": "ok" if error_rate < 10 else ("warning" if error_rate < 25 else "critical"),
        "error_rate_pct": round(error_rate, 2),
        "total_errors": error_count,
        "total_events": total_events,
    }

    return {
        "status": overall_status,
        "service": "kodechirp-worker",
        "checks": checks,
        "metrics_summary": {
            "total_executions": metrics["total_executions"],
            "total_failures": metrics["total_failures"],
            "avg_execution_ms": metrics["avg_execution_ms"],
        },
    }


@router.get("/summary")
async def monitoring_summary():
    """
    High-level monitoring summary — recent event counts by type and severity.
    Pulls from the database for the last hour.
    """
    try:
        async with db_service.pool.acquire() as conn:
            # Events by type in last hour
            type_counts = await conn.fetch("""
                SELECT event_type, COUNT(*) as count
                FROM system_events
                WHERE created_at > NOW() - INTERVAL '1 hour'
                GROUP BY event_type
                ORDER BY count DESC
            """)

            # Events by severity in last hour
            severity_counts = await conn.fetch("""
                SELECT severity, COUNT(*) as count
                FROM system_events
                WHERE created_at > NOW() - INTERVAL '1 hour'
                GROUP BY severity
                ORDER BY count DESC
            """)

            # Recent critical/error events
            recent_errors = await conn.fetch("""
                SELECT id, event_type, severity, service, component, message,
                       submission_id, duration_ms, created_at
                FROM system_events
                WHERE severity IN ('error', 'critical')
                  AND created_at > NOW() - INTERVAL '1 hour'
                ORDER BY created_at DESC
                LIMIT 20
            """)

            # Execution performance in last hour
            exec_stats = await conn.fetchrow("""
                SELECT
                    COUNT(*) as total,
                    COUNT(*) FILTER (WHERE event_type LIKE 'execution.%') as executions,
                    AVG(duration_ms) FILTER (WHERE duration_ms IS NOT NULL) as avg_duration,
                    MAX(duration_ms) FILTER (WHERE duration_ms IS NOT NULL) as max_duration,
                    COUNT(*) FILTER (WHERE severity IN ('error', 'critical')) as errors
                FROM system_events
                WHERE created_at > NOW() - INTERVAL '1 hour'
            """)

        return {
            "period": "last_1_hour",
            "event_counts_by_type": {r["event_type"]: r["count"] for r in type_counts},
            "event_counts_by_severity": {r["severity"]: r["count"] for r in severity_counts},
            "recent_errors": [
                {
                    "id": str(r["id"]),
                    "event_type": r["event_type"],
                    "severity": r["severity"],
                    "service": r["service"],
                    "component": r["component"],
                    "message": r["message"],
                    "submission_id": str(r["submission_id"]) if r["submission_id"] else None,
                    "duration_ms": r["duration_ms"],
                    "created_at": r["created_at"].isoformat(),
                }
                for r in recent_errors
            ],
            "performance": {
                "total_events": exec_stats["total"] if exec_stats else 0,
                "total_executions": exec_stats["executions"] if exec_stats else 0,
                "avg_duration_ms": round(float(exec_stats["avg_duration"] or 0), 2) if exec_stats else 0,
                "max_duration_ms": exec_stats["max_duration"] if exec_stats else 0,
                "total_errors": exec_stats["errors"] if exec_stats else 0,
            },
        }
    except Exception as e:
        return {"error": str(e)}
