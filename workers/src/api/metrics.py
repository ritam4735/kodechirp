# workers/src/api/metrics.py
# ─────────────────────────────────────────────────────────────────────────────
# Execution metrics API
# ─────────────────────────────────────────────────────────────────────────────

from fastapi import APIRouter
from src.services.redis_service import redis_service
from src.config import settings

router = APIRouter()


@router.get("/metrics")
async def get_metrics():
    """Get worker execution metrics from Redis queue."""
    redis = redis_service.client
    queue = settings.submission_queue

    waiting = await redis.llen(f"bull:{queue}:wait")
    active = await redis.llen(f"bull:{queue}:active")
    completed = await redis.zcard(f"bull:{queue}:completed")
    failed = await redis.zcard(f"bull:{queue}:failed")

    return {
        "queue": queue,
        "waiting": waiting,
        "active": active,
        "completed": completed,
        "failed": failed,
    }
