# workers/src/api/health.py
# ─────────────────────────────────────────────────────────────────────────────
# Worker health check endpoints
# ─────────────────────────────────────────────────────────────────────────────

from fastapi import APIRouter
from src.services.redis_service import redis_service
from src.services.db_service import db_service

router = APIRouter()


@router.get("/health")
async def health_check():
    """Basic health check."""
    return {
        "status": "ok",
        "service": "kodechirp-worker",
    }


@router.get("/health/detailed")
async def detailed_health():
    """Detailed health check with dependency status."""
    checks = {}

    # Redis
    try:
        await redis_service.client.ping()
        checks["redis"] = {"status": "ok"}
    except Exception as e:
        checks["redis"] = {"status": "error", "error": str(e)}

    # Database
    try:
        await db_service.pool.execute("SELECT 1")
        checks["database"] = {"status": "ok"}
    except Exception as e:
        checks["database"] = {"status": "error", "error": str(e)}

    all_ok = all(c["status"] == "ok" for c in checks.values())

    return {
        "status": "healthy" if all_ok else "degraded",
        "service": "kodechirp-worker",
        "checks": checks,
    }
