# workers/src/utils/sanitizer.py
# ─────────────────────────────────────────────────────────────────────────────
# Output sanitization for Docker sandbox output
# ─────────────────────────────────────────────────────────────────────────────

import re

# Patterns to strip from output
NOISE_PATTERNS = [
    re.compile(r"Emulate Docker CLI using podman\. Create /etc/containers/nodocker to quiet msg\.\s*"),
    re.compile(r"WARN\[.*?\].*?\n?"),
]


def sanitize_output(text: str) -> str:
    """Remove Docker/Podman noise from execution output."""
    if not text:
        return ""
    result = text
    for pattern in NOISE_PATTERNS:
        result = pattern.sub("", result)
    return result.strip()


def normalise_output(text: str) -> str:
    """Normalise output for comparison (trim, collapse whitespace)."""
    if not text:
        return ""
    result = text.strip()
    result = result.replace("\r\n", "\n")
    result = re.sub(r" +\n", "\n", result)
    result = re.sub(r"\n +", "\n", result)
    return result


def truncate(text: str, max_length: int = 500) -> str:
    """Truncate text for storage."""
    if not text or len(text) <= max_length:
        return text or ""
    return text[:max_length] + "..."
