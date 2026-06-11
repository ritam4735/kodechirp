// gateway/tests/problemParser.test.js
// ─────────────────────────────────────────────────────────────────────────────
// Unit tests for the Problem Parser
// Run: npx jest tests/problemParser.test.js
// ─────────────────────────────────────────────────────────────────────────────

const { parseProblem, _internals } = require('../src/services/problemParser');
const { classifyLine, parseExampleBlock, parseConstraintLines } = _internals;

// ── Test Data ───────────────────────────────────────────────────────────────

const FULL_PROBLEM = `Given an integer array nums and an integer target, return indices of the two numbers such that they add up to target.

You may assume that each input would have exactly one solution, and you may not use the same element twice.

You can return the answer in any order.

Example 1:

Input: nums = [2,7,11,15], target = 9

Output: [0,1]

Explanation: Because nums[0] + nums[1] == 9, we return [0,1].

Example 2:

Input: nums = [3,2,4], target = 6

Output: [1,2]

Example 3:

Input: nums = [3,3], target = 6

Output: [0,1]

Constraints:

2 <= nums.length <= 10^4
-10^9 <= nums[i] <= 10^9
-10^9 <= target <= 10^9
Only one valid answer exists.

Follow-up:

Can you come up with an algorithm that is less than O(n^2) time complexity?`;

const PROBLEM_NO_CONSTRAINTS = `Given a string s, find the length of the longest substring without repeating characters.

Example 1:

Input: s = "abcabcbb"
Output: 3
Explanation: The answer is "abc", with the length of 3.

Example 2:

Input: s = "bbbbb"
Output: 1
Explanation: The answer is "b", with the length of 1.`;

const PROBLEM_MINIMAL = `Return the sum of two integers.`;

const PROBLEM_CASE_INSENSITIVE = `Find the median of two sorted arrays.

EXAMPLE 1:

INPUT: nums1 = [1,3], nums2 = [2]
OUTPUT: 2.00000

EXAMPLE 2:

INPUT: nums1 = [1,2], nums2 = [3,4]
OUTPUT: 2.50000

Constraint:

nums1.length + nums2.length >= 1`;

const PROBLEM_NOTES = `Given the root of a binary tree, return the level order traversal of its nodes' values.

Example 1:

Input: root = [3,9,20,null,null,15,7]
Output: [[3],[9,20],[15,7]]

Note:

The number of nodes in the tree is in the range [0, 2000].
-1000 <= Node.val <= 1000`;

const PROBLEM_COMPACT = `Return true if x is a palindrome integer.

Example 1: Input: x = 121
Output: true
Explanation: 121 reads as 121 from left to right and from right to left.

Example 2: Input: x = -121
Output: false

Constraints: -2^31 <= x <= 2^31 - 1

Follow-up: Could you solve it without converting the integer to a string?`;

// ── Tests ───────────────────────────────────────────────────────────────────

