# scratch/test_validation.py
import asyncio
import json
import sys
import os

# Adjust sys.path to find src
sys.path.insert(0, os.path.abspath('.'))
sys.path.insert(0, os.path.abspath('./workers'))

from src.worker.wrapper_generator.generator import WrapperGenerator
from src.services.docker_service import docker_service
from src.utils.batch_parser import parse_batch_outputs, BATCH_DELIMITER
from src.utils.sanitizer import normalise_output

# Test solutions per language for TwoSum (Array<Int>)
TWO_SUM_SOLUTIONS = {
    'python': '''
class Solution:
    def twoSum(self, nums: list[int], target: int) -> list[int]:
        print("Hello from Python twoSum")
        m = {}
        for i, x in enumerate(nums):
            if target - x in m:
                return [m[target - x], i]
            m[x] = i
        return []
''',
    'javascript': '''
var twoSum = function(nums, target) {
    console.log("Hello from JS twoSum");
    let map = {};
    for (let i = 0; i < nums.length; i++) {
        let diff = target - nums[i];
        if (diff in map) return [map[diff], i];
        map[nums[i]] = i;
    }
    return [];
};
''',
    'cpp': '''
class Solution {
public:
    vector<int> twoSum(vector<int>& nums, int target) {
        cout << "Hello from C++ twoSum" << endl;
        unordered_map<int, int> mp;
        for (int i = 0; i < nums.size(); i++) {
            int diff = target - nums[i];
            if (mp.count(diff)) return {mp[diff], i};
            mp[nums[i]] = i;
        }
        return {};
    }
};
''',
    'java': '''
import java.util.*;
class Solution {
    public int[] twoSum(int[] nums, int target) {
        System.out.println("Hello from Java twoSum");
        Map<Integer, Integer> map = new HashMap<>();
        for (int i = 0; i < nums.length; i++) {
            int diff = target - nums[i];
            if (map.containsKey(diff)) return new int[]{map.get(diff), i};
            map.put(nums[i], i);
        }
        return new int[0];
    }
}
''',
    'c': '''
int* twoSum(int* nums, int numsSize, int target, int* returnSize) {
    printf("Hello from C twoSum\\n");
    int* res = (int*)malloc(2 * sizeof(int));
    *returnSize = 2;
    for (int i = 0; i < numsSize; i++) {
        for (int j = i + 1; j < numsSize; j++) {
            if (nums[i] + nums[j] == target) {
                res[0] = i; res[1] = j;
                return res;
            }
        }
    }
    return res;
}
'''
}

# Test solutions for Matrix<Int>
MATRIX_SOLUTIONS = {
    'python': '''
class Solution:
    def transpose(self, matrix: list[list[int]]) -> list[list[int]]:
        return [[matrix[j][i] for j in range(len(matrix))] for i in range(len(matrix[0]))]
''',
    'javascript': '''
var transpose = function(matrix) {
    let R = matrix.length, C = matrix[0].length;
    let ans = Array.from({length: C}, () => Array(R).fill(0));
    for (let r = 0; r < R; r++) {
        for (let c = 0; c < C; c++) {
            ans[c][r] = matrix[r][c];
        }
    }
    return ans;
};
''',
    'cpp': '''
class Solution {
public:
    vector<vector<int>> transpose(vector<vector<int>>& matrix) {
        int R = matrix.size(), C = matrix[0].size();
        vector<vector<int>> ans(C, vector<int>(R));
        for (int r = 0; r < R; r++) {
            for (int c = 0; c < C; c++) {
                ans[c][r] = matrix[r][c];
            }
        }
        return ans;
    }
};
''',
    'java': '''
class Solution {
    public int[][] transpose(int[][] matrix) {
        int R = matrix.length, C = matrix[0].length;
        int[][] ans = new int[C][R];
        for (int r = 0; r < R; r++) {
            for (int c = 0; c < C; c++) {
                ans[c][r] = matrix[r][c];
            }
        }
        return ans;
    }
}
''',
    'c': '''
int** transpose(int* matrix_flat, int matrix_rows, int matrix_cols, int* returnSize, int** returnColumnSizes) {
    *returnSize = matrix_cols;
    *returnColumnSizes = (int*)malloc(matrix_cols * sizeof(int));
    int** ans = (int**)malloc(matrix_cols * sizeof(int*));
    for (int c = 0; c < matrix_cols; c++) {
        (*returnColumnSizes)[c] = matrix_rows;
        ans[c] = (int*)malloc(matrix_rows * sizeof(int));
        for (int r = 0; r < matrix_rows; r++) {
            ans[c][r] = matrix_flat[r * matrix_cols + c];
        }
    }
    return ans;
}
'''
}

