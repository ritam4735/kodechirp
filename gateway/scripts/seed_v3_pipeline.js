require('dotenv').config({ path: '../.env' });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://kodechirp:ritam123@localhost:5433/kodechirp'
});

const problemsData = {
  'two-sum': {
    judge_mode: 'FUNCTION',
    signature_metadata: { name: 'twoSum', params: [{ name: 'nums', type: 'Array<Int>' }, { name: 'target', type: 'Int' }], returnType: 'Array<Int>' },
    examples_json: [
      { input: "nums = [2,7,11,15], target = 9", output: "[0,1]", explanation: "Because nums[0] + nums[1] == 9, we return [0, 1]." },
      { input: "nums = [3,2,4], target = 6", output: "[1,2]", explanation: "" }
    ],
    constraints_json: ["2 <= nums.length <= 10^4", "-10^9 <= nums[i] <= 10^9", "-10^9 <= target <= 10^9", "Only one valid answer exists."],
    input_format: "nums\ntarget",
    output_format: "indices array",
    ref_fn: (nums, target) => {
      let m = new Map();
      for (let i = 0; i < nums.length; i++) {
        if (m.has(target - nums[i])) return [m.get(target - nums[i]), i];
        m.set(nums[i], i);
      }
      return [];
    },
    templates: {
      python: "def twoSum(nums, target):\n    # Write your code here\n    pass",
      javascript: "function twoSum(nums, target) {\n    // Write your code here\n}"
    },
    ref_code: {
      python: "def twoSum(nums, target):\n    m = {}\n    for i, n in enumerate(nums):\n        if target - n in m:\n            return [m[target - n], i]\n        m[n] = i\n    return []",
      javascript: "function twoSum(nums, target) {\n    let m = new Map();\n    for (let i = 0; i < nums.length; i++) {\n        if (m.has(target - nums[i])) return [m.get(target - nums[i]), i];\n        m.set(nums[i], i);\n    }\n    return [];\n}"
    },
    generateTests: () => {
      const tests = [];
      // 10 visible
      tests.push({ inputs: [[2,7,11,15], 9], is_sample: true });
      tests.push({ inputs: [[3,2,4], 6], is_sample: true });
      tests.push({ inputs: [[3,3], 6], is_sample: true });
      tests.push({ inputs: [[1, 2, 3, 4, 5], 9], is_sample: true });
      tests.push({ inputs: [[-1, -2, -3, -4, -5], -8], is_sample: true });
      tests.push({ inputs: [[0, 4, 3, 0], 0], is_sample: true });
      tests.push({ inputs: [[-10, 7, 19, 15], 9], is_sample: true });
      tests.push({ inputs: [[2, 5, 5, 11], 10], is_sample: true });
      tests.push({ inputs: [[1000000, 500, -1000000], 0], is_sample: true });
      tests.push({ inputs: [[2, 2], 4], is_sample: true });
      // 50 hidden
      for (let i = 0; i < 50; i++) {
        let size = Math.floor(Math.random() * 1000) + 2;
        let nums = [];
        for (let j = 0; j < size; j++) nums.push(Math.floor(Math.random() * 20000) - 10000);
        let idx1 = Math.floor(Math.random() * size);
        let idx2 = Math.floor(Math.random() * size);
        while(idx1 === idx2) idx2 = Math.floor(Math.random() * size);
        let target = nums[idx1] + nums[idx2];
        tests.push({ inputs: [nums, target], is_sample: false });
      }
      return tests;
    }
  },
  'valid-parentheses': {
    judge_mode: 'FUNCTION',
    signature_metadata: { name: 'isValid', params: [{ name: 's', type: 'String' }], returnType: 'Boolean' },
    examples_json: [
      { input: "s = \"()\"", output: "true", explanation: "" },
      { input: "s = \"()[]{}\"", output: "true", explanation: "" },
      { input: "s = \"(]\"", output: "false", explanation: "" }
    ],
    constraints_json: ["1 <= s.length <= 10^4", "s consists of parentheses only '()[]{}'."],
    input_format: "s",
    output_format: "boolean",
    ref_fn: (s) => {
      let stack = [];
      let map = { ')': '(', '}': '{', ']': '[' };
      for (let c of s) {
        if (map[c]) {
          if (stack.pop() !== map[c]) return false;
        } else {
          stack.push(c);
        }
      }
      return stack.length === 0;
    },
    templates: {
      python: "def isValid(s):\n    # Write your code here\n    pass",
      javascript: "function isValid(s) {\n    // Write your code here\n}"
    },
    ref_code: {
      python: "def isValid(s):\n    stack = []\n    mapping = {')': '(', '}': '{', ']': '['}\n    for char in s:\n        if char in mapping:\n            top_element = stack.pop() if stack else '#'\n            if mapping[char] != top_element:\n                return False\n        else:\n            stack.append(char)\n    return not stack",
      javascript: "function isValid(s) {\n    let stack = [];\n    let map = { ')': '(', '}': '{', ']': '[' };\n    for (let c of s) {\n        if (map[c]) {\n            if (stack.pop() !== map[c]) return false;\n        } else {\n            stack.push(c);\n        }\n    }\n    return stack.length === 0;\n}"
    },
    generateTests: () => {
      const tests = [];
      // 10 visible
      tests.push({ inputs: ["()"], is_sample: true });
      tests.push({ inputs: ["()[]{}"], is_sample: true });
      tests.push({ inputs: ["(]"], is_sample: true });
      tests.push({ inputs: ["([)]"], is_sample: true });
      tests.push({ inputs: ["{[]}"], is_sample: true });
      tests.push({ inputs: ["["], is_sample: true });
      tests.push({ inputs: ["]"], is_sample: true });
      tests.push({ inputs: ["(((())))"], is_sample: true });
      tests.push({ inputs: ["(((()))"], is_sample: true });
      tests.push({ inputs: ["(((((())))))()()()()[]{}{}{}{}[][][][]"], is_sample: true });
      // 50 hidden
      let chars = ['(', ')', '[', ']', '{', '}'];
      for (let i = 0; i < 25; i++) {
        let s = "";
        let len = Math.floor(Math.random() * 100) + 1;
        for (let j = 0; j < len; j++) s += chars[Math.floor(Math.random() * chars.length)];
        tests.push({ inputs: [s], is_sample: false });
      }
      for (let i = 0; i < 25; i++) { // valid ones
         let s = "";
         let pairs = ['()', '[]', '{}'];
         for (let j = 0; j < 50; j++) s += pairs[Math.floor(Math.random() * pairs.length)];
         tests.push({ inputs: [s], is_sample: false });
      }
      return tests;
    }
  },
  'reverse-linked-list': {
    judge_mode: 'FUNCTION',
    signature_metadata: { name: 'reverseList', params: [{ name: 'head', type: 'LinkedList' }], returnType: 'LinkedList' },
    examples_json: [
      { input: "head = [1,2,3,4,5]", output: "[5,4,3,2,1]", explanation: "" },
      { input: "head = [1,2]", output: "[2,1]", explanation: "" }
    ],
    constraints_json: ["The number of nodes in the list is the range [0, 5000].", "-5000 <= Node.val <= 5000"],
    input_format: "head",
    output_format: "reversed list",
    ref_fn: (head) => {
      let prev = null;
      let curr = head;
      while (curr !== null) {
          let nextTemp = curr.next;
          curr.next = prev;
          prev = curr;
          curr = nextTemp;
      }
      return prev;
    },
    // We mock LinkedList locally by using arrays, since the JS evaluation in this script runs locally.
    // The evaluation wrapper will give arrays, we process them as arrays here for simplicity of expected_json.
    // Wait, the python wrapper parses lists into ListNodes, and then serializes ListNodes back to arrays.
    // So the input_json will be an array, expected_json will be an array.
    ref_fn_wrapper: (arr) => {
      return arr.slice().reverse();
    },
    templates: {
      python: "# class ListNode:\n#     def __init__(self, val=0, next=None):\n#         self.val = val\n#         self.next = next\n\ndef reverseList(head):\n    # Write your code here\n    pass",
      javascript: "// class ListNode {\n//     constructor(val = 0, next = null) {\n//         this.val = val;\n//         this.next = next;\n//     }\n// }\n\nfunction reverseList(head) {\n    // Write your code here\n}"
    },
    ref_code: {
      python: "def reverseList(head):\n    prev = None\n    curr = head\n    while curr:\n        next_temp = curr.next\n        curr.next = prev\n        prev = curr\n        curr = next_temp\n    return prev",
      javascript: "function reverseList(head) {\n    let prev = null;\n    let curr = head;\n    while (curr !== null) {\n        let nextTemp = curr.next;\n        curr.next = prev;\n        prev = curr;\n        curr = nextTemp;\n    }\n    return prev;\n}"
    },
    generateTests: () => {
      const tests = [];
      tests.push({ inputs: [[1,2,3,4,5]], is_sample: true });
      tests.push({ inputs: [[1,2]], is_sample: true });
      tests.push({ inputs: [[]], is_sample: true });
      for (let i=0; i<7; i++) {
        tests.push({ inputs: [[i]], is_sample: true });
      }
      for (let i=0; i<50; i++) {
        let size = Math.floor(Math.random() * 50);
        let arr = [];
        for (let j=0; j<size; j++) arr.push(Math.floor(Math.random() * 100));
        tests.push({ inputs: [arr], is_sample: false });
      }
      return tests;
    }
  },
  'climbing-stairs': {
    judge_mode: 'FUNCTION',
    signature_metadata: { name: 'climbStairs', params: [{ name: 'n', type: 'Int' }], returnType: 'Int' },
    examples_json: [
      { input: "n = 2", output: "2", explanation: "1 step + 1 step or 2 steps" },
      { input: "n = 3", output: "3", explanation: "1+1+1, 1+2, 2+1" }
    ],
    constraints_json: ["1 <= n <= 45"],
    input_format: "n",
    output_format: "integer ways",
    ref_fn: (n) => {
      if (n <= 2) return n;
      let a = 1, b = 2;
      for (let i = 3; i <= n; i++) {
          let c = a + b;
          a = b;
          b = c;
      }
      return b;
    },
    templates: {
      python: "def climbStairs(n):\n    # Write your code here\n    pass",
      javascript: "function climbStairs(n) {\n    // Write your code here\n}"
    },
    ref_code: {
      python: "def climbStairs(n):\n    if n <= 2: return n\n    a, b = 1, 2\n    for i in range(3, n + 1):\n        a, b = b, a + b\n    return b",
      javascript: "function climbStairs(n) {\n    if (n <= 2) return n;\n    let a = 1, b = 2;\n    for (let i = 3; i <= n; i++) {\n        let c = a + b;\n        a = b;\n        b = c;\n    }\n    return b;\n}"
    },
    generateTests: () => {
      const tests = [];
      for (let i=1; i<=10; i++) {
         tests.push({ inputs: [i], is_sample: true });
      }
      for (let i=11; i<=45; i++) {
         tests.push({ inputs: [i], is_sample: false });
      }
      for (let i=0; i<15; i++) {
         tests.push({ inputs: [40 + Math.floor(Math.random()*6)], is_sample: false });
      }
      return tests;
    }
  },
  'merge-sorted-arrays': {
    judge_mode: 'FUNCTION',
    signature_metadata: { name: 'merge', params: [{ name: 'nums1', type: 'Array<Int>' }, { name: 'm', type: 'Int' }, { name: 'nums2', type: 'Array<Int>' }, { name: 'n', type: 'Int' }], returnType: 'Array<Int>' },
    examples_json: [
      { input: "nums1 = [1,2,3], m = 3, nums2 = [2,5,6], n = 3", output: "[1,2,2,3,5,6]", explanation: "" },
      { input: "nums1 = [1], m = 1, nums2 = [], n = 0", output: "[1]", explanation: "" }
    ],
    constraints_json: ["0 <= m, n <= 200", "1 <= m + n <= 200", "-10^9 <= nums1[i], nums2[j] <= 10^9"],
    input_format: "nums1, m, nums2, n",
    output_format: "merged array",
    ref_fn: (nums1, m, nums2, n) => {
      let res = nums1.slice(0, m).concat(nums2.slice(0, n));
      res.sort((a,b) => a-b);
      return res;
    },
    templates: {
      python: "def merge(nums1, m, nums2, n):\n    # Write your code here\n    pass",
      javascript: "function merge(nums1, m, nums2, n) {\n    // Write your code here\n}"
    },
    ref_code: {
      python: "def merge(nums1, m, nums2, n):\n    res = nums1[:m] + nums2[:n]\n    res.sort()\n    return res",
      javascript: "function merge(nums1, m, nums2, n) {\n    let res = nums1.slice(0, m).concat(nums2.slice(0, n));\n    res.sort((a, b) => a - b);\n    return res;\n}"
    },
    generateTests: () => {
      const tests = [];
      tests.push({ inputs: [[1,2,3], 3, [2,5,6], 3], is_sample: true });
      tests.push({ inputs: [[1], 1, [], 0], is_sample: true });
      tests.push({ inputs: [[], 0, [1], 1], is_sample: true });
      tests.push({ inputs: [[1,2,3,0,0,0], 3, [2,5,6], 3], is_sample: true }); // padding case ignored by ref code based on slicing but fine
      for(let k=0; k<6; k++) tests.push({ inputs: [[1,5,9], 3, [2,3,4], 3], is_sample: true });
      
      for(let i=0; i<50; i++) {
        let m = Math.floor(Math.random() * 50);
        let n = Math.floor(Math.random() * 50);
        let nums1 = Array.from({length: m}, () => Math.floor(Math.random() * 100)).sort((a,b)=>a-b);
        let nums2 = Array.from({length: n}, () => Math.floor(Math.random() * 100)).sort((a,b)=>a-b);
        tests.push({ inputs: [nums1, m, nums2, n], is_sample: false });
      }
      return tests;
    }
  },
  'maximum-subarray': {
    judge_mode: 'FUNCTION',
    signature_metadata: { name: 'maxSubArray', params: [{ name: 'nums', type: 'Array<Int>' }, { name: 'n', type: 'Int' }], returnType: 'Int' },
    examples_json: [
      { input: "nums = [-2,1,-3,4,-1,2,1,-5,4], n = 9", output: "6", explanation: "The subarray [4,-1,2,1] has the largest sum 6." },
      { input: "nums = [1], n = 1", output: "1", explanation: "" }
    ],
    constraints_json: ["1 <= nums.length <= 10^5", "-10^4 <= nums[i] <= 10^4"],
    input_format: "nums array and n length",
    output_format: "integer sum",
    ref_fn: (nums, n) => {
      let max_sum = -Infinity;
      let curr_sum = 0;
      for(let num of nums) {
          curr_sum = Math.max(num, curr_sum + num);
          max_sum = Math.max(max_sum, curr_sum);
      }
      return max_sum;
    },
    templates: {
      python: "def maxSubArray(nums, n):\n    # Write your code here\n    pass",
      javascript: "function maxSubArray(nums, n) {\n    // Write your code here\n}"
    },
    ref_code: {
      python: "def maxSubArray(nums, n):\n    max_sum = float('-inf')\n    curr_sum = 0\n    for num in nums:\n        curr_sum = max(num, curr_sum + num)\n        max_sum = max(max_sum, curr_sum)\n    return max_sum",
      javascript: "function maxSubArray(nums, n) {\n    let max_sum = -Infinity;\n    let curr_sum = 0;\n    for(let num of nums) {\n        curr_sum = Math.max(num, curr_sum + num);\n        max_sum = Math.max(max_sum, curr_sum);\n    }\n    return max_sum;\n}"
    },
    generateTests: () => {
      const tests = [];
      tests.push({ inputs: [[-2,1,-3,4,-1,2,1,-5,4], 9], is_sample: true });
      tests.push({ inputs: [[1], 1], is_sample: true });
      tests.push({ inputs: [[5,4,-1,7,8], 5], is_sample: true });
      tests.push({ inputs: [[-1], 1], is_sample: true });
      tests.push({ inputs: [[-1, -2, -3, -4], 4], is_sample: true });
      for(let i=0; i<5; i++) tests.push({ inputs: [[0,0,0,0], 4], is_sample: true });
      for(let i=0; i<50; i++) {
        let n = Math.floor(Math.random() * 100) + 1;
        let nums = Array.from({length: n}, () => Math.floor(Math.random() * 20000) - 10000);
        tests.push({ inputs: [nums, n], is_sample: false });
      }
      return tests;
    }
  }
};

