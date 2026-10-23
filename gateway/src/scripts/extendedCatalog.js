// gateway/src/scripts/extendedCatalog.js
// ─────────────────────────────────────────────────────────────────────────────
// KodeChirp — Verified Reference Catalog Extension (63 Additional Solutions)
// ─────────────────────────────────────────────────────────────────────────────
'use strict';

const NEW_CATALOG_ENTRIES = {
  'fibonacci-number': {
    signature: {
      name: 'fib',
      params: [{ name: 'n', type: 'Int' }],
      returnType: 'Int'
    },
    python: `def fib(n):
    if n <= 0: return 0
    if n == 1: return 1
    a, b = 0, 1
    for _ in range(2, n + 1):
        a, b = b, a + b
    return b`,
    cleanExamples: [
      { input: { n: 2 }, expected: 1 },
      { input: { n: 3 }, expected: 2 },
      { input: { n: 4 }, expected: 3 }
    ]
  },

  'contains-duplicate-ii': {
    signature: {
      name: 'containsNearbyDuplicate',
      params: [
        { name: 'nums', type: 'Array<Int>' },
        { name: 'k', type: 'Int' }
      ],
      returnType: 'Boolean'
    },
    python: `def containsNearbyDuplicate(nums, k):
    seen = {}
    for i, val in enumerate(nums):
        if val in seen and i - seen[val] <= k:
            return True
        seen[val] = i
    return False`,
    cleanExamples: [
      { input: { nums: [1, 2, 3, 1], k: 3 }, expected: true },
      { input: { nums: [1, 0, 1, 1], k: 1 }, expected: true },
      { input: { nums: [1, 2, 3, 1, 2, 3], k: 2 }, expected: false }
    ]
  },

  'power-of-three': {
    signature: {
      name: 'isPowerOfThree',
      params: [{ name: 'n', type: 'Int' }],
      returnType: 'Boolean'
    },
    python: `def isPowerOfThree(n):
    if n <= 0: return False
    while n % 3 == 0:
        n //= 3
    return n == 1`,
    cleanExamples: [
      { input: { n: 27 }, expected: true },
      { input: { n: 0 }, expected: false },
      { input: { n: 9 }, expected: true }
    ]
  },

  'power-of-four': {
    signature: {
      name: 'isPowerOfFour',
      params: [{ name: 'n', type: 'Int' }],
      returnType: 'Boolean'
    },
    python: `def isPowerOfFour(n):
    return n > 0 and (n & (n - 1)) == 0 and (n & 0x55555555) != 0`,
    cleanExamples: [
      { input: { n: 16 }, expected: true },
      { input: { n: 5 }, expected: false },
      { input: { n: 1 }, expected: true }
    ]
  },

  'counting-bits': {
    signature: {
      name: 'countBits',
      params: [{ name: 'n', type: 'Int' }],
      returnType: 'Array<Int>'
    },
    python: `def countBits(n):
    ans = [0] * (n + 1)
    for i in range(1, n + 1):
        ans[i] = ans[i >> 1] + (i & 1)
    return ans`,
    cleanExamples: [
      { input: { n: 2 }, expected: [0, 1, 1] },
      { input: { n: 5 }, expected: [0, 1, 1, 2, 1, 2] }
    ]
  },

  'hamming-distance': {
    signature: {
      name: 'hammingDistance',
      params: [
        { name: 'x', type: 'Int' },
        { name: 'y', type: 'Int' }
      ],
      returnType: 'Int'
    },
    python: `def hammingDistance(x, y):
    return bin(x ^ y).count('1')`,
    cleanExamples: [
      { input: { x: 1, y: 4 }, expected: 2 },
      { input: { x: 3, y: 1 }, expected: 1 }
    ]
  },

  'number-complement': {
    signature: {
      name: 'findComplement',
      params: [{ name: 'num', type: 'Int' }],
      returnType: 'Int'
    },
    python: `def findComplement(num):
    mask = (1 << num.bit_length()) - 1
    return num ^ mask`,
    cleanExamples: [
      { input: { num: 5 }, expected: 2 },
      { input: { num: 1 }, expected: 0 }
    ]
  },

  'robot-return-to-origin': {
    signature: {
      name: 'judgeCircle',
      params: [{ name: 'moves', type: 'String' }],
      returnType: 'Boolean'
    },
    python: `def judgeCircle(moves):
    return moves.count('U') == moves.count('D') and moves.count('L') == moves.count('R')`,
    cleanExamples: [
      { input: { moves: 'UD' }, expected: true },
      { input: { moves: 'LL' }, expected: false }
    ]
  },

  'binary-number-with-alternating-bits': {
    signature: {
      name: 'hasAlternatingBits',
      params: [{ name: 'n', type: 'Int' }],
      returnType: 'Boolean'
    },
    python: `def hasAlternatingBits(n):
    x = n ^ (n >> 1)
    return (x & (x + 1)) == 0`,
    cleanExamples: [
      { input: { n: 5 }, expected: true },
      { input: { n: 7 }, expected: false },
      { input: { n: 11 }, expected: false }
    ]
  },

  'can-place-flowers': {
    signature: {
      name: 'canPlaceFlowers',
      params: [
        { name: 'flowerbed', type: 'Array<Int>' },
        { name: 'n', type: 'Int' }
      ],
      returnType: 'Boolean'
    },
    python: `def canPlaceFlowers(flowerbed, n):
    count = 0
    fb = [0] + list(flowerbed) + [0]
    for i in range(1, len(fb) - 1):
        if fb[i-1] == 0 and fb[i] == 0 and fb[i+1] == 0:
            fb[i] = 1
            count += 1
            if count >= n:
                return True
    return count >= n`,
    cleanExamples: [
      { input: { flowerbed: [1, 0, 0, 0, 1], n: 1 }, expected: true },
      { input: { flowerbed: [1, 0, 0, 0, 1], n: 2 }, expected: false }
    ]
  },

  'maximum-product-of-three-numbers': {
    signature: {
      name: 'maximumProduct',
      params: [{ name: 'nums', type: 'Array<Int>' }],
      returnType: 'Int'
    },
    python: `def maximumProduct(nums):
    nums.sort()
    return max(nums[-1] * nums[-2] * nums[-3], nums[0] * nums[1] * nums[-1])`,
    cleanExamples: [
      { input: { nums: [1, 2, 3] }, expected: 6 },
      { input: { nums: [1, 2, 3, 4] }, expected: 24 },
      { input: { nums: [-1, -2, -3] }, expected: -6 }
    ]
  },

  'reshape-the-matrix': {
    signature: {
      name: 'matrixReshape',
      params: [
        { name: 'mat', type: 'Matrix<Int>' },
        { name: 'r', type: 'Int' },
        { name: 'c', type: 'Int' }
      ],
      returnType: 'Matrix<Int>'
    },
    python: `def matrixReshape(mat, r, c):
    m, n = len(mat), len(mat[0])
    if m * n != r * c: return mat
    flat = [val for row in mat for val in row]
    return [flat[i * c:(i + 1) * c] for i in range(r)]`,
    cleanExamples: [
      { input: { mat: [[1, 2], [3, 4]], r: 1, c: 4 }, expected: [[1, 2, 3, 4]] },
      { input: { mat: [[1, 2], [3, 4]], r: 2, c: 4 }, expected: [[1, 2], [3, 4]] }
    ]
  },

  'array-partition-i': {
    signature: {
      name: 'arrayPairSum',
      params: [{ name: 'nums', type: 'Array<Int>' }],
      returnType: 'Int'
    },
    python: `def arrayPairSum(nums):
    return sum(sorted(nums)[::2])`,
    cleanExamples: [
      { input: { nums: [1, 4, 3, 2] }, expected: 4 },
      { input: { nums: [6, 2, 6, 5, 1, 2] }, expected: 9 }
    ]
  },

  'reverse-words-in-a-string-iii': {
    signature: {
      name: 'reverseWords',
      params: [{ name: 's', type: 'String' }],
      returnType: 'String'
    },
    python: `def reverseWords(s):
    return ' '.join(w[::-1] for w in s.split(' '))`,
    cleanExamples: [
      { input: { s: "Let's take LeetCode contest" }, expected: "s'teL ekat edoCteeL tsetnoc" },
      { input: { s: "God Ding" }, expected: "doG gniD" }
    ]
  },

  'rotate-string': {
    signature: {
      name: 'rotateString',
      params: [
        { name: 's', type: 'String' },
        { name: 'goal', type: 'String' }
      ],
      returnType: 'Boolean'
    },
    python: `def rotateString(s, goal):
    return len(s) == len(goal) and goal in (s + s)`,
    cleanExamples: [
      { input: { s: 'abcde', goal: 'cdeab' }, expected: true },
      { input: { s: 'abcde', goal: 'abced' }, expected: false }
    ]
  },

  'unique-morse-code-words': {
    signature: {
      name: 'uniqueMorseRepresentations',
      params: [{ name: 'words', type: 'Array<String>' }],
      returnType: 'Int'
    },
    python: `def uniqueMorseRepresentations(words):
    morse = [".-","-...","-.-.","-..",".","..-.","--.","....","..",".---","-.-",".-..","--","-.","---",".--.","--.-",".-.","...","-","..-","...-",".--","-..-","-.--","--.."]
    return len(set(''.join(morse[ord(c) - ord('a')] for c in w) for w in words))`,
    cleanExamples: [
      { input: { words: ["gin", "zen", "gig", "msg"] }, expected: 2 },
      { input: { words: ["a"] }, expected: 1 }
    ]
  },

  'flipping-an-image': {
    signature: {
      name: 'flipAndInvertImage',
      params: [{ name: 'image', type: 'Matrix<Int>' }],
      returnType: 'Matrix<Int>'
    },
    python: `def flipAndInvertImage(image):
    return [[1 - x for x in row[::-1]] for row in image]`,
    cleanExamples: [
      { input: { image: [[1, 1, 0], [1, 0, 1], [0, 0, 0]] }, expected: [[1, 0, 0], [0, 1, 0], [1, 1, 1]] },
      { input: { image: [[1, 1, 0, 0], [1, 0, 0, 1], [0, 1, 1, 1], [1, 0, 1, 0]] }, expected: [[1, 1, 0, 0], [0, 1, 1, 0], [0, 0, 0, 1], [1, 0, 1, 0]] }
    ]
  },

  'degree-of-an-array': {
    signature: {
      name: 'findShortestSubArray',
      params: [{ name: 'nums', type: 'Array<Int>' }],
      returnType: 'Int'
    },
    python: `def findShortestSubArray(nums):
    left, right, count = {}, {}, {}
    for i, x in enumerate(nums):
        if x not in left: left[x] = i
        right[x] = i
        count[x] = count.get(x, 0) + 1
    degree = max(count.values())
    return min(right[x] - left[x] + 1 for x in count if count[x] == degree)`,
    cleanExamples: [
      { input: { nums: [1, 2, 2, 3, 1] }, expected: 2 },
      { input: { nums: [1, 2, 2, 3, 1, 4, 2] }, expected: 6 }
    ]
  },

  'sort-array-by-parity-ii': {
    signature: {
      name: 'sortArrayByParityII',
      params: [{ name: 'nums', type: 'Array<Int>' }],
      returnType: 'Array<Int>'
    },
    python: `def sortArrayByParityII(nums):
    i, j = 0, 1
    n = len(nums)
    res = list(nums)
    while i < n and j < n:
        while i < n and res[i] % 2 == 0: i += 2
        while j < n and res[j] % 2 == 1: j += 2
        if i < n and j < n:
            res[i], res[j] = res[j], res[i]
            i += 2
            j += 2
    return res`,
    cleanExamples: [
      { input: { nums: [4, 2, 5, 7] }, expected: [4, 5, 2, 7] },
      { input: { nums: [2, 3] }, expected: [2, 3] }
    ]
  },

  'find-all-numbers-disappeared-in-an-array': {
    signature: {
      name: 'findDisappearedNumbers',
      params: [{ name: 'nums', type: 'Array<Int>' }],
      returnType: 'Array<Int>'
    },
    python: `def findDisappearedNumbers(nums):
    s = set(nums)
    return [i for i in range(1, len(nums) + 1) if i not in s]`,
    cleanExamples: [
      { input: { nums: [4, 3, 2, 7, 8, 2, 3, 1] }, expected: [5, 6] },
      { input: { nums: [1, 1] }, expected: [2] }
    ]
  },

  'ugly-number': {
    signature: {
      name: 'isUgly',
      params: [{ name: 'n', type: 'Int' }],
      returnType: 'Boolean'
    },
    python: `def isUgly(n):
    if n <= 0: return False
    for p in [2, 3, 5]:
        while n % p == 0:
            n //= p
    return n == 1`,
    cleanExamples: [
      { input: { n: 6 }, expected: true },
      { input: { n: 1 }, expected: true },
      { input: { n: 14 }, expected: false }
    ]
  },

  'ugly-number-ii': {
    signature: {
      name: 'nthUglyNumber',
      params: [{ name: 'n', type: 'Int' }],
      returnType: 'Int'
    },
    python: `def nthUglyNumber(n):
    uglies = [1]
    i2 = i3 = i5 = 0
    while len(uglies) < n:
        next_val = min(uglies[i2] * 2, uglies[i3] * 3, uglies[i5] * 5)
        uglies.append(next_val)
        if next_val == uglies[i2] * 2: i2 += 1
        if next_val == uglies[i3] * 3: i3 += 1
        if next_val == uglies[i5] * 5: i5 += 1
    return uglies[-1]`,
    cleanExamples: [
      { input: { n: 10 }, expected: 12 },
      { input: { n: 1 }, expected: 1 }
    ]
  },

  'ransom-note': {
    signature: {
      name: 'canConstruct',
      params: [
        { name: 'ransomNote', type: 'String' },
        { name: 'magazine', type: 'String' }
      ],
      returnType: 'Boolean'
    },
    python: `def canConstruct(ransomNote, magazine):
    from collections import Counter
    c1, c2 = Counter(ransomNote), Counter(magazine)
    return all(c1[ch] <= c2[ch] for ch in c1)`,
    cleanExamples: [
      { input: { ransomNote: 'a', magazine: 'b' }, expected: false },
      { input: { ransomNote: 'aa', magazine: 'ab' }, expected: false },
      { input: { ransomNote: 'aa', magazine: 'aab' }, expected: true }
    ]
  },

  'first-unique-character-in-a-string': {
    signature: {
      name: 'firstUniqChar',
      params: [{ name: 's', type: 'String' }],
      returnType: 'Int'
    },
    python: `def firstUniqChar(s):
    from collections import Counter
    counts = Counter(s)
    for i, ch in enumerate(s):
        if counts[ch] == 1:
            return i
    return -1`,
    cleanExamples: [
      { input: { s: 'leetcode' }, expected: 0 },
      { input: { s: 'loveleetcode' }, expected: 2 },
      { input: { s: 'aabb' }, expected: -1 }
    ]
  },

  'find-the-difference': {
    signature: {
      name: 'findTheDifference',
      params: [
        { name: 's', type: 'String' },
        { name: 't', type: 'String' }
      ],
      returnType: 'String'
    },
    python: `def findTheDifference(s, t):
    from collections import Counter
    diff = Counter(t) - Counter(s)
    return list(diff.keys())[0]`,
    cleanExamples: [
      { input: { s: 'abcd', t: 'abcde' }, expected: 'e' },
      { input: { s: '', t: 'y' }, expected: 'y' }
    ]
  },

  'third-maximum-number': {
    signature: {
      name: 'thirdMax',
      params: [{ name: 'nums', type: 'Array<Int>' }],
      returnType: 'Int'
    },
    python: `def thirdMax(nums):
    unique = sorted(list(set(nums)), reverse=True)
    return unique[2] if len(unique) >= 3 else unique[0]`,
    cleanExamples: [
      { input: { nums: [3, 2, 1] }, expected: 1 },
      { input: { nums: [1, 2] }, expected: 2 },
      { input: { nums: [2, 2, 3, 1] }, expected: 1 }
    ]
  },

  'license-key-formatting': {
    signature: {
      name: 'licenseKeyFormatting',
      params: [
        { name: 's', type: 'String' },
        { name: 'k', type: 'Int' }
      ],
      returnType: 'String'
    },
    python: `def licenseKeyFormatting(s, k):
    clean = s.replace('-', '').upper()
    first_len = len(clean) % k
    parts = []
    if first_len:
        parts.append(clean[:first_len])
    for i in range(first_len, len(clean), k):
        parts.append(clean[i:i + k])
    return '-'.join(parts)`,
    cleanExamples: [
      { input: { s: '5F3Z-2e-9-w', k: 4 }, expected: '5F3Z-2E9W' },
      { input: { s: '2-5g-3-J', k: 2 }, expected: '2-5G-3J' }
    ]
  },

  'keyboard-row': {
    signature: {
      name: 'findWords',
      params: [{ name: 'words', type: 'Array<String>' }],
      returnType: 'Array<String>'
    },
    python: `def findWords(words):
    rows = [set('qwertyuiop'), set('asdfghjkl'), set('zxcvbnm')]
    res = []
    for w in words:
        s = set(w.lower())
        if any(s <= row for row in rows):
            res.append(w)
    return res`,
    cleanExamples: [
      { input: { words: ["Hello", "Alaska", "Dad", "Peace"] }, expected: ["Alaska", "Dad"] },
      { input: { words: ["omk"] }, expected: [] }
    ]
  },

  'pascals-triangle-ii': {
    signature: {
      name: 'getRow',
      params: [{ name: 'rowIndex', type: 'Int' }],
      returnType: 'Array<Int>'
    },
    python: `def getRow(rowIndex):
    row = [1]
    for _ in range(rowIndex):
        row = [x + y for x, y in zip([0] + row, row + [0])]
    return row`,
    cleanExamples: [
      { input: { rowIndex: 3 }, expected: [1, 3, 3, 1] },
      { input: { rowIndex: 0 }, expected: [1] },
      { input: { rowIndex: 1 }, expected: [1, 1] }
    ]
  },

  'best-time-to-buy-and-sell-stock-ii': {
    signature: {
      name: 'maxProfit',
      params: [{ name: 'prices', type: 'Array<Int>' }],
      returnType: 'Int'
    },
    python: `def maxProfit(prices):
    profit = 0
    for i in range(1, len(prices)):
        if prices[i] > prices[i - 1]:
            profit += prices[i] - prices[i - 1]
    return profit`,
    cleanExamples: [
      { input: { prices: [7, 1, 5, 3, 6, 4] }, expected: 7 },
      { input: { prices: [1, 2, 3, 4, 5] }, expected: 4 },
      { input: { prices: [7, 6, 4, 3, 1] }, expected: 0 }
    ]
  },

  'word-pattern': {
    signature: {
      name: 'wordPattern',
      params: [
        { name: 'pattern', type: 'String' },
        { name: 's', type: 'String' }
      ],
      returnType: 'Boolean'
    },
    python: `def wordPattern(pattern, s):
    words = s.split(' ')
    if len(pattern) != len(words): return False
    return len(set(zip(pattern, words))) == len(set(pattern)) == len(set(words))`,
    cleanExamples: [
      { input: { pattern: 'abba', s: 'dog cat cat dog' }, expected: true },
      { input: { pattern: 'abba', s: 'dog cat cat fish' }, expected: false },
      { input: { pattern: 'aaaa', s: 'dog cat cat dog' }, expected: false }
    ]
  },

  'intersection-of-two-arrays-ii': {
    signature: {
      name: 'intersect',
      params: [
        { name: 'nums1', type: 'Array<Int>' },
        { name: 'nums2', type: 'Array<Int>' }
      ],
      returnType: 'Array<Int>'
    },
    python: `def intersect(nums1, nums2):
    from collections import Counter
    c1 = Counter(nums1)
    res = []
    for x in nums2:
        if c1[x] > 0:
            res.append(x)
            c1[x] -= 1
    return sorted(res)`,
    cleanExamples: [
      { input: { nums1: [1, 2, 2, 1], nums2: [2, 2] }, expected: [2, 2] },
      { input: { nums1: [4, 9, 5], nums2: [9, 4, 9, 8, 4] }, expected: [4, 9] }
    ]
  },

  'valid-perfect-square': {
    signature: {
      name: 'isPerfectSquare',
      params: [{ name: 'num', type: 'Int' }],
      returnType: 'Boolean'
    },
    python: `def isPerfectSquare(num):
    if num < 1: return False
    l, r = 1, num
    while l <= r:
        mid = (l + r) // 2
        sq = mid * mid
        if sq == num: return True
        elif sq < num: l = mid + 1
        else: r = mid - 1
    return False`,
    cleanExamples: [
      { input: { num: 16 }, expected: true },
      { input: { num: 14 }, expected: false }
    ]
  },

  'rotate-array': {
    signature: {
      name: 'rotate',
      params: [
        { name: 'nums', type: 'Array<Int>' },
        { name: 'k', type: 'Int' }
      ],
      returnType: 'Array<Int>'
    },
    python: `def rotate(nums, k):
    if not nums: return []
    k = k % len(nums)
    return nums[-k:] + nums[:-k] if k > 0 else nums`,
    cleanExamples: [
      { input: { nums: [1, 2, 3, 4, 5, 6, 7], k: 3 }, expected: [5, 6, 7, 1, 2, 3, 4] },
      { input: { nums: [-1, -100, 3, 99], k: 2 }, expected: [3, 99, -1, -100] }
    ]
  },

  'shortest-unsorted-continuous-subarray': {
    signature: {
      name: 'findUnsortedSubarray',
      params: [{ name: 'nums', type: 'Array<Int>' }],
      returnType: 'Int'
    },
    python: `def findUnsortedSubarray(nums):
    sorted_nums = sorted(nums)
    diff = [i for i, (a, b) in enumerate(zip(nums, sorted_nums)) if a != b]
    return diff[-1] - diff[0] + 1 if diff else 0`,
    cleanExamples: [
      { input: { nums: [2, 6, 4, 8, 10, 9, 15] }, expected: 5 },
      { input: { nums: [1, 2, 3, 4] }, expected: 0 },
      { input: { nums: [1] }, expected: 0 }
    ]
  },

  'min-cost-climbing-stairs': {
    signature: {
      name: 'minCostClimbingStairs',
      params: [{ name: 'cost', type: 'Array<Int>' }],
      returnType: 'Int'
    },
    python: `def minCostClimbingStairs(cost):
    f1 = f2 = 0
    for x in reversed(cost):
        f1, f2 = x + min(f1, f2), f1
    return min(f1, f2)`,
    cleanExamples: [
      { input: { cost: [10, 15, 20] }, expected: 15 },
      { input: { cost: [1, 100, 1, 1, 1, 100, 1, 1, 100, 1] }, expected: 6 }
    ]
  },

  'unique-binary-search-trees': {
    signature: {
      name: 'numTrees',
      params: [{ name: 'n', type: 'Int' }],
      returnType: 'Int'
    },
    python: `def numTrees(n):
    dp = [0] * (n + 1)
    dp[0] = 1
    for i in range(1, n + 1):
        for j in range(1, i + 1):
            dp[i] += dp[j - 1] * dp[i - j]
    return dp[n]`,
    cleanExamples: [
      { input: { n: 3 }, expected: 5 },
      { input: { n: 1 }, expected: 1 }
    ]
  },

  'perfect-squares': {
    signature: {
      name: 'numSquares',
      params: [{ name: 'n', type: 'Int' }],
      returnType: 'Int'
    },
    python: `def numSquares(n):
    dp = [float('inf')] * (n + 1)
    dp[0] = 0
    squares = [i * i for i in range(1, int(n ** 0.5) + 1)]
    for sq in squares:
        for i in range(sq, n + 1):
            dp[i] = min(dp[i], dp[i - sq] + 1)
    return dp[n]`,
    cleanExamples: [
      { input: { n: 12 }, expected: 3 },
      { input: { n: 13 }, expected: 2 }
    ]
  },

  'jump-game-ii': {
    signature: {
      name: 'jump',
      params: [{ name: 'nums', type: 'Array<Int>' }],
      returnType: 'Int'
    },
    python: `def jump(nums):
    jumps = 0; curr_end = 0; farthest = 0
    for i in range(len(nums) - 1):
        farthest = max(farthest, i + nums[i])
        if i == curr_end:
            jumps += 1
            curr_end = farthest
    return jumps`,
    cleanExamples: [
      { input: { nums: [2, 3, 1, 1, 4] }, expected: 2 },
      { input: { nums: [2, 3, 0, 1, 4] }, expected: 2 }
    ]
  },

  'find-minimum-in-rotated-sorted-array': {
    signature: {
      name: 'findMin',
      params: [{ name: 'nums', type: 'Array<Int>' }],
      returnType: 'Int'
    },
    python: `def findMin(nums):
    l, r = 0, len(nums) - 1
    while l < r:
        mid = (l + r) // 2
        if nums[mid] > nums[r]: l = mid + 1
        else: r = mid
    return nums[l]`,
    cleanExamples: [
      { input: { nums: [3, 4, 5, 1, 2] }, expected: 1 },
      { input: { nums: [4, 5, 6, 7, 0, 1, 2] }, expected: 0 },
      { input: { nums: [11, 13, 15, 17] }, expected: 11 }
    ]
  },

  'longest-increasing-subsequence': {
    signature: {
      name: 'lengthOfLIS',
      params: [{ name: 'nums', type: 'Array<Int>' }],
      returnType: 'Int'
    },
    python: `def lengthOfLIS(nums):
    import bisect
    tails = []
    for x in nums:
        idx = bisect.bisect_left(tails, x)
        if idx == len(tails): tails.append(x)
        else: tails[idx] = x
    return len(tails)`,
    cleanExamples: [
      { input: { nums: [10, 9, 2, 5, 3, 7, 101, 18] }, expected: 4 },
      { input: { nums: [0, 1, 0, 3, 2, 3] }, expected: 4 },
      { input: { nums: [7, 7, 7, 7, 7, 7, 7] }, expected: 1 }
    ]
  },

  'word-break': {
    signature: {
      name: 'wordBreak',
      params: [
        { name: 's', type: 'String' },
        { name: 'wordDict', type: 'Array<String>' }
      ],
      returnType: 'Boolean'
    },
    python: `def wordBreak(s, wordDict):
    ws = set(wordDict)
    dp = [False] * (len(s) + 1)
    dp[0] = True
    for i in range(1, len(s) + 1):
        for j in range(i):
            if dp[j] and s[j:i] in ws:
                dp[i] = True
                break
    return dp[len(s)]`,
    cleanExamples: [
      { input: { s: 'leetcode', wordDict: ['leet', 'code'] }, expected: true },
      { input: { s: 'applepenapple', wordDict: ['apple', 'pen'] }, expected: true },
      { input: { s: 'catsandog', wordDict: ['cats', 'dog', 'sand', 'and', 'cat'] }, expected: false }
    ]
  },

  'partition-equal-subset-sum': {
    signature: {
      name: 'canPartition',
      params: [{ name: 'nums', type: 'Array<Int>' }],
      returnType: 'Boolean'
    },
    python: `def canPartition(nums):
    total = sum(nums)
    if total % 2 != 0: return False
    target = total // 2
    dp = {0}
    for num in nums:
        dp = dp | {s + num for s in dp if s + num <= target}
        if target in dp: return True
    return target in dp`,
    cleanExamples: [
      { input: { nums: [1, 5, 11, 5] }, expected: true },
      { input: { nums: [1, 2, 3, 5] }, expected: false }
    ]
  },

  'search-a-2d-matrix-ii': {
    signature: {
      name: 'searchMatrix',
      params: [
        { name: 'matrix', type: 'Matrix<Int>' },
        { name: 'target', type: 'Int' }
      ],
      returnType: 'Boolean'
    },
    python: `def searchMatrix(matrix, target):
    if not matrix or not matrix[0]: return False
    m, n = len(matrix), len(matrix[0])
    r, c = 0, n - 1
    while r < m and c >= 0:
        if matrix[r][c] == target: return True
        elif matrix[r][c] > target: c -= 1
        else: r += 1
    return False`,
    cleanExamples: [
      { input: { matrix: [[1, 4, 7, 11, 15], [2, 5, 8, 12, 19], [3, 6, 9, 16, 22], [10, 13, 14, 17, 24], [18, 21, 23, 26, 30]], target: 5 }, expected: true },
      { input: { matrix: [[1, 4, 7, 11, 15], [2, 5, 8, 12, 19], [3, 6, 9, 16, 22], [10, 13, 14, 17, 24], [18, 21, 23, 26, 30]], target: 20 }, expected: false }
    ]
  },

  'letter-combinations-of-a-phone-number': {
    signature: {
      name: 'letterCombinations',
      params: [{ name: 'digits', type: 'String' }],
      returnType: 'Array<String>'
    },
    python: `def letterCombinations(digits):
    if not digits: return []
    mapping = {'2': 'abc', '3': 'def', '4': 'ghi', '5': 'jkl', '6': 'mno', '7': 'pqrs', '8': 'tuv', '9': 'wxyz'}
    res = ['']
    for d in digits:
        if d in mapping:
            res = [prefix + ch for prefix in res for ch in mapping[d]]
    return res`,
    cleanExamples: [
      { input: { digits: '23' }, expected: ["ad", "ae", "af", "bd", "be", "bf", "cd", "ce", "cf"] },
      { input: { digits: '' }, expected: [] },
      { input: { digits: '2' }, expected: ["a", "b", "c"] }
    ]
  },

  'find-first-and-last-position-of-element-in-sorted-array': {
    signature: {
      name: 'searchRange',
      params: [
        { name: 'nums', type: 'Array<Int>' },
        { name: 'target', type: 'Int' }
      ],
      returnType: 'Array<Int>'
    },
    python: `def searchRange(nums, target):
    import bisect
    l = bisect.bisect_left(nums, target)
    r = bisect.bisect_right(nums, target)
    if l < len(nums) and nums[l] == target:
        return [l, r - 1]
    return [-1, -1]`,
    cleanExamples: [
      { input: { nums: [5, 7, 7, 8, 8, 10], target: 8 }, expected: [3, 4] },
      { input: { nums: [5, 7, 7, 8, 8, 10], target: 6 }, expected: [-1, -1] },
      { input: { nums: [], target: 0 }, expected: [-1, -1] }
    ]
  },

  'combination-sum': {
    signature: {
      name: 'combinationSum',
      params: [
        { name: 'candidates', type: 'Array<Int>' },
        { name: 'target', type: 'Int' }
      ],
      returnType: 'Matrix<Int>'
    },
    python: `def combinationSum(candidates, target):
    res = []
    candidates.sort()
    def backtrack(remain, combo, start):
        if remain == 0:
            res.append(list(combo))
            return
        for i in range(start, len(candidates)):
            if candidates[i] > remain: break
            combo.append(candidates[i])
            backtrack(remain - candidates[i], combo, i)
            combo.pop()
    backtrack(target, [], 0)
    return res`,
    cleanExamples: [
      { input: { candidates: [2, 3, 6, 7], target: 7 }, expected: [[2, 2, 3], [7]] },
      { input: { candidates: [2, 3, 5], target: 8 }, expected: [[2, 2, 2, 2], [2, 3, 3], [3, 5]] },
      { input: { candidates: [2], target: 1 }, expected: [] }
    ]
  },

  'combination-sum-ii': {
    signature: {
      name: 'combinationSum2',
      params: [
        { name: 'candidates', type: 'Array<Int>' },
        { name: 'target', type: 'Int' }
      ],
      returnType: 'Matrix<Int>'
    },
    python: `def combinationSum2(candidates, target):
    res = []
    candidates.sort()
    def backtrack(remain, combo, start):
        if remain == 0:
            res.append(list(combo))
            return
        for i in range(start, len(candidates)):
            if candidates[i] > remain: break
            if i > start and candidates[i] == candidates[i - 1]: continue
            combo.append(candidates[i])
            backtrack(remain - candidates[i], combo, i + 1)
            combo.pop()
    backtrack(target, [], 0)
    return res`,
    cleanExamples: [
      { input: { candidates: [10, 1, 2, 7, 6, 1, 5], target: 8 }, expected: [[1, 1, 6], [1, 2, 5], [1, 7], [2, 6]] },
      { input: { candidates: [2, 5, 2, 1, 2], target: 5 }, expected: [[1, 2, 2], [5]] }
    ]
  },

  'multiply-strings': {
    signature: {
      name: 'multiply',
      params: [
        { name: 'num1', type: 'String' },
        { name: 'num2', type: 'String' }
      ],
      returnType: 'String'
    },
    python: `def multiply(num1, num2):
    d1 = ''.join(c for c in str(num1) if c.isdigit()) or '0'
    d2 = ''.join(c for c in str(num2) if c.isdigit()) or '0'
    return str(int(d1) * int(d2))`,
    cleanExamples: [
      { input: { num1: '2', num2: '3' }, expected: '6' },
      { input: { num1: '123', num2: '456' }, expected: '56088' }
    ]
  },

  'permutations-ii': {
    signature: {
      name: 'permuteUnique',
      params: [{ name: 'nums', type: 'Array<Int>' }],
      returnType: 'Matrix<Int>'
    },
    python: `def permuteUnique(nums):
    res = []
    nums.sort()
    used = [False] * len(nums)
    def backtrack(curr):
        if len(curr) == len(nums):
            res.append(list(curr))
            return
        for i in range(len(nums)):
            if used[i]: continue
            if i > 0 and nums[i] == nums[i - 1] and not used[i - 1]: continue
            used[i] = True
            curr.append(nums[i])
            backtrack(curr)
            curr.pop()
            used[i] = False
    backtrack([])
    return res`,
    cleanExamples: [
      { input: { nums: [1, 1, 2] }, expected: [[1, 1, 2], [1, 2, 1], [2, 1, 1]] },
      { input: { nums: [1, 2, 3] }, expected: [[1, 2, 3], [1, 3, 2], [2, 1, 3], [2, 3, 1], [3, 1, 2], [3, 2, 1]] }
    ]
  },

  'group-anagrams': {
    signature: {
      name: 'groupAnagrams',
      params: [{ name: 'strs', type: 'Array<String>' }],
      returnType: 'Matrix<String>'
    },
    python: `def groupAnagrams(strs):
    from collections import defaultdict
    groups = defaultdict(list)
    for s in strs:
        key = ''.join(sorted(s))
        groups[key].append(s)
    return sorted([sorted(g) for g in groups.values()])`,
    cleanExamples: [
      { input: { strs: ["eat", "tea", "tan", "ate", "nat", "bat"] }, expected: [["ate", "eat", "tea"], ["bat"], ["nat", "tan"]] },
      { input: { strs: [""] }, expected: [[""]] },
      { input: { strs: ["a"] }, expected: [["a"]] }
    ]
  },

  'spiral-matrix-ii': {
    signature: {
      name: 'generateMatrix',
      params: [{ name: 'n', type: 'Int' }],
      returnType: 'Matrix<Int>'
    },
    python: `def generateMatrix(n):
    matrix = [[0] * n for _ in range(n)]
    num = 1
    top, bottom, left, right = 0, n - 1, 0, n - 1
    while top <= bottom and left <= right:
        for j in range(left, right + 1):
            matrix[top][j] = num
            num += 1
        top += 1
        for i in range(top, bottom + 1):
            matrix[i][right] = num
            num += 1
        right -= 1
        for j in range(right, left - 1, -1):
            matrix[bottom][j] = num
            num += 1
        bottom -= 1
        for i in range(bottom, top - 1, -1):
            matrix[i][left] = num
            num += 1
        left += 1
    return matrix`,
    cleanExamples: [
      { input: { n: 3 }, expected: [[1, 2, 3], [8, 9, 4], [7, 6, 5]] },
      { input: { n: 1 }, expected: [[1]] }
    ]
  },

  'unique-paths-ii': {
    signature: {
      name: 'uniquePathsWithObstacles',
      params: [{ name: 'obstacleGrid', type: 'Matrix<Int>' }],
      returnType: 'Int'
    },
    python: `def uniquePathsWithObstacles(obstacleGrid):
    if not obstacleGrid or obstacleGrid[0][0] == 1: return 0
    m, n = len(obstacleGrid), len(obstacleGrid[0])
    dp = [0] * n
    dp[0] = 1
    for i in range(m):
        for j in range(n):
            if obstacleGrid[i][j] == 1: dp[j] = 0
            elif j > 0: dp[j] += dp[j - 1]
    return dp[-1]`,
    cleanExamples: [
      { input: { obstacleGrid: [[0, 0, 0], [0, 1, 0], [0, 0, 0]] }, expected: 2 },
      { input: { obstacleGrid: [[0, 1], [0, 0]] }, expected: 1 }
    ]
  },

  'simplify-path': {
    signature: {
      name: 'simplifyPath',
      params: [{ name: 'path', type: 'String' }],
      returnType: 'String'
    },
    python: `def simplifyPath(path):
    stack = []
    for part in path.split('/'):
        if part == '' or part == '.': continue
        elif part == '..':
            if stack: stack.pop()
        else: stack.append(part)
    return '/' + '/'.join(stack)`,
    cleanExamples: [
      { input: { path: '/home/' }, expected: '/home' },
      { input: { path: '/../' }, expected: '/' },
      { input: { path: '/home//foo/' }, expected: '/home/foo' }
    ]
  },

  'edit-distance': {
    signature: {
      name: 'minDistance',
      params: [
        { name: 'word1', type: 'String' },
        { name: 'word2', type: 'String' }
      ],
      returnType: 'Int'
    },
    python: `def minDistance(word1, word2):
    m, n = len(word1), len(word2)
    dp = [[0] * (n + 1) for _ in range(m + 1)]
    for i in range(m + 1): dp[i][0] = i
    for j in range(n + 1): dp[0][j] = j
    for i in range(1, m + 1):
        for j in range(1, n + 1):
            if word1[i - 1] == word2[j - 1]: dp[i][j] = dp[i - 1][j - 1]
            else: dp[i][j] = 1 + min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1])
    return dp[m][n]`,
    cleanExamples: [
      { input: { word1: 'horse', word2: 'ros' }, expected: 3 },
      { input: { word1: 'intention', word2: 'execution' }, expected: 5 }
    ]
  },

  'subsets-ii': {
    signature: {
      name: 'subsetsWithDup',
      params: [{ name: 'nums', type: 'Array<Int>' }],
      returnType: 'Matrix<Int>'
    },
    python: `def subsetsWithDup(nums):
    nums.sort()
    res = [[]]
    prev_end = 0
    for i in range(len(nums)):
        start = prev_end if i > 0 and nums[i] == nums[i - 1] else 0
        prev_end = len(res)
        for j in range(start, prev_end):
            res.append(res[j] + [nums[i]])
    return sorted(res)`,
    cleanExamples: [
      { input: { nums: [1, 2, 2] }, expected: [[], [1], [1, 2], [1, 2, 2], [2], [2, 2]] },
      { input: { nums: [0] }, expected: [[], [0]] }
    ]
  },

  'combinations': {
    signature: {
      name: 'combine',
      params: [
        { name: 'n', type: 'Int' },
        { name: 'k', type: 'Int' }
      ],
      returnType: 'Matrix<Int>'
    },
    python: `def combine(n, k):
    res = []
    def backtrack(start, combo):
        if len(combo) == k:
            res.append(list(combo))
            return
        for i in range(start, n + 1):
            combo.append(i)
            backtrack(i + 1, combo)
            combo.pop()
    backtrack(1, [])
    return res`,
    cleanExamples: [
      { input: { n: 4, k: 2 }, expected: [[1, 2], [1, 3], [1, 4], [2, 3], [2, 4], [3, 4]] },
      { input: { n: 1, k: 1 }, expected: [[1]] }
    ]
  },

  'remove-duplicates-from-sorted-array-ii': {
    signature: {
      name: 'removeDuplicates',
      params: [{ name: 'nums', type: 'Array<Int>' }],
      returnType: 'Int'
    },
    python: `def removeDuplicates(nums):
    if len(nums) <= 2: return len(nums)
    k = 2
    for i in range(2, len(nums)):
        if nums[i] != nums[k - 2]:
            nums[k] = nums[i]
            k += 1
    return k`,
    cleanExamples: [
      { input: { nums: [1, 1, 1, 2, 2, 3] }, expected: 5 },
      { input: { nums: [0, 0, 1, 1, 1, 1, 2, 3, 3] }, expected: 7 }
    ]
  },

  'largest-rectangle-in-histogram': {
    signature: {
      name: 'largestRectangleArea',
      params: [{ name: 'heights', type: 'Array<Int>' }],
      returnType: 'Int'
    },
    python: `def largestRectangleArea(heights):
    stack = []
    max_area = 0
    h = heights + [0]
    for i, val in enumerate(h):
        while stack and h[stack[-1]] >= val:
            height = h[stack.pop()]
            width = i if not stack else i - stack[-1] - 1
            max_area = max(max_area, height * width)
        stack.append(i)
    return max_area`,
    cleanExamples: [
      { input: { heights: [2, 1, 5, 6, 2, 3] }, expected: 10 },
      { input: { heights: [2, 4] }, expected: 4 }
    ]
  },

  'decode-string': {
    signature: {
      name: 'decodeString',
      params: [{ name: 's', type: 'String' }],
      returnType: 'String'
    },
    python: `def decodeString(s):
    stack = []
    curr_str = ''
    curr_num = 0
    for ch in s:
        if ch.isdigit(): curr_num = curr_num * 10 + int(ch)
        elif ch == '[':
            stack.append((curr_str, curr_num))
            curr_str = ''
            curr_num = 0
        elif ch == ']':
            prev_str, num = stack.pop()
            curr_str = prev_str + num * curr_str
        else: curr_str += ch
    return curr_str`,
    cleanExamples: [
      { input: { s: '3[a]2[bc]' }, expected: 'aaabcbc' },
      { input: { s: '3[a2[c]]' }, expected: 'accaccacc' },
      { input: { s: '2[abc]3[cd]ef' }, expected: 'abcabccdcdcdef' }
    ]
  },

  'next-permutation': {
    signature: {
      name: 'nextPermutation',
      params: [{ name: 'nums', type: 'Array<Int>' }],
      returnType: 'Array<Int>'
    },
    python: `def nextPermutation(nums):
    res = list(nums)
    i = len(res) - 2
    while i >= 0 and res[i] >= res[i + 1]: i -= 1
    if i >= 0:
        j = len(res) - 1
        while res[j] <= res[i]: j -= 1
        res[i], res[j] = res[j], res[i]
    res[i + 1:] = reversed(res[i + 1:])
    return res`,
    cleanExamples: [
      { input: { nums: [1, 2, 3] }, expected: [1, 3, 2] },
      { input: { nums: [3, 2, 1] }, expected: [1, 2, 3] },
      { input: { nums: [1, 1, 5] }, expected: [1, 5, 1] }
    ]
  },

  'longest-valid-parentheses': {
    signature: {
      name: 'longestValidParentheses',
      params: [{ name: 's', type: 'String' }],
      returnType: 'Int'
    },
    python: `def longestValidParentheses(s):
    stack = [-1]
    max_len = 0
    for i, ch in enumerate(s):
        if ch == '(': stack.append(i)
        else:
            stack.pop()
            if not stack: stack.append(i)
            else: max_len = max(max_len, i - stack[-1])
    return max_len`,
    cleanExamples: [
      { input: { s: '(()' }, expected: 2 },
      { input: { s: ')()())' }, expected: 4 },
      { input: { s: '' }, expected: 0 }
    ]
  },

  'number-of-islands': {
    signature: {
      name: 'numIslands',
      params: [{ name: 'grid', type: 'Matrix<String>' }],
      returnType: 'Int'
    },
    python: `def numIslands(grid):
    if not grid: return 0
    m, n = len(grid), len(grid[0])
    g = [list(row) for row in grid]
    count = 0
    def dfs(r, c):
        if r < 0 or r >= m or c < 0 or c >= n or g[r][c] != '1': return
        g[r][c] = '0'
        dfs(r + 1, c); dfs(r - 1, c); dfs(r, c + 1); dfs(r, c - 1)
    for i in range(m):
        for j in range(n):
            if g[i][j] == '1':
                count += 1
                dfs(i, j)
    return count`,
    cleanExamples: [
      { input: { grid: [["1", "1", "1", "1", "0"], ["1", "1", "0", "1", "0"], ["1", "1", "0", "0", "0"], ["0", "0", "0", "0", "0"]] }, expected: 1 },
      { input: { grid: [["1", "1", "0", "0", "0"], ["1", "1", "0", "0", "0"], ["0", "0", "1", "0", "0"], ["0", "0", "0", "1", "1"]] }, expected: 3 }
    ]
  },

  'word-search': {
    signature: {
      name: 'exist',
      params: [
        { name: 'board', type: 'Matrix<String>' },
        { name: 'word', type: 'String' }
      ],
      returnType: 'Boolean'
    },
    python: `def exist(board, word):
    if not board or not board[0]: return False
    m, n = len(board), len(board[0])
    b = [list(row) for row in board]
    def dfs(r, c, k):
        if k == len(word): return True
        if r < 0 or r >= m or c < 0 or c >= n or b[r][c] != word[k]: return False
        tmp = b[r][c]
        b[r][c] = '#'
        res = dfs(r + 1, c, k + 1) or dfs(r - 1, c, k + 1) or dfs(r, c + 1, k + 1) or dfs(r, c - 1, k + 1)
        b[r][c] = tmp
        return res
    for i in range(m):
        for j in range(n):
            if dfs(i, j, 0): return True
    return False`,
    cleanExamples: [
      { input: { board: [["A","B","C","E"],["S","F","C","S"],["A","D","E","E"]], word: "ABCCED" }, expected: true },
      { input: { board: [["A","B","C","E"],["S","F","C","S"],["A","D","E","E"]], word: "SEE" }, expected: true },
      { input: { board: [["A","B","C","E"],["S","F","C","S"],["A","D","E","E"]], word: "ABCB" }, expected: false }
    ]
  }
};

module.exports = {
  NEW_CATALOG_ENTRIES
};
