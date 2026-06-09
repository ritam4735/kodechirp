import asyncio
import json
import sys
from pathlib import Path

sys.path.append(str(Path(__file__).parent.parent))

import os
os.environ["REDIS_URL"] = "redis://localhost:6380/0"
os.environ["DATABASE_URL"] = "postgresql://postgres:postgres@localhost:5433/kodechirp"

from src.worker.consumer import QueueConsumer
from src.services.redis_service import redis_service
from src.models.submission import SubmissionJob, Constraints

async def test_recovery():
    print("Testing Sweeper Recovery...")
    
    await redis_service.connect()
    from src.services.db_service import db_service
    await db_service.connect()
    
    consumer = QueueConsumer(concurrency=1)
    
    redis = redis_service.client
    
    # 1. Inject a stalled job
    job_id = "test-job-123"
    job_data = {
        "submissionId": "sub-123",
        "problemId": "prob-1",
        "language": "python",
        "code": "print('hello')",
        "testCases": [],
        "constraints": {"timeoutMs": 1000, "memoryMb": 64}
    }
    
    # Clear wait and active
    await redis.delete(consumer._queue_key)
    await redis.delete(consumer._active_key)
    
    # Put job in ACTIVE queue directly WITHOUT lock
    await redis.lpush(consumer._active_key, job_id)
    await redis.hset(f"bull:{consumer._queue_key.split(':')[1]}:{job_id}", "data", json.dumps(job_data))
    
    print("Job injected into active queue without lock. Starting sweeper...")
    
    # Start consumer
    task = asyncio.create_task(consumer.start())
    
    # Wait for sweeper to run (sweeps every 15s)
    # We will poll to see if job moved to wait queue
    for _ in range(25):
        active = await redis.lrange(consumer._active_key, 0, -1)
        wait = await redis.lrange(consumer._queue_key, 0, -1)
        print(f"Active: {active}, Wait: {wait}")
        if job_id in wait or job_id in active:
            # Note: the job should be moved to WAIT, then picked up by the consumer!
            # Since the consumer is running, it will immediately process it.
            # So it will be active WITH a lock.
            lock = await redis.get(f"bull:{consumer._queue_key.split(':')[1]}:{job_id}:lock")
            if lock:
                print(f"Job acquired by consumer with lock: {lock}")
                break
        await asyncio.sleep(1)
        
    await consumer.stop()
    task.cancel()
    
    await redis_service.close()
    await db_service.close()

if __name__ == "__main__":
    asyncio.run(test_recovery())
