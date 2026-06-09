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
        submission_id: str,
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
        container_name = f"judge-submission-{submission_id}"
        run_dir = self._tmp_base / f"{container_name}_{uuid.uuid4().hex[:8]}"
        run_dir.mkdir(parents=True, exist_ok=True)
        os.chmod(str(run_dir), 0o777)

        # Write source file
        src_filename = f"main.{config['extension']}"
        if language == "java":
            src_filename = "Main.java"
        src_path = run_dir / src_filename
        src_path.write_text(code, encoding="utf-8")
        os.chmod(str(src_path), 0o666)

        # Copy mem_wrapper
        mem_wrapper_src = Path(__file__).parent.parent / "utils" / "mem_wrapper"
        if mem_wrapper_src.exists():
            mem_wrapper_dst = run_dir / "mem_wrapper"
            shutil.copy2(mem_wrapper_src, mem_wrapper_dst)
            os.chmod(str(mem_wrapper_dst), 0o755)

        proc = None
        try:
            # Build Docker command
            timeout_s = min(timeout_ms / 1000, config["timeout"])
            docker_timeout = timeout_s + 5  # Extra buffer for container startup

            docker_args = [
                "docker", "run",
                "--name", container_name,
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

            if stdin:
                proc.stdin.write(stdin.encode("utf-8"))
            try:
                await proc.stdin.drain()
            except Exception:
                pass
            proc.stdin.close()

            MAX_OUTPUT_BYTES = 10 * 1024 * 1024  # 10 MB

            async def read_stream(stream: asyncio.StreamReader, limit: int) -> bytes:
                chunks = []
                total_bytes = 0
                while True:
                    chunk = await stream.read(8192)
                    if not chunk:
                        break
                    chunks.append(chunk)
                    total_bytes += len(chunk)
                    if total_bytes > limit:
                        raise MemoryError("Output Limit Exceeded")
                return b"".join(chunks)

            try:
                stdout_task = asyncio.create_task(read_stream(proc.stdout, MAX_OUTPUT_BYTES))
                stderr_task = asyncio.create_task(read_stream(proc.stderr, MAX_OUTPUT_BYTES))
                
                await asyncio.wait_for(
                    asyncio.gather(stdout_task, stderr_task, proc.wait()),
                    timeout=docker_timeout,
                )
                
                stdout_bytes = stdout_task.result()
                stderr_bytes = stderr_task.result()
                
            except asyncio.TimeoutError:
                elapsed_ms = int((time.monotonic() - start_time) * 1000)
                return ExecutionResult(
                    stdout="",
                    stderr="Time Limit Exceeded",
                    exitCode=-1,
                    timedOut=True,
                    runtimeMs=elapsed_ms,
                )
            except MemoryError:
                elapsed_ms = int((time.monotonic() - start_time) * 1000)
                return ExecutionResult(
                    stdout="",
                    stderr="Runtime Error: Output exceeded 10 MB limit",
                    exitCode=-1,
                    timedOut=False,
                    runtimeMs=elapsed_ms,
                )

            elapsed_ms = int((time.monotonic() - start_time) * 1000)

            raw_stdout = stdout_bytes.decode("utf-8", errors="replace")
            raw_stderr = stderr_bytes.decode("utf-8", errors="replace")

            # Extract memory profile
            memory_kb = None
            filtered_stderr_lines = []
            for line in raw_stderr.splitlines():
                if line.startswith("MEMORY_KB: "):
                    try:
                        memory_kb = int(line.split("MEMORY_KB: ")[1].strip())
                    except ValueError:
                        pass
                else:
                    filtered_stderr_lines.append(line)
            
            raw_stderr = "\n".join(filtered_stderr_lines)

            stdout = sanitize_output(raw_stdout)
            stderr = sanitize_output(raw_stderr)

            return ExecutionResult(
                stdout=stdout,
                stderr=stderr,
                exitCode=proc.returncode or 0,
                timedOut=False,
                runtimeMs=elapsed_ms,
                memoryKb=memory_kb,
            )

        except Exception as e:
            logger.error(f"Docker execution error: {e}")
            return ExecutionResult(
                stderr=f"Execution error: {str(e)}",
                exitCode=-1,
            )
        finally:
            # 1. Guaranteed Cleanup for Container
            try:
                rm_proc = await asyncio.create_subprocess_exec(
                    "docker", "rm", "-f", container_name,
                    stdout=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.PIPE,
                )
                rm_stdout, rm_stderr = await asyncio.wait_for(rm_proc.communicate(), timeout=5.0)
                if rm_proc.returncode != 0:
                    err_str = rm_stderr.decode('utf-8', errors='replace').strip()
                    if "No such container" not in err_str:
                        logger.error(f"Cleanup failure for container {container_name}: {err_str}")
            except Exception as e:
                logger.error(f"Exception during cleanup of container {container_name}: {e}")

            # 2. Cleanup Docker CLI process if it's still alive
            try:
                if proc is not None and proc.returncode is None:
                    proc.kill()
                    await proc.wait()
            except Exception:
                pass

            # 3. Cleanup temp files and directories
            try:
                if run_dir.exists():
                    shutil.rmtree(str(run_dir), ignore_errors=True)
            except Exception as e:
                logger.error(f"Failed to cleanup temp directory {run_dir}: {e}")


# Singleton instance
docker_service = DockerService()
