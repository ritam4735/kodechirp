import asyncio
import time
import os
import sys
from pathlib import Path

# Add src to path so we can import from it
sys.path.append(os.path.join(os.path.dirname(__file__), "src"))

from src.models.submission import SubmissionJob, TestCase
from src.worker.evaluator import evaluate_submission

async def run_benchmark(num_testcases):
    print(f"Running benchmark with {num_testcases} testcases...")
    
    # Create dummy testcases
    testcases = [
        TestCase(
            id=f"tc{i}",
            input="1 2",
            expectedOutput="3",
            isSample=False,
            points=10
        ) for i in range(num_testcases)
    ]
    
    job = SubmissionJob(
        submissionId=f"bench_{num_testcases}",
        userId="user1",
        problemId="prob1",
        language="python",
        code="import sys\n\nfor line in sys.stdin:\n    a, b = map(int, line.split())\n    print(a + b)\n",
        testCases=testcases,
        constraints={"timeoutMs": 2000, "memoryMb": 256}
    )
    
    start_time = time.time()
    
    # We need to mock db_service and redis_service so they don't actually hit DB
    from src.worker.evaluator import db_service, redis_service
    
    async def mock_update(*args, **kwargs): pass
    async def mock_save(*args, **kwargs): pass
    async def mock_publish(*args, **kwargs): pass
    
    db_service.update_submission_status = mock_update
    db_service.save_execution_metric = mock_save
    redis_service.publish_progress = mock_publish
    
    # Run evaluation
    try:
        result = await evaluate_submission(job)
        duration = time.time() - start_time
        print(f"Result: {result.verdict}")
        print(f"Time taken: {duration:.2f} seconds")
        print(f"Containers started: {num_testcases + 1}")
        return duration
    except Exception as e:
        print(f"Error during benchmark: {e}")
        return -1

async def main():
    for num in [10, 50, 100]:
        await run_benchmark(num)
        print("-" * 40)

if __name__ == "__main__":
    asyncio.run(main())