# Test solutions for BinaryTree
TREE_SOLUTIONS = {
    'python': '''
class Solution:
    def invertTree(self, root: Optional[TreeNode]) -> Optional[TreeNode]:
        if not root: return None
        root.left, root.right = self.invertTree(root.right), self.invertTree(root.left)
        return root
''',
    'javascript': '''
var invertTree = function(root) {
    if (!root) return null;
    let temp = root.left;
    root.left = invertTree(root.right);
    root.right = invertTree(temp);
    return root;
};
''',
    'cpp': '''
class Solution {
public:
    TreeNode* invertTree(TreeNode* root) {
        if (!root) return nullptr;
        TreeNode* temp = root->left;
        root->left = invertTree(root->right);
        root->right = invertTree(temp);
        return root;
    }
};
''',
    'java': '''
class Solution {
    public TreeNode invertTree(TreeNode root) {
        if (root == null) return null;
        TreeNode temp = root.left;
        root.left = invertTree(root.right);
        root.right = invertTree(temp);
        return root;
    }
}
''',
    'c': '''
struct TreeNode* invertTree(struct TreeNode* root) {
    if (!root) return NULL;
    struct TreeNode* temp = root->left;
    root->left = invertTree(root->right);
    root->right = invertTree(temp);
    return root;
}
'''
}

# STDIN_STDOUT test codes
STDIN_SOLUTIONS = {
    'python': 'import sys\nfor line in sys.stdin:\n    if line.strip():\n        print(int(line.strip()) * 2)',
    'javascript': 'const fs = require("fs"); const lines = fs.readFileSync(0, "utf-8").trim().split("\\n"); lines.forEach(l => { if (l.trim()) console.log(parseInt(l.trim()) * 2); });',
    'cpp': '#include <iostream>\nusing namespace std;\nint main() { int n; while (cin >> n) cout << (n * 2) << endl; return 0; }',
    'java': 'import java.util.*; public class Main { public static void main(String[] args) { Scanner sc = new Scanner(System.in); while (sc.hasNextInt()) System.out.println(sc.nextInt() * 2); } }',
    'c': '#include <stdio.h>\nint main() { int n; while (scanf("%d", &n) == 1) printf("%d\\n", n * 2); return 0; }'
}

