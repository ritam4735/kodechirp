// gateway/src/scripts/referenceCatalog.js
'use strict';

/**
 * Curated, verified reference solutions and canonical signatures for
 * fundamental LeetCode algorithmic problems.
 * Compatible with KodeChirp's FUNCTION judge mode, type system, and wrapper generator.
 */
const REFERENCE_CATALOG = {
  'two-sum': {
    signature: {
      name: 'twoSum',
      params: [
        { name: 'nums', type: 'Array<Int>' },
        { name: 'target', type: 'Int' }
      ],
      returnType: 'Array<Int>'
    },
    python: `def twoSum(nums, target):
    m = {}
    for i, n in enumerate(nums):
        if target - n in m:
            return [m[target - n], i]
        m[n] = i
    return []`
  },

  'add-two-numbers': {
    signature: {
      name: 'addTwoNumbers',
      params: [
        { name: 'l1', type: 'LinkedList' },
        { name: 'l2', type: 'LinkedList' }
      ],
      returnType: 'LinkedList'
    },
    python: `def addTwoNumbers(l1, l2):
    dummy = ListNode(0)
    curr = dummy
    carry = 0
    while l1 or l2 or carry:
        v1 = l1.val if l1 else 0
        v2 = l2.val if l2 else 0
        val = v1 + v2 + carry
        carry = val // 10
        curr.next = ListNode(val % 10)
        curr = curr.next
        if l1: l1 = l1.next
        if l2: l2 = l2.next
    return dummy.next`
  },

  'longest-substring-without-repeating-characters': {
    signature: {
      name: 'lengthOfLongestSubstring',
      params: [
        { name: 's', type: 'String' }
      ],
      returnType: 'Int'
    },
    python: `def lengthOfLongestSubstring(s):
    seen = {}
    left = 0
    res = 0
    for right, char in enumerate(s):
        if char in seen and seen[char] >= left:
            left = seen[char] + 1
        seen[char] = right
        res = max(res, right - left + 1)
    return res`
  },

  'median-of-two-sorted-arrays': {
    signature: {
      name: 'findMedianSortedArrays',
      params: [
        { name: 'nums1', type: 'Array<Int>' },
        { name: 'nums2', type: 'Array<Int>' }
      ],
      returnType: 'Float'
    },
    python: `def findMedianSortedArrays(nums1, nums2):
    merged = sorted(nums1 + nums2)
    n = len(merged)
    if n % 2 == 1:
        return float(merged[n // 2])
    return (merged[n // 2 - 1] + merged[n // 2]) / 2.0`
  },

  'longest-palindromic-substring': {
    signature: {
      name: 'longestPalindrome',
      params: [
        { name: 's', type: 'String' }
      ],
      returnType: 'String'
    },
    python: `def longestPalindrome(s):
    if not s:
        return ""
    start, max_len = 0, 1
    def expand(l, r):
        while l >= 0 and r < len(s) and s[l] == s[r]:
            l -= 1
            r += 1
        return l + 1, r - 1
    for i in range(len(s)):
        l1, r1 = expand(i, i)
        if r1 - l1 + 1 > max_len:
            start, max_len = l1, r1 - l1 + 1
        l2, r2 = expand(i, i + 1)
        if r2 - l2 + 1 > max_len:
            start, max_len = l2, r2 - l2 + 1
    return s[start:start + max_len]`
  },

  'reverse-integer': {
    signature: {
      name: 'reverse',
      params: [
        { name: 'x', type: 'Int' }
      ],
      returnType: 'Int'
    },
    python: `def reverse(x):
    sign = -1 if x < 0 else 1
    x = abs(x)
    rev = int(str(x)[::-1]) * sign
    if rev < -2**31 or rev > 2**31 - 1:
        return 0
    return rev`
  },

  'palindrome-number': {
    signature: {
      name: 'isPalindrome',
      params: [
        { name: 'x', type: 'Int' }
      ],
      returnType: 'Boolean'
    },
    python: `def isPalindrome(x):
    if x < 0:
        return False
    s = str(x)
    return s == s[::-1]`
  },

  'container-with-most-water': {
    signature: {
      name: 'maxArea',
      params: [
        { name: 'height', type: 'Array<Int>' }
      ],
      returnType: 'Int'
    },
    python: `def maxArea(height):
    l, r = 0, len(height) - 1
    res = 0
    while l < r:
        res = max(res, (r - l) * min(height[l], height[r]))
        if height[l] < height[r]:
            l += 1
        else:
            r -= 1
    return res`
  },

  'roman-to-integer': {
    signature: {
      name: 'romanToInt',
      params: [
        { name: 's', type: 'String' }
      ],
      returnType: 'Int'
    },
    python: `def romanToInt(s):
    vals = {'I': 1, 'V': 5, 'X': 10, 'L': 50, 'C': 100, 'D': 500, 'M': 1000}
    total = 0
    prev = 0
    for c in reversed(s):
        curr = vals[c]
        if curr < prev:
            total -= curr
        else:
            total += curr
            prev = curr
    return total`
  },

  'longest-common-prefix': {
    signature: {
      name: 'longestCommonPrefix',
      params: [
        { name: 'strs', type: 'Array<String>' }
      ],
      returnType: 'String'
    },
    python: `def longestCommonPrefix(strs):
    if not strs:
        return ""
    shortest = min(strs, key=len)
    for i, ch in enumerate(shortest):
        for other in strs:
            if other[i] != ch:
                return shortest[:i]
    return shortest`
  },

  '3sum': {
    signature: {
      name: 'threeSum',
      params: [
        { name: 'nums', type: 'Array<Int>' }
      ],
      returnType: 'Matrix<Int>'
    },
    python: `def threeSum(nums):
    nums.sort()
    res = []
    for i in range(len(nums) - 2):
        if i > 0 and nums[i] == nums[i - 1]:
            continue
        l, r = i + 1, len(nums) - 1
        while l < r:
            s = nums[i] + nums[l] + nums[r]
            if s == 0:
                res.append([nums[i], nums[l], nums[r]])
                while l < r and nums[l] == nums[l + 1]: l += 1
                while l < r and nums[r] == nums[r - 1]: r -= 1
                l += 1
                r -= 1
            elif s < 0:
                l += 1
            else:
                r -= 1
    return res`
  },

  'valid-parentheses': {
    signature: {
      name: 'isValid',
      params: [
        { name: 's', type: 'String' }
      ],
      returnType: 'Boolean'
    },
    python: `def isValid(s):
    stack = []
    mapping = {')': '(', '}': '{', ']': '['}
    for char in s:
        if char in mapping:
            top_element = stack.pop() if stack else '#'
            if mapping[char] != top_element:
                return False
        else:
            stack.append(char)
    return not stack`
  },

  'merge-two-sorted-lists': {
    signature: {
      name: 'mergeTwoLists',
      params: [
        { name: 'l1', type: 'LinkedList' },
        { name: 'l2', type: 'LinkedList' }
      ],
      returnType: 'LinkedList'
    },
    python: `def mergeTwoLists(l1, l2):
    dummy = ListNode(0)
    curr = dummy
    while l1 and l2:
        if l1.val <= l2.val:
            curr.next = l1
            l1 = l1.next
        else:
            curr.next = l2
            l2 = l2.next
        curr = curr.next
    curr.next = l1 if l1 else l2
    return dummy.next`
  },

  'generate-parentheses': {
    signature: {
      name: 'generateParenthesis',
      params: [
        { name: 'n', type: 'Int' }
      ],
      returnType: 'Array<String>'
    },
    python: `def generateParenthesis(n):
    res = []
    def backtrack(s, open_count, close_count):
        if len(s) == 2 * n:
            res.append(s)
            return
        if open_count < n:
            backtrack(s + '(', open_count + 1, close_count)
        if close_count < open_count:
            backtrack(s + ')', open_count, close_count + 1)
    backtrack('', 0, 0)
    return res`
  },

  'remove-duplicates-from-sorted-array': {
    signature: {
      name: 'removeDuplicates',
      params: [
        { name: 'nums', type: 'Array<Int>' }
      ],
      returnType: 'Int'
    },
    python: `def removeDuplicates(nums):
    if not nums:
        return 0
    k = 1
    for i in range(1, len(nums)):
        if nums[i] != nums[i - 1]:
            nums[k] = nums[i]
            k += 1
    return k`
  },

  'remove-element': {
    signature: {
      name: 'removeElement',
      params: [
        { name: 'nums', type: 'Array<Int>' },
        { name: 'val', type: 'Int' }
      ],
      returnType: 'Int'
    },
    python: `def removeElement(nums, val):
    k = 0
    for x in nums:
        if x != val:
            nums[k] = x
            k += 1
    return k`
  },

  'search-insert-position': {
    signature: {
      name: 'searchInsert',
      params: [
        { name: 'nums', type: 'Array<Int>' },
        { name: 'target', type: 'Int' }
      ],
      returnType: 'Int'
    },
    python: `def searchInsert(nums, target):
    l, r = 0, len(nums) - 1
    while l <= r:
        mid = (l + r) // 2
        if nums[mid] == target:
            return mid
        elif nums[mid] < target:
            l = mid + 1
        else:
            r = mid - 1
    return l`
  },

  'search-in-rotated-sorted-array': {
    signature: {
      name: 'search',
      params: [
        { name: 'nums', type: 'Array<Int>' },
        { name: 'target', type: 'Int' }
      ],
      returnType: 'Int'
    },
    python: `def search(nums, target):
    if not nums:
        return -1
    l, r = 0, len(nums) - 1
    while l <= r:
        mid = (l + r) // 2
        if nums[mid] == target:
            return mid
        if nums[l] <= nums[mid]:
            if nums[l] <= target < nums[mid]:
                r = mid - 1
            else:
                l = mid + 1
        else:
            if nums[mid] < target <= nums[r]:
                l = mid + 1
            else:
                r = mid - 1
    return -1`
  },

  'trapping-rain-water': {
    signature: {
      name: 'trap',
      params: [
        { name: 'height', type: 'Array<Int>' }
      ],
      returnType: 'Int'
    },
    python: `def trap(height):
    if not height:
        return 0
    l, r = 0, len(height) - 1
    l_max, r_max = height[l], height[r]
    ans = 0
    while l < r:
        if l_max < r_max:
            l += 1
            l_max = max(l_max, height[l])
            ans += l_max - height[l]
        else:
            r -= 1
            r_max = max(r_max, height[r])
            ans += r_max - height[r]
    return ans`
  },

  'maximum-subarray': {
    signature: {
      name: 'maxSubArray',
      params: [
        { name: 'nums', type: 'Array<Int>' },
        { name: 'n', type: 'Int' }
      ],
      returnType: 'Int'
    },
    python: `def maxSubArray(nums, *args):
    cur = res = nums[0]
    for x in nums[1:]:
        cur = max(x, cur + x)
        res = max(res, cur)
    return res`
  },

  'merge-intervals': {
    signature: {
      name: 'merge',
      params: [
        { name: 'intervals', type: 'Matrix<Int>' }
      ],
      returnType: 'Matrix<Int>'
    },
    python: `def merge(intervals):
    if not intervals:
        return []
    intervals.sort(key=lambda x: x[0])
    res = [intervals[0]]
    for cur in intervals[1:]:
        last = res[-1]
        if cur[0] <= last[1]:
            last[1] = max(last[1], cur[1])
        else:
            res.append(cur)
    return res`
  },

  'length-of-last-word': {
    signature: {
      name: 'lengthOfLastWord',
      params: [
        { name: 's', type: 'String' }
      ],
      returnType: 'Int'
    },
    python: `def lengthOfLastWord(s):
    words = s.strip().split()
    return len(words[-1]) if words else 0`
  },

  'plus-one': {
    signature: {
      name: 'plusOne',
      params: [
        { name: 'digits', type: 'Array<Int>' }
      ],
      returnType: 'Array<Int>'
    },
    python: `def plusOne(digits):
    for i in range(len(digits) - 1, -1, -1):
        if digits[i] < 9:
            digits[i] += 1
            return digits
        digits[i] = 0
    return [1] + digits`
  },

  'add-binary': {
    signature: {
      name: 'addBinary',
      params: [
        { name: 'a', type: 'String' },
        { name: 'b', type: 'String' }
      ],
      returnType: 'String'
    },
    python: `def addBinary(a, b):
    return bin(int(a, 2) + int(b, 2))[2:]`
  },

  'sqrtx': {
    signature: {
      name: 'mySqrt',
      params: [
        { name: 'x', type: 'Int' }
      ],
      returnType: 'Int'
    },
    python: `def mySqrt(x):
    if x < 2:
        return x
    l, r = 1, x // 2
    ans = 1
    while l <= r:
        mid = (l + r) // 2
        if mid * mid <= x:
            ans = mid
            l = mid + 1
        else:
            r = mid - 1
    return ans`
  },

  'climbing-stairs': {
    signature: {
      name: 'climbStairs',
      params: [
        { name: 'n', type: 'Int' }
      ],
      returnType: 'Int'
    },
    python: `def climbStairs(n):
    if n <= 2:
        return n
    a, b = 1, 2
    for _ in range(3, n + 1):
        a, b = b, a + b
    return b`
  },

  'merge-sorted-array': {
    signature: {
      name: 'merge',
      params: [
        { name: 'nums1', type: 'Array<Int>' },
        { name: 'm', type: 'Int' },
        { name: 'nums2', type: 'Array<Int>' },
        { name: 'n', type: 'Int' }
      ],
      returnType: 'Array<Int>'
    },
    python: `def merge(nums1, m, nums2, n):
    nums1[m:m+n] = nums2[:n]
    nums1.sort()
    return nums1`
  },

  'same-tree': {
    signature: {
      name: 'isSameTree',
      params: [
        { name: 'p', type: 'BinaryTree' },
        { name: 'q', type: 'BinaryTree' }
      ],
      returnType: 'Boolean'
    },
    python: `def isSameTree(p, q):
    if not p and not q:
        return True
    if not p or not q or p.val != q.val:
        return False
    return isSameTree(p.left, q.left) and isSameTree(p.right, q.right)`
  },

  'symmetric-tree': {
    signature: {
      name: 'isSymmetric',
      params: [
        { name: 'root', type: 'BinaryTree' }
      ],
      returnType: 'Boolean'
    },
    python: `def isSymmetric(root):
    if not root:
        return True
    def isMirror(t1, t2):
        if not t1 and not t2:
            return True
        if not t1 or not t2 or t1.val != t2.val:
            return False
        return isMirror(t1.left, t2.right) and isMirror(t1.right, t2.left)
    return isMirror(root.left, root.right)`
  },

  'maximum-depth-of-binary-tree': {
    signature: {
      name: 'maxDepth',
      params: [
        { name: 'root', type: 'BinaryTree' }
      ],
      returnType: 'Int'
    },
    python: `def maxDepth(root):
    if not root:
        return 0
    return 1 + max(maxDepth(root.left), maxDepth(root.right))`
  },

  'best-time-to-buy-and-sell-stock': {
    signature: {
      name: 'maxProfit',
      params: [
        { name: 'prices', type: 'Array<Int>' }
      ],
      returnType: 'Int'
    },
    python: `def maxProfit(prices):
    if not prices:
        return 0
    min_price = prices[0]
    max_p = 0
    for p in prices[1:]:
        if p < min_price:
            min_price = p
        elif p - min_price > max_p:
            max_p = p - min_price
    return max_p`
  },

  'valid-palindrome': {
    signature: {
      name: 'isPalindrome',
      params: [
        { name: 's', type: 'String' }
      ],
      returnType: 'Boolean'
    },
    python: `def isPalindrome(s):
    cleaned = [c.lower() for c in s if c.isalnum()]
    return cleaned == cleaned[::-1]`
  },

  'single-number': {
    signature: {
      name: 'singleNumber',
      params: [
        { name: 'nums', type: 'Array<Int>' }
      ],
      returnType: 'Int'
    },
    python: `def singleNumber(nums):
    res = 0
    for x in nums:
        res ^= x
    return res`
  },

  'majority-element': {
    signature: {
      name: 'majorityElement',
      params: [
        { name: 'nums', type: 'Array<Int>' }
      ],
      returnType: 'Int'
    },
    python: `def majorityElement(nums):
    candidate = None
    count = 0
    for n in nums:
        if count == 0:
            candidate = n
        count += (1 if n == candidate else -1)
    return candidate`
  },

  'reverse-bits': {
    signature: {
      name: 'reverseBits',
      params: [
        { name: 'n', type: 'Int' }
      ],
      returnType: 'Int'
    },
    python: `def reverseBits(n):
    res = 0
    for _ in range(32):
        res = (res << 1) | (n & 1)
        n >>= 1
    return res`
  },

  'number-of-1-bits': {
    signature: {
      name: 'hammingWeight',
      params: [
        { name: 'n', type: 'Int' }
      ],
      returnType: 'Int'
    },
    python: `def hammingWeight(n):
    return bin(n).count('1')`
  },

  'happy-number': {
    signature: {
      name: 'isHappy',
      params: [
        { name: 'n', type: 'Int' }
      ],
      returnType: 'Boolean'
    },
    python: `def isHappy(n):
    seen = set()
    while n != 1 and n not in seen:
        seen.add(n)
        n = sum(int(d)**2 for d in str(n))
    return n == 1`
  },

  'reverse-linked-list': {
    signature: {
      name: 'reverseList',
      params: [
        { name: 'head', type: 'LinkedList' }
      ],
      returnType: 'LinkedList'
    },
    python: `def reverseList(head):
    prev = None
    curr = head
    while curr:
        nxt = curr.next
        curr.next = prev
        prev = curr
        curr = nxt
    return prev`
  },

  'contains-duplicate': {
    signature: {
      name: 'containsDuplicate',
      params: [
        { name: 'nums', type: 'Array<Int>' }
      ],
      returnType: 'Boolean'
    },
    python: `def containsDuplicate(nums):
    return len(nums) != len(set(nums))`
  },

  'invert-binary-tree': {
    signature: {
      name: 'invertTree',
      params: [
        { name: 'root', type: 'BinaryTree' }
      ],
      returnType: 'BinaryTree'
    },
    python: `def invertTree(root):
    if not root:
        return None
    root.left, root.right = invertTree(root.right), invertTree(root.left)
    return root`
  },

  'power-of-two': {
    signature: {
      name: 'isPowerOfTwo',
      params: [
        { name: 'n', type: 'Int' }
      ],
      returnType: 'Boolean'
    },
    python: `def isPowerOfTwo(n):
    return n > 0 and (n & (n - 1)) == 0`
  },

  'valid-anagram': {
    signature: {
      name: 'isAnagram',
      params: [
        { name: 's', type: 'String' },
        { name: 't', type: 'String' }
      ],
      returnType: 'Boolean'
    },
    python: `def isAnagram(s, t):
    return sorted(s) == sorted(t)`
  },

  'missing-number': {
    signature: {
      name: 'missingNumber',
      params: [
        { name: 'nums', type: 'Array<Int>' }
      ],
      returnType: 'Int'
    },
    python: `def missingNumber(nums):
    n = len(nums)
    return n * (n + 1) // 2 - sum(nums)`
  },

  'move-zeroes': {
    signature: {
      name: 'moveZeroes',
      params: [
        { name: 'nums', type: 'Array<Int>' }
      ],
      returnType: 'Array<Int>'
    },
    python: `def moveZeroes(nums):
    pos = 0
    for i in range(len(nums)):
        if nums[i] != 0:
            nums[pos], nums[i] = nums[i], nums[pos]
            pos += 1
    return nums`
  },

  'intersection-of-two-arrays': {
    signature: {
      name: 'intersection',
      params: [
        { name: 'nums1', type: 'Array<Int>' },
        { name: 'nums2', type: 'Array<Int>' }
      ],
      returnType: 'Array<Int>'
    },
    python: `def intersection(nums1, nums2):
    return sorted(list(set(nums1) & set(nums2)))`
  },

  'first-unique-character-in-a-string': {
    signature: {
      name: 'firstUniqChar',
      params: [
        { name: 's', type: 'String' }
      ],
      returnType: 'Int'
    },
    python: `def firstUniqChar(s):
    from collections import Counter
    c = Counter(s)
    for i, ch in enumerate(s):
        if c[ch] == 1:
            return i
    return -1`
  },

  'find-the-difference': {
    signature: {
      name: 'findTheDifference',
      params: [
        { name: 's', type: 'String' },
        { name: 't', type: 'String' }
      ],
      returnType: 'Character'
    },
    python: `def findTheDifference(s, t):
    res = 0
    for ch in s + t:
        res ^= ord(ch)
    return chr(res)`
  },

  'third-maximum-number': {
    signature: {
      name: 'thirdMax',
      params: [
        { name: 'nums', type: 'Array<Int>' }
      ],
      returnType: 'Int'
    },
    python: `def thirdMax(nums):
    u = sorted(set(nums), reverse=True)
    return u[2] if len(u) >= 3 else u[0]`
  },

  'fizz-buzz': {
    signature: {
      name: 'fizzBuzz',
      params: [
        { name: 'n', type: 'Int' }
      ],
      returnType: 'Array<String>'
    },
    python: `def fizzBuzz(n):
    res = []
    for i in range(1, n + 1):
        if i % 15 == 0:
            res.append("FizzBuzz")
        elif i % 3 == 0:
            res.append("Fizz")
        elif i % 5 == 0:
            res.append("Buzz")
        else:
            res.append(str(i))
    return res`
  },

  'product-of-array-except-self': {
    signature: {
      name: 'productExceptSelf',
      params: [
        { name: 'nums', type: 'Array<Int>' }
      ],
      returnType: 'Array<Int>'
    },
    python: `def productExceptSelf(nums):
    n = len(nums)
    res = [1] * n
    prefix = 1
    for i in range(n):
        res[i] = prefix
        prefix *= nums[i]
    postfix = 1
    for i in range(n - 1, -1, -1):
        res[i] *= postfix
        postfix *= nums[i]
    return res`
  },

  'find-the-duplicate-number': {
    signature: {
      name: 'findDuplicate',
      params: [
        { name: 'nums', type: 'Array<Int>' }
      ],
      returnType: 'Int'
    },
    python: `def findDuplicate(nums):
    slow = nums[0]
    fast = nums[0]
    while True:
        slow = nums[slow]
        fast = nums[nums[fast]]
        if slow == fast:
            break
    slow = nums[0]
    while slow != fast:
        slow = nums[slow]
        fast = nums[fast]
    return slow`
  },

  'subarray-sum-equals-k': {
    signature: {
      name: 'subarraySum',
      params: [
        { name: 'nums', type: 'Array<Int>' },
        { name: 'k', type: 'Int' }
      ],
      returnType: 'Int'
    },
    python: `def subarraySum(nums, k):
    count = 0
    cur_sum = 0
    prefix_sums = {0: 1}
    for num in nums:
        cur_sum += num
        count += prefix_sums.get(cur_sum - k, 0)
        prefix_sums[cur_sum] = prefix_sums.get(cur_sum, 0) + 1
    return count`
  }
};

module.exports = {
  REFERENCE_CATALOG,
};