async function run() {
  try {
    const adminRes = await pool.query("SELECT id FROM users WHERE role = 'admin' LIMIT 1");
    const adminId = adminRes.rows[0]?.id || null;

    const probRes = await pool.query("SELECT * FROM problems");
    const existingProblems = probRes.rows;

    for (const prob of existingProblems) {
      const pData = problemsData[prob.slug];
      if (!pData) continue;
      
      console.log(`Processing ${prob.slug}...`);

      // 1. Update metadata
      await pool.query(`
        UPDATE problems 
        SET judge_mode = $1, 
            signature_metadata = $2,
            examples_json = $3,
            constraints_json = $4,
            input_format = $5,
            output_format = $6,
            review_status = 'published',
            status = 'Published'
        WHERE id = $7
      `, [
        pData.judge_mode,
        JSON.stringify(pData.signature_metadata),
        JSON.stringify(pData.examples_json),
        JSON.stringify(pData.constraints_json),
        pData.input_format,
        pData.output_format,
        prob.id
      ]);

      // 2. Insert templates
      for (const [lang, code] of Object.entries(pData.templates)) {
        await pool.query(`
          INSERT INTO problem_templates (problem_id, language, starter_code)
          VALUES ($1, $2, $3)
          ON CONFLICT (problem_id, language) DO UPDATE SET starter_code = $3
        `, [prob.id, lang, code]);
      }

      // 3. Reference solution
      let refId;
      const existingRef = await pool.query("SELECT id FROM reference_solutions WHERE problem_id = $1 LIMIT 1", [prob.id]);
      if (existingRef.rowCount > 0) {
        refId = existingRef.rows[0].id;
        await pool.query(`
          UPDATE reference_solutions 
          SET language = 'python', source_code = $1, compile_status = 'verified'
          WHERE id = $2
        `, [pData.ref_code.python, refId]);
      } else {
        const insertRef = await pool.query(`
          INSERT INTO reference_solutions (problem_id, language, source_code, compile_status, created_by)
          VALUES ($1, 'python', $2, 'verified', $3) RETURNING id
        `, [prob.id, pData.ref_code.python, adminId]);
        refId = insertRef.rows[0].id;
      }
      
      await pool.query("UPDATE problems SET reference_solution_id = $1 WHERE id = $2", [refId, prob.id]);

      // 4. Test cases
      await pool.query("DELETE FROM test_cases WHERE problem_id = $1", [prob.id]);
      
      const tests = pData.generateTests();
      for (let i = 0; i < tests.length; i++) {
        const test = tests[i];
        let input_json = {};
        for (let j = 0; j < pData.signature_metadata.params.length; j++) {
            input_json[pData.signature_metadata.params[j].name] = test.inputs[j];
        }
        
        let expected_out;
        if (pData.ref_fn_wrapper) {
            expected_out = pData.ref_fn_wrapper(...test.inputs);
        } else {
            expected_out = pData.ref_fn(...test.inputs);
        }

        // Expected output string format (similar to what Python/JS wrappers do: print(json.dumps(...)))
        let expected_output_str = JSON.stringify(expected_out);
        let input_str = JSON.stringify(input_json); // Standard input is just the stringified json object

        await pool.query(`
          INSERT INTO test_cases (problem_id, input, expected_output, input_json, expected_json, is_sample, order_index, category, verified)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true)
        `, [
          prob.id,
          input_str,
          expected_output_str,
          JSON.stringify(input_json),
          JSON.stringify(expected_out),
          test.is_sample,
          i,
          test.is_sample ? 'public' : 'hidden'
        ]);
      }
      console.log(`✅ Seeded ${tests.length} tests for ${prob.slug}`);
    }
    
    console.log("All problems seeded successfully.");
  } catch(e) {
    console.error(e);
  } finally {
    pool.end();
  }
}

run();
