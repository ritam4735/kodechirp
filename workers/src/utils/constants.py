# workers/src/utils/constants.py
# ─────────────────────────────────────────────────────────────────────────────

# Language configurations for Docker sandboxes
LANGUAGE_CONFIG = {
    "javascript": {
        "extension": "js",
        "image": "kodechirp-node-sandbox",
        "memory": "64m",
        "cpus": 0.5,
        "tmpfs_size": "16m",
        "run_command": "/app/mem_wrapper node main.js",
        "timeout": 5,
    },
    "python": {
        "extension": "py",
        "image": "kodechirp-python-sandbox",
        "memory": "64m",
        "cpus": 0.5,
        "tmpfs_size": "16m",
        "run_command": "/app/mem_wrapper python main.py",
        "timeout": 5,
    },
    "cpp": {
        "extension": "cpp",
        "image": "kodechirp-cpp-sandbox",
        "memory": "256m",
        "cpus": 1.0,
        "tmpfs_size": "32m",
        "compile_command": "g++ main.cpp -O2 -std=c++17 -o main",
        "run_command": "/app/mem_wrapper ./main",
        "timeout": 15,
    },
    "c": {
        "extension": "c",
        "image": "kodechirp-c-sandbox",
        "memory": "256m",
        "cpus": 1.0,
        "tmpfs_size": "32m",
        "compile_command": "gcc main.c -O2 -std=c11 -o main",
        "run_command": "/app/mem_wrapper ./main",
        "timeout": 15,
    },
    "java": {
        "extension": "java",
        "image": "kodechirp-java-sandbox",
        "memory": "512m",
        "cpus": 1.0,
        "tmpfs_size": "64m",
        "compile_command": "javac Main.java",
        "run_command": "/app/mem_wrapper java Main",
        "timeout": 15,
    },
}

# Submission verdicts
class Verdict:
    QUEUED = "queued"
    RUNNING = "running"
    ACCEPTED = "Accepted"
    WRONG_ANSWER = "Wrong Answer"
    TLE = "Time Limit Exceeded"
    RUNTIME_ERROR = "Runtime Error"
    COMPILATION_ERROR = "Compilation Error"
    MLE = "Memory Limit Exceeded"
    INTERNAL_ERROR = "Internal Error"
