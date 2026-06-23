# workers/src/worker/wrapper_generator/languages/python.py

class PythonGenerator:
    @staticmethod
    def generate(signature: dict, user_code: str, batch: bool = False) -> str:
        func_name = signature.get('name', 'solve')
        ret_type = signature.get('returnType', 'Void')

        wrapper = f"""
import sys
import json
from typing import List, Dict, Any, Optional

# --- Platform Types ---
class ListNode:
    def __init__(self, val=0, next=None):
        self.val = val
        self.next = next

class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right

# --- Deserialization Helpers ---
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
{user_code}

# --- Driver Code ---
def __main():
"""

        if batch:
            wrapper += f"""
    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue
        print(f"DEBUG raw JSON: {{line}}", file=sys.stderr)
        tc = json.loads(line)
        print(f"DEBUG parsed JSON: {{tc}}", file=sys.stderr)
        args = []
"""
            for param in signature.get('params', []):
                pn = param['name']
                pt = param['type']
                wrapper += f"        a_{pn} = tc.get('{pn}')\n"
                if pt == 'LinkedList':
                    wrapper += f"        a_{pn} = __build_linked_list(a_{pn})\n"
                    wrapper += f"        print(f'DEBUG deserialized {pn}: {{__serialize_linked_list(a_{pn})}}', file=sys.stderr)\n"
                elif pt == 'BinaryTree':
                    wrapper += f"        a_{pn} = __build_binary_tree(a_{pn})\n"
                elif pt == 'Character':
                    wrapper += f"        a_{pn} = a_{pn}[0] if a_{pn} else ''\n"
                wrapper += f"        args.append(a_{pn})\n"

            wrapper += f"""
        sol = Solution()
        r = sol.{func_name}(*args)
"""
            if ret_type == 'Void':
                wrapper += "        print('null')\n"
            elif ret_type == 'LinkedList':
                wrapper += "        print(json.dumps(__serialize_linked_list(r), separators=(',', ':')))\n"
            elif ret_type == 'BinaryTree':
                wrapper += "        print(json.dumps(__serialize_binary_tree(r), separators=(',', ':')))\n"
            elif ret_type in ['Boolean', 'Character']:
                wrapper += "        print(json.dumps(r, separators=(',', ':')))\n"
            else:
                wrapper += "        print(json.dumps(r, separators=(',', ':')))\n"

            wrapper += "        print('___KC_BATCH_SEP___', flush=True)\n"
        else:
            wrapper += f"""
    input_data = sys.stdin.read().strip()
    if not input_data:
        return
        
    try:
        parsed_input = json.loads(input_data)
    except json.JSONDecodeError:
        print("Invalid JSON input", file=sys.stderr)
        sys.exit(1)
        
    args = []
"""
            for param in signature.get('params', []):
                pn = param['name']
                pt = param['type']
                wrapper += f"    arg_{pn} = parsed_input.get('{pn}')\n"
                if pt == 'LinkedList':
                    wrapper += f"    arg_{pn} = __build_linked_list(arg_{pn})\n"
                elif pt == 'BinaryTree':
                    wrapper += f"    arg_{pn} = __build_binary_tree(arg_{pn})\n"
                elif pt == 'Character':
                    wrapper += f"    arg_{pn} = arg_{pn}[0] if arg_{pn} else ''\n"
                wrapper += f"    args.append(arg_{pn})\n"

            wrapper += f"""
    sol = Solution()
    result = sol.{func_name}(*args)
"""
            if ret_type == 'Void':
                wrapper += "    print('null')\n"
            elif ret_type == 'LinkedList':
                wrapper += "    print(json.dumps(__serialize_linked_list(result), separators=(',', ':')))\n"
            elif ret_type == 'BinaryTree':
                wrapper += "    print(json.dumps(__serialize_binary_tree(result), separators=(',', ':')))\n"
            elif ret_type in ['Boolean', 'Character']:
                wrapper += "    print(json.dumps(result, separators=(',', ':')))\n"
            else:
                wrapper += "    print(json.dumps(result, separators=(',', ':')))\n"

        wrapper += """
if __name__ == "__main__":
    __main()
"""
        return wrapper
