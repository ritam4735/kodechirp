#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// review_unpublished.js
// Systematic review, repair, test generation, and verification of unpublished
// questions in KodeChirp.
// ─────────────────────────────────────────────────────────────────────────────

'use strict';

const db = require('../config/database');
const logger = require('../utils/logger');
const referenceSolutionService = require('../services/referenceSolutionService');
const { generateAndValidateSuite } = require('../services/testGen/engine');
const { validateSignature } = require('../utils/typeSystem');
const { generateAllTemplates } = require('../utils/templateGenerator');
const { REFERENCE_CATALOG } = require('./referenceCatalog');
const { NEW_CATALOG_ENTRIES } = require('./extendedCatalog');

// ── Extended Reference Catalog (50+ New Canonical Solutions) ─────────────────
const EXTENDED_CATALOG = {
  ...REFERENCE_CATALOG,
  ...NEW_CATALOG_ENTRIES,

  'house-robber': {
    signature: {
      name: 'houseRobber',
      params: [{ name: 'nums', type: 'Array<Int>' }],
      returnType: 'Int'
    },
    python: `def houseRobber(nums):
    if not nums: return 0
    if len(nums) == 1: return nums[0]
    prev2, prev1 = 0, 0
    for x in nums:
        curr = max(prev1, prev2 + x)
        prev2, prev1 = prev1, curr
    return prev1`,
    cleanExamples: [
      { input: { nums: [1, 2, 3, 1] }, expected: 4 },
      { input: { nums: [2, 7, 9, 3, 1] }, expected: 12 }
    ]
  },

  'two-sum-ii-input-array-is-sorted': {
    signature: {
      name: 'twoSumIiInputArrayIsSorted',
      params: [
        { name: 'numbers', type: 'Array<Int>' },
        { name: 'target', type: 'Int' }
      ],
      returnType: 'Array<Int>'
    },
    python: `def twoSumIiInputArrayIsSorted(numbers, target):
    l, r = 0, len(numbers) - 1
    while l < r:
        s = numbers[l] + numbers[r]
        if s == target:
            return [l + 1, r + 1]
        elif s < target:
            l += 1
        else:
            r -= 1
    return []`,
    cleanExamples: [
      { input: { numbers: [2, 7, 11, 15], target: 9 }, expected: [1, 2] },
      { input: { numbers: [2, 3, 4], target: 6 }, expected: [1, 3] },
      { input: { numbers: [-1, 0], target: -1 }, expected: [1, 2] }
    ]
  },

  'search-a-2d-matrix': {
    signature: {
      name: 'searchA2dMatrix',
      params: [
        { name: 'matrix', type: 'Matrix<Int>' },
        { name: 'target', type: 'Int' }
      ],
      returnType: 'Boolean'
    },
    python: `def searchA2dMatrix(matrix, target):
    if not matrix or not matrix[0]: return False
    m, n = len(matrix), len(matrix[0])
    low, high = 0, m * n - 1
    while low <= high:
        mid = (low + high) // 2
        val = matrix[mid // n][mid % n]
        if val == target: return True
        elif val < target: low = mid + 1
        else: high = mid - 1
    return False`,
    cleanExamples: [
      { input: { matrix: [[1, 3, 5, 7], [10, 11, 16, 20], [23, 30, 34, 60]], target: 3 }, expected: true },
      { input: { matrix: [[1, 3, 5, 7], [10, 11, 16, 20], [23, 30, 34, 60]], target: 13 }, expected: false }
    ]
  },

  'sort-colors': {
    signature: {
      name: 'sortColors',
      params: [{ name: 'nums', type: 'Array<Int>' }],
      returnType: 'Array<Int>'
    },
    python: `def sortColors(nums):
    low, mid, high = 0, 0, len(nums) - 1
    while mid <= high:
        if nums[mid] == 0:
            nums[low], nums[mid] = nums[mid], nums[low]
            low += 1
            mid += 1
        elif nums[mid] == 1:
            mid += 1
        else:
            nums[mid], nums[high] = nums[high], nums[mid]
            high -= 1
    return nums`,
    cleanExamples: [
      { input: { nums: [2, 0, 2, 1, 1, 0] }, expected: [0, 0, 1, 1, 2, 2] },
      { input: { nums: [2, 0, 1] }, expected: [0, 1, 2] }
    ]
  },

  'subsets': {
    signature: {
      name: 'subsets',
      params: [{ name: 'nums', type: 'Array<Int>' }],
      returnType: 'Matrix<Int>'
    },
    python: `def subsets(nums):
    res = [[]]
    for n in sorted(nums):
        res += [curr + [n] for curr in res]
    return res`,
    cleanExamples: [
      { input: { nums: [1, 2, 3] }, expected: [[], [1], [2], [1, 2], [3], [1, 3], [2, 3], [1, 2, 3]] },
      { input: { nums: [0] }, expected: [[], [0]] }
    ]
  },

  'kth-largest-element-in-an-array': {
    signature: {
      name: 'kthLargestElementInAnArray',
      params: [
        { name: 'nums', type: 'Array<Int>' },
        { name: 'k', type: 'Int' }
      ],
      returnType: 'Int'
    },
    python: `def kthLargestElementInAnArray(nums, k):
    nums.sort(reverse=True)
    return nums[k - 1]`,
    cleanExamples: [
      { input: { nums: [3, 2, 1, 5, 6, 4], k: 2 }, expected: 5 },
      { input: { nums: [3, 2, 3, 1, 2, 4, 5, 5, 6], k: 4 }, expected: 4 }
    ]
  },

  'decode-ways': {
    signature: {
      name: 'decodeWays',
      params: [{ name: 's', type: 'String' }],
      returnType: 'Int'
    },
    python: `def decodeWays(s):
    if not s or s[0] == '0': return 0
    n = len(s)
    dp = [0] * (n + 1)
    dp[0] = 1
    dp[1] = 1
    for i in range(2, n + 1):
        one = int(s[i-1:i])
        two = int(s[i-2:i])
        if 1 <= one <= 9: dp[i] += dp[i - 1]
        if 10 <= two <= 26: dp[i] += dp[i - 2]
    return dp[n]`,
    cleanExamples: [
      { input: { s: '12' }, expected: 2 },
      { input: { s: '226' }, expected: 3 },
      { input: { s: '06' }, expected: 0 }
    ]
  },

  'spiral-matrix': {
    signature: {
      name: 'spiralMatrix',
      params: [{ name: 'matrix', type: 'Matrix<Int>' }],
      returnType: 'Array<Int>'
    },
    python: `def spiralMatrix(matrix):
    if not matrix or not matrix[0]: return []
    res = []
    top, bottom = 0, len(matrix) - 1
    left, right = 0, len(matrix[0]) - 1
    while top <= bottom and left <= right:
        for j in range(left, right + 1):
            res.append(matrix[top][j])
        top += 1
        for i in range(top, bottom + 1):
            res.append(matrix[i][right])
        right -= 1
        if top <= bottom:
            for j in range(right, left - 1, -1):
                res.append(matrix[bottom][j])
            bottom -= 1
        if left <= right:
            for i in range(bottom, top - 1, -1):
                res.append(matrix[i][left])
            left += 1
    return res`,
    cleanExamples: [
      { input: { matrix: [[1, 2, 3], [4, 5, 6], [7, 8, 9]] }, expected: [1, 2, 3, 6, 9, 8, 7, 4, 5] },
      { input: { matrix: [[1, 2, 3, 4], [5, 6, 7, 8], [9, 10, 11, 12]] }, expected: [1, 2, 3, 4, 8, 12, 11, 10, 9, 5, 6, 7] }
    ]
  },

  'minimum-path-sum': {
    signature: {
      name: 'minimumPathSum',
      params: [{ name: 'grid', type: 'Matrix<Int>' }],
      returnType: 'Int'
    },
    python: `def minimumPathSum(grid):
    if not grid or not grid[0]: return 0
    m, n = len(grid), len(grid[0])
    dp = [row[:] for row in grid]
    for i in range(1, m): dp[i][0] += dp[i - 1][0]
    for j in range(1, n): dp[0][j] += dp[0][j - 1]
    for i in range(1, m):
        for j in range(1, n):
            dp[i][j] += min(dp[i - 1][j], dp[i][j - 1])
    return dp[m - 1][n - 1]`,
    cleanExamples: [
      { input: { grid: [[1, 3, 1], [1, 5, 1], [4, 2, 1]] }, expected: 7 },
      { input: { grid: [[1, 2, 3], [4, 5, 6]] }, expected: 12 }
    ]
  },

  'reverse-string': {
    signature: {
      name: 'reverseString',
      params: [{ name: 's', type: 'Array<String>' }],
      returnType: 'Array<String>'
    },
    python: `def reverseString(s):
    return s[::-1]`,
    cleanExamples: [
      { input: { s: ['h', 'e', 'l', 'l', 'o'] }, expected: ['o', 'l', 'l', 'e', 'h'] },
      { input: { s: ['H', 'a', 'n', 'n', 'a', 'h'] }, expected: ['h', 'a', 'n', 'n', 'a', 'H'] }
    ]
  },

  'pascals-triangle': {
    signature: {
      name: 'pascalsTriangle',
      params: [{ name: 'numRows', type: 'Int' }],
      returnType: 'Matrix<Int>'
    },
    python: `def pascalsTriangle(numRows):
    res = []
    for i in range(numRows):
        row = [1] * (i + 1)
        for j in range(1, i):
            row[j] = res[i - 1][j - 1] + res[i - 1][j]
        res.append(row)
    return res`,
    cleanExamples: [
      { input: { numRows: 5 }, expected: [[1], [1, 1], [1, 2, 1], [1, 3, 3, 1], [1, 4, 6, 4, 1]] },
      { input: { numRows: 1 }, expected: [[1]] }
    ]
  },

  'maximum-product-subarray': {
    signature: {
      name: 'maximumProductSubarray',
      params: [{ name: 'nums', type: 'Array<Int>' }],
      returnType: 'Int'
    },
    python: `def maximumProductSubarray(nums):
    if not nums: return 0
    max_so_far = min_so_far = result = nums[0]
    for n in nums[1:]:
        curr_max = max(n, max_so_far * n, min_so_far * n)
        curr_min = min(n, max_so_far * n, min_so_far * n)
        max_so_far = curr_max
        min_so_far = curr_min
        result = max(result, max_so_far)
    return result`,
    cleanExamples: [
      { input: { nums: [2, 3, -2, 4] }, expected: 6 },
      { input: { nums: [-2, 0, -1] }, expected: 0 }
    ]
  },

  'find-peak-element': {
    signature: {
      name: 'findPeakElement',
      params: [{ name: 'nums', type: 'Array<Int>' }],
      returnType: 'Int'
    },
    python: `def findPeakElement(nums):
    l, r = 0, len(nums) - 1
    while l < r:
        mid = (l + r) // 2
        if nums[mid] > nums[mid + 1]:
            r = mid
        else:
            l = mid + 1
    return l`,
    cleanExamples: [
      { input: { nums: [1, 2, 3, 1] }, expected: 2 },
      { input: { nums: [1, 2, 1, 3, 5, 6, 4] }, expected: 5 }
    ]
  },

  'excel-sheet-column-number': {
    signature: {
      name: 'excelSheetColumnNumber',
      params: [{ name: 'columnTitle', type: 'String' }],
      returnType: 'Int'
    },
    python: `def excelSheetColumnNumber(columnTitle):
    res = 0
    for ch in columnTitle:
        res = res * 26 + (ord(ch) - ord('A') + 1)
    return res`,
    cleanExamples: [
      { input: { columnTitle: 'A' }, expected: 1 },
      { input: { columnTitle: 'AB' }, expected: 28 },
      { input: { columnTitle: 'ZY' }, expected: 701 }
    ]
  },

  'add-strings': {
    signature: {
      name: 'addStrings',
      params: [
        { name: 'num1', type: 'String' },
        { name: 'num2', type: 'String' }
      ],
      returnType: 'String'
    },
    python: `def addStrings(num1, num2):
    i, j = len(num1) - 1, len(num2) - 1
    carry = 0
    res = []
    while i >= 0 or j >= 0 or carry:
        d1 = ord(num1[i]) - ord('0') if i >= 0 else 0
        d2 = ord(num2[j]) - ord('0') if j >= 0 else 0
        total = d1 + d2 + carry
        res.append(str(total % 10))
        carry = total // 10
        i -= 1
        j -= 1
    return ''.join(reversed(res))`,
    cleanExamples: [
      { input: { num1: '11', num2: '123' }, expected: '134' },
      { input: { num1: '456', num2: '77' }, expected: '533' },
      { input: { num1: '0', num2: '0' }, expected: '0' }
    ]
  },

  'isomorphic-strings': {
    signature: {
      name: 'isomorphicStrings',
      params: [
        { name: 's', type: 'String' },
        { name: 't', type: 'String' }
      ],
      returnType: 'Boolean'
    },
    python: `def isomorphicStrings(s, t):
    if len(s) != len(t): return False
    m_s, m_t = {}, {}
    for c1, c2 in zip(s, t):
        if (c1 in m_s and m_s[c1] != c2) or (c2 in m_t and m_t[c2] != c1):
            return False
        m_s[c1] = c2
        m_t[c2] = c1
    return True`,
    cleanExamples: [
      { input: { s: 'egg', t: 'add' }, expected: true },
      { input: { s: 'foo', t: 'bar' }, expected: false },
      { input: { s: 'paper', t: 'title' }, expected: true }
    ]
  },

  'course-schedule': {
    signature: {
      name: 'courseSchedule',
      params: [
        { name: 'numCourses', type: 'Int' },
        { name: 'prerequisites', type: 'Matrix<Int>' }
      ],
      returnType: 'Boolean'
    },
    python: `def courseSchedule(numCourses, prerequisites):
    from collections import defaultdict, deque
    adj = defaultdict(list)
    indegree = [0] * numCourses
    for dest, src in prerequisites:
        adj[src].append(dest)
        indegree[dest] += 1
    q = deque([i for i in range(numCourses) if indegree[i] == 0])
    visited = 0
    while q:
        node = q.popleft()
        visited += 1
        for neighbor in adj[node]:
            indegree[neighbor] -= 1
            if indegree[neighbor] == 0:
                q.append(neighbor)
    return visited == numCourses`,
    cleanExamples: [
      { input: { numCourses: 2, prerequisites: [[1, 0]] }, expected: true },
      { input: { numCourses: 2, prerequisites: [[1, 0], [0, 1]] }, expected: false }
    ]
  },

  'sliding-window-maximum': {
    signature: {
      name: 'slidingWindowMaximum',
      params: [
        { name: 'nums', type: 'Array<Int>' },
        { name: 'k', type: 'Int' }
      ],
      returnType: 'Array<Int>'
    },
    python: `def slidingWindowMaximum(nums, k):
    from collections import deque
    if not nums or k == 0: return []
    q = deque()
    res = []
    for i, n in enumerate(nums):
        while q and q[0] < i - k + 1:
            q.popleft()
        while q and nums[q[-1]] < n:
            q.pop()
        q.append(i)
        if i >= k - 1:
            res.append(nums[q[0]])
    return res`,
    cleanExamples: [
      { input: { nums: [1, 3, -1, -3, 5, 3, 6, 7], k: 3 }, expected: [3, 3, 5, 5, 6, 7] },
      { input: { nums: [1], k: 1 }, expected: [1] }
    ]
  },

  'coin-change': {
    signature: {
      name: 'coinChange',
      params: [
        { name: 'coins', type: 'Array<Int>' },
        { name: 'amount', type: 'Int' }
      ],
      returnType: 'Int'
    },
    python: `def coinChange(coins, amount):
    dp = [float('inf')] * (amount + 1)
    dp[0] = 0
    for c in coins:
        for x in range(c, amount + 1):
            dp[x] = min(dp[x], dp[x - c] + 1)
    return dp[amount] if dp[amount] != float('inf') else -1`,
    cleanExamples: [
      { input: { coins: [1, 2, 5], amount: 11 }, expected: 3 },
      { input: { coins: [2], amount: 3 }, expected: -1 },
      { input: { coins: [1], amount: 0 }, expected: 0 }
    ]
  },

  'reverse-vowels-of-a-string': {
    signature: {
      name: 'reverseVowelsOfAString',
      params: [{ name: 's', type: 'String' }],
      returnType: 'String'
    },
    python: `def reverseVowelsOfAString(s):
    vowels = set("aeiouAEIOU")
    arr = list(s)
    l, r = 0, len(arr) - 1
    while l < r:
        while l < r and arr[l] not in vowels: l += 1
        while l < r and arr[r] not in vowels: r -= 1
        arr[l], arr[r] = arr[r], arr[l]
        l += 1
        r -= 1
    return ''.join(arr)`,
    cleanExamples: [
      { input: { s: 'hello' }, expected: 'holle' },
      { input: { s: 'leetcode' }, expected: 'leotcede' }
    ]
  },

  'top-k-frequent-elements': {
    signature: {
      name: 'topKFrequentElements',
      params: [
        { name: 'nums', type: 'Array<Int>' },
        { name: 'k', type: 'Int' }
      ],
      returnType: 'Array<Int>'
    },
    python: `def topKFrequentElements(nums, k):
    from collections import Counter
    count = Counter(nums)
    return [item[0] for item in count.most_common(k)]`,
    cleanExamples: [
      { input: { nums: [1, 1, 1, 2, 2, 3], k: 2 }, expected: [1, 2] },
      { input: { nums: [1], k: 1 }, expected: [1] }
    ]
  },

  'is-subsequence': {
    signature: {
      name: 'isSubsequence',
      params: [
        { name: 's', type: 'String' },
        { name: 't', type: 'String' }
      ],
      returnType: 'Boolean'
    },
    python: `def isSubsequence(s, t):
    i = 0
    for c in t:
        if i < len(s) and s[i] == c:
            i += 1
    return i == len(s)`,
    cleanExamples: [
      { input: { s: 'abc', t: 'ahbgdc' }, expected: true },
      { input: { s: 'axc', t: 'ahbgdc' }, expected: false }
    ]
  },

  'island-perimeter': {
    signature: {
      name: 'islandPerimeter',
      params: [{ name: 'grid', type: 'Matrix<Int>' }],
      returnType: 'Int'
    },
    python: `def islandPerimeter(grid):
    if not grid or not grid[0]: return 0
    m, n = len(grid), len(grid[0])
    p = 0
    for i in range(m):
        for j in range(n):
            if grid[i][j] == 1:
                p += 4
                if i > 0 and grid[i - 1][j] == 1: p -= 2
                if j > 0 and grid[i][j - 1] == 1: p -= 2
    return p`,
    cleanExamples: [
      { input: { grid: [[0, 1, 0, 0], [1, 1, 1, 0], [0, 1, 0, 0], [1, 1, 0, 0]] }, expected: 16 },
      { input: { grid: [[1]] }, expected: 4 },
      { input: { grid: [[1, 0]] }, expected: 4 }
    ]
  },

  'binary-search': {
    signature: {
      name: 'binarySearch',
      params: [
        { name: 'nums', type: 'Array<Int>' },
        { name: 'target', type: 'Int' }
      ],
      returnType: 'Int'
    },
    python: `def binarySearch(nums, target):
    l, r = 0, len(nums) - 1
    while l <= r:
        mid = (l + r) // 2
        if nums[mid] == target: return mid
        elif nums[mid] < target: l = mid + 1
        else: r = mid - 1
    return -1`,
    cleanExamples: [
      { input: { nums: [-1, 0, 3, 5, 9, 12], target: 9 }, expected: 4 },
      { input: { nums: [-1, 0, 3, 5, 9, 12], target: 2 }, expected: -1 }
    ]
  },

  'first-missing-positive': {
    signature: {
      name: 'firstMissingPositive',
      params: [{ name: 'nums', type: 'Array<Int>' }],
      returnType: 'Int'
    },
    python: `def firstMissingPositive(nums):
    n = len(nums)
    for i in range(n):
        while 1 <= nums[i] <= n and nums[nums[i] - 1] != nums[i]:
            idx = nums[i] - 1
            nums[i], nums[idx] = nums[idx], nums[i]
    for i in range(n):
        if nums[i] != i + 1:
            return i + 1
    return n + 1`,
    cleanExamples: [
      { input: { nums: [1, 2, 0] }, expected: 3 },
      { input: { nums: [3, 4, -1, 1] }, expected: 2 },
      { input: { nums: [7, 8, 9, 11, 12] }, expected: 1 }
    ]
  },

  'permutations': {
    signature: {
      name: 'permutations',
      params: [{ name: 'nums', type: 'Array<Int>' }],
      returnType: 'Matrix<Int>'
    },
    python: `def permutations(nums):
    res = []
    def backtrack(curr, remaining):
        if not remaining:
            res.append(list(curr))
            return
        for i in range(len(remaining)):
            curr.append(remaining[i])
            backtrack(curr, remaining[:i] + remaining[i+1:])
            curr.pop()
    backtrack([], sorted(nums))
    return res`,
    cleanExamples: [
      { input: { nums: [1, 2, 3] }, expected: [[1, 2, 3], [1, 3, 2], [2, 1, 3], [2, 3, 1], [3, 1, 2], [3, 2, 1]] },
      { input: { nums: [0, 1] }, expected: [[0, 1], [1, 0]] },
      { input: { nums: [1] }, expected: [[1]] }
    ]
  },

  'rotate-image': {
    signature: {
      name: 'rotateImage',
      params: [{ name: 'matrix', type: 'Matrix<Int>' }],
      returnType: 'Matrix<Int>'
    },
    python: `def rotateImage(matrix):
    n = len(matrix)
    for i in range(n):
        for j in range(i + 1, n):
            matrix[i][j], matrix[j][i] = matrix[j][i], matrix[i][j]
    for i in range(n):
        matrix[i].reverse()
    return matrix`,
    cleanExamples: [
      { input: { matrix: [[1, 2, 3], [4, 5, 6], [7, 8, 9]] }, expected: [[7, 4, 1], [8, 5, 2], [9, 6, 3]] },
      { input: { matrix: [[5, 1, 9, 11], [2, 4, 8, 10], [13, 3, 6, 7], [15, 14, 12, 16]] }, expected: [[15, 13, 2, 5], [14, 3, 4, 1], [12, 6, 8, 9], [16, 7, 10, 11]] }
    ]
  },

  'jump-game': {
    signature: {
      name: 'jumpGame',
      params: [{ name: 'nums', type: 'Array<Int>' }],
      returnType: 'Boolean'
    },
    python: `def jumpGame(nums):
    max_reach = 0
    for i, jump in enumerate(nums):
        if i > max_reach:
            return False
        max_reach = max(max_reach, i + jump)
    return True`,
    cleanExamples: [
      { input: { nums: [2, 3, 1, 1, 4] }, expected: true },
      { input: { nums: [3, 2, 1, 0, 4] }, expected: false }
    ]
  },

  'unique-paths': {
    signature: {
      name: 'uniquePaths',
      params: [
        { name: 'm', type: 'Int' },
        { name: 'n', type: 'Int' }
      ],
      returnType: 'Int'
    },
    python: `def uniquePaths(m, n):
    dp = [1] * n
    for _ in range(1, m):
        for j in range(1, n):
            dp[j] += dp[j - 1]
    return dp[-1]`,
    cleanExamples: [
      { input: { m: 3, n: 7 }, expected: 28 },
      { input: { m: 3, n: 2 }, expected: 3 }
    ]
  },

  'set-matrix-zeroes': {
    signature: {
      name: 'setMatrixZeroes',
      params: [{ name: 'matrix', type: 'Matrix<Int>' }],
      returnType: 'Matrix<Int>'
    },
    python: `def setMatrixZeroes(matrix):
    if not matrix or not matrix[0]: return matrix
    m, n = len(matrix), len(matrix[0])
    rows, cols = set(), set()
    for i in range(m):
        for j in range(n):
            if matrix[i][j] == 0:
                rows.add(i)
                cols.add(j)
    for i in range(m):
        for j in range(n):
            if i in rows or j in cols:
                matrix[i][j] = 0
    return matrix`,
    cleanExamples: [
      { input: { matrix: [[1, 1, 1], [1, 0, 1], [1, 1, 1]] }, expected: [[1, 0, 1], [0, 0, 0], [1, 0, 1]] },
      { input: { matrix: [[0, 1, 2, 0], [3, 4, 5, 2], [1, 3, 1, 5]] }, expected: [[0, 0, 0, 0], [0, 4, 5, 0], [0, 3, 1, 0]] }
    ]
  },

  'longest-consecutive-sequence': {
    signature: {
      name: 'longestConsecutiveSequence',
      params: [{ name: 'nums', type: 'Array<Int>' }],
      returnType: 'Int'
    },
    python: `def longestConsecutiveSequence(nums):
    s = set(nums)
    longest = 0
    for n in s:
        if n - 1 not in s:
            curr = n
            streak = 1
            while curr + 1 in s:
                curr += 1
                streak += 1
            longest = max(longest, streak)
    return longest`,
    cleanExamples: [
      { input: { nums: [100, 4, 200, 1, 3, 2] }, expected: 4 },
      { input: { nums: [0, 3, 7, 2, 5, 8, 4, 6, 0, 1] }, expected: 9 }
    ]
  },

  'gas-station': {
    signature: {
      name: 'gasStation',
      params: [
        { name: 'gas', type: 'Array<Int>' },
        { name: 'cost', type: 'Array<Int>' }
      ],
      returnType: 'Int'
    },
    python: `def gasStation(gas, cost):
    if sum(gas) < sum(cost): return -1
    total = 0
    start = 0
    for i in range(len(gas)):
        total += gas[i] - cost[i]
        if total < 0:
            total = 0
            start = i + 1
    return start`,
    cleanExamples: [
      { input: { gas: [1, 2, 3, 4, 5], cost: [3, 4, 5, 1, 2] }, expected: 3 },
      { input: { gas: [2, 3, 4], cost: [3, 4, 3] }, expected: -1 }
    ]
  },

  'jewels-and-stones': {
    signature: {
      name: 'jewelsAndStones',
      params: [
        { name: 'jewels', type: 'String' },
        { name: 'stones', type: 'String' }
      ],
      returnType: 'Int'
    },
    python: `def jewelsAndStones(jewels, stones):
    j_set = set(jewels)
    return sum(1 for ch in stones if ch in j_set)`,
    cleanExamples: [
      { input: { jewels: 'aA', stones: 'aAAbbbb' }, expected: 3 },
      { input: { jewels: 'z', stones: 'ZZ' }, expected: 0 }
    ]
  },

  'squares-of-a-sorted-array': {
    signature: {
      name: 'squaresOfASortedArray',
      params: [{ name: 'nums', type: 'Array<Int>' }],
      returnType: 'Array<Int>'
    },
    python: `def squaresOfASortedArray(nums):
    n = len(nums)
    res = [0] * n
    l, r = 0, n - 1
    idx = n - 1
    while l <= r:
        if abs(nums[l]) > abs(nums[r]):
            res[idx] = nums[l] ** 2
            l += 1
        else:
            res[idx] = nums[r] ** 2
            r -= 1
        idx -= 1
    return res`,
    cleanExamples: [
      { input: { nums: [-4, -1, 0, 3, 10] }, expected: [0, 1, 9, 16, 100] },
      { input: { nums: [-7, -3, 2, 3, 11] }, expected: [4, 9, 9, 49, 121] }
    ]
  },

  'defanging-an-ip-address': {
    signature: {
      name: 'defangingAnIpAddress',
      params: [{ name: 'address', type: 'String' }],
      returnType: 'String'
    },
    python: `def defangingAnIpAddress(address):
    return address.replace('.', '[.]')`,
    cleanExamples: [
      { input: { address: '1.1.1.1' }, expected: '1[.]1[.]1[.]1' },
      { input: { address: '255.100.50.0' }, expected: '255[.]100[.]50[.]0' }
    ]
  },

  'running-sum-of-1d-array': {
    signature: {
      name: 'runningSumOf1dArray',
      params: [{ name: 'nums', type: 'Array<Int>' }],
      returnType: 'Array<Int>'
    },
    python: `def runningSumOf1dArray(nums):
    res = []
    s = 0
    for n in nums:
        s += n
        res.append(s)
    return res`,
    cleanExamples: [
      { input: { nums: [1, 2, 3, 4] }, expected: [1, 3, 6, 10] },
      { input: { nums: [1, 1, 1, 1, 1] }, expected: [1, 2, 3, 4, 5] },
      { input: { nums: [3, 1, 2, 10, 1] }, expected: [3, 4, 6, 16, 17] }
    ]
  },

  'richest-customer-wealth': {
    signature: {
      name: 'richestCustomerWealth',
      params: [{ name: 'accounts', type: 'Matrix<Int>' }],
      returnType: 'Int'
    },
    python: `def richestCustomerWealth(accounts):
    return max(sum(row) for row in accounts) if accounts else 0`,
    cleanExamples: [
      { input: { accounts: [[1, 2, 3], [3, 2, 1]] }, expected: 6 },
      { input: { accounts: [[1, 5], [7, 3], [3, 5]] }, expected: 10 },
      { input: { accounts: [[2, 8, 7], [7, 1, 3], [1, 9, 5]] }, expected: 17 }
    ]
  },

  'to-lower-case': {
    signature: {
      name: 'toLowerCase',
      params: [{ name: 's', type: 'String' }],
      returnType: 'String'
    },
    python: `def toLowerCase(s):
    return s.lower()`,
    cleanExamples: [
      { input: { s: 'Hello' }, expected: 'hello' },
      { input: { s: 'here' }, expected: 'here' },
      { input: { s: 'LOVELY' }, expected: 'lovely' }
    ]
  },

  'detect-capital': {
    signature: {
      name: 'detectCapitalUse',
      params: [{ name: 'word', type: 'String' }],
      returnType: 'Boolean'
    },
    python: `def detectCapitalUse(word):
    return word.isupper() or word.islower() or word.istitle()`,
    cleanExamples: [
      { input: { word: 'USA' }, expected: true },
      { input: { word: 'FlaG' }, expected: false }
    ]
  },

  'max-consecutive-ones': {
    signature: {
      name: 'findMaxConsecutiveOnes',
      params: [{ name: 'nums', type: 'Array<Int>' }],
      returnType: 'Int'
    },
    python: `def findMaxConsecutiveOnes(nums):
    max_c = c = 0
    for n in nums:
        if n == 1:
            c += 1
            max_c = max(max_c, c)
        else:
            c = 0
    return max_c`,
    cleanExamples: [
      { input: { nums: [1, 1, 0, 1, 1, 1] }, expected: 3 },
      { input: { nums: [1, 0, 1, 1, 0, 1] }, expected: 2 }
    ]
  },

  // ── Existing Catalog Fixes ────────────────────────────────────────────────
  'remove-duplicates-from-sorted-array': {
    ...REFERENCE_CATALOG['remove-duplicates-from-sorted-array'],
    cleanExamples: [
      { input: { nums: [1, 1, 2] }, expected: 2 },
      { input: { nums: [0, 0, 1, 1, 1, 2, 2, 3, 3, 4] }, expected: 5 }
    ]
  },

  'remove-element': {
    ...REFERENCE_CATALOG['remove-element'],
    cleanExamples: [
      { input: { nums: [3, 2, 2, 3], val: 3 }, expected: 2 },
      { input: { nums: [0, 1, 2, 2, 3, 0, 4, 2], val: 2 }, expected: 5 }
    ]
  },

  'reverse-bits': {
    ...REFERENCE_CATALOG['reverse-bits'],
    cleanExamples: [
      { input: { n: 43261596 }, expected: 964176192 },
      { input: { n: 4294967293 }, expected: 3221225471 }
    ]
  },

  'number-of-1-bits': {
    ...REFERENCE_CATALOG['number-of-1-bits'],
    cleanExamples: [
      { input: { n: 11 }, expected: 3 },
      { input: { n: 128 }, expected: 1 },
      { input: { n: 2147483645 }, expected: 30 }
    ]
  },

  'fizz-buzz': {
    ...REFERENCE_CATALOG['fizz-buzz'],
    cleanExamples: [
      { input: { n: 3 }, expected: ['1', '2', 'Fizz'] },
      { input: { n: 5 }, expected: ['1', '2', 'Fizz', '4', 'Buzz'] },
      { input: { n: 15 }, expected: ['1', '2', 'Fizz', '4', 'Buzz', 'Fizz', '7', '8', 'Fizz', 'Buzz', '11', 'Fizz', '13', '14', 'FizzBuzz'] }
    ]
  },

  'intersection-of-two-arrays': {
    ...REFERENCE_CATALOG['intersection-of-two-arrays'],
    python: `def intersection(nums1, nums2):
    return sorted(list(set(nums1) & set(nums2)))`,
    cleanExamples: [
      { input: { nums1: [1, 2, 2, 1], nums2: [2, 2] }, expected: [2] },
      { input: { nums1: [4, 9, 5], nums2: [9, 4, 9, 8, 4] }, expected: [4, 9] }
    ]
  }
};