describe('Problem Parser', () => {
  describe('parseProblem — full problem', () => {
    let result;
    beforeAll(() => {
      result = parseProblem(FULL_PROBLEM);
    });

    test('extracts description without examples/constraints', () => {
      expect(result.parsed.description).toContain('Given an integer array nums');
      expect(result.parsed.description).toContain('return the answer in any order');
      expect(result.parsed.description).not.toContain('Example');
      expect(result.parsed.description).not.toContain('Constraint');
    });

    test('extracts 3 examples', () => {
      expect(result.parsed.examples).toHaveLength(3);
    });

    test('examples have input and output', () => {
      expect(result.parsed.examples[0].input).toContain('nums = [2,7,11,15]');
      expect(result.parsed.examples[0].output).toBe('[0,1]');
    });

    test('example 1 has explanation', () => {
      expect(result.parsed.examples[0].explanation).toContain('Because nums[0]');
    });

    test('example 2 has no explanation', () => {
      expect(result.parsed.examples[1].explanation).toBeUndefined();
    });

    test('extracts constraints', () => {
      expect(result.parsed.constraints).toHaveLength(4);
      expect(result.parsed.constraints[0]).toContain('2 <= nums.length');
    });

    test('extracts follow-up as notes', () => {
      expect(result.parsed.notes).toHaveLength(1);
      expect(result.parsed.notes[0]).toContain('O(n^2)');
    });

    test('confidence is high (>= 0.90)', () => {
      expect(result.confidence).toBeGreaterThanOrEqual(0.90);
    });
  });

  describe('parseProblem — no constraints', () => {
    let result;
    beforeAll(() => {
      result = parseProblem(PROBLEM_NO_CONSTRAINTS);
    });

    test('extracts description', () => {
      expect(result.parsed.description).toContain('longest substring');
    });

    test('extracts 2 examples', () => {
      expect(result.parsed.examples).toHaveLength(2);
    });

    test('no constraints', () => {
      expect(result.parsed.constraints).toHaveLength(0);
    });

    test('confidence is medium (0.60-0.80)', () => {
      expect(result.confidence).toBeGreaterThanOrEqual(0.60);
      expect(result.confidence).toBeLessThanOrEqual(0.80);
    });
  });

  describe('parseProblem — minimal input', () => {
    let result;
    beforeAll(() => {
      result = parseProblem(PROBLEM_MINIMAL);
    });

    test('description is the whole text', () => {
      expect(result.parsed.description).toBe('Return the sum of two integers.');
    });

    test('no examples', () => {
      expect(result.parsed.examples).toHaveLength(0);
    });

    test('no constraints', () => {
      expect(result.parsed.constraints).toHaveLength(0);
    });

    test('confidence is low (<= 0.40)', () => {
      expect(result.confidence).toBeLessThanOrEqual(0.40);
    });
  });

  describe('parseProblem — case insensitive headers', () => {
    let result;
    beforeAll(() => {
      result = parseProblem(PROBLEM_CASE_INSENSITIVE);
    });

    test('extracts 2 examples from uppercase headers', () => {
      expect(result.parsed.examples).toHaveLength(2);
    });

    test('extracts input/output from uppercase fields', () => {
      expect(result.parsed.examples[0].input).toContain('nums1 = [1,3]');
      expect(result.parsed.examples[0].output).toContain('2.00000');
    });

    test('extracts singular "Constraint:" header', () => {
      expect(result.parsed.constraints).toHaveLength(1);
    });
  });

  describe('parseProblem — notes section', () => {
    let result;
    beforeAll(() => {
      result = parseProblem(PROBLEM_NOTES);
    });

    test('extracts notes from "Note:" header', () => {
      expect(result.parsed.notes.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('parseProblem — compact inline sections', () => {
    let result;
    beforeAll(() => {
      result = parseProblem(PROBLEM_COMPACT);
    });

    test('extracts examples with input on the header line', () => {
      expect(result.parsed.examples).toHaveLength(2);
      expect(result.parsed.examples[0].input).toBe('x = 121');
      expect(result.parsed.examples[1].input).toBe('x = -121');
    });

    test('extracts inline constraints and follow-up notes', () => {
      expect(result.parsed.constraints).toEqual(['-2^31 <= x <= 2^31 - 1']);
      expect(result.parsed.notes).toEqual(['Could you solve it without converting the integer to a string?']);
    });
  });

  describe('fault tolerance', () => {
    test('handles null input', () => {
      const result = parseProblem(null);
      expect(result.parsed.description).toBe('');
      expect(result.parsed.examples).toEqual([]);
      expect(result.confidence).toBe(0);
    });

    test('handles empty string', () => {
      const result = parseProblem('');
      expect(result.parsed.description).toBe('');
      expect(result.confidence).toBe(0);
    });

    test('handles undefined input', () => {
      const result = parseProblem(undefined);
      expect(result.confidence).toBe(0);
    });

    test('handles numeric input', () => {
      const result = parseProblem(42);
      expect(result.confidence).toBe(0);
    });

    test('never throws', () => {
      expect(() => parseProblem(null)).not.toThrow();
      expect(() => parseProblem('')).not.toThrow();
      expect(() => parseProblem(undefined)).not.toThrow();
      expect(() => parseProblem(42)).not.toThrow();
      expect(() => parseProblem({})).not.toThrow();
    });
  });

  describe('classifyLine', () => {
    test('detects example headers', () => {
      expect(classifyLine('Example 1:').type).toBe('EXAMPLE');
      expect(classifyLine('Example 2:').type).toBe('EXAMPLE');
      expect(classifyLine('EXAMPLE 1:').type).toBe('EXAMPLE');
      expect(classifyLine('Example:').type).toBe('EXAMPLE');
      expect(classifyLine('example 3:').type).toBe('EXAMPLE');
    });

    test('detects constraint headers', () => {
      expect(classifyLine('Constraints:').type).toBe('CONSTRAINT');
      expect(classifyLine('Constraint:').type).toBe('CONSTRAINT');
      expect(classifyLine('CONSTRAINTS:').type).toBe('CONSTRAINT');
    });

    test('detects note headers', () => {
      expect(classifyLine('Note:').type).toBe('NOTE');
      expect(classifyLine('Notes:').type).toBe('NOTE');
      expect(classifyLine('Follow Up:').type).toBe('NOTE');
      expect(classifyLine('Follow-up:').type).toBe('NOTE');
    });

    test('returns null for non-headers', () => {
      expect(classifyLine('Given an array...')).toBeNull();
      expect(classifyLine('Input: [1,2,3]')).toBeNull();
      expect(classifyLine('')).toBeNull();
    });
  });

  describe('parseExampleBlock', () => {
    test('parses input/output/explanation', () => {
      const lines = [
        'Input: nums = [1,2,3]',
        'Output: 6',
        'Explanation: 1+2+3 = 6',
      ];
      const result = parseExampleBlock(lines);
      expect(result.input).toBe('nums = [1,2,3]');
      expect(result.output).toBe('6');
      expect(result.explanation).toBe('1+2+3 = 6');
    });

    test('handles missing explanation', () => {
      const lines = [
        'Input: x = 5',
        'Output: 25',
      ];
      const result = parseExampleBlock(lines);
      expect(result.input).toBe('x = 5');
      expect(result.output).toBe('25');
      expect(result.explanation).toBeUndefined();
    });
  });

  describe('parseConstraintLines', () => {
    test('parses constraint lines', () => {
      const lines = [
        '1 <= n <= 100',
        '- -10^9 <= x <= 10^9',
        '• Only one valid answer exists.',
      ];
      const result = parseConstraintLines(lines);
      expect(result).toHaveLength(3);
      expect(result[0]).toBe('1 <= n <= 100');
    });

    test('handles empty lines', () => {
      const lines = ['', '  ', '1 <= n <= 10', ''];
      const result = parseConstraintLines(lines);
      expect(result).toHaveLength(1);
    });

    test('preserves leading negative signs', () => {
      const lines = ['-10^9 <= nums[i] <= 10^9'];
      const result = parseConstraintLines(lines);
      expect(result).toEqual(['-10^9 <= nums[i] <= 10^9']);
    });
  });
});
