-- KodeChirp Database Schema
-- Run this to initialize your PostgreSQL database

-- Safely create tables without dropping existing ones
-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  avatar_url TEXT,
  bio TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Problems table
CREATE TABLE IF NOT EXISTS problems (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug VARCHAR(100) UNIQUE NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  difficulty VARCHAR(20) DEFAULT 'Medium',
  input_format TEXT,
  output_format TEXT,
  constraints TEXT,
  time_limit_ms INTEGER DEFAULT 2000,
  memory_limit_mb INTEGER DEFAULT 256,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Test cases table
CREATE TABLE IF NOT EXISTS test_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  problem_id UUID REFERENCES problems(id) ON DELETE CASCADE,
  input TEXT NOT NULL,
  expected_output TEXT NOT NULL,
  is_sample BOOLEAN DEFAULT FALSE,
  explanation TEXT,
  order_index INTEGER DEFAULT 0
);

-- Submissions table
CREATE TABLE IF NOT EXISTS submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  problem_id UUID REFERENCES problems(id) ON DELETE CASCADE,
  language VARCHAR(20) NOT NULL,
  code TEXT NOT NULL,
  status VARCHAR(50) NOT NULL, -- Accepted, Wrong Answer, Runtime Error, TLE, Compilation Error
  runtime_ms INTEGER,
  memory_kb INTEGER,
  failed_test_input TEXT,
  failed_test_expected TEXT,
  failed_test_actual TEXT,
  judge0_token VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Chirps (peer explanations) table
