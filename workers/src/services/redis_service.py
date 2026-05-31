# workers/src/services/redis_service.py
# ─────────────────────────────────────────────────────────────────────────────
# Redis service for queue operations and pub/sub
# ─────────────────────────────────────────────────────────────────────────────

import json
import redis.asyncio as aioredis
from src.config import settings
from src.utils.logger import logger


class RedisService:
    """Manages Redis connections for queue consumption and result publishing."""

    def __init__(self):
        self._client: aioredis.Redis | None = None
        self._publisher: aioredis.Redis | None = None

    async def connect(self):
        """Initialize Redis connections."""
        self._client = aioredis.from_url(
            settings.redis_url,
            decode_responses=True,
            max_connections=10,
        )
        self._publisher = aioredis.from_url(
            settings.redis_url,
            decode_responses=True,
            max_connections=5,
        )
        await self._client.ping()
        logger.info("Redis connected successfully")

    async def close(self):
        """Close all Redis connections."""
        if self._client:
            await self._client.close()
        if self._publisher:
            await self._publisher.close()
        logger.info("Redis connections closed")

    @property
    def client(self) -> aioredis.Redis:
        if not self._client:
            raise RuntimeError("Redis not connected")
        return self._client

    async def publish_result(self, result: dict):
        """Publish an execution result to the results channel."""
        try:
            message = json.dumps(result)
            await self._publisher.publish(settings.result_channel, message)
            logger.info(
                f"Published result for submission {result.get('submissionId')} "
                f"to channel {settings.result_channel}"
            )
        except Exception as e:
            logger.error(f"Failed to publish result: {e}")
            raise

    async def publish_progress(self, data: dict):
        """Publish a progress update."""
        try:
            message = json.dumps(data)
            await self._publisher.publish(settings.progress_channel, message)
        except Exception as e:
            logger.error(f"Failed to publish progress: {e}")


# Singleton instance
redis_service = RedisService()
