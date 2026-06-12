# workers/src/models/submission.py
# ─────────────────────────────────────────────────────────────────────────────
# Pydantic schemas for submission data
# ─────────────────────────────────────────────────────────────────────────────

from pydantic import BaseModel
from typing import Optional, List, Dict, Any


class TestCase(BaseModel):
    """Test case from the job payload."""
    id: str
    input: str
    expectedOutput: str
    isSample: bool = False


class Constraints(BaseModel):
    """Execution constraints."""
    timeoutMs: int = 5000
    memoryMb: int = 256


class SubmissionJob(BaseModel):
    """Job payload received from the Redis queue."""
    submissionId: str
    userId: Optional[str] = None
    problemId: str
    language: str
    code: str
    testCases: List[TestCase]
    constraints: Constraints = Constraints()
    judgeMode: str = "STDIN_STDOUT"
    signatureMetadata: Optional[Dict[str, Any]] = None


class ExecutionResult(BaseModel):
    """Result of a single code execution."""
    stdout: str = ""
    stderr: str = ""
    exitCode: int = 0
    timedOut: bool = False
    runtimeMs: Optional[int] = None
    memoryKb: Optional[int] = None


class TestCaseResult(BaseModel):
    """Result of running code against a single test case."""
    testCaseId: str
    testIndex: int
    status: str
    runtimeMs: Optional[int] = None
    memoryKb: Optional[int] = None
    actualOutput: str = ""
    expectedOutput: str = ""
    input: str = ""


class SubmissionResult(BaseModel):
    """Final result of judging a submission."""
    submissionId: str
    userId: Optional[str] = None
    verdict: str
    testCasesPassed: int = 0
    testCasesTotal: int = 0
    runtimeMs: Optional[int] = None
    memoryKb: Optional[int] = None
    failedTestCase: Optional[dict] = None
    error: Optional[str] = None
    workerId: str = ""


class RunCodeRequest(BaseModel):
    """Request body for the sync /api/execute endpoint."""
    code: str
    language: str
    stdin: str = ""