CREATE TABLE IF NOT EXISTS chirps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  problem_id UUID REFERENCES problems(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  code_snippet TEXT,
  approach_tag VARCHAR(50), -- greedy, dp, brute-force, two-pointers, etc.
  upvote_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Chirp upvotes (to prevent duplicate voting)
CREATE TABLE IF NOT EXISTS chirp_upvotes (
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  chirp_id UUID REFERENCES chirps(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, chirp_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_submissions_user_id ON submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_submissions_problem_id ON submissions(problem_id);
CREATE INDEX IF NOT EXISTS idx_chirps_problem_id ON chirps(problem_id);
CREATE INDEX IF NOT EXISTS idx_chirps_upvotes ON chirps(upvote_count DESC);

-- ============================================================
-- SEED DATA
-- ============================================================

-- Sample problems
INSERT INTO problems (id, slug, title, description, difficulty, input_format, output_format, constraints) VALUES
(
  '11111111-1111-1111-1111-111111111111',
  'two-sum',
  'Two Sum',
  'Given an array of integers `nums` and an integer `target`, return indices of the two numbers such that they add up to target.

You may assume that each input would have exactly one solution, and you may not use the same element twice.

You can return the answer in any order.',
  'Easy',
  'First line contains n (size of array) and target separated by space.
Second line contains n space-separated integers.',
  'Print two space-separated indices (0-indexed) that sum to target.',
  '2 ≤ n ≤ 10^4
-10^9 ≤ nums[i] ≤ 10^9
-10^9 ≤ target ≤ 10^9
Only one valid answer exists.'
),
(
  '22222222-2222-2222-2222-222222222222',
  'valid-parentheses',
  'Valid Parentheses',
  'Given a string s containing just the characters `(`, `)`, `{`, `}`, `[` and `]`, determine if the input string is valid.

An input string is valid if:
- Open brackets must be closed by the same type of brackets.
- Open brackets must be closed in the correct order.
- Every close bracket has a corresponding open bracket of the same type.',
  'Easy',
  'A single line containing the string s.',
  'Print "true" if the string is valid, "false" otherwise.',
  '1 ≤ |s| ≤ 10^4
s consists of parentheses only: ()[]{}'
),
(
  '33333333-3333-3333-3333-333333333333',
  'reverse-linked-list',
  'Reverse Linked List',
  'Given the head of a singly linked list, reverse the list, and return the reversed list.

**Example:**
Input: 1 → 2 → 3 → 4 → 5
Output: 5 → 4 → 3 → 2 → 1',
  'Medium',
  'First line contains n (number of nodes).
Second line contains n space-separated integers representing node values.',
  'Print the values of the reversed linked list separated by spaces.',
  '0 ≤ n ≤ 5000
-5000 ≤ Node.val ≤ 5000'
),
(
  '44444444-4444-4444-4444-444444444444',
  'climbing-stairs',
  'Climbing Stairs',
  'You are climbing a staircase. It takes `n` steps to reach the top.

Each time you can either climb 1 or 2 steps. In how many distinct ways can you climb to the top?',
  'Medium',
  'A single integer n.',
  'Print the number of distinct ways to climb to the top.',
  '1 ≤ n ≤ 45'
),
(
  '55555555-5555-5555-5555-555555555555',
  'maximum-subarray',
  'Maximum Subarray',
  'Given an integer array `nums`, find the subarray with the largest sum, and return its sum.

A subarray is a contiguous non-empty sequence of elements within an array.',
  'Hard',
  'First line contains n (size of array).
Second line contains n space-separated integers.',
  'Print the maximum subarray sum.',
  '1 ≤ n ≤ 10^5
-10^4 ≤ nums[i] ≤ 10^4'
),
(
  '66666666-6666-6666-6666-666666666666',
  'merge-sorted-arrays',
  'Merge Sorted Arrays',
  'You are given two integer arrays `nums1` and `nums2`, sorted in non-decreasing order, and two integers `m` and `n`, representing the number of elements in nums1 and nums2 respectively.

Merge nums1 and nums2 into a single array sorted in non-decreasing order.',
  'Easy',
  'First line: m n
Second line: m space-separated integers (nums1)
Third line: n space-separated integers (nums2)',
  'Print the merged sorted array space-separated.',
  '0 ≤ m, n ≤ 200
1 ≤ m + n ≤ 200
-10^9 ≤ nums[i] ≤ 10^9'
) ON CONFLICT (id) DO NOTHING;

-- Sample test cases
INSERT INTO test_cases (id, problem_id, input, expected_output, is_sample, explanation, order_index) VALUES
('a1111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', '4 9
2 7 11 15', '0 1', TRUE, 'Because nums[0] + nums[1] = 2 + 7 = 9', 0),
('b1111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', '3 6
3 2 4', '1 2', TRUE, 'Because nums[1] + nums[2] = 2 + 4 = 6', 1),
('c1111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', '2 6
3 3', '0 1', FALSE, 'Hidden test case', 2),

('a2222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', '()', 'true', TRUE, 'Simple valid parenthesis pair', 0),
('b2222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', '()[]{}'  , 'true', TRUE, 'Multiple valid pairs', 1),
('c2222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', '(]', 'false', TRUE, 'Mismatched brackets', 2),

('a3333333-3333-3333-3333-333333333333', '33333333-3333-3333-3333-333333333333', '5
1 2 3 4 5', '5 4 3 2 1', TRUE, 'Reverse the list', 0),
('b3333333-3333-3333-3333-333333333333', '33333333-3333-3333-3333-333333333333', '2
1 2', '2 1', TRUE, 'Reverse two-element list', 1),

('a4444444-4444-4444-4444-444444444444', '44444444-4444-4444-4444-444444444444', '2', '2', TRUE, 'Either 1+1 or 2 steps', 0),
('b4444444-4444-4444-4444-444444444444', '44444444-4444-4444-4444-444444444444', '3', '3', TRUE, '1+1+1, 1+2, or 2+1', 1),

('a5555555-5555-5555-5555-555555555555', '55555555-5555-5555-5555-555555555555', '9
-2 1 -3 4 -1 2 1 -5 4', '6', TRUE, 'Subarray [4,-1,2,1] has the largest sum = 6', 0),
('b5555555-5555-5555-5555-555555555555', '55555555-5555-5555-5555-555555555555', '1
1', '1', TRUE, 'Single element', 1),

('a6666666-6666-6666-6666-666666666666', '66666666-6666-6666-6666-666666666666', '3 3
1 2 3
2 5 6', '1 2 2 3 5 6', TRUE, 'Merge two sorted arrays', 0)
ON CONFLICT (id) DO NOTHING;

-- Sample chirps
INSERT INTO chirps (id, problem_id, user_id, content, code_snippet, approach_tag, upvote_count) VALUES
(
  'c1111111-1111-1111-1111-111111111111',
  '11111111-1111-1111-1111-111111111111',
  NULL,
  'The key insight is to use a HashMap to store each number and its index. For each element, check if (target - current) exists in the map. This gives us O(n) time complexity instead of the naive O(n²) approach.',
  'def twoSum(nums, target):
    seen = {}
    for i, num in enumerate(nums):
        complement = target - num
        if complement in seen:
            return [seen[complement], i]
        seen[num] = i',
  'hash-map',
  42
),
(
  'c2222222-1111-1111-1111-111111111111',
  '11111111-1111-1111-1111-111111111111',
  NULL,
  'Think of it like this: you''re walking through an array with a "buddy list". For each number you meet, you check if its perfect partner (target minus itself) is already in the list. If yes, you''ve found your pair! Otherwise, add yourself to the list for future numbers to find.',
  NULL,
  'hash-map',
  28
),
(
  'c3333333-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222',
  NULL,
  'Classic stack problem! Push opening brackets onto the stack. When you see a closing bracket, check if the top of the stack matches. If not, invalid. At the end, stack should be empty.',
  'def isValid(s):
    stack = []
    mapping = {")": "(", "}": "{", "]": "["}
    for char in s:
        if char in mapping:
            top = stack.pop() if stack else "#"
            if mapping[char] != top:
                return False
        else:
            stack.append(char)
    return not stack',
  'stack',
  35
) ON CONFLICT (id) DO NOTHING;
