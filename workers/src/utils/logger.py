# workers/src/utils/logger.py
# ─────────────────────────────────────────────────────────────────────────────
# Structured logging for Python worker
# ─────────────────────────────────────────────────────────────────────────────

import logging
import sys
from pythonjsonlogger import json as jsonlogger


def get_logger(name: str = "kodechirp-worker") -> logging.Logger:
    """Get a structured JSON logger."""
    logger = logging.getLogger(name)

    if not logger.handlers:
        handler = logging.StreamHandler(sys.stdout)
        formatter = jsonlogger.JsonFormatter(
            fmt="%(asctime)s %(name)s %(levelname)s %(message)s",
            datefmt="%Y-%m-%dT%H:%M:%S",
        )
        handler.setFormatter(formatter)
        logger.addHandler(handler)
        logger.setLevel(logging.INFO)

    return logger


logger = get_logger()
