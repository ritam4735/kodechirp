# 🔁 Execution Pipeline

> Queue lifecycle, worker processing, judge modes, wrapper generation, and result publishing.

[← Back to README](../README.md)

---

## Overview

KodeChirp's execution pipeline is **fully asynchronous** — the gateway dispatches jobs to a Redis-backed BullMQ queue, and Python workers independently consume, execute, and publish results. This decoupling enables horizontal scaling of workers without any gateway changes.

---

## Submission Sequence

```
 User               Frontend            Gateway             Redis              Worker             Docker
  │                    │                   │                   │                  │                  │
  │   Submit Code      │                   │                   │                  │                  │
  ├──────────────────► │                   │                   │                  │                  │
  │                    │  POST /submit     │                   │                  │                  │
  │                    ├──────────────────►│                   │                  │                  │
  │                    │                   │  Validate + Store │                  │                  │
  │                    │                   │  (PostgreSQL)     │                  │                  │
  │                    │                   │                   │                  │                  │
  │                    │                   │  BullMQ.add()     │                  │                  │
  │                    │                   ├──────────────────►│                  │                  │
  │                    │  { submissionId,  │                   │                  │                  │
  │                    │  status: queued } │                   │                  │                  │
  │                    │◄──────────────────┤                   │                  │                  │
  │                    │                   │                   │  BRPOP/dequeue   │                  │
  │                    │                   │                   │◄─────────────────┤                  │
  │                    │  GET /poll        │                   │                  │                  │
  │                    ├──────────────────►│  PUB processing   │                  │                  │
  │                    │◄──────────────────┤◄──────────────────┤                  │  docker.run()    │
  │                    │  { processing }   │                   │                  ├─────────────────►│
  │                    │                   │                   │                  │                  │
  │                    │                   │                   │                  │ stdout/stderr    │
  │                    │                   │                   │                  │◄─────────────────┤
  │                    │                   │                   │  PUB completed   │                  │
  │                    │  GET /poll        │                   │◄─────────────────┤                  │
  │                    ├──────────────────►│◄──────────────────┤                  │                  │
  │  Result Display    │◄──────────────────┤                   │                  │                  │
  │◄───────────────────┤  { accepted }     │                   │                  │                  │
```

---

## Submission Status Lifecycle

| Status | Description |
| :--- | :--- |
| `queued` | Stored in DB, job dispatched to BullMQ |
| `processing` | Worker dequeued job, preparing execution |
| `running` | Code executing inside Docker sandbox |
| `accepted` | All test cases passed ✅ |
| `wrong_answer` | Output mismatch on one or more test cases |
| `time_limit_exceeded` | Execution exceeded configured timeout |
| `runtime_error` | Non-zero exit code or crash |
| `compilation_error` | Failed to compile (C / C++ / Java) |

---

## Queue Lifecycle

### 1. Job Dispatch (Gateway)

```javascript
// gateway/src/queue/submissionProducer.js
await submissionQueue.add('execute', {
    submissionId,
    problemId,
    language,
    code,
    judgeMode,
    signatureMetadata,
}, {
    attempts: MAX_RETRIES,
    backoff: { type: 'exponential', delay: 1000 },
    removeOnComplete: true,
    removeOnFail: false,
});
```

### 2. Job Consumption (Worker)

```python
# workers/src/worker/consumer.py
async def consume_loop():
    while True:
        job_data = await redis.brpop("bull:kodechirp-submissions:wait")
        submission = parse_job(job_data)
        await process_submission(submission)
```

### 3. Result Publishing

```python
# workers/src/services/redis_service.py
await redis.publish(
    f"submission:{submission_id}",
    json.dumps({
        "status": "accepted",
        "runtime_ms": total_runtime,
        "test_cases_passed": passed,
        "test_cases_total": total,
    })
)
```

---

## Judge Modes

### STDIN_STDOUT (Classic Competitive Programming)

In this mode, user code reads from `stdin` and writes to `stdout`. The worker:

1. Writes test case `input` to a temp file
2. Mounts it as stdin in the Docker container
3. Captures stdout
4. Compares stdout against `expected_output` (whitespace-trimmed)

### FUNCTION (LeetCode-Style)

In this mode, the worker auto-generates a wrapper that:

1. Reads `signature_metadata` from the problem (function name, params, return type)
2. Generates a language-specific wrapper at execution time
3. The wrapper:
   - Reads `input_json` from stdin
   - Parses parameters from JSON
   - Calls the user's function
   - Serializes the return value to JSON
   - Writes result to stdout