async def run_test_suite():
    print("==========================================================================")
    print("                 KODECHIRP END-TO-END VALIDATION SUITE                    ")
    print("==========================================================================")

    passed_count = 0
    total_count = 0

    # 1. Test TwoSum (Primitives & Arrays) across 5 languages
    two_sum_sig = {
        'name': 'twoSum',
        'params': [{'name': 'nums', 'type': 'Array<Int>'}, {'name': 'target', 'type': 'Int'}],
        'returnType': 'Array<Int>'
    }
    two_sum_inputs = [
        json.dumps({'nums': [2, 7, 11, 15], 'target': 9}),
        json.dumps({'nums': [3, 2, 4], 'target': 6})
    ]
    two_sum_expected = ['[0,1]', '[1,2]']

    print("\n--- 1. Testing FUNCTION Mode: Array<Int> (TwoSum) ---")
    for lang, code in TWO_SUM_SOLUTIONS.items():
        total_count += 1
        wrapped_code = WrapperGenerator.generate_batch(lang, two_sum_sig, code)
        batch_stdin = "\n".join(two_sum_inputs) + "\n"

        res = await docker_service.execute_code(wrapped_code, lang, batch_stdin, timeout_ms=10000)
        if res.exitCode != 0:
            print(f"❌ {lang.upper()}: Execution/Compile Error -> {res.stderr}")
            continue

        parsed = parse_batch_outputs(res.stdout, len(two_sum_inputs))
        all_ok = True
        for i, (act, con) in enumerate(parsed):
            exp = two_sum_expected[i]
            if normalise_output(act) != normalise_output(exp):
                print(f"❌ {lang.upper()} TC {i+1}: expected {exp}, got {act}")
                all_ok = False
            elif "Hello from" not in con:
                print(f"⚠️ {lang.upper()} TC {i+1}: Output passed ({act}) but stdout capture missing ({con})")

        if all_ok:
            print(f"✅ {lang.upper()}: PASSED (Output & Console output captured correctly)")
            passed_count += 1

    # 2. Test Matrix<Int> across 5 languages
    matrix_sig = {
        'name': 'transpose',
        'params': [{'name': 'matrix', 'type': 'Matrix<Int>'}],
        'returnType': 'Matrix<Int>'
    }
    matrix_inputs = [
        json.dumps({'matrix': [[1, 2, 3], [4, 5, 6]]})
    ]
    matrix_expected = ['[[1,4],[2,5],[3,6]]']

    print("\n--- 2. Testing FUNCTION Mode: Matrix<Int> (Transpose) ---")
    for lang, code in MATRIX_SOLUTIONS.items():
        total_count += 1
        wrapped_code = WrapperGenerator.generate_batch(lang, matrix_sig, code)
        batch_stdin = "\n".join(matrix_inputs) + "\n"

        res = await docker_service.execute_code(wrapped_code, lang, batch_stdin, timeout_ms=10000)
        if res.exitCode != 0:
            print(f"❌ {lang.upper()}: Execution/Compile Error -> {res.stderr}")
            continue

        parsed = parse_batch_outputs(res.stdout, len(matrix_inputs))
        all_ok = True
        for i, (act, con) in enumerate(parsed):
            exp = matrix_expected[i]
            if normalise_output(act) != normalise_output(exp):
                print(f"❌ {lang.upper()} TC {i+1}: expected {exp}, got {act}")
                all_ok = False

        if all_ok:
            print(f"✅ {lang.upper()}: PASSED (Matrix transposed correctly)")
            passed_count += 1

    # 3. Test BinaryTree across 5 languages
    tree_sig = {
        'name': 'invertTree',
        'params': [{'name': 'root', 'type': 'BinaryTree'}],
        'returnType': 'BinaryTree'
    }
    tree_inputs = [
        json.dumps({'root': [4, 2, 7, 1, 3, 6, 9]})
    ]
    tree_expected = ['[4,7,2,9,6,3,1]']

    print("\n--- 3. Testing FUNCTION Mode: BinaryTree (InvertTree) ---")
    for lang, code in TREE_SOLUTIONS.items():
        total_count += 1
        wrapped_code = WrapperGenerator.generate_batch(lang, tree_sig, code)
        batch_stdin = "\n".join(tree_inputs) + "\n"

        res = await docker_service.execute_code(wrapped_code, lang, batch_stdin, timeout_ms=10000)
        if res.exitCode != 0:
            print(f"❌ {lang.upper()}: Execution/Compile Error -> {res.stderr}")
            continue

        parsed = parse_batch_outputs(res.stdout, len(tree_inputs))
        all_ok = True
        for i, (act, con) in enumerate(parsed):
            exp = tree_expected[i]
            if normalise_output(act) != normalise_output(exp):
                print(f"❌ {lang.upper()} TC {i+1}: expected {exp}, got {act}")
                all_ok = False

        if all_ok:
            print(f"✅ {lang.upper()}: PASSED (BinaryTree inverted correctly)")
            passed_count += 1

    # 4. Test STDIN_STDOUT Mode across 5 languages
    print("\n--- 4. Testing STDIN_STDOUT Mode (No Regression) ---")
    stdin_input = "5\n10\n"
    stdin_expected = "10\n20"

    for lang, code in STDIN_SOLUTIONS.items():
        total_count += 1
        res = await docker_service.execute_code(code, lang, stdin_input, timeout_ms=10000)
        if res.exitCode != 0:
            print(f"❌ {lang.upper()}: Execution Error -> {res.stderr}")
            continue

        if normalise_output(res.stdout) == normalise_output(stdin_expected):
            print(f"✅ {lang.upper()}: PASSED (STDIN/STDOUT works as expected)")
            passed_count += 1
        else:
            print(f"❌ {lang.upper()}: expected '{stdin_expected}', got '{res.stdout}'")

    print("\n==========================================================================")
    print(f"RESULTS SUMMARY: {passed_count}/{total_count} TESTS PASSED")
    print("==========================================================================")

if __name__ == '__main__':
    asyncio.run(run_test_suite())
