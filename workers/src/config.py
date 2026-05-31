# workers/src/config.py
# ─────────────────────────────────────────────────────────────────────────────
# Worker configuration from environment variables
# ─────────────────────────────────────────────────────────────────────────────

from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    """Worker service configuration."""

    # Redis
    redis_url: str = "redis://localhost:6379"

    # Database
    database_url: str = "postgresql://kodechirp:kodechirp_dev@localhost:5432/kodechirp"

    # Worker
    worker_concurrency: int = 4
    execution_timeout: int = 10  # seconds
    max_retries: int = 3

    # Queue
    submission_queue: str = "kodechirp:submissions"
    result_channel: str = "kodechirp:results"
    progress_channel: str = "kodechirp:progress"

    # Docker
    docker_host: Optional[str] = None

    # Sandbox defaults
    default_memory_limit: str = "64m"
    default_cpu_limit: float = 0.5
    default_tmpfs_size: str = "16m"

    class Config:
        env_file = ".env"
        case_sensitive = False


settings = Settings()