4. Worker compares JSON output against `expected_json`

---

## Wrapper Generation

### Signature Metadata Structure

```json
{
    "function_name": "twoSum",
    "return_type": "array<integer>",
    "parameters": [
        { "name": "nums", "type": "array<integer>" },
        { "name": "target", "type": "integer" }
    ]
}
```

### Generated Python Wrapper Example

```python
import sys, json

# ─── User's solution is prepended above ───

if __name__ == "__main__":
    data = json.loads(sys.stdin.read())
    nums = data["nums"]
    target = data["target"]
    result = twoSum(nums, target)
    print(json.dumps(result))
```

### Generated JavaScript Wrapper Example

```javascript
const readline = require('readline');
// User's solution is prepended above

const chunks = [];
process.stdin.on('data', c => chunks.push(c));
process.stdin.on('end', () => {
    const data = JSON.parse(chunks.join(''));
    const result = twoSum(data.nums, data.target);
    console.log(JSON.stringify(result));
});
```

### Supported Language Wrappers

| Language | Wrapper Strategy |
| :--- | :--- |
| Python 3 | `json.loads(stdin)` → call function → `json.dumps(result)` |
| JavaScript | `process.stdin` → `JSON.parse` → call function → `JSON.stringify` |
| C++ | Custom JSON parser → call function → serialize |
| Java | Jackson / manual parse → call method → serialize |
| C | Manual parse → call function → `printf` |

---

## Docker Execution Flow

### Per-Submission Container Lifecycle

```
┌─────────────────────────────────────────────┐
│  Worker Process                              │
│                                              │
│  1. Create temp dir: /tmp/kodechirp/<uuid>/  │
│  2. Write code to solution.<ext>             │
│  3. Write input to input.txt                 │
│                                              │
│  4. docker.create(                           │
│       image: "kodechirp-{lang}-sandbox",     │
│       network_mode: "none",                  │
│       cap_drop: ["ALL"],                     │
│       read_only: True,                       │
│       user: "runner",                        │
│       mem_limit: "256m",                     │
│       pids_limit: 64,                        │
│       volumes: {temp_dir: /workspace},       │
│     )                                        │
│                                              │
│  5. docker.start(container)                  │
│  6. docker.wait(container, timeout=10s)      │
│  7. docker.logs(container)  → stdout/stderr  │
│  8. docker.remove(container, force=True)     │
│  9. Cleanup temp dir                         │
└─────────────────────────────────────────────┘
```

### Compilation (C, C++, Java)

For compiled languages, the sandbox image includes a compile step:

```dockerfile
# sandboxes/cpp/entrypoint.sh
#!/bin/sh
g++ -O2 -o /workspace/solution /workspace/solution.cpp 2>&1
if [ $? -ne 0 ]; then exit 2; fi  # Exit code 2 = compilation error
/workspace/solution < /workspace/input.txt
```

---

## Result Evaluation

### Per-Test-Case Processing

```python
for i, test_case in enumerate(test_cases):
    # Execute in Docker
    exit_code, stdout, stderr, runtime_ms, memory_kb = await execute(
        code, test_case.input, language, problem
    )
    
    # Evaluate
    if exit_code != 0:
        status = "runtime_error"
    elif runtime_ms > problem.time_limit_ms:
        status = "time_limit_exceeded"
    elif normalize(stdout) == normalize(test_case.expected_output):
        status = "accepted"
    else:
        status = "wrong_answer"
    
    # Record metric
    await save_execution_metric(submission_id, test_case.id, i, ...)
    
    # Short-circuit on first failure
    if status != "accepted":
        break
```

### Output Normalization

- Trailing whitespace stripped
- Trailing newlines stripped
- For FUNCTION mode: JSON comparison (order-insensitive for arrays when applicable)

---

## Error Handling

| Error Type | Handling |
| :--- | :--- |
| Container timeout | Worker kills container after `EXECUTION_TIMEOUT` seconds |
| Container OOM | Docker kills process, worker detects non-zero exit |
| Queue failure | BullMQ retries with exponential backoff (up to `MAX_RETRIES`) |
| DB connection lost | Worker reconnects with retry logic |
| Redis disconnect | Worker reconnects, missed jobs re-queued by BullMQ |

---

[← Architecture](./architecture.md) · [Database Design →](./database.md)