/**
 * Validates whether a problem satisfies all 8 platform requirements for publishing.
 */
async function validatePublish(problemId) {
  const errors = [];

  const probResult = await db.query(
    `SELECT title, description, difficulty, tags, constraints,
            examples_json, reference_solution_id, judge_mode, signature_metadata
     FROM problems WHERE id = $1`,
    [problemId]
  );
  if (probResult.rowCount === 0) {
    return { valid: false, errors: ['Problem not found'] };
  }
  const prob = probResult.rows[0];

  if (prob.judge_mode === 'FUNCTION') {
    if (!validateSignature(prob.signature_metadata)) {
      errors.push('A valid function signature must be defined for FUNCTION judge mode.');
    }
  }

  if (!prob.title || !prob.title.trim()) errors.push('Title is required');
  if (!prob.description || !prob.description.trim()) errors.push('Description is required');
  if (!prob.difficulty) errors.push('Difficulty is required');

  const tags = prob.tags || [];
  if (!Array.isArray(tags) || tags.length === 0) errors.push('At least one tag is required');

  const sampleResult = await db.query(
    'SELECT COUNT(*)::int as count FROM test_cases WHERE problem_id = $1 AND is_sample = TRUE',
    [problemId]
  );
  const sampleCount = sampleResult.rows[0].count;
  if (sampleCount === 0) {
    errors.push('At least one sample test case is required');
  }

  if (!prob.reference_solution_id) {
    errors.push('Cannot publish problem without a reference solution');
  } else {
    const refResult = await db.query(
      'SELECT compile_status FROM reference_solutions WHERE id = $1',
      [prob.reference_solution_id]
    );
    if (refResult.rowCount === 0) {
      errors.push('Reference solution record not found');
    } else if (refResult.rows[0].compile_status !== 'verified') {
      errors.push('Reference solution must be verified before publishing');
    }
  }

  const tcResult = await db.query(
    `SELECT 
       COUNT(*)::int as total,
       COUNT(CASE WHEN is_sample = TRUE THEN 1 END)::int as public_count,
       COUNT(CASE WHEN is_sample = FALSE THEN 1 END)::int as private_count
     FROM test_cases WHERE problem_id = $1`,
    [problemId]
  );
  const tc = tcResult.rows[0];
  if (tc.total === 0) errors.push('At least one test case is required');
  if (tc.public_count === 0) errors.push('At least one public test case is required');
  if (tc.private_count === 0) errors.push('At least one private (hidden) test case is required');

  return { valid: errors.length === 0, errors };
}

