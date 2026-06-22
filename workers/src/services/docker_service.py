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
from typing import Optional, Tuple

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

    async def prepare_and_compile(
        self,
        submission_id: str,
        code: str,
        language: str,
    ) -> Tuple[Optional[Path], Optional[ExecutionResult]]:
        """
        Prepare directory and optionally compile the code.
        Returns (run_dir, compile_result).
        If no compilation is needed, compile_result is None.
        If preparation fails, run_dir might be None.
        """
        config = LANGUAGE_CONFIG.get(language)
        if not config:
            return None, ExecutionResult(
                stderr=f"Unsupported language: {language}",
                exitCode=-1,
            )

        container_name = f"judge-compile-{submission_id}-{uuid.uuid4().hex[:8]}"
        run_dir = self._tmp_base / f"judge-run-{submission_id}_{uuid.uuid4().hex[:8]}"
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

        compile_cmd = config.get("compile_command")
        if not compile_cmd:
            return run_dir, None

        # Execute compilation
        docker_args = [
            "docker", "run",
            "--name", container_name,
            "--rm",
            "--network=none",
            "--memory=512m",
            "--cpus=1.0",
            "--security-opt=no-new-privileges",
            "--user", "sandbox",
            "-v", f"{run_dir}:/app:Z",
            "-w", "/app",
            config["image"],
            "sh", "-c", compile_cmd,
        ]

        try:
            start_time = time.monotonic()
            proc = await asyncio.create_subprocess_exec(
                *docker_args,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            
            try:
                stdout_bytes, stderr_bytes = await asyncio.wait_for(proc.communicate(), timeout=15.0)
            except asyncio.TimeoutError:
                # Kill compilation
                try:
                    proc.kill()
                    await asyncio.wait_for(proc.wait(), timeout=1.0)
                except Exception:
                    pass
                
                rm_proc = await asyncio.create_subprocess_exec(
                    "docker", "rm", "-f", container_name,
                    stdout=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.PIPE,
                )
                await rm_proc.communicate()
                
                elapsed_ms = int((time.monotonic() - start_time) * 1000)
                return run_dir, ExecutionResult(
                    stdout="",
                    stderr="Compilation Time Limit Exceeded",
                    exitCode=-1,
                    timedOut=True,
                    runtimeMs=elapsed_ms,
                )

            elapsed_ms = int((time.monotonic() - start_time) * 1000)
            
            raw_stdout = stdout_bytes.decode("utf-8", errors="replace")
            raw_stderr = stderr_bytes.decode("utf-8", errors="replace")
            
            # Combine stdout and stderr for compilation error message
            # Sometimes errors are written to stdout
            combined_output = ""
            if raw_stdout.strip():
                combined_output += raw_stdout
            if raw_stderr.strip():
                if combined_output:
                    combined_output += "\n"
                combined_output += raw_stderr

            return run_dir, ExecutionResult(
                stdout=sanitize_output(raw_stdout),
                stderr=sanitize_output(combined_output), # Put combined in stderr
                exitCode=proc.returncode or 0,
                timedOut=False,
                runtimeMs=elapsed_ms,
            )

        except Exception as e:
            logger.error(f"Docker compilation error: {e}")
            return run_dir, ExecutionResult(
                stderr=f"Compilation error: {str(e)}",
                exitCode=-1,
            )
        finally:
            # We don't clean up run_dir here, it's passed to execute_test_case
            pass

    async def execute_code(
        self,
        code: str,
        language: str,
        stdin: str = "",
        timeout_ms: int = 5000,
    ) -> ExecutionResult:
        """Compile, run once, and clean up a temporary sandbox execution."""
        submission_id = uuid.uuid4().hex
        run_dir = None
        container_name = None

        try:
            run_dir, compile_result = await self.prepare_and_compile(
                submission_id=submission_id,
                code=code,
                language=language,
            )

            if compile_result and compile_result.exitCode != 0:
                return compile_result

            if run_dir is None:
                return ExecutionResult(
                    stderr="Failed to prepare execution directory",
                    exitCode=-1,
                )

            container_name = await self.start_sandbox(
                run_dir=run_dir,
                submission_id=submission_id,
                language=language,
            )

            if not container_name:
                return ExecutionResult(
                    stderr="Failed to start sandbox",
                    exitCode=-1,
                )

            return await self.execute_in_sandbox(
                container_name=container_name,
                language=language,
                stdin=stdin,
                timeout_ms=timeout_ms,
            )
        except Exception as e:
            logger.error(f"Docker execute_code error: {e}")
            return ExecutionResult(
                stderr=f"Execution error: {str(e)}",
                exitCode=-1,
            )
        finally:
            if container_name:
                await self.stop_sandbox(container_name)
            await self.cleanup_submission(run_dir)

    async def cleanup_submission(self, run_dir: Optional[Path]):
        """Cleanup submission temp directory."""
        if run_dir and run_dir.exists():
            try:
                shutil.rmtree(str(run_dir), ignore_errors=True)
            except Exception as e:
                logger.error(f"Failed to cleanup temp directory {run_dir}: {e}")

    async def start_sandbox(
        self,
        run_dir: Path,
        submission_id: str,
        language: str,
        memory_mb: int = 256,
    ) -> Optional[str]:
        config = LANGUAGE_CONFIG.get(language)
        if not config:
            return None

        container_name = f"judge-sandbox-{submission_id}-{uuid.uuid4().hex[:8]}"

        docker_args = [
            "docker", "run", "-d",
            "--name", container_name,
            "--rm",
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
            "sleep", "infinity"
        ]

        try:
            proc = await asyncio.create_subprocess_exec(
                *docker_args,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            stdout_bytes, stderr_bytes = await asyncio.wait_for(proc.communicate(), timeout=10.0)
            
            if proc.returncode != 0:
                logger.error(f"Failed to start sandbox container: {stderr_bytes.decode('utf-8')}")
                return None
                
            return container_name
        except Exception as e:
            logger.error(f"Error starting sandbox: {e}")
            return None

    async def execute_in_sandbox(
        self,
        container_name: str,
        language: str,
        stdin: str = "",
        timeout_ms: int = 5000,
        use_sh_stdin: bool = False,
    ) -> ExecutionResult:
        config = LANGUAGE_CONFIG.get(language)
        if not config:
            return ExecutionResult(
                stderr=f"Unsupported language: {language}",
                exitCode=-1,
            )

        proc = None
        try:
            timeout_s = min(timeout_ms / 1000, config["timeout"])
            docker_timeout = timeout_s + 5

            if use_sh_stdin:
                docker_args = [
                    "docker", "exec", "-i",
                    container_name,
                    "sh",
                ]
            else:
                docker_args = [
                    "docker", "exec", "-i",
                    container_name,
                    "sh", "-c", config["run_command"],
                ]

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

            # Wait for docker process to finish or timeout
            try:
                stdout_task = asyncio.create_task(read_stream(proc.stdout, MAX_OUTPUT_BYTES))
                stderr_task = asyncio.create_task(read_stream(proc.stderr, MAX_OUTPUT_BYTES))
                
                await asyncio.wait_for(
                    asyncio.gather(stdout_task, stderr_task, proc.wait()),
                    timeout=docker_timeout,
                )
                
                stdout_bytes = stdout_task.result()
                stderr_bytes = stderr_task.result()
                exit_code = proc.returncode
                
            except asyncio.TimeoutError:
                elapsed_ms = int((time.monotonic() - start_time) * 1000)
                # Ensure the exec process is killed
                try:
                    proc.kill()
                    await proc.wait()
                except Exception:
                    pass
                return ExecutionResult(
                    stdout="",
                    stderr="Time Limit Exceeded",
                    exitCode=-1,
                    timedOut=True,
                    runtimeMs=elapsed_ms,
                )
            except MemoryError:
                elapsed_ms = int((time.monotonic() - start_time) * 1000)
                try:
                    proc.kill()
                    await proc.wait()
                except Exception:
                    pass
                return ExecutionResult(
                    stdout="",
                    stderr="Runtime Error: Output exceeded 10 MB limit",
                    exitCode=-1,
                    timedOut=False,
                    runtimeMs=elapsed_ms,
                )

            # Check if container died (e.g. from OOM)
            # Actually, `docker exec` will return 137 if the process inside is killed by OOM
            # If the whole container was killed, `docker exec` might fail with some exit code or error.
            if exit_code == 137:
                pass

            elapsed_ms = int((time.monotonic() - start_time) * 1000)

            raw_stdout = stdout_bytes.decode("utf-8", errors="replace")
            raw_stderr = stderr_bytes.decode("utf-8", errors="replace")

            memory_kb = None
            filtered_stderr_lines = []
            for line in raw_stderr.splitlines():
                if line.startswith("MEMORY_KB: "):
                    try:
                        mem = int(line.split("MEMORY_KB: ")[1].strip())
                        if memory_kb is None:
                            memory_kb = mem
                        else:
                            memory_kb = max(memory_kb, mem)
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
                exitCode=exit_code or 0,
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
            try:
                if proc is not None and proc.returncode is None:
                    proc.kill()
                    await proc.wait()
            except Exception:
                pass

    async def stop_sandbox(self, container_name: str):
        """Stop and remove the sandbox container."""
        if not container_name:
            return
        try:
            # Fast kill to avoid 10s SIGTERM timeout for sleep infinity
            kill_proc = await asyncio.create_subprocess_exec(
                "docker", "kill", "-s", "KILL", container_name,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            await kill_proc.communicate()

            rm_proc = await asyncio.create_subprocess_exec(
                "docker", "rm", "-f", container_name,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            rm_stdout, rm_stderr = await asyncio.wait_for(rm_proc.communicate(), timeout=15.0)
            if rm_proc.returncode != 0:
                err_str = rm_stderr.decode('utf-8', errors='replace').strip()
                if "No such container" not in err_str:
                    logger.error(f"Cleanup failure for container {container_name}: {err_str}")
        except Exception as e:
            logger.error(f"Exception during cleanup of container {container_name}: {e}")

# Singleton instance
docker_service = DockerService()
