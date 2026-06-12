# workers/src/worker/wrapper_generator.py
# ─────────────────────────────────────────────────────────────────────────────
# KodeChirp V3 — Multi-Language Execution Wrapper Generator
# ─────────────────────────────────────────────────────────────────────────────

import json

class WrapperGenerator:
    """
    Generates execution wrappers for FUNCTION and CLASS judge modes.
    Takes the user's implementation and wraps it with JSON serialization/deserialization logic.
    """

    @staticmethod
    def generate(language: str, signature: dict, user_code: str) -> str:
        """
        Main entry point for generating the wrapper.
        """
        if language == "python":
            return WrapperGenerator._generate_python(signature, user_code)
        elif language == "javascript":
            return WrapperGenerator._generate_javascript(signature, user_code)
        # Add support for Java, C++ later
        else:
            raise NotImplementedError(f"Wrapper generation not supported for language: {language}")

    @staticmethod
    def _generate_python(signature: dict, user_code: str) -> str:
        """
        Generates a Python wrapper.
        """
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

# --- User Code ---
{user_code}

# --- Driver Code ---
def __main():
    # Read from stdin
    input_data = sys.stdin.read().strip()
    if not input_data:
        return
        
    try:
        parsed_input = json.loads(input_data)
    except json.JSONDecodeError:
        print("Invalid JSON input", file=sys.stderr)
        sys.exit(1)
        
    # Extract arguments based on signature
    args = []
"""
        # Inject arg extraction logic
        for param in signature.get('params', []):
            p_name = param['name']
            p_type = param['type']
            wrapper += f"    arg_{p_name} = parsed_input.get('{p_name}')\n"
            if p_type == 'LinkedList':
                wrapper += f"    arg_{p_name} = __build_linked_list(arg_{p_name})\n"
            wrapper += f"    args.append(arg_{p_name})\n"

        func_name = signature.get('name', 'solve')
        wrapper += f"\n    # Call user function\n"
        wrapper += f"    result = {func_name}(*args)\n\n"

        ret_type = signature.get('returnType', 'Void')
        if ret_type == 'Void':
            wrapper += f"    print('null')\n"
        elif ret_type == 'LinkedList':
            wrapper += f"    print(json.dumps(__serialize_linked_list(result)))\n"
        else:
            wrapper += f"    print(json.dumps(result))\n"

        wrapper += """
if __name__ == "__main__":
    __main()
"""
        return wrapper

    @staticmethod
    def _generate_javascript(signature: dict, user_code: str) -> str:
        """
        Generates a JavaScript wrapper.
        """
        wrapper = f"""
const fs = require('fs');

// --- Platform Types ---
class ListNode {{
    constructor(val = 0, next = null) {{
        this.val = val;
        this.next = next;
    }}
}}

class TreeNode {{
    constructor(val = 0, left = null, right = null) {{
        this.val = val;
        this.left = left;
        this.right = right;
    }}
}}

// --- Deserialization Helpers ---
function __buildLinkedList(arr) {{
    if (!arr || arr.length === 0) return null;
    let head = new ListNode(arr[0]);
    let curr = head;
    for (let i = 1; i < arr.length; i++) {{
        curr.next = new ListNode(arr[i]);
        curr = curr.next;
    }}
    return head;
}}

function __serializeLinkedList(head) {{
    let arr = [];
    while (head) {{
        arr.push(head.val);
        head = head.next;
    }}
    return arr;
}}

// --- User Code ---
{user_code}

// --- Driver Code ---
function __main() {{
    const inputData = fs.readFileSync(0, 'utf-8').trim();
    if (!inputData) return;
    
    let parsedInput;
    try {{
        parsedInput = JSON.parse(inputData);
    }} catch (e) {{
        console.error("Invalid JSON input");
        process.exit(1);
    }}
    
    let args = [];
"""
        for param in signature.get('params', []):
            p_name = param['name']
            p_type = param['type']
            wrapper += f"    let arg_{p_name} = parsedInput['{p_name}'];\n"
            if p_type == 'LinkedList':
                wrapper += f"    arg_{p_name} = __buildLinkedList(arg_{p_name});\n"
            wrapper += f"    args.push(arg_{p_name});\n"

        func_name = signature.get('name', 'solve')
        wrapper += f"\n    // Call user function\n"
        wrapper += f"    let result = {func_name}(...args);\n\n"

        ret_type = signature.get('returnType', 'Void')
        if ret_type == 'Void':
            wrapper += f"    console.log('null');\n"
        elif ret_type == 'LinkedList':
            wrapper += f"    console.log(JSON.stringify(__serializeLinkedList(result)));\n"
        else:
            wrapper += f"    console.log(JSON.stringify(result));\n"

        wrapper += """
}

if (require.main === module) {
    __main();
}
"""
        return wrapper
