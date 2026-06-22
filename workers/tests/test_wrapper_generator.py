# tests/test_wrapper_generator.py
# ─────────────────────────────────────────────────────────────────────────────
# Unit tests for WrapperGenerator — verifies wrapper source generation
# for all five languages: Python, JavaScript, C, C++, Java.
# ─────────────────────────────────────────────────────────────────────────────

import json
import pytest
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from src.worker.wrapper_generator import WrapperGenerator

# ── Test Signatures ───────────────────────────────────────────────────────────

CLIMB_STAIRS_SIG = {
    "name": "climbStairs",
    "params": [{"name": "n", "type": "Int"}],
    "returnType": "Int",
}

TWO_SUM_SIG = {
    "name": "twoSum",
    "params": [
        {"name": "nums", "type": "Array<Int>"},
        {"name": "target", "type": "Int"},
    ],
    "returnType": "Array<Int>",
}

IS_VALID_SIG = {
    "name": "isValid",
    "params": [{"name": "s", "type": "String"}],
    "returnType": "Boolean",
}


# ── Python ────────────────────────────────────────────────────────────────────

class TestPythonWrapper:
    def test_climb_stairs(self):
        code = "def climbStairs(n):\n    if n <= 2: return n\n    a, b = 1, 2\n    for i in range(3, n+1): a, b = b, a+b\n    return b"
        result = WrapperGenerator.generate("python", CLIMB_STAIRS_SIG, code)
        assert "climbStairs" in result
        assert "json.loads" in result
        assert "json.dumps" in result

    def test_two_sum(self):
        code = "def twoSum(nums, target): pass"
        result = WrapperGenerator.generate("python", TWO_SUM_SIG, code)
        assert "arg_nums" in result
        assert "arg_target" in result


# ── JavaScript ────────────────────────────────────────────────────────────────

class TestJavaScriptWrapper:
    def test_climb_stairs(self):
        code = "function climbStairs(n) { return n; }"
        result = WrapperGenerator.generate("javascript", CLIMB_STAIRS_SIG, code)
        assert "JSON.parse" in result
        assert "JSON.stringify" in result

    def test_two_sum(self):
        code = "function twoSum(nums, target) { return []; }"
        result = WrapperGenerator.generate("javascript", TWO_SUM_SIG, code)
        assert "arg_nums" in result
        assert "arg_target" in result


# ── C ─────────────────────────────────────────────────────────────────────────

class TestCWrapper:
    def test_climb_stairs(self):
        code = "int climbStairs(int n) { return n; }"
        result = WrapperGenerator.generate("c", CLIMB_STAIRS_SIG, code)
        assert "#include <stdio.h>" in result
        assert "__kc_get_int" in result
        assert "climbStairs(arg_n)" in result
        assert 'printf("%d' in result

    def test_two_sum_array(self):
        code = "int* twoSum(int* nums, int nums_len, int target, int* returnSize) { *returnSize = 0; return nums; }"
        result = WrapperGenerator.generate("c", TWO_SUM_SIG, code)
        assert "__kc_get_int_array" in result
        assert "arg_nums_len" in result
        assert "&__ret_size" in result

    def test_bool_return(self):
        code = "int isValid(char* s) { return 1; }"
        result = WrapperGenerator.generate("c", IS_VALID_SIG, code)
        assert '"true"' in result or "'true'" in result
        assert "__kc_get_string" in result

    def test_no_scanf(self):
        code = "int climbStairs(int n) { return n; }"
        result = WrapperGenerator.generate("c", CLIMB_STAIRS_SIG, code)
        assert "scanf" not in result


# ── C++ ───────────────────────────────────────────────────────────────────────

class TestCppWrapper:
    def test_climb_stairs(self):
        code = "int climbStairs(int n) { return n; }"
        result = WrapperGenerator.generate("cpp", CLIMB_STAIRS_SIG, code)
        assert "#include <iostream>" in result
        assert "__kc_get_int" in result
        assert "climbStairs(arg_n)" in result

    def test_two_sum_vector(self):
        code = "vector<int> twoSum(vector<int>& nums, int target) { return {}; }"
        result = WrapperGenerator.generate("cpp", TWO_SUM_SIG, code)
        assert "__kc_get_int_array" in result
        assert "vector<int>" in result

    def test_bool_return(self):
        code = "bool isValid(string s) { return true; }"
        result = WrapperGenerator.generate("cpp", IS_VALID_SIG, code)
        assert '"true"' in result or "'true'" in result

    def test_no_cin(self):
        code = "int climbStairs(int n) { return n; }"
        result = WrapperGenerator.generate("cpp", CLIMB_STAIRS_SIG, code)
        assert "cin >>" not in result


# ── Java ──────────────────────────────────────────────────────────────────────

class TestJavaWrapper:
    def test_climb_stairs(self):
        code = "class Solution {\n    public int climbStairs(int n) { return n; }\n}"
        result = WrapperGenerator.generate("java", CLIMB_STAIRS_SIG, code)
        assert "public class Main" in result
        assert "Solution sol = new Solution()" in result
        assert "__kcGetInt" in result
        assert f"sol.climbStairs(arg_n)" in result

    def test_two_sum_array(self):
        code = "class Solution {\n    public int[] twoSum(int[] nums, int target) { return new int[0]; }\n}"
        result = WrapperGenerator.generate("java", TWO_SUM_SIG, code)
        assert "__kcGetIntArray" in result
        assert "int[]" in result

    def test_bool_return(self):
        code = 'class Solution {\n    public boolean isValid(String s) { return true; }\n}'
        result = WrapperGenerator.generate("java", IS_VALID_SIG, code)
        assert '"true"' in result

    def test_no_scanner(self):
        code = "class Solution {\n    public int climbStairs(int n) { return n; }\n}"
        result = WrapperGenerator.generate("java", CLIMB_STAIRS_SIG, code)
        assert "Scanner" not in result


# ── Edge Cases ────────────────────────────────────────────────────────────────

class TestEdgeCases:
    def test_unsupported_language(self):
        with pytest.raises(NotImplementedError):
            WrapperGenerator.generate("rust", CLIMB_STAIRS_SIG, "fn main() {}")

    def test_all_languages_return_string(self):
        for lang in ["python", "javascript", "c", "cpp", "java"]:
            result = WrapperGenerator.generate(
                lang, CLIMB_STAIRS_SIG,
                "int climbStairs(int n) { return n; }" if lang in ("c", "cpp") else
                "class Solution {\n    public int climbStairs(int n) { return n; }\n}" if lang == "java" else
                "def climbStairs(n): return n" if lang == "python" else
                "function climbStairs(n) { return n; }"
            )
            assert isinstance(result, str)
            assert len(result) > 100
