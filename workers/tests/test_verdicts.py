import asyncio
import sys
from pathlib import Path

# Add src to path
sys.path.append(str(Path(__file__).parent.parent))

from src.models.submission import SubmissionJob, TestCase, Constraints
from src.worker.evaluator import evaluate_submission, Verdict
from src.services.docker_service import docker_service

import unittest
from unittest.mock import patch, AsyncMock

# Snippets for tests
SNIPPETS = {
    "javascript": {
        "AC": "console.log('hello');",
        "WA": "console.log('world');",
        "TLE": "while(true){}",
        "MLE": "const a = []; while(true) { a.push(new Array(10000).fill(1)); }",
        "RE": "throw new Error('boom');",
        "CE": "function oops() {", # syntax error
    },
    "python": {
        "AC": "print('hello')",
        "WA": "print('world')",
        "TLE": "while True: pass",
        "MLE": "a = []\nwhile True: a.append(' ' * 10**6)",
        "RE": "raise Exception('boom')",
        "CE": "def oops():", # syntax error
    },
    "cpp": {
        "AC": "#include <iostream>\nint main() { std::cout << \"hello\\n\"; return 0; }",
        "WA": "#include <iostream>\nint main() { std::cout << \"world\\n\"; return 0; }",
        "TLE": "int main() { while(true){} return 0; }",
        "MLE": "#include <stdlib.h>\n#include <string.h>\nint main() { while(true) { void* p = malloc(1024*1024); if(p) memset(p, 1, 1024*1024); } return 0; }",
        "RE": "#include <stdlib.h>\nint main() { abort(); return 0; }",
        "CE": "int main() { missing_semicolon }",
    },
    "c": {
        "AC": "#include <stdio.h>\nint main() { printf(\"hello\\n\"); return 0; }",
        "WA": "#include <stdio.h>\nint main() { printf(\"world\\n\"); return 0; }",
        "TLE": "int main() { while(1){} return 0; }",
        "MLE": "#include <stdlib.h>\n#include <string.h>\nint main() { while(1) { void* p = malloc(1024*1024); if(p) memset(p, 1, 1024*1024); } return 0; }",
        "RE": "#include <stdlib.h>\nint main() { abort(); return 0; }",
        "CE": "int main() { missing_semicolon }",
    },
    "java": {
        "AC": "public class Main { public static void main(String[] args) { System.out.println(\"hello\"); } }",
        "WA": "public class Main { public static void main(String[] args) { System.out.println(\"world\"); } }",
        "TLE": "public class Main { public static void main(String[] args) { while(true){} } }",
        "MLE": "import java.util.*; public class Main { public static void main(String[] args) { List<byte[]> list = new ArrayList<>(); while(true) { list.add(new byte[1024 * 1024]); } } }",
        "RE": "public class Main { public static void main(String[] args) { throw new RuntimeException(\"boom\"); } }",
        "CE": "public class Main { public static void main(String[] args) { missing_semicolon } }",
    }
}

async def run_test(language, verdict_type, code):
    job = SubmissionJob(
        submissionId=f"test-{language}-{verdict_type}",
        userId="user-1",
        problemId="prob-1",
        language=language,
        code=code,
        constraints=Constraints(timeoutMs=1000, memoryMb=64),
        testCases=[
            TestCase(
                id="tc-1",
                input="",
                expectedOutput="hello",
                isSample=True
            )
        ]
    )

    with patch('src.worker.evaluator.db_service') as mock_db, \
         patch('src.worker.evaluator.redis_service') as mock_redis:
        mock_db.update_submission_status = AsyncMock()
        mock_db.save_execution_metric = AsyncMock()
        mock_redis.publish_progress = AsyncMock()
        
        result = await evaluate_submission(job)
        return result.verdict

async def main():
    print("Running Verdict Consistency Tests...\n")
    results = {}
    passed = 0
    total = 0

    for lang, tests in SNIPPETS.items():
        results[lang] = {}
        print(f"--- Language: {lang.upper()} ---")
        for verdict_type, code in tests.items():
            try:
                actual_verdict = await run_test(lang, verdict_type, code)
                
                # Verify mapping
                expected_verdicts = {
                    "AC": Verdict.ACCEPTED,
                    "WA": Verdict.WRONG_ANSWER,
                    "TLE": Verdict.TLE,
                    "MLE": Verdict.MLE,
                    "RE": Verdict.RUNTIME_ERROR,
                    "CE": Verdict.COMPILATION_ERROR,
                }
                
                # Special cases for syntax errors in JS/Python
                if verdict_type == "CE" and lang in ["javascript", "python"]:
                    expected = [Verdict.COMPILATION_ERROR, Verdict.RUNTIME_ERROR]
                    match = actual_verdict in expected
                else:
                    expected = [expected_verdicts[verdict_type]]
                    match = actual_verdict == expected_verdicts[verdict_type]

                status = "PASS" if match else "FAIL"
                
                if match: passed += 1
                total += 1
                
                print(f"[{status}] {verdict_type}: expected={expected}, got={actual_verdict}")
                results[lang][verdict_type] = actual_verdict
            except Exception as e:
                print(f"[ERROR] {verdict_type}: {e}")
                results[lang][verdict_type] = str(e)
                total += 1

    print(f"\nSummary: {passed}/{total} tests passed.")
    
    # Save a markdown matrix
    with open("verdict_matrix.md", "w") as f:
        f.write("# Verdict Matrix\n\n")
        f.write("| Language | AC | WA | TLE | MLE | RE | CE |\n")
        f.write("|----------|----|----|-----|-----|----|----|\n")
        for lang, tests in results.items():
            row = f"| {lang} "
            for vt in ["AC", "WA", "TLE", "MLE", "RE", "CE"]:
                row += f"| {tests.get(vt, 'N/A')} "
            row += "|\n"
            f.write(row)

if __name__ == "__main__":
    asyncio.run(main())
