import sys
import unittest
from pathlib import Path
from unittest.mock import AsyncMock

sys.path.append(str(Path(__file__).parent.parent))

from src.models.submission import ExecutionResult
from src.services.docker_service import DockerService


class ExecuteCodeWrapperTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.service = DockerService()
        self.run_dir = Path("/tmp/kodechirp-test-run")

    async def test_returns_compile_error_and_cleans_up(self):
        compile_result = ExecutionResult(stderr="Syntax error", exitCode=1)
        self.service.prepare_and_compile = AsyncMock(return_value=(self.run_dir, compile_result))
        self.service.start_sandbox = AsyncMock()
        self.service.execute_in_sandbox = AsyncMock()
        self.service.stop_sandbox = AsyncMock()
        self.service.cleanup_submission = AsyncMock()

        result = await self.service.execute_code("bad code", "cpp")

        self.assertEqual(result, compile_result)
        self.service.start_sandbox.assert_not_called()
        self.service.execute_in_sandbox.assert_not_called()
        self.service.stop_sandbox.assert_not_called()
        self.service.cleanup_submission.assert_awaited_once_with(self.run_dir)

    async def test_returns_start_failure_and_cleans_up(self):
        self.service.prepare_and_compile = AsyncMock(return_value=(self.run_dir, None))
        self.service.start_sandbox = AsyncMock(return_value=None)
        self.service.execute_in_sandbox = AsyncMock()
        self.service.stop_sandbox = AsyncMock()
        self.service.cleanup_submission = AsyncMock()

        result = await self.service.execute_code("print('ok')", "python")

        self.assertEqual(result.exitCode, -1)
        self.assertIn("Failed to start sandbox", result.stderr)
        self.service.execute_in_sandbox.assert_not_called()
        self.service.stop_sandbox.assert_not_called()
        self.service.cleanup_submission.assert_awaited_once_with(self.run_dir)

    async def test_executes_in_sandbox_then_stops_and_cleans_up(self):
        execution_result = ExecutionResult(stdout="ok\n", exitCode=0, runtimeMs=12)
        self.service.prepare_and_compile = AsyncMock(return_value=(self.run_dir, None))
        self.service.start_sandbox = AsyncMock(return_value="sandbox-1")
        self.service.execute_in_sandbox = AsyncMock(return_value=execution_result)
        self.service.stop_sandbox = AsyncMock()
        self.service.cleanup_submission = AsyncMock()

        result = await self.service.execute_code(
            code="print('ok')",
            language="python",
            stdin="",
            timeout_ms=1000,
        )

        self.assertEqual(result, execution_result)
        self.service.start_sandbox.assert_awaited_once()
        self.service.execute_in_sandbox.assert_awaited_once_with(
            container_name="sandbox-1",
            language="python",
            stdin="",
            timeout_ms=1000,
        )
        self.service.stop_sandbox.assert_awaited_once_with("sandbox-1")
        self.service.cleanup_submission.assert_awaited_once_with(self.run_dir)


if __name__ == "__main__":
    unittest.main()
