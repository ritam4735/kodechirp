
import sys
import json
from typing import List, Dict, Any, Optional

class ListNode:
    def __init__(self, val=0, next=None):
        self.val = val
        self.next = next

class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right

def __build_linked_list(arr):
    if not arr: return None
    head = ListNode(arr[0])
    curr = head
    for val in arr[1:]:
        curr.next = ListNode(val)
        curr = curr.next
    return head

def __serialize_linked_list(head):
    arr = []
    while head:
        arr.append(head.val)
        head = head.next
    return arr

def __build_binary_tree(arr):
    if not arr or arr[0] is None: return None
    root = TreeNode(arr[0])
    queue = [root]
    i = 1
    while queue and i < len(arr):
        node = queue.pop(0)
        if i < len(arr) and arr[i] is not None:
            node.left = TreeNode(arr[i])
            queue.append(node.left)
        i += 1
        if i < len(arr) and arr[i] is not None:
            node.right = TreeNode(arr[i])
            queue.append(node.right)
        i += 1
    return root

def __serialize_binary_tree(root):
    if not root: return []
    result = []
    queue = [root]
    while queue:
        node = queue.pop(0)
        if node:
            result.append(node.val)
            queue.append(node.left)
            queue.append(node.right)
        else:
            result.append(None)
    while result and result[-1] is None:
        result.pop()
    return result

# --- User Code ---

class Solution:
    def mergeTwoLists(self, list1, list2):
        return None


# --- Batch Driver ---
def __main():
    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue
        tc = json.loads(line)
        args = []
        a_list1 = tc.get('list1')
        a_list1 = __build_linked_list(a_list1)
        args.append(a_list1)
        a_list2 = tc.get('list2')
        a_list2 = __build_linked_list(a_list2)
        args.append(a_list2)

        sol = Solution()
        r = sol.mergeTwoLists(*args)
        print(json.dumps(__serialize_linked_list(r), separators=(',', ':')))
        print("___KC_BATCH_SEP___", flush=True)

if __name__ == "__main__":
    __main()