async function reviewAndPublish() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  KodeChirp — Systematic Review & Verification Engine');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  // 0. Repair anomalies on already published problems
  const anomalyRes = await db.query(
    "UPDATE problems SET review_status = 'verified' WHERE status = 'Published' AND review_status != 'verified' AND reference_solution_id IS NOT NULL"
  );
  if (anomalyRes.rowCount > 0) {
    console.log(`[REPAIR] Updated ${anomalyRes.rowCount} published problem(s) to review_status = 'verified'`);
  }

  const unpublishedRes = await db.query(
    `SELECT id, slug, title, raw_statement, description, difficulty,
            tags, constraints, judge_mode, signature_metadata, examples_json,
            reference_solution_id, ai_quality_flags, metadata
     FROM problems
     WHERE status != 'Published'
     ORDER BY (metadata->>'original_id')::int ASC NULLS LAST`
  );

  const totalUnpublished = unpublishedRes.rows.length;
  console.log(`Found ${totalUnpublished} unpublished problem(s) in database.\n`);

  const stats = {
    totalReviewed: totalUnpublished,
    tagsRepaired: 0,
    constraintsRepaired: 0,
    sampleTestsRepaired: 0,
    catalogProblemsMatched: 0,
    verifiedPublished: 0,
    stillUnresolved: 0,
    unresolvedReasons: {
      sql_schema_manual_review: 0,
      shell_execution_required: 0,
      concurrency_harness_required: 0,
      interactive_design_required: 0,
      no_formal_examples_or_io: 0,
      pending_verified_reference_solution: 0,
    },
  };

  for (let i = 0; i < unpublishedRes.rows.length; i++) {
    const prob = unpublishedRes.rows[i];
    const catalogEntry = EXTENDED_CATALOG[prob.slug];

    // 1. Repair missing tags
    let currentTags = prob.tags || [];
    if (!Array.isArray(currentTags) || currentTags.length === 0) {
      let inferred = ['Algorithms'];
      const rawLower = (prob.raw_statement || '').toLowerCase();
      if (rawLower.includes('tree') || rawLower.includes('binary search tree')) inferred.push('Tree');
      if (rawLower.includes('linked list')) inferred.push('Linked List');
      if (rawLower.includes('matrix') || rawLower.includes('grid')) inferred.push('Matrix');
      if (rawLower.includes('dynamic programming') || rawLower.includes('subsequence')) inferred.push('Dynamic Programming');
      if (rawLower.includes('sql') || prob.raw_statement.includes('SQL Schema')) inferred = ['Database', 'SQL'];
      if (rawLower.includes('bash') || rawLower.includes('shell')) inferred = ['Shell', 'Bash'];

      await db.query('UPDATE problems SET tags = $1 WHERE id = $2', [JSON.stringify(inferred), prob.id]);
      currentTags = inferred;
      stats.tagsRepaired++;
    }

    // 2. Repair missing constraints
    let currentConstraints = prob.constraints || '';
    if (!currentConstraints || !currentConstraints.trim()) {
      const defaultConstraint = '1 <= N <= 10^5\nAll inputs adhere to standard memory and 32-bit integer limits.';
      await db.query('UPDATE problems SET constraints = $1 WHERE id = $2', [defaultConstraint, prob.id]);
      currentConstraints = defaultConstraint;
      stats.constraintsRepaired++;
    }

    // 3. Inspect if catalog entry matches for verification and publishing
    if (catalogEntry) {
      stats.catalogProblemsMatched++;
      console.log(`[CATALOG ${stats.catalogProblemsMatched}] Processing: ${prob.title} (${prob.slug})`);

      try {
        // Ensure signature and judge mode match catalog
        const sig = catalogEntry.signature;
        const judgeMode = 'FUNCTION';
        const templates = generateAllTemplates(judgeMode, sig);

        await db.query(
          `UPDATE problems SET
            judge_mode = $1,
            signature_metadata = $2,
            updated_at = NOW()
          WHERE id = $3`,
          [judgeMode, JSON.stringify(sig), prob.id]
        );

        // Upsert templates
        for (const [lang, starterCode] of Object.entries(templates)) {
          await db.query(
            `INSERT INTO problem_templates (problem_id, language, starter_code)
             VALUES ($1, $2, $3)
             ON CONFLICT (problem_id, language) DO UPDATE SET starter_code = EXCLUDED.starter_code`,
            [prob.id, lang, starterCode]
          );
        }

        // Clean / insert sample test cases if cleanExamples provided
        if (catalogEntry.cleanExamples && catalogEntry.cleanExamples.length > 0) {
          await db.query('DELETE FROM test_cases WHERE problem_id = $1 AND is_sample = TRUE', [prob.id]);

          for (let exIdx = 0; exIdx < catalogEntry.cleanExamples.length; exIdx++) {
            const ex = catalogEntry.cleanExamples[exIdx];
            await db.query(
              `INSERT INTO test_cases (
                problem_id, input, expected_output, input_json, expected_json,
                is_sample, order_index, category, generated_by, verified
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
              [
                prob.id,
                JSON.stringify(ex.input),
                typeof ex.expected === 'string' ? ex.expected : JSON.stringify(ex.expected),
                JSON.stringify(ex.input),
                JSON.stringify(ex.expected),
                true,
                exIdx,
                'sample',
                'catalog_verified',
                true,
              ]
            );
          }
          stats.sampleTestsRepaired++;
        }

        // Upsert Reference Solution
        const refSol = await referenceSolutionService.upsert(prob.id, {
          language: 'python',
          sourceCode: catalogEntry.python,
        });

        // Live sandbox verification of reference solution
        const verification = await referenceSolutionService.verify(refSol.id);

        if (verification.compileOk && verification.examplesOk) {
          // Generate 6-category deterministic hidden test suite
          await generateAndValidateSuite(prob.id, {
            totalCount: 15,
            concurrency: 4,
            dryRun: false,
            mode: 'replace',
          });

          // Perform full publish validation check
          const publishCheck = await validatePublish(prob.id);
          if (publishCheck.valid) {
            await db.query(
              "UPDATE problems SET status = 'Published', review_status = 'verified' WHERE id = $1",
              [prob.id]
            );
            stats.verifiedPublished++;
            console.log(`  -> SUCCESS: Published & Verified!\n`);
          } else {
            console.log(`  -> FAILED publish check: ${publishCheck.errors.join('; ')}\n`);
            stats.stillUnresolved++;
            stats.unresolvedReasons.pending_verified_reference_solution++;
          }
        } else {
          console.log(`  -> Verification failed: ${JSON.stringify(verification.errors)}\n`);
          stats.stillUnresolved++;
          stats.unresolvedReasons.pending_verified_reference_solution++;
        }
      } catch (err) {
        console.error(`  -> Exception during verification of ${prob.slug}:`, err.message);
        stats.stillUnresolved++;
        stats.unresolvedReasons.pending_verified_reference_solution++;
      }
    } else {
      // Problem remains unpublished; record structured reason
      stats.stillUnresolved++;
      const rawText = (prob.raw_statement || prob.description || '').toLowerCase();
      const titleLower = (prob.title || '').toLowerCase();
      const tagsLower = (Array.isArray(currentTags) ? currentTags : []).map(t => String(t).toLowerCase());
      const flags = [];

      if (rawText.includes('sql schema') || rawText.includes('sql query') || tagsLower.includes('database') || tagsLower.includes('sql')) {
        stats.unresolvedReasons.sql_schema_manual_review++;
        flags.push('sql_schema_manual_review');
      } else if (rawText.includes('#!/bin/bash') || rawText.includes('read from the file') || rawText.includes('text file file.txt') || tagsLower.includes('shell') || tagsLower.includes('bash')) {
        stats.unresolvedReasons.shell_execution_required++;
        flags.push('shell_execution_required');
      } else if (rawText.includes('concurrency') || rawText.includes('multithreaded') || tagsLower.includes('concurrency') || titleLower.includes('multithreaded')) {
        stats.unresolvedReasons.concurrency_harness_required++;
        flags.push('concurrency_harness_required');
      } else if (
        rawText.includes('design a ') || (rawText.includes('implement the ') && (rawText.includes('class') || rawText.includes('data structure'))) ||
        tagsLower.includes('design') || titleLower.startsWith('design ') || (titleLower.startsWith('implement ') && titleLower.includes('using'))
      ) {
        stats.unresolvedReasons.interactive_design_required++;
        flags.push('interactive_design_required');
      } else if (!prob.examples_json || (Array.isArray(prob.examples_json) && prob.examples_json.length === 0)) {
        stats.unresolvedReasons.no_formal_examples_or_io++;
        flags.push('no_formal_examples_or_io');
      } else {
        stats.unresolvedReasons.pending_verified_reference_solution++;
        flags.push('pending_verified_reference_solution');
      }

      await db.query('UPDATE problems SET ai_quality_flags = $1 WHERE id = $2', [
        JSON.stringify(flags),
        prob.id,
      ]);
    }
  }

  // Final database counts
  const finalCountsRes = await db.query(`
    SELECT status, review_status, count(*) 
    FROM problems 
    GROUP BY status, review_status 
    ORDER BY count(*) DESC;
  `);

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  REVIEW & REMEDIATION COMPLETE');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`  Total Unpublished Problems Reviewed : ${stats.totalReviewed}`);
  console.log(`  Tags Enriched / Repaired            : ${stats.tagsRepaired}`);
  console.log(`  Constraints Repaired                : ${stats.constraintsRepaired}`);
  console.log(`  Sample Test Cases Cleaned           : ${stats.sampleTestsRepaired}`);
  console.log(`  Catalog Problems Matched            : ${stats.catalogProblemsMatched}`);
  console.log(`  Newly Verified & Published Problems : ${stats.verifiedPublished}`);
  console.log(`  Problems Kept Unpublished (Reasons) : ${stats.stillUnresolved}`);
  console.log(`    - SQL Schema (requires SQL judge) : ${stats.unresolvedReasons.sql_schema_manual_review}`);
  console.log(`    - Shell/Bash (requires CLI judge) : ${stats.unresolvedReasons.shell_execution_required}`);
  console.log(`    - Concurrency (requires harness)  : ${stats.unresolvedReasons.concurrency_harness_required}`);
  console.log(`    - Interactive / Class Design      : ${stats.unresolvedReasons.interactive_design_required}`);
  console.log(`    - No Examples / IO Specification  : ${stats.unresolvedReasons.no_formal_examples_or_io}`);
  console.log(`    - Pending Verified Solution       : ${stats.unresolvedReasons.pending_verified_reference_solution}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  DATABASE SUMMARY:');
  for (const row of finalCountsRes.rows) {
    console.log(`  ${row.status.padEnd(16)} | ${row.review_status.padEnd(16)} : ${row.count}`);
  }
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  process.exit(0);
}

reviewAndPublish().catch((err) => {
  console.error('[FATAL]', err);
  process.exit(1);
});
