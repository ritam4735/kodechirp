# workers/src/services/docker_service.py
# ─────────────────────────────────────────────────────────────────────────────
# Docker SDK service for sandbox container lifecycle management
# ─────────────────────────────────────────────────────────────────────────────

import os
import uuid
import time
import asyncio
import tempfile
import shutil
from pathlib import Path
from typing import Optional

from src.config import settings
from src.utils.logger import logger
from src.utils.constants import LANGUAGE_CONFIG
from src.utils.sanitizer import sanitize_output
from src.models.submission import ExecutionResult


class DockerService:
    """Manages Docker sandbox container execution."""

    def __init__(self):
        self._tmp_base = Path("/tmp/kodechirp")
        self._tmp_base.mkdir(parents=True, exist_ok=True)

    async def execute_code(
        self,
        code: str,
        language: str,
        stdin: str = "",
        timeout_ms: int = 5000,
        memory_mb: int = 256,
    ) -> ExecutionResult:
        """
        Execute code inside a Docker sandbox container.

        Creates an isolated container with:
        - No network access
        - Memory and CPU limits
        - Read-only root filesystem
        - Non-root user
        - Temporary filesystem for compilation
        - Automatic cleanup
        """
        config = LANGUAGE_CONFIG.get(language)
        if not config:
            return ExecutionResult(
                stderr=f"Unsupported language: {language}",
                exitCode=-1,
            )

        # Create isolated temp directory for this execution
        run_id = str(uuid.uuid4())
        run_dir = self._tmp_base / f"kc_run_{run_id}"
        run_dir.mkdir(parents=True, exist_ok=True)
        os.chmod(str(run_dir), 0o777)

        # Write source file
        src_filename = f"main.{config['extension']}"
        if language == "java":
            src_filename = "Main.java"
        src_path = run_dir / src_filename
        src_path.write_text(code, encoding="utf-8")
        os.chmod(str(src_path), 0o666)

        try:
            # Build Docker command
            timeout_s = min(timeout_ms / 1000, config["timeout"])
            docker_timeout = timeout_s + 5  # Extra buffer for container startup

            docker_args = [
                "docker", "run",
                "--rm",
                "-i",
                "--network=none",
                f"--memory={config.get('memory', f'{memory_mb}m')}",
                f"--cpus={config['cpus']}",
                "--pids-limit=64",
                "--cap-drop=ALL",
                "--security-opt=no-new-privileges",
                "--read-only",
                "--tmpfs", f"/tmp:size={config['tmpfs_size']},exec",
                "--user", "sandbox",
                "-v", f"{run_dir}:/app:Z",
                "-w", "/app",
                config["image"],
                "sh", "-c", config["run_command"],
            ]

            # Execute
            start_time = time.monotonic()

            proc = await asyncio.create_subprocess_exec(
                *docker_args,
                stdin=asyncio.subprocess.PIPE,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )

            try:
                stdout_bytes, stderr_bytes = await asyncio.wait_for(
                    proc.communicate(input=stdin.encode("utf-8") if stdin else None),
                    timeout=docker_timeout,
                )
            except asyncio.TimeoutError:
                proc.kill()
                await proc.wait()
                elapsed_ms = int((time.monotonic() - start_time) * 1000)
                return ExecutionResult(
                    stdout="",
                    stderr="Time Limit Exceeded",
                    exitCode=-1,
                    timedOut=True,
                    runtimeMs=elapsed_ms,
                )

            elapsed_ms = int((time.monotonic() - start_time) * 1000)

            stdout = sanitize_output(stdout_bytes.decode("utf-8", errors="replace"))
            stderr = sanitize_output(stderr_bytes.decode("utf-8", errors="replace"))

            return ExecutionResult(
                stdout=stdout,
                stderr=stderr,
                exitCode=proc.returncode or 0,
                timedOut=False,
                runtimeMs=elapsed_ms,
            )

        except Exception as e:
            logger.error(f"Docker execution error: {e}")
            return ExecutionResult(
                stderr=f"Execution error: {str(e)}",
                exitCode=-1,
            )
        finally:
            # Cleanup
            try:
                shutil.rmtree(str(run_dir), ignore_errors=True)
            except Exception:
                pass


# Singleton instance
docker_service = DockerService()
