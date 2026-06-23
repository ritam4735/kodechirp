# workers/src/worker/wrapper_generator.py
# ─────────────────────────────────────────────────────────────────────────────
# KodeChirp V3 — Multi-Language Execution Wrapper Generator
# ─────────────────────────────────────────────────────────────────────────────

import json
import re


# ─── Type Normalization ───────────────────────────────────────────────────────
# The UI uses names like 'Integer', 'Array<Integer>', but the wrapper logic uses
# shorter canonical names like 'Int', 'Array<Int>'.  This layer maps them.

_TYPE_ALIASES = {
    'Integer': 'Int',
    'Float': 'Float',
    'String': 'String',
    'Boolean': 'Boolean',
    'Character': 'Character',
    'Array<Integer>': 'Array<Int>',
    'Array<Float>': 'Array<Float>',
    'Array<String>': 'Array<String>',
    'Array<Boolean>': 'Array<Boolean>',
    'Matrix<Integer>': 'Matrix<Int>',
    'Matrix<Float>': 'Matrix<Float>',
    'Matrix<String>': 'Matrix<String>',
    'Matrix<Boolean>': 'Matrix<Boolean>',
    'LinkedList': 'LinkedList',
    'BinaryTree': 'BinaryTree',
    'Void': 'Void',
    # Already-canonical names (idempotent)
    'Int': 'Int',
    'Array<Int>': 'Array<Int>',
    'Matrix<Int>': 'Matrix<Int>',
}


def _normalize_type(t: str) -> str:
    """Normalize a UI type name to the internal canonical name."""
    return _TYPE_ALIASES.get(t, t)


def _normalize_signature(sig: dict) -> dict:
    """Return a copy of the signature with all types normalized."""
    return {
        'name': sig.get('name', 'solve'),
        'params': [
            {'name': p['name'], 'type': _normalize_type(p['type'])}
            for p in sig.get('params', [])
        ],
        'returnType': _normalize_type(sig.get('returnType', 'Void')),
    }


# ─── Type-mapping helpers ─────────────────────────────────────────────────────

def _c_type(sig_type: str) -> str:
    """Map signature type to C type string."""
    mapping = {
        'Int': 'int',
        'Float': 'double',
        'Boolean': 'int',
        'String': 'char*',
        'Character': 'char',
        'Array<Int>': 'int*',
        'Array<Float>': 'double*',
        'Array<String>': 'char**',
        'Array<Boolean>': 'int*',
        'Matrix<Int>': 'int**',
        'Matrix<Float>': 'double**',
        'Matrix<String>': 'char***',
        'Matrix<Boolean>': 'int**',
        'LinkedList': 'struct ListNode*',
        'BinaryTree': 'struct TreeNode*',
        'Void': 'void',
    }
    return mapping.get(sig_type, 'int')


def _cpp_type(sig_type: str) -> str:
    """Map signature type to C++ type string."""
    mapping = {
        'Int': 'int',
        'Float': 'double',
        'Boolean': 'bool',
        'String': 'string',
        'Character': 'char',
        'Array<Int>': 'vector<int>',
        'Array<Float>': 'vector<double>',
        'Array<String>': 'vector<string>',
        'Array<Boolean>': 'vector<bool>',
        'Matrix<Int>': 'vector<vector<int>>',
        'Matrix<Float>': 'vector<vector<double>>',
        'Matrix<String>': 'vector<vector<string>>',
        'Matrix<Boolean>': 'vector<vector<bool>>',
        'LinkedList': 'ListNode*',
        'BinaryTree': 'TreeNode*',
        'Void': 'void',
    }
    return mapping.get(sig_type, 'int')


def _java_type(sig_type: str) -> str:
    """Map signature type to Java type string."""
    mapping = {
        'Int': 'int',
        'Float': 'double',
        'Boolean': 'boolean',
        'String': 'String',
        'Character': 'char',
        'Array<Int>': 'int[]',
        'Array<Float>': 'double[]',
        'Array<String>': 'String[]',
        'Array<Boolean>': 'boolean[]',
        'Matrix<Int>': 'int[][]',
        'Matrix<Float>': 'double[][]',
        'Matrix<String>': 'String[][]',
        'Matrix<Boolean>': 'boolean[][]',
        'LinkedList': 'ListNode',
        'BinaryTree': 'TreeNode',
        'Void': 'void',
    }
    return mapping.get(sig_type, 'int')


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
        signature = _normalize_signature(signature)
        if language == "python":
            return WrapperGenerator._generate_python(signature, user_code)
        elif language == "javascript":
            return WrapperGenerator._generate_javascript(signature, user_code)
        elif language == "c":
            return WrapperGenerator._generate_c(signature, user_code)
        elif language == "cpp":
            return WrapperGenerator._generate_cpp(signature, user_code)
        elif language == "java":
            return WrapperGenerator._generate_java(signature, user_code)
        else:
            raise NotImplementedError(f"Wrapper generation not supported for language: {language}")

    @staticmethod
    def generate_batch(language: str, signature: dict, user_code: str) -> str:
        """
        Generate a batch wrapper that runs ALL test cases in a single process.

        Protocol (NDJSON):
          stdin:  JSON array of test-case input objects
          stdout: One JSON line per test case: {"stdout":"...","exitCode":0}
                  If the user function crashes, partial results are emitted up
                  to the failing test, then one error line with exitCode != 0.
        """
        signature = _normalize_signature(signature)
        if language == "python":
            return WrapperGenerator._generate_batch_python(signature, user_code)
        elif language == "javascript":
            return WrapperGenerator._generate_batch_javascript(signature, user_code)
        elif language == "c":
            return WrapperGenerator._generate_batch_c(signature, user_code)
        elif language == "cpp":
            return WrapperGenerator._generate_batch_cpp(signature, user_code)
        elif language == "java":
            return WrapperGenerator._generate_batch_java(signature, user_code)
        else:
            raise NotImplementedError(f"Batch wrapper not supported for language: {language}")

    # ─── Python ───────────────────────────────────────────────────────────────

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
            elif p_type == 'BinaryTree':
                wrapper += f"    arg_{p_name} = __build_binary_tree(arg_{p_name})\n"
            elif p_type == 'Character':
                wrapper += f"    arg_{p_name} = arg_{p_name}[0] if arg_{p_name} else ''\n"
            wrapper += f"    args.append(arg_{p_name})\n"

        func_name = signature.get('name', 'solve')
        wrapper += f"\n    # Call user function\n"
        wrapper += f"    sol = Solution()\n"
        wrapper += f"    result = sol.{func_name}(*args)\n\n"

        ret_type = signature.get('returnType', 'Void')
        if ret_type == 'Void':
            wrapper += f"    print('null')\n"
        elif ret_type == 'LinkedList':
            wrapper += f"    print(json.dumps(__serialize_linked_list(result), separators=(',', ':')))\n"
        elif ret_type == 'BinaryTree':
            wrapper += f"    print(json.dumps(__serialize_binary_tree(result), separators=(',', ':')))\n"
        elif ret_type == 'Boolean':
            wrapper += f"    print(json.dumps(result, separators=(',', ':')))\n"
        elif ret_type == 'Character':
            wrapper += f"    print(json.dumps(result, separators=(',', ':')))\n"
        else:
            wrapper += f"    print(json.dumps(result, separators=(',', ':')))\n"

        wrapper += """
if __name__ == "__main__":
    __main()
"""
        return wrapper

    # ─── JavaScript ───────────────────────────────────────────────────────────

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

function __buildBinaryTree(arr) {{
    if (!arr || arr.length === 0 || arr[0] == null) return null;
    let root = new TreeNode(arr[0]);
    let queue = [root];
    let i = 1;
    while (queue.length > 0 && i < arr.length) {{
        let node = queue.shift();
        if (i < arr.length && arr[i] != null) {{
            node.left = new TreeNode(arr[i]);
            queue.push(node.left);
        }}
        i++;
        if (i < arr.length && arr[i] != null) {{
            node.right = new TreeNode(arr[i]);
            queue.push(node.right);
        }}
        i++;
    }}
    return root;
}}

function __serializeBinaryTree(root) {{
    if (!root) return [];
    let result = [];
    let queue = [root];
    while (queue.length > 0) {{
        let node = queue.shift();
        if (node) {{
            result.push(node.val);
            queue.push(node.left);
            queue.push(node.right);
        }} else {{
            result.push(null);
        }}
    }}
    while (result.length > 0 && result[result.length - 1] == null) result.pop();
    return result;
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
            elif p_type == 'BinaryTree':
                wrapper += f"    arg_{p_name} = __buildBinaryTree(arg_{p_name});\n"
            elif p_type == 'Character':
                wrapper += f"    arg_{p_name} = (arg_{p_name} || '')[0] || '';\n"
            wrapper += f"    args.push(arg_{p_name});\n"

        func_name = signature.get('name', 'solve')
        wrapper += f"\n    // Call user function\n"
        wrapper += f"    let result = {func_name}(...args);\n\n"

        ret_type = signature.get('returnType', 'Void')
        if ret_type == 'Void':
            wrapper += f"    console.log('null');\n"
        elif ret_type == 'LinkedList':
            wrapper += f"    console.log(JSON.stringify(__serializeLinkedList(result)));\n"
        elif ret_type == 'BinaryTree':
            wrapper += f"    console.log(JSON.stringify(__serializeBinaryTree(result)));\n"
        else:
            wrapper += f"    console.log(JSON.stringify(result));\n"

        wrapper += """
}

if (require.main === module) {
    __main();
}
"""
        return wrapper

    # ─── C ────────────────────────────────────────────────────────────────────

    @staticmethod
    def _generate_c(signature: dict, user_code: str) -> str:
        """
        Generates a C wrapper.
        Includes a minimal JSON parser that handles: int, bool (as int), string,
        and int arrays. Reads JSON object from stdin, extracts named fields,
        calls the user function, and prints the result as compact JSON.
        """
        params = signature.get('params', [])
        func_name = signature.get('name', 'solve')
        ret_type = signature.get('returnType', 'Int')

        # Build the call arguments and declarations
        decl_lines = []
        parse_lines = []
        call_args = []

        for p in params:
            pn = p['name']
            pt = p['type']
            if pt == 'Int':
                decl_lines.append(f'    int arg_{pn} = 0;')
                parse_lines.append(f'    arg_{pn} = __kc_get_int(input, "{pn}");')
                call_args.append(f'arg_{pn}')
            elif pt == 'Float':
                decl_lines.append(f'    double arg_{pn} = 0.0;')
                parse_lines.append(f'    arg_{pn} = __kc_get_float(input, "{pn}");')
                call_args.append(f'arg_{pn}')
            elif pt == 'Boolean':
                decl_lines.append(f'    int arg_{pn} = 0;')
                parse_lines.append(f'    arg_{pn} = __kc_get_bool(input, "{pn}");')
                call_args.append(f'arg_{pn}')
            elif pt == 'String':
                decl_lines.append(f'    char arg_{pn}[65536]; arg_{pn}[0] = 0;')
                parse_lines.append(f'    __kc_get_string(input, "{pn}", arg_{pn}, sizeof(arg_{pn}));')
                call_args.append(f'arg_{pn}')
            elif pt == 'Character':
                decl_lines.append(f'    char arg_{pn} = 0;')
                parse_lines.append(f'    {{ char __tmp[4]; __kc_get_string(input, "{pn}", __tmp, sizeof(__tmp)); arg_{pn} = __tmp[0]; }}')
                call_args.append(f'arg_{pn}')
            elif pt == 'Array<Int>':
                decl_lines.append(f'    int arg_{pn}[100001]; int arg_{pn}_len = 0;')
                parse_lines.append(f'    arg_{pn}_len = __kc_get_int_array(input, "{pn}", arg_{pn}, 100001);')
                call_args.append(f'arg_{pn}')
                call_args.append(f'arg_{pn}_len')
            elif pt == 'Array<Float>':
                decl_lines.append(f'    double arg_{pn}[100001]; int arg_{pn}_len = 0;')
                parse_lines.append(f'    arg_{pn}_len = __kc_get_float_array(input, "{pn}", arg_{pn}, 100001);')
                call_args.append(f'arg_{pn}')
                call_args.append(f'arg_{pn}_len')
            elif pt == 'Array<String>':
                decl_lines.append(f'    char arg_{pn}[10001][256]; int arg_{pn}_len = 0;')
                parse_lines.append(f'    arg_{pn}_len = __kc_get_string_array(input, "{pn}", arg_{pn}, 10001, 256);')
                call_args.append(f'arg_{pn}')
                call_args.append(f'arg_{pn}_len')
            elif pt == 'Array<Boolean>':
                decl_lines.append(f'    int arg_{pn}[100001]; int arg_{pn}_len = 0;')
                parse_lines.append(f'    arg_{pn}_len = __kc_get_bool_array(input, "{pn}", arg_{pn}, 100001);')
                call_args.append(f'arg_{pn}')
                call_args.append(f'arg_{pn}_len')
            elif pt == 'LinkedList':
                decl_lines.append(f'    int arg_{pn}_arr[100001]; int arg_{pn}_len = 0;')
                decl_lines.append(f'    struct ListNode* arg_{pn} = NULL;')
                parse_lines.append(f'    arg_{pn}_len = __kc_get_int_array(input, "{pn}", arg_{pn}_arr, 100001);')
                parse_lines.append(f'    arg_{pn} = __kc_build_linked_list(arg_{pn}_arr, arg_{pn}_len);')
                call_args.append(f'arg_{pn}')
            elif pt.startswith('Matrix'):
                # Matrix types are passed as flattened with rows/cols
                decl_lines.append(f'    /* Matrix param {pn} - not fully supported in C */')
                decl_lines.append(f'    int arg_{pn}_flat[100001]; int arg_{pn}_rows = 0; int arg_{pn}_cols = 0;')
                parse_lines.append(f'    /* Matrix deserialization for {pn} is not supported in C wrappers */')
                call_args.append(f'arg_{pn}_flat')
                call_args.append(f'arg_{pn}_rows')
                call_args.append(f'arg_{pn}_cols')

        # For array return, user must write: int* func(args..., int* returnSize)
        if ret_type.startswith('Array'):
            call_args.append('&__ret_size')
        elif ret_type.startswith('Matrix'):
            call_args.append('&__ret_size')
            call_args.append('&__ret_col_sizes')

        decls = '\n'.join(decl_lines)
        parses = '\n'.join(parse_lines)
        args_str = ', '.join(call_args)

        # Build print logic
        if ret_type == 'Int':
            print_logic = '    printf("%d\\n", __result);'
        elif ret_type == 'Float':
            print_logic = '    printf("%.17g\\n", __result);'
        elif ret_type == 'Boolean':
            print_logic = '    printf("%s\\n", __result ? "true" : "false");'
        elif ret_type == 'String':
            print_logic = '    __kc_print_string(__result);'
        elif ret_type == 'Character':
            print_logic = '    printf("\\"%c\\"\\n", __result);'
        elif ret_type == 'Array<Int>':
            print_logic = '''    printf("[");
    for (int __i = 0; __i < __ret_size; __i++) {
        if (__i > 0) printf(",");
        printf("%d", __result[__i]);
    }
    printf("]\\n");'''
        elif ret_type == 'Array<Float>':
            print_logic = '''    printf("[");
    for (int __i = 0; __i < __ret_size; __i++) {
        if (__i > 0) printf(",");
        printf("%.17g", __result[__i]);
    }
    printf("]\\n");'''
        elif ret_type == 'Array<Boolean>':
            print_logic = '''    printf("[");
    for (int __i = 0; __i < __ret_size; __i++) {
        if (__i > 0) printf(",");
        printf("%s", __result[__i] ? "true" : "false");
    }
    printf("]\\n");'''
        elif ret_type == 'LinkedList':
            print_logic = '    __kc_print_linked_list(__result);'
        elif ret_type == 'Void':
            print_logic = '    printf("null\\n");'
        else:
            print_logic = '    printf("%d\\n", __result);'

        # Return type in C
        c_ret = _c_type(ret_type)
        if ret_type.startswith('Array'):
            c_ret = _c_type(ret_type) if _c_type(ret_type) != 'int' else 'int*'
        elif ret_type == 'LinkedList':
            c_ret = 'struct ListNode*'

        if ret_type == 'Void':
            call_logic = f"    {func_name}({args_str});"
        else:
            call_logic = f"    {c_ret} __result = {func_name}({args_str});"

        wrapper = f'''#include <stdio.h>
#include <stdlib.h>
#include <string.h>

/* ── Platform Types ───────────────────────────────────────────────────── */
struct ListNode {{
    int val;
    struct ListNode *next;
}};

struct TreeNode {{
    int val;
    struct TreeNode *left;
    struct TreeNode *right;
}};

/* ── Minimal JSON helpers ─────────────────────────────────────────────── */

static const char* __kc_find_key(const char* json, const char* key) {{
    char pat[256];
    snprintf(pat, sizeof(pat), "\\"%s\\"", key);
    const char* p = json;
    while ((p = strstr(p, pat)) != NULL) {{
        const char* check = p + strlen(pat);
        while (*check == ' ') check++;
        if (*check == ':') {{
            check++;
            while (*check == ' ') check++;
            return check;
        }}
        p += strlen(pat);
    }}
    return NULL;
}}

static int __kc_get_int(const char* json, const char* key) {{
    const char* p = __kc_find_key(json, key);
    if (!p) return 0;
    return atoi(p);
}}

static double __kc_get_float(const char* json, const char* key) {{
    const char* p = __kc_find_key(json, key);
    if (!p) return 0.0;
    return atof(p);
}}

static int __kc_get_bool(const char* json, const char* key) {{
    const char* p = __kc_find_key(json, key);
    if (!p) return 0;
    if (strncmp(p, "true", 4) == 0) return 1;
    return 0;
}}

static void __kc_get_string(const char* json, const char* key, char* out, int maxlen) {{
    const char* p = __kc_find_key(json, key);
    if (!p || *p != '"') {{ out[0] = 0; return; }}
    p++;
    int i = 0;
    while (*p && *p != '"' && i < maxlen - 1) {{
        if (*p == '\\\\' && *(p+1)) {{
            p++;
            if (*p == 'n') out[i++] = '\\n';
            else if (*p == 'r') out[i++] = '\\r';
            else if (*p == 't') out[i++] = '\\t';
            else out[i++] = *p;
            p++;
        }} else {{
            out[i++] = *p++;
        }}
    }}
    out[i] = 0;
}}

static void __kc_print_string(const char* s) {{
    putchar('"');
    while (*s) {{
        if (*s == '\\\\') printf("\\\\\\\\");
        else if (*s == '"') printf("\\\\\\"");
        else if (*s == '\\n') printf("\\\\n");
        else if (*s == '\\r') printf("\\\\r");
        else if (*s == '\\t') printf("\\\\t");
        else putchar(*s);
        s++;
    }}
    printf("\\"\\n");
}}

static int __kc_get_int_array(const char* json, const char* key, int* out, int maxlen) {{
    const char* p = __kc_find_key(json, key);
    if (!p || *p != '[') return 0;
    p++;
    int count = 0;
    while (*p && *p != ']' && count < maxlen) {{
        while (*p == ' ' || *p == ',') p++;
        if (*p == ']') break;
        out[count++] = atoi(p);
        if (*p == '-') p++;
        while (*p >= '0' && *p <= '9') p++;
    }}
    return count;
}}

static int __kc_get_float_array(const char* json, const char* key, double* out, int maxlen) {{
    const char* p = __kc_find_key(json, key);
    if (!p || *p != '[') return 0;
    p++;
    int count = 0;
    while (*p && *p != ']' && count < maxlen) {{
        while (*p == ' ' || *p == ',') p++;
        if (*p == ']') break;
        out[count++] = atof(p);
        if (*p == '-') p++;
        while ((*p >= '0' && *p <= '9') || *p == '.' || *p == 'e' || *p == 'E' || *p == '+') p++;
    }}
    return count;
}}

static int __kc_get_bool_array(const char* json, const char* key, int* out, int maxlen) {{
    const char* p = __kc_find_key(json, key);
    if (!p || *p != '[') return 0;
    p++;
    int count = 0;
    while (*p && *p != ']' && count < maxlen) {{
        while (*p == ' ' || *p == ',') p++;
        if (*p == ']') break;
        out[count++] = (strncmp(p, "true", 4) == 0) ? 1 : 0;
        while (*p && *p != ',' && *p != ']') p++;
    }}
    return count;
}}

static int __kc_get_string_array(const char* json, const char* key, char out[][256], int maxrows, int maxcol) {{
    const char* p = __kc_find_key(json, key);
    if (!p || *p != '[') return 0;
    p++;
    int count = 0;
    while (*p && *p != ']' && count < maxrows) {{
        while (*p == ' ' || *p == ',') p++;
        if (*p == ']') break;
        if (*p == '\"') {{
            p++;
            int i = 0;
            while (*p && *p != '\"' && i < maxcol - 1) {{
                if (*p == '\\\\' && *(p+1)) {{ p++; out[count][i++] = *p++; }}
                else {{ out[count][i++] = *p++; }}
            }}
            out[count][i] = 0;
            if (*p == '\"') p++;
            count++;
        }} else {{
            while (*p && *p != ',' && *p != ']') p++;
        }}
    }}
    return count;
}}

static struct ListNode* __kc_build_linked_list(int* arr, int len) {{
    if (len == 0) return NULL;
    struct ListNode* head = (struct ListNode*)malloc(sizeof(struct ListNode));
    head->val = arr[0];
    head->next = NULL;
    struct ListNode* curr = head;
    for (int i = 1; i < len; i++) {{
        curr->next = (struct ListNode*)malloc(sizeof(struct ListNode));
        curr->next->val = arr[i];
        curr->next->next = NULL;
        curr = curr->next;
    }}
    return head;
}}

static void __kc_print_linked_list(struct ListNode* head) {{
    printf("[");
    int first = 1;
    while (head) {{
        if (!first) printf(",");
        printf("%d", head->val);
        first = 0;
        head = head->next;
    }}
    printf("]\\n");
}}

/* ── User Code ────────────────────────────────────────── */

{user_code}

/* ── Driver ───────────────────────────────────────────── */

int main(void) {{
    char input[1048576];
    int total = 0;
    while (1) {{
        int n = fread(input + total, 1, sizeof(input) - total - 1, stdin);
        if (n <= 0) break;
        total += n;
    }}
    input[total] = 0;

{decls}
{parses}

    int __ret_size = 0;
    int* __ret_col_sizes = NULL;
{call_logic}

{print_logic}
    return 0;
}}
'''
        return wrapper

    # ─── C++ ──────────────────────────────────────────────────────────────────

    @staticmethod
    def _generate_cpp(signature: dict, user_code: str) -> str:
        """
        Generates a C++ wrapper.
        Uses a lightweight JSON parser built on std::string operations.
        """
        params = signature.get('params', [])
        func_name = signature.get('name', 'solve')
        ret_type = signature.get('returnType', 'Int')

        decl_lines = []
        call_args = []

        for p in params:
            pn = p['name']
            pt = p['type']
            if pt == 'Int':
                decl_lines.append(f'    int arg_{pn} = __kc_get_int(input, "{pn}");')
                call_args.append(f'arg_{pn}')
            elif pt == 'Float':
                decl_lines.append(f'    double arg_{pn} = __kc_get_float(input, "{pn}");')
                call_args.append(f'arg_{pn}')
            elif pt == 'Boolean':
                decl_lines.append(f'    bool arg_{pn} = __kc_get_bool(input, "{pn}");')
                call_args.append(f'arg_{pn}')
            elif pt == 'String':
                decl_lines.append(f'    string arg_{pn} = __kc_get_string(input, "{pn}");')
                call_args.append(f'arg_{pn}')
            elif pt == 'Character':
                decl_lines.append(f'    char arg_{pn} = __kc_get_string(input, "{pn}")[0];')
                call_args.append(f'arg_{pn}')
            elif pt == 'Array<Int>':
                decl_lines.append(f'    vector<int> arg_{pn} = __kc_get_int_array(input, "{pn}");')
                call_args.append(f'arg_{pn}')
            elif pt == 'Array<Float>':
                decl_lines.append(f'    vector<double> arg_{pn} = __kc_get_float_array(input, "{pn}");')
                call_args.append(f'arg_{pn}')
            elif pt == 'Array<String>':
                decl_lines.append(f'    vector<string> arg_{pn} = __kc_get_string_array(input, "{pn}");')
                call_args.append(f'arg_{pn}')
            elif pt == 'Array<Boolean>':
                decl_lines.append(f'    vector<bool> arg_{pn} = __kc_get_bool_array(input, "{pn}");')
                call_args.append(f'arg_{pn}')
            elif pt.startswith('Matrix'):
                inner = 'int'
                if 'Float' in pt: inner = 'double'
                elif 'String' in pt: inner = 'string'
                elif 'Boolean' in pt or 'Bool' in pt: inner = 'bool'
                getter = '__kc_get_int_matrix' if inner == 'int' else '__kc_get_int_matrix'
                decl_lines.append(f'    vector<vector<{inner}>> arg_{pn} = __kc_get_matrix<{inner}>(input, "{pn}");')
                call_args.append(f'arg_{pn}')
            elif pt == 'LinkedList':
                decl_lines.append(f'    ListNode* arg_{pn} = __kc_build_linked_list(__kc_get_int_array(input, "{pn}"));')
                call_args.append(f'arg_{pn}')
            elif pt == 'BinaryTree':
                decl_lines.append(f'    TreeNode* arg_{pn} = __kc_build_binary_tree(__kc_get_int_array_nullable(input, "{pn}"));')
                call_args.append(f'arg_{pn}')

        decls = '\n'.join(decl_lines)
        args_str = ', '.join(call_args)

        # Return type
        cpp_ret = _cpp_type(ret_type)

        if ret_type == 'Void':
            call_logic = f"    sol.{func_name}({args_str});"
        else:
            call_logic = f"    {cpp_ret} result = sol.{func_name}({args_str});"

        # Print logic
        if ret_type == 'Int':
            print_logic = '    cout << result << "\\n";'
        elif ret_type == 'Float':
            print_logic = '    cout << fixed << setprecision(17) << result << "\\n";'
        elif ret_type == 'Boolean':
            print_logic = '    cout << (result ? "true" : "false") << "\\n";'
        elif ret_type == 'String':
            print_logic = '    __kc_print_string(result);'
        elif ret_type == 'Character':
            print_logic = '    cout << "\\"" << result << "\\"" << "\\n";'
        elif ret_type.startswith('Array') or ret_type.startswith('Matrix'):
            print_logic = '    __kc_print_json(result);'
        elif ret_type == 'LinkedList':
            print_logic = '    __kc_print_linked_list(result);'
        elif ret_type == 'BinaryTree':
            print_logic = '    __kc_print_binary_tree(result);'
        elif ret_type == 'Void':
            print_logic = '    cout << "null" << "\\n";'
        else:
            print_logic = '    cout << result << "\\n";'

        wrapper = f'''#include <iostream>
#include <string>
#include <vector>
#include <sstream>
#include <algorithm>
#include <cstdlib>

using namespace std;

/* ── Platform Types ───────────────────────────────────────────────────── */
struct ListNode {{
    int val;
    ListNode *next;
    ListNode() : val(0), next(nullptr) {{}}
    ListNode(int x) : val(x), next(nullptr) {{}}
    ListNode(int x, ListNode *next) : val(x), next(next) {{}}
}};

/* ── Minimal JSON helpers ─────────────────────────────────────────────── */

static string::size_type __kc_find_key(const string& json, const string& key) {{
    string pat = "\\"" + key + "\\"";
    string::size_type pos = 0;
    while ((pos = json.find(pat, pos)) != string::npos) {{
        string::size_type check = pos + pat.size();
        while (check < json.size() && json[check] == ' ') check++;
        if (check < json.size() && json[check] == ':') {{
            check++;
            while (check < json.size() && json[check] == ' ') check++;
            return check;
        }}
        pos += pat.size();
    }}
    return string::npos;
}}

static int __kc_get_int(const string& json, const string& key) {{
    auto pos = __kc_find_key(json, key);
    if (pos == string::npos) return 0;
    return atoi(json.c_str() + pos);
}}

static bool __kc_get_bool(const string& json, const string& key) {{
    auto pos = __kc_find_key(json, key);
    if (pos == string::npos) return false;
    return json.substr(pos, 4) == "true";
}}

static string __kc_get_string(const string& json, const string& key) {{
    auto pos = __kc_find_key(json, key);
    if (pos == string::npos || json[pos] != '"') return "";
    pos++;
    string result;
    while (pos < json.size() && json[pos] != '"') {{
        if (json[pos] == '\\\\' && pos + 1 < json.size()) {{
            pos++;
            if (json[pos] == 'n') result += '\\n';
            else if (json[pos] == 'r') result += '\\r';
            else if (json[pos] == 't') result += '\\t';
            else result += json[pos];
            pos++;
        }} else {{
            result += json[pos++];
        }}
    }}
    return result;
}}

static void __kc_print_string(const string& s) {{
    cout << '"';
    for (char c : s) {{
        if (c == '\\\\') cout << "\\\\\\\\";
        else if (c == '"') cout << "\\\\\\"";
        else if (c == '\\n') cout << "\\\\n";
        else if (c == '\\r') cout << "\\\\r";
        else if (c == '\\t') cout << "\\\\t";
        else cout << c;
    }}
    cout << '"' << "\\n";
}}

static vector<int> __kc_get_int_array(const string& json, const string& key) {{
    auto pos = __kc_find_key(json, key);
    vector<int> result;
    if (pos == string::npos || json[pos] != '[') return result;
    pos++;
    while (pos < json.size() && json[pos] != ']') {{
        while (pos < json.size() && (json[pos] == ' ' || json[pos] == ',')) pos++;
        if (pos < json.size() && json[pos] != ']') {{
            result.push_back(atoi(json.c_str() + pos));
            if (json[pos] == '-') pos++;
            while (pos < json.size() && json[pos] >= '0' && json[pos] <= '9') pos++;
        }}
    }}
    return result;
}}

static ListNode* __kc_build_linked_list(const vector<int>& arr) {{
    if (arr.empty()) return nullptr;
    ListNode* head = new ListNode(arr[0]);
    ListNode* curr = head;
    for (size_t i = 1; i < arr.size(); i++) {{
        curr->next = new ListNode(arr[i]);
        curr = curr->next;
    }}
    return head;
}}

static void __kc_print_linked_list(ListNode* head) {{
    cout << "[";
    bool first = true;
    while (head) {{
        if (!first) cout << ",";
        cout << head->val;
        first = false;
        head = head->next;
    }}
    cout << "]\\n";
}}

struct TreeNode {{
    int val;
    TreeNode *left;
    TreeNode *right;
    TreeNode() : val(0), left(nullptr), right(nullptr) {{}}
    TreeNode(int x) : val(x), left(nullptr), right(nullptr) {{}}
    TreeNode(int x, TreeNode *left, TreeNode *right) : val(x), left(left), right(right) {{}}
}};

static vector<int> __kc_get_int_array_nullable(const string& json, const string& key) {{
    return vector<int>(); // stub
}}

static TreeNode* __kc_build_binary_tree(const vector<int>& arr) {{
    return nullptr; // stub
}}

static void __kc_print_binary_tree(TreeNode* root) {{
    cout << "[]\\n"; // stub
}}

template <typename T>
static vector<vector<T>> __kc_get_matrix(const string& json, const string& key) {{
    return vector<vector<T>>(); // stub
}}

template <typename T>
static void __kc_print_json(const T& obj) {{
    cout << "[]\\n"; // stub
}}

/* ── User Code ────────────────────────────────────────────────────────── */

{user_code}

/* ── Driver ───────────────────────────────────────────────────────────── */

int main() {{
    ios_base::sync_with_stdio(false);
    cin.tie(nullptr);

    string input;
    {{ ostringstream oss; oss << cin.rdbuf(); input = oss.str(); }}

{decls}

    Solution sol;
{call_logic}

{print_logic}
    return 0;
}}
'''
        return wrapper

    # ─── Java ─────────────────────────────────────────────────────────────────

    @staticmethod
    def _generate_java(signature: dict, user_code: str) -> str:
        """
        Generates a Java wrapper.
        Includes a minimal JSON parser as static helper methods inside Main.
        The user's Solution class is embedded, and the driver instantiates it.
        """
        params = signature.get('params', [])
        func_name = signature.get('name', 'solve')
        ret_type = signature.get('returnType', 'Int')

        decl_lines = []
        call_args = []

        for p in params:
            pn = p['name']
            pt = p['type']
            if pt == 'Int':
                decl_lines.append(f'        int arg_{pn} = __kcGetInt(input, "{pn}");')
                call_args.append(f'arg_{pn}')
            elif pt == 'Float':
                decl_lines.append(f'        double arg_{pn} = __kcGetFloat(input, "{pn}");')
                call_args.append(f'arg_{pn}')
            elif pt == 'Boolean':
                decl_lines.append(f'        boolean arg_{pn} = __kcGetBool(input, "{pn}");')
                call_args.append(f'arg_{pn}')
            elif pt == 'String':
                decl_lines.append(f'        String arg_{pn} = __kcGetString(input, "{pn}");')
                call_args.append(f'arg_{pn}')
            elif pt == 'Character':
                decl_lines.append(f'        char arg_{pn} = __kcGetChar(input, "{pn}");')
                call_args.append(f'arg_{pn}')
            elif pt == 'Array<Int>':
                decl_lines.append(f'        int[] arg_{pn} = __kcGetIntArray(input, "{pn}");')
                call_args.append(f'arg_{pn}')
            elif pt == 'Array<Float>':
                decl_lines.append(f'        double[] arg_{pn} = __kcGetFloatArray(input, "{pn}");')
                call_args.append(f'arg_{pn}')
            elif pt == 'Array<String>':
                decl_lines.append(f'        String[] arg_{pn} = __kcGetStringArray(input, "{pn}");')
                call_args.append(f'arg_{pn}')
            elif pt == 'Array<Boolean>':
                decl_lines.append(f'        boolean[] arg_{pn} = __kcGetBooleanArray(input, "{pn}");')
                call_args.append(f'arg_{pn}')
            elif pt.startswith('Matrix'):
                inner = 'int'
                if 'Float' in pt: inner = 'double'
                elif 'String' in pt: inner = 'String'
                elif 'Boolean' in pt or 'Bool' in pt: inner = 'boolean'
                
                if inner == 'int': decl_lines.append(f'        int[][] arg_{pn} = __kcGetIntMatrix(input, "{pn}");')
                elif inner == 'double': decl_lines.append(f'        double[][] arg_{pn} = __kcGetFloatMatrix(input, "{pn}");')
                elif inner == 'String': decl_lines.append(f'        String[][] arg_{pn} = __kcGetStringMatrix(input, "{pn}");')
                elif inner == 'boolean': decl_lines.append(f'        boolean[][] arg_{pn} = __kcGetBooleanMatrix(input, "{pn}");')
                call_args.append(f'arg_{pn}')
            elif pt == 'LinkedList':
                decl_lines.append(f'        ListNode arg_{pn} = __kcBuildLinkedList(__kcGetIntArray(input, "{pn}"));')
                call_args.append(f'arg_{pn}')
            elif pt == 'BinaryTree':
                decl_lines.append(f'        TreeNode arg_{pn} = __kcBuildBinaryTree(__kcGetIntegerArrayNullable(input, "{pn}"));')
                call_args.append(f'arg_{pn}')

        decls = '\n'.join(decl_lines)
        args_str = ', '.join(call_args)

        # Java return type
        java_ret = _java_type(ret_type)

        if ret_type == 'Void':
            call_logic = f"        sol.{func_name}({args_str});"
        else:
            call_logic = f"        {java_ret} result = sol.{func_name}({args_str});"

        # Print logic
        if ret_type == 'Int':
            print_logic = '        System.out.println(result);'
        elif ret_type == 'Float':
            print_logic = '        System.out.println(String.format(Locale.US, "%.17g", result));'
        elif ret_type == 'Boolean':
            print_logic = '        System.out.println(result ? "true" : "false");'
        elif ret_type == 'String':
            print_logic = '        __kcPrintString(result);'
        elif ret_type == 'Character':
            print_logic = '        System.out.println("\\"" + result + "\\"");'
        elif ret_type.startswith('Array') or ret_type.startswith('Matrix'):
            print_logic = '        System.out.println(__kcSerializeJson(result));'
        elif ret_type == 'LinkedList':
            print_logic = '        System.out.println(__kcSerializeLinkedList(result));'
        elif ret_type == 'BinaryTree':
            print_logic = '        System.out.println(__kcSerializeBinaryTree(result));'
        elif ret_type == 'Void':
            print_logic = '        System.out.println("null");'
        else:
            print_logic = '        System.out.println(result);'

        user_code = re.sub(r'public\s+class\s+Solution', 'class Solution', user_code)

        wrapper = f'''import java.io.*;
import java.util.*;

/* ── Platform Types ───────────────────────────────────────────────────── */
class ListNode {{
    int val;
    ListNode next;
    ListNode() {{}}
    ListNode(int val) {{ this.val = val; }}
    ListNode(int val, ListNode next) {{ this.val = val; this.next = next; }}
}}

class TreeNode {{
    int val;
    TreeNode left;
    TreeNode right;
    TreeNode() {{}}
    TreeNode(int val) {{ this.val = val; }}
    TreeNode(int val, TreeNode left, TreeNode right) {{
        this.val = val;
        this.left = left;
        this.right = right;
    }}
}}

/* ── User Code ────────────────────────────────────────────────────────── */

{user_code}

/* ── Driver ───────────────────────────────────────────────────────────── */

public class Main {{

    /* ── Minimal JSON helpers ─────────────────────────────────────────── */

    static int __kcFindKey(String json, String key) {{
        String pat = "\\"" + key + "\\"";
        int pos = json.indexOf(pat);
        if (pos < 0) return -1;
        pos += pat.length();
        while (pos < json.length() && (json.charAt(pos) == ' ' || json.charAt(pos) == ':')) pos++;
        return pos;
    }}

    static int __kcGetInt(String json, String key) {{
        int pos = __kcFindKey(json, key);
        if (pos < 0) return 0;
        int end = pos;
        if (end < json.length() && json.charAt(end) == '-') end++;
        while (end < json.length() && json.charAt(end) >= '0' && json.charAt(end) <= '9') end++;
        return Integer.parseInt(json.substring(pos, end));
    }}

    static boolean __kcGetBool(String json, String key) {{
        int pos = __kcFindKey(json, key);
        if (pos < 0) return false;
        return json.substring(pos).startsWith("true");
    }}

    static String __kcGetString(String json, String key) {{
        int pos = __kcFindKey(json, key);
        if (pos < 0 || json.charAt(pos) != '"') return "";
        pos++;
        StringBuilder sb = new StringBuilder();
        while (pos < json.length() && json.charAt(pos) != '"') {{
            if (json.charAt(pos) == '\\\\' && pos + 1 < json.length()) {{
                pos++;
                sb.append(json.charAt(pos++));
            }} else {{
                sb.append(json.charAt(pos++));
            }}
        }}
        return sb.toString();
    }}

    static int[] __kcGetIntArray(String json, String key) {{
        int pos = __kcFindKey(json, key);
        if (pos < 0 || json.charAt(pos) != '[') return new int[0];
        int end = json.indexOf(']', pos);
        if (end < 0) return new int[0];
        String inner = json.substring(pos + 1, end).trim();
        if (inner.isEmpty()) return new int[0];
        String[] parts = inner.split(",");
        int[] result = new int[parts.length];
        for (int i = 0; i < parts.length; i++) {{
            result[i] = Integer.parseInt(parts[i].trim());
        }}
        return result;
    }}

    static double __kcGetFloat(String json, String key) {{
        int pos = __kcFindKey(json, key);
        if (pos < 0) return 0.0;
        int end = pos;
        while (end < json.length() && ((json.charAt(end) >= '0' && json.charAt(end) <= '9') || json.charAt(end) == '.' || json.charAt(end) == '-' || json.charAt(end) == 'e' || json.charAt(end) == 'E' || json.charAt(end) == '+')) end++;
        return Double.parseDouble(json.substring(pos, end));
    }}

    static char __kcGetChar(String json, String key) {{
        String s = __kcGetString(json, key);
        return s.length() > 0 ? s.charAt(0) : 0;
    }}

    static double[] __kcGetFloatArray(String json, String key) {{
        int pos = __kcFindKey(json, key);
        if (pos < 0 || json.charAt(pos) != '[') return new double[0];
        int end = json.indexOf(']', pos);
        if (end < 0) return new double[0];
        String inner = json.substring(pos + 1, end).trim();
        if (inner.isEmpty()) return new double[0];
        String[] parts = inner.split(",");
        double[] result = new double[parts.length];
        for (int i = 0; i < parts.length; i++) {{
            result[i] = Double.parseDouble(parts[i].trim());
        }}
        return result;
    }}

    static String[] __kcGetStringArray(String json, String key) {{
        int pos = __kcFindKey(json, key);
        if (pos < 0 || json.charAt(pos) != '[') return new String[0];
        List<String> list = new ArrayList<>();
        pos++;
        while (pos < json.length() && json.charAt(pos) != ']') {{
            while (pos < json.length() && (json.charAt(pos) == ' ' || json.charAt(pos) == ',')) pos++;
            if (json.charAt(pos) == ']') break;
            if (json.charAt(pos) == '"') {{
                pos++;
                StringBuilder sb = new StringBuilder();
                while (pos < json.length() && json.charAt(pos) != '"') {{
                    if (json.charAt(pos) == '\\\\' && pos + 1 < json.length()) {{ pos++; sb.append(json.charAt(pos++)); }}
                    else {{ sb.append(json.charAt(pos++)); }}
                }}
                list.add(sb.toString());
                if (pos < json.length() && json.charAt(pos) == '"') pos++;
            }} else {{
                while (pos < json.length() && json.charAt(pos) != ',' && json.charAt(pos) != ']') pos++;
            }}
        }}
        return list.toArray(new String[0]);
    }}

    static boolean[] __kcGetBooleanArray(String json, String key) {{
        int pos = __kcFindKey(json, key);
        if (pos < 0 || json.charAt(pos) != '[') return new boolean[0];
        int end = json.indexOf(']', pos);
        if (end < 0) return new boolean[0];
        String inner = json.substring(pos + 1, end).trim();
        if (inner.isEmpty()) return new boolean[0];
        String[] parts = inner.split(",");
        boolean[] result = new boolean[parts.length];
        for (int i = 0; i < parts.length; i++) {{
            result[i] = parts[i].trim().equals("true");
        }}
        return result;
    }}

    static Integer[] __kcGetIntegerArrayNullable(String json, String key) {{
        int pos = __kcFindKey(json, key);
        if (pos < 0 || json.charAt(pos) != '[') return new Integer[0];
        int end = json.indexOf(']', pos);
        if (end < 0) return new Integer[0];
        String inner = json.substring(pos + 1, end).trim();
        if (inner.isEmpty()) return new Integer[0];
        String[] parts = inner.split(",");
        Integer[] result = new Integer[parts.length];
        for (int i = 0; i < parts.length; i++) {{
            String p = parts[i].trim();
            if (p.equals("null")) result[i] = null;
            else result[i] = Integer.parseInt(p);
        }}
        return result;
    }}

    static int[][] __kcGetIntMatrix(String json, String key) {{ return new int[0][0]; /* Simplified for space */ }}
    static double[][] __kcGetFloatMatrix(String json, String key) {{ return new double[0][0]; }}
    static String[][] __kcGetStringMatrix(String json, String key) {{ return new String[0][0]; }}
    static boolean[][] __kcGetBooleanMatrix(String json, String key) {{ return new boolean[0][0]; }}

    static ListNode __kcBuildLinkedList(int[] arr) {{
        if (arr == null || arr.length == 0) return null;
        ListNode head = new ListNode(arr[0]);
        ListNode curr = head;
        for (int i = 1; i < arr.length; i++) {{
            curr.next = new ListNode(arr[i]);
            curr = curr.next;
        }}
        return head;
    }}

    static TreeNode __kcBuildBinaryTree(Integer[] arr) {{
        if (arr == null || arr.length == 0 || arr[0] == null) return null;
        TreeNode root = new TreeNode(arr[0]);
        Queue<TreeNode> q = new LinkedList<>();
        q.add(root);
        int i = 1;
        while (!q.isEmpty() && i < arr.length) {{
            TreeNode node = q.poll();
            if (i < arr.length && arr[i] != null) {{
                node.left = new TreeNode(arr[i]);
                q.add(node.left);
            }}
            i++;
            if (i < arr.length && arr[i] != null) {{
                node.right = new TreeNode(arr[i]);
                q.add(node.right);
            }}
            i++;
        }}
        return root;
    }}

    static String __kcSerializeLinkedList(ListNode head) {{
        StringBuilder sb = new StringBuilder("[");
        boolean first = true;
        while (head != null) {{
            if (!first) sb.append(",");
            sb.append(head.val);
            first = false;
            head = head.next;
        }}
        sb.append("]");
        return sb.toString();
    }}

    static String __kcSerializeBinaryTree(TreeNode root) {{
        if (root == null) return "[]";
        List<Integer> res = new ArrayList<>();
        Queue<TreeNode> q = new LinkedList<>();
        q.add(root);
        while (!q.isEmpty()) {{
            TreeNode node = q.poll();
            if (node != null) {{
                res.add(node.val);
                q.add(node.left);
                q.add(node.right);
            }} else {{
                res.add(null);
            }}
        }}
        while (!res.isEmpty() && res.get(res.size() - 1) == null) res.remove(res.size() - 1);
        StringBuilder sb = new StringBuilder("[");
        for (int i = 0; i < res.size(); i++) {{
            if (i > 0) sb.append(",");
            sb.append(res.get(i) == null ? "null" : res.get(i));
        }}
        sb.append("]");
        return sb.toString();
    }}

    static String __kcSerializeJson(Object obj) {{
        // Simplified fallback
        return "[]";
    }}

    static void __kcPrintString(String s) {{
        System.out.print("\\"");
        for (int i = 0; i < s.length(); i++) {{
            char c = s.charAt(i);
            if (c == '\\\\') System.out.print("\\\\\\\\");
            else if (c == '"') System.out.print("\\\\\\"");
            else if (c == '\\n') System.out.print("\\\\n");
            else if (c == '\\r') System.out.print("\\\\r");
            else if (c == '\\t') System.out.print("\\\\t");
            else System.out.print(c);
        }}
        System.out.println("\\"");
    }}

    public static void main(String[] args) throws Exception {{
        BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
        StringBuilder sb = new StringBuilder();
        String line;
        while ((line = br.readLine()) != null) sb.append(line);
        String input = sb.toString().trim();
        if (input.isEmpty()) return;

{decls}

        Solution sol = new Solution();
{call_logic}

{print_logic}
    }}
}}
'''
        return wrapper

    # ═══════════════════════════════════════════════════════════════════════════
    # BATCH WRAPPERS — run all test cases in a single process invocation
    # ═══════════════════════════════════════════════════════════════════════════

    # ─── Batch Python ─────────────────────────────────────────────────────────

    @staticmethod
    def _generate_batch_python(signature: dict, user_code: str) -> str:
        func_name = signature.get('name', 'solve')
        ret_type = signature.get('returnType', 'Void')

        # Build per-test arg extraction
        arg_lines = ""
        for param in signature.get('params', []):
            pn = param['name']
            pt = param['type']
            arg_lines += f"        a_{pn} = tc.get('{pn}')\n"
            if pt == 'LinkedList':
                arg_lines += f"        a_{pn} = __build_linked_list(a_{pn})\n"
            elif pt == 'BinaryTree':
                arg_lines += f"        a_{pn} = __build_binary_tree(a_{pn})\n"
            elif pt == 'Character':
                arg_lines += f"        a_{pn} = a_{pn}[0] if a_{pn} else ''\n"
            arg_lines += f"        args.append(a_{pn})\n"

        # Build result serialization
        if ret_type == 'Void':
            serialize = "        print('null')"
        elif ret_type == 'LinkedList':
            serialize = "        print(json.dumps(__serialize_linked_list(r), separators=(',', ':')))"
        elif ret_type == 'BinaryTree':
            serialize = "        print(json.dumps(__serialize_binary_tree(r), separators=(',', ':')))"
        elif ret_type == 'Boolean' or ret_type == 'Character':
            serialize = "        print(json.dumps(r, separators=(',', ':')))"
        else:
            serialize = "        print(json.dumps(r, separators=(',', ':')))"

        return f"""
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
{user_code}

# --- Batch Driver ---
def __main():
    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue
        tc = json.loads(line)
        args = []
{arg_lines}
        sol = Solution()
        r = sol.{func_name}(*args)
{serialize}
        print("___KC_BATCH_SEP___", flush=True)

if __name__ == "__main__":
    __main()
"""

    # ─── Batch JavaScript ─────────────────────────────────────────────────────

    @staticmethod
    def _generate_batch_javascript(signature: dict, user_code: str) -> str:
        func_name = signature.get('name', 'solve')
        ret_type = signature.get('returnType', 'Void')

        arg_lines = ""
        for param in signature.get('params', []):
            pn = param['name']
            pt = param['type']
            arg_lines += f"        let a_{pn} = tc['{pn}'];\n"
            if pt == 'LinkedList':
                arg_lines += f"        a_{pn} = __buildLinkedList(a_{pn});\n"
            elif pt == 'BinaryTree':
                arg_lines += f"        a_{pn} = __buildBinaryTree(a_{pn});\n"
            elif pt == 'Character':
                arg_lines += f"        a_{pn} = (a_{pn} || '')[0] || '';\n"
            arg_lines += f"        args.push(a_{pn});\n"

        if ret_type == 'Void':
            serialize = "        console.log('null');"
        elif ret_type == 'LinkedList':
            serialize = "        console.log(JSON.stringify(__serializeLinkedList(r)));"
        elif ret_type == 'BinaryTree':
            serialize = "        console.log(JSON.stringify(__serializeBinaryTree(r)));"
        else:
            serialize = "        console.log(JSON.stringify(r));"

        return f"""
const fs = require('fs');
const readline = require('readline');

class ListNode {{
    constructor(val = 0, next = null) {{ this.val = val; this.next = next; }}
}}
class TreeNode {{
    constructor(val = 0, left = null, right = null) {{ this.val = val; this.left = left; this.right = right; }}
}}
function __buildLinkedList(arr) {{
    if (!arr || arr.length === 0) return null;
    let head = new ListNode(arr[0]), curr = head;
    for (let i = 1; i < arr.length; i++) {{ curr.next = new ListNode(arr[i]); curr = curr.next; }}
    return head;
}}
function __serializeLinkedList(head) {{
    let arr = []; while (head) {{ arr.push(head.val); head = head.next; }} return arr;
}}
function __buildBinaryTree(arr) {{
    if (!arr || arr.length === 0 || arr[0] == null) return null;
    let root = new TreeNode(arr[0]), queue = [root], i = 1;
    while (queue.length > 0 && i < arr.length) {{
        let node = queue.shift();
        if (i < arr.length && arr[i] != null) {{ node.left = new TreeNode(arr[i]); queue.push(node.left); }}
        i++;
        if (i < arr.length && arr[i] != null) {{ node.right = new TreeNode(arr[i]); queue.push(node.right); }}
        i++;
    }}
    return root;
}}
function __serializeBinaryTree(root) {{
    if (!root) return [];
    let res = [], queue = [root];
    while (queue.length > 0) {{
        let node = queue.shift();
        if (node) {{ res.push(node.val); queue.push(node.left); queue.push(node.right); }}
        else {{ res.push(null); }}
    }}
    while (res.length > 0 && res[res.length - 1] == null) res.pop();
    return res;
}}

// --- User Code ---
{user_code}

// --- Batch Driver ---
function __main() {{
    const payload = fs.readFileSync(0, 'utf-8');
    const lines = payload.split('\\n');
    for (let line of lines) {{
        line = line.trim();
        if (!line) continue;
        let tc = JSON.parse(line);
        let args = [];
{arg_lines}
        let r = {func_name}(...args);
{serialize}
        console.log("___KC_BATCH_SEP___");
    }}
}}

if (require.main === module) {{ __main(); }}
"""

    # ─── Batch C ──────────────────────────────────────────────────────────────

    @staticmethod
    def _generate_batch_c(signature: dict, user_code: str) -> str:
        params = signature.get('params', [])
        func_name = signature.get('name', 'solve')
        ret_type = signature.get('returnType', 'Int')

        decl_lines = []
        parse_lines = []
        call_args = []

        for p in params:
            pn = p['name']
            pt = p['type']
            if pt == 'Int':
                decl_lines.append(f'        int arg_{pn} = 0;')
                parse_lines.append(f'        arg_{pn} = __kc_get_int(input, "{pn}");')
                call_args.append(f'arg_{pn}')
            elif pt == 'Float':
                decl_lines.append(f'        double arg_{pn} = 0.0;')
                parse_lines.append(f'        arg_{pn} = __kc_get_float(input, "{pn}");')
                call_args.append(f'arg_{pn}')
            elif pt == 'Boolean':
                decl_lines.append(f'        int arg_{pn} = 0;')
                parse_lines.append(f'        arg_{pn} = __kc_get_bool(input, "{pn}");')
                call_args.append(f'arg_{pn}')
            elif pt == 'String':
                decl_lines.append(f'        char arg_{pn}[65536]; arg_{pn}[0] = 0;')
                parse_lines.append(f'        __kc_get_string(input, "{pn}", arg_{pn}, sizeof(arg_{pn}));')
                call_args.append(f'arg_{pn}')
            elif pt == 'Character':
                decl_lines.append(f'        char arg_{pn} = 0;')
                parse_lines.append(f'        {{ char __tmp[4]; __kc_get_string(input, "{pn}", __tmp, sizeof(__tmp)); arg_{pn} = __tmp[0]; }}')
                call_args.append(f'arg_{pn}')
            elif pt == 'Array<Int>':
                decl_lines.append(f'        int arg_{pn}[100001]; int arg_{pn}_len = 0;')
                parse_lines.append(f'        arg_{pn}_len = __kc_get_int_array(input, "{pn}", arg_{pn}, 100001);')
                call_args.append(f'arg_{pn}')
                call_args.append(f'arg_{pn}_len')
            elif pt == 'Array<Float>':
                decl_lines.append(f'        double arg_{pn}[100001]; int arg_{pn}_len = 0;')
                parse_lines.append(f'        arg_{pn}_len = __kc_get_float_array(input, "{pn}", arg_{pn}, 100001);')
                call_args.append(f'arg_{pn}')
                call_args.append(f'arg_{pn}_len')
            elif pt == 'Array<String>':
                decl_lines.append(f'        char arg_{pn}[10001][256]; int arg_{pn}_len = 0;')
                parse_lines.append(f'        arg_{pn}_len = __kc_get_string_array(input, "{pn}", arg_{pn}, 10001, 256);')
                call_args.append(f'arg_{pn}')
                call_args.append(f'arg_{pn}_len')
            elif pt == 'Array<Boolean>':
                decl_lines.append(f'        int arg_{pn}[100001]; int arg_{pn}_len = 0;')
                parse_lines.append(f'        arg_{pn}_len = __kc_get_bool_array(input, "{pn}", arg_{pn}, 100001);')
                call_args.append(f'arg_{pn}')
                call_args.append(f'arg_{pn}_len')
            elif pt == 'LinkedList':
                decl_lines.append(f'        int arg_{pn}_arr[100001]; int arg_{pn}_len = 0;')
                decl_lines.append(f'        struct ListNode* arg_{pn} = NULL;')
                parse_lines.append(f'        arg_{pn}_len = __kc_get_int_array(input, "{pn}", arg_{pn}_arr, 100001);')
                parse_lines.append(f'        arg_{pn} = __kc_build_linked_list(arg_{pn}_arr, arg_{pn}_len);')
                call_args.append(f'arg_{pn}')
            elif pt.startswith('Matrix'):
                decl_lines.append(f'        /* Matrix param {pn} - not fully supported in C */')
                decl_lines.append(f'        int arg_{pn}_flat[100001]; int arg_{pn}_rows = 0; int arg_{pn}_cols = 0;')
                parse_lines.append(f'        /* Matrix deserialization for {pn} is not supported in C wrappers */')
                call_args.append(f'arg_{pn}_flat')
                call_args.append(f'arg_{pn}_rows')
                call_args.append(f'arg_{pn}_cols')
            elif pt == 'BinaryTree':
                decl_lines.append(f'        int arg_{pn}_arr[100001]; int arg_{pn}_len = 0;')
                decl_lines.append(f'        struct TreeNode* arg_{pn} = NULL;')
                parse_lines.append(f'        /* BinaryTree not fully supported in C */')
                call_args.append(f'arg_{pn}')

        if ret_type.startswith('Array'):
            call_args.append('&__ret_size')
        elif ret_type.startswith('Matrix'):
            call_args.append('&__ret_size')
            call_args.append('&__ret_col_sizes')

        decls = '\n'.join(decl_lines)
        parses = '\n'.join(parse_lines)
        args_str = ', '.join(call_args)

        if ret_type == 'Void':
            call_logic = f"        {func_name}({args_str});"
        else:
            c_ret = _c_type(ret_type)
            if ret_type.startswith('Array'):
                c_ret = _c_type(ret_type) if _c_type(ret_type) != 'int' else 'int*'
            elif ret_type == 'LinkedList':
                c_ret = 'struct ListNode*'
            call_logic = f"        {c_ret} __result = {func_name}({args_str});"

        if ret_type == 'Int':
            print_logic = '        printf("%d\\n", __result);'
        elif ret_type == 'Float':
            print_logic = '        printf("%.17g\\n", __result);'
        elif ret_type == 'Boolean':
            print_logic = '        printf("%s\\n", __result ? "true" : "false");'
        elif ret_type == 'String':
            print_logic = '        __kc_print_string(__result);'
        elif ret_type == 'Character':
            print_logic = '        printf("\\"%c\\"\\n", __result);'
        elif ret_type == 'Void':
            print_logic = '        printf("null\\n");'
        elif ret_type == 'Array<Int>':
            print_logic = '''        printf("[");
        for (int __i = 0; __i < __ret_size; __i++) {
            if (__i > 0) printf(",");
            printf("%d", __result[__i]);
        }
        printf("]\\n");'''
        elif ret_type == 'Array<Float>':
            print_logic = '''        printf("[");
        for (int __i = 0; __i < __ret_size; __i++) {
            if (__i > 0) printf(",");
            printf("%.17g", __result[__i]);
        }
        printf("]\\n");'''
        elif ret_type == 'Array<Boolean>':
            print_logic = '''        printf("[");
        for (int __i = 0; __i < __ret_size; __i++) {
            if (__i > 0) printf(",");
            printf("%s", __result[__i] ? "true" : "false");
        }
        printf("]\\n");'''
        elif ret_type == 'LinkedList':
            print_logic = '        __kc_print_linked_list(__result);'
        else:
            print_logic = '        printf("%d\\n", __result);'

        c_ret = _c_type(ret_type)
        if ret_type == 'Array<Int>':
            c_ret = 'int*'
        elif ret_type == 'LinkedList':
            c_ret = 'struct ListNode*'

        return f'''#include <stdio.h>
#include <stdlib.h>
#include <string.h>

/* ── Platform Types ───────────────────────────────────────────────────── */
struct ListNode {{
    int val;
    struct ListNode *next;
}};

struct TreeNode {{
    int val;
    struct TreeNode *left;
    struct TreeNode *right;
}};

/* ── Minimal JSON helpers ─────────────────────────────────────────────── */

static const char* __kc_find_key(const char* json, const char* key) {{
    char pat[256];
    snprintf(pat, sizeof(pat), "\\"%s\\"", key);
    const char* p = json;
    while ((p = strstr(p, pat)) != NULL) {{
        const char* check = p + strlen(pat);
        while (*check == ' ') check++;
        if (*check == ':') {{
            check++;
            while (*check == ' ') check++;
            return check;
        }}
        p += strlen(pat);
    }}
    return NULL;
}}

static int __kc_get_int(const char* json, const char* key) {{
    const char* p = __kc_find_key(json, key);
    if (!p) return 0;
    return atoi(p);
}}

static int __kc_get_bool(const char* json, const char* key) {{
    const char* p = __kc_find_key(json, key);
    if (!p) return 0;
    if (strncmp(p, "true", 4) == 0) return 1;
    return 0;
}}

static void __kc_get_string(const char* json, const char* key, char* out, int maxlen) {{
    const char* p = __kc_find_key(json, key);
    if (!p || *p != '"') {{ out[0] = 0; return; }}
    p++;
    int i = 0;
    while (*p && *p != '"' && i < maxlen - 1) {{
        if (*p == '\\\\' && *(p+1)) {{
            p++;
            if (*p == 'n') out[i++] = '\\n';
            else if (*p == 'r') out[i++] = '\\r';
            else if (*p == 't') out[i++] = '\\t';
            else out[i++] = *p;
            p++;
        }} else {{
            out[i++] = *p++;
        }}
    }}
    out[i] = 0;
}}

static void __kc_print_string(const char* s) {{
    putchar('"');
    while (*s) {{
        if (*s == '\\\\') printf("\\\\\\\\");
        else if (*s == '"') printf("\\\\\\"");
        else if (*s == '\\n') printf("\\\\n");
        else if (*s == '\\r') printf("\\\\r");
        else if (*s == '\\t') printf("\\\\t");
        else putchar(*s);
        s++;
    }}
    printf("\\"\\n");
}}

static int __kc_get_int_array(const char* json, const char* key, int* out, int maxlen) {{
    const char* p = __kc_find_key(json, key);
    if (!p || *p != '[') return 0;
    p++;
    int count = 0;
    while (*p && *p != ']' && count < maxlen) {{
        while (*p == ' ' || *p == ',') p++;
        if (*p == ']') break;
        out[count++] = atoi(p);
        if (*p == '-') p++;
        while (*p >= '0' && *p <= '9') p++;
    }}
    return count;
}}

static struct ListNode* __kc_build_linked_list(int* arr, int len) {{
    if (len == 0) return NULL;
    struct ListNode* head = (struct ListNode*)malloc(sizeof(struct ListNode));
    head->val = arr[0];
    head->next = NULL;
    struct ListNode* curr = head;
    for (int i = 1; i < len; i++) {{
        curr->next = (struct ListNode*)malloc(sizeof(struct ListNode));
        curr->next->val = arr[i];
        curr->next->next = NULL;
        curr = curr->next;
    }}
    return head;
}}

static void __kc_print_linked_list(struct ListNode* head) {{
    printf("[");
    int first = 1;
    while (head) {{
        if (!first) printf(",");
        printf("%d", head->val);
        first = 0;
        head = head->next;
    }}
    printf("]\\n");
}}

/* ── User Code ────────────────────────────────────────── */

{user_code}

/* ── Batch Driver ───────────────────────────────────────────── */

int main(void) {{
    char input[1048576];
    while (fgets(input, sizeof(input), stdin)) {{
        int len = strlen(input);
        while (len > 0 && (input[len-1] == '\\n' || input[len-1] == '\\r')) {{
            input[len-1] = '\\0';
            len--;
        }}
        if (len == 0) continue;

{decls}
{parses}

        int __ret_size = 0;
        int* __ret_col_sizes = NULL;
{call_logic}

{print_logic}
        printf("___KC_BATCH_SEP___\\n");
        fflush(stdout);
    }}
    return 0;
}}
'''

    # ─── Batch C++ ────────────────────────────────────────────────────────────

    @staticmethod
    def _generate_batch_cpp(signature: dict, user_code: str) -> str:
        params = signature.get('params', [])
        func_name = signature.get('name', 'solve')
        ret_type = signature.get('returnType', 'Int')

        decl_lines = []
        call_args = []

        for p in params:
            pn = p['name']
            pt = p['type']
            if pt == 'Int':
                decl_lines.append(f'        int arg_{pn} = __kc_get_int(input, "{pn}");')
                call_args.append(f'arg_{pn}')
            elif pt == 'Float':
                decl_lines.append(f'        double arg_{pn} = __kc_get_float(input, "{pn}");')
                call_args.append(f'arg_{pn}')
            elif pt == 'Boolean':
                decl_lines.append(f'        bool arg_{pn} = __kc_get_bool(input, "{pn}");')
                call_args.append(f'arg_{pn}')
            elif pt == 'String':
                decl_lines.append(f'        string arg_{pn} = __kc_get_string(input, "{pn}");')
                call_args.append(f'arg_{pn}')
            elif pt == 'Character':
                decl_lines.append(f'        char arg_{pn} = __kc_get_string(input, "{pn}")[0];')
                call_args.append(f'arg_{pn}')
            elif pt == 'Array<Int>':
                decl_lines.append(f'        vector<int> arg_{pn} = __kc_get_int_array(input, "{pn}");')
                call_args.append(f'arg_{pn}')
            elif pt == 'Array<Float>':
                decl_lines.append(f'        vector<double> arg_{pn} = __kc_get_float_array(input, "{pn}");')
                call_args.append(f'arg_{pn}')
            elif pt == 'Array<String>':
                decl_lines.append(f'        vector<string> arg_{pn} = __kc_get_string_array(input, "{pn}");')
                call_args.append(f'arg_{pn}')
            elif pt == 'Array<Boolean>':
                decl_lines.append(f'        vector<bool> arg_{pn} = __kc_get_bool_array(input, "{pn}");')
                call_args.append(f'arg_{pn}')
            elif pt.startswith('Matrix'):
                inner = 'int'
                if 'Float' in pt: inner = 'double'
                elif 'String' in pt: inner = 'string'
                elif 'Boolean' in pt or 'Bool' in pt: inner = 'bool'
                decl_lines.append(f'        vector<vector<{inner}>> arg_{pn} = __kc_get_matrix<{inner}>(input, "{pn}");')
                call_args.append(f'arg_{pn}')
            elif pt == 'LinkedList':
                decl_lines.append(f'        ListNode* arg_{pn} = __kc_build_linked_list(__kc_get_int_array(input, "{pn}"));')
                call_args.append(f'arg_{pn}')
            elif pt == 'BinaryTree':
                decl_lines.append(f'        TreeNode* arg_{pn} = __kc_build_binary_tree(__kc_get_int_array_nullable(input, "{pn}"));')
                call_args.append(f'arg_{pn}')

        decls = '\n'.join(decl_lines)
        args_str = ', '.join(call_args)

        cpp_ret = _cpp_type(ret_type)

        if ret_type == 'Void':
            call_logic = f"        sol.{func_name}({args_str});"
        else:
            call_logic = f"        {cpp_ret} result = sol.{func_name}({args_str});"

        if ret_type == 'Int':
            print_logic = '        cout << result << "\\n";'
        elif ret_type == 'Float':
            print_logic = '        cout << fixed << setprecision(17) << result << "\\n";'
        elif ret_type == 'Boolean':
            print_logic = '        cout << (result ? "true" : "false") << "\\n";'
        elif ret_type == 'String':
            print_logic = '        __kc_print_string(result);'
        elif ret_type == 'Character':
            print_logic = '        cout << "\\"" << result << "\\"" << "\\n";'
        elif ret_type.startswith('Array') or ret_type.startswith('Matrix'):
            print_logic = '        __kc_print_json(result);'
        elif ret_type == 'LinkedList':
            print_logic = '        __kc_print_linked_list(result);'
        elif ret_type == 'BinaryTree':
            print_logic = '        __kc_print_binary_tree(result);'
        elif ret_type == 'Void':
            print_logic = '        cout << "null" << "\\n";'
        else:
            print_logic = '        cout << result << "\\n";'

        return f'''#include <iostream>
#include <string>
#include <vector>
#include <sstream>
#include <algorithm>
#include <cstdlib>

using namespace std;

/* ── Platform Types ───────────────────────────────────────────────────── */
struct ListNode {{
    int val;
    ListNode *next;
    ListNode() : val(0), next(nullptr) {{}}
    ListNode(int x) : val(x), next(nullptr) {{}}
    ListNode(int x, ListNode *next) : val(x), next(next) {{}}
}};

/* ── Minimal JSON helpers ─────────────────────────────────────────────── */

static string::size_type __kc_find_key(const string& json, const string& key) {{
    string pat = "\\"" + key + "\\"";
    string::size_type pos = 0;
    while ((pos = json.find(pat, pos)) != string::npos) {{
        string::size_type check = pos + pat.size();
        while (check < json.size() && json[check] == ' ') check++;
        if (check < json.size() && json[check] == ':') {{
            check++;
            while (check < json.size() && json[check] == ' ') check++;
            return check;
        }}
        pos += pat.size();
    }}
    return string::npos;
}}

static int __kc_get_int(const string& json, const string& key) {{
    auto pos = __kc_find_key(json, key);
    if (pos == string::npos) return 0;
    return atoi(json.c_str() + pos);
}}

static bool __kc_get_bool(const string& json, const string& key) {{
    auto pos = __kc_find_key(json, key);
    if (pos == string::npos) return false;
    return json.substr(pos, 4) == "true";
}}

static string __kc_get_string(const string& json, const string& key) {{
    auto pos = __kc_find_key(json, key);
    if (pos == string::npos || json[pos] != '"') return "";
    pos++;
    string result;
    while (pos < json.size() && json[pos] != '"') {{
        if (json[pos] == '\\\\' && pos + 1 < json.size()) {{
            pos++;
            if (json[pos] == 'n') result += '\\n';
            else if (json[pos] == 'r') result += '\\r';
            else if (json[pos] == 't') result += '\\t';
            else result += json[pos];
            pos++;
        }} else {{
            result += json[pos++];
        }}
    }}
    return result;
}}

static void __kc_print_string(const string& s) {{
    cout << '"';
    for (char c : s) {{
        if (c == '\\\\') cout << "\\\\\\\\";
        else if (c == '"') cout << "\\\\\\"";
        else if (c == '\\n') cout << "\\\\n";
        else if (c == '\\r') cout << "\\\\r";
        else if (c == '\\t') cout << "\\\\t";
        else cout << c;
    }}
    cout << '"' << "\\n";
}}

static vector<int> __kc_get_int_array(const string& json, const string& key) {{
    auto pos = __kc_find_key(json, key);
    vector<int> result;
    if (pos == string::npos || json[pos] != '[') return result;
    pos++;
    while (pos < json.size() && json[pos] != ']') {{
        while (pos < json.size() && (json[pos] == ' ' || json[pos] == ',')) pos++;
        if (pos < json.size() && json[pos] != ']') {{
            result.push_back(atoi(json.c_str() + pos));
            if (json[pos] == '-') pos++;
            while (pos < json.size() && json[pos] >= '0' && json[pos] <= '9') pos++;
        }}
    }}
    return result;
}}

static ListNode* __kc_build_linked_list(const vector<int>& arr) {{
    if (arr.empty()) return nullptr;
    ListNode* head = new ListNode(arr[0]);
    ListNode* curr = head;
    for (size_t i = 1; i < arr.size(); i++) {{
        curr->next = new ListNode(arr[i]);
        curr = curr->next;
    }}
    return head;
}}

static void __kc_print_linked_list(ListNode* head) {{
    cout << "[";
    bool first = true;
    while (head) {{
        if (!first) cout << ",";
        cout << head->val;
        first = false;
        head = head->next;
    }}
    cout << "]\\n";
}}

struct TreeNode {{
    int val;
    TreeNode *left;
    TreeNode *right;
    TreeNode() : val(0), left(nullptr), right(nullptr) {{}}
    TreeNode(int x) : val(x), left(nullptr), right(nullptr) {{}}
    TreeNode(int x, TreeNode *left, TreeNode *right) : val(x), left(left), right(right) {{}}
}};

static vector<int> __kc_get_int_array_nullable(const string& json, const string& key) {{
    return vector<int>(); // stub
}}

static TreeNode* __kc_build_binary_tree(const vector<int>& arr) {{
    return nullptr; // stub
}}

static void __kc_print_binary_tree(TreeNode* root) {{
    cout << "[]\\n"; // stub
}}

template <typename T>
static vector<vector<T>> __kc_get_matrix(const string& json, const string& key) {{
    return vector<vector<T>>(); // stub
}}

template <typename T>
static void __kc_print_json(const T& obj) {{
    cout << "[]\\n"; // stub
}}

/* ── User Code ────────────────────────────────────────────────────────── */

{user_code}

/* ── Batch Driver ───────────────────────────────────────────────────────────── */

int main() {{
    ios_base::sync_with_stdio(false);
    cin.tie(nullptr);

    string input;
    while (getline(cin, input)) {{
        if (input.empty()) continue;

{decls}

        Solution sol;
{call_logic}

{print_logic}
        cout << "___KC_BATCH_SEP___\\n";
        cout.flush();
    }}
    return 0;
}}
'''

    # ─── Batch Java ───────────────────────────────────────────────────────────

    @staticmethod
    def _generate_batch_java(signature: dict, user_code: str) -> str:
        params = signature.get('params', [])
        func_name = signature.get('name', 'solve')
        ret_type = signature.get('returnType', 'Int')

        decl_lines = []
        call_args = []

        for p in params:
            pn = p['name']
            pt = p['type']
            if pt == 'Int':
                decl_lines.append(f'            int arg_{pn} = __kcGetInt(input, "{pn}");')
                call_args.append(f'arg_{pn}')
            elif pt == 'Float':
                decl_lines.append(f'            double arg_{pn} = __kcGetFloat(input, "{pn}");')
                call_args.append(f'arg_{pn}')
            elif pt == 'Boolean':
                decl_lines.append(f'            boolean arg_{pn} = __kcGetBool(input, "{pn}");')
                call_args.append(f'arg_{pn}')
            elif pt == 'String':
                decl_lines.append(f'            String arg_{pn} = __kcGetString(input, "{pn}");')
                call_args.append(f'arg_{pn}')
            elif pt == 'Character':
                decl_lines.append(f'            char arg_{pn} = __kcGetChar(input, "{pn}");')
                call_args.append(f'arg_{pn}')
            elif pt == 'Array<Int>':
                decl_lines.append(f'            int[] arg_{pn} = __kcGetIntArray(input, "{pn}");')
                call_args.append(f'arg_{pn}')
            elif pt == 'Array<Float>':
                decl_lines.append(f'            double[] arg_{pn} = __kcGetFloatArray(input, "{pn}");')
                call_args.append(f'arg_{pn}')
            elif pt == 'Array<String>':
                decl_lines.append(f'            String[] arg_{pn} = __kcGetStringArray(input, "{pn}");')
                call_args.append(f'arg_{pn}')
            elif pt == 'Array<Boolean>':
                decl_lines.append(f'            boolean[] arg_{pn} = __kcGetBooleanArray(input, "{pn}");')
                call_args.append(f'arg_{pn}')
            elif pt.startswith('Matrix'):
                inner = 'int'
                if 'Float' in pt: inner = 'double'
                elif 'String' in pt: inner = 'String'
                elif 'Boolean' in pt or 'Bool' in pt: inner = 'boolean'
                if inner == 'int': decl_lines.append(f'            int[][] arg_{pn} = __kcGetIntMatrix(input, "{pn}");')
                elif inner == 'double': decl_lines.append(f'            double[][] arg_{pn} = __kcGetFloatMatrix(input, "{pn}");')
                elif inner == 'String': decl_lines.append(f'            String[][] arg_{pn} = __kcGetStringMatrix(input, "{pn}");')
                elif inner == 'boolean': decl_lines.append(f'            boolean[][] arg_{pn} = __kcGetBooleanMatrix(input, "{pn}");')
                call_args.append(f'arg_{pn}')
            elif pt == 'LinkedList':
                decl_lines.append(f'            ListNode arg_{pn} = __kcBuildLinkedList(__kcGetIntArray(input, "{pn}"));')
                call_args.append(f'arg_{pn}')
            elif pt == 'BinaryTree':
                decl_lines.append(f'            TreeNode arg_{pn} = __kcBuildBinaryTree(__kcGetIntegerArrayNullable(input, "{pn}"));')
                call_args.append(f'arg_{pn}')

        decls = '\n'.join(decl_lines)
        args_str = ', '.join(call_args)

        java_ret = _java_type(ret_type)

        if ret_type == 'Void':
            call_logic = f"            sol.{func_name}({args_str});"
        else:
            call_logic = f"            {java_ret} result = sol.{func_name}({args_str});"

        if ret_type == 'Int':
            print_logic = '            System.out.println(result);'
        elif ret_type == 'Float':
            print_logic = '            System.out.println(String.format(Locale.US, "%.17g", result));'
        elif ret_type == 'Boolean':
            print_logic = '            System.out.println(result ? "true" : "false");'
        elif ret_type == 'String':
            print_logic = '            __kcPrintString(result);'
        elif ret_type == 'Character':
            print_logic = '            System.out.println("\\"" + result + "\\"");'
        elif ret_type.startswith('Array') or ret_type.startswith('Matrix'):
            print_logic = '            System.out.println(__kcSerializeJson(result));'
        elif ret_type == 'LinkedList':
            print_logic = '            System.out.println(__kcSerializeLinkedList(result));'
        elif ret_type == 'BinaryTree':
            print_logic = '            System.out.println(__kcSerializeBinaryTree(result));'
        elif ret_type == 'Void':
            print_logic = '            System.out.println("null");'
        else:
            print_logic = '            System.out.println(result);'

        user_code = re.sub(r'public\s+class\s+Solution', 'class Solution', user_code)

        return f'''import java.io.*;
import java.util.*;

/* ── Platform Types ───────────────────────────────────────────────────── */
class ListNode {{
    int val;
    ListNode next;
    ListNode() {{}}
    ListNode(int val) {{ this.val = val; }}
    ListNode(int val, ListNode next) {{ this.val = val; this.next = next; }}
}}

class TreeNode {{
    int val;
    TreeNode left;
    TreeNode right;
    TreeNode() {{}}
    TreeNode(int val) {{ this.val = val; }}
    TreeNode(int val, TreeNode left, TreeNode right) {{
        this.val = val;
        this.left = left;
        this.right = right;
    }}
}}

/* ── User Code ────────────────────────────────────────────────────────── */

{user_code}

/* ── Batch Driver ───────────────────────────────────────────────────────────── */

public class Main {{

    /* ── Minimal JSON helpers ─────────────────────────────────────────── */

    static int __kcFindKey(String json, String key) {{
        String pat = "\\"" + key + "\\"";
        int pos = json.indexOf(pat);
        if (pos < 0) return -1;
        pos += pat.length();
        while (pos < json.length() && (json.charAt(pos) == ' ' || json.charAt(pos) == ':')) pos++;
        return pos;
    }}

    static int __kcGetInt(String json, String key) {{
        int pos = __kcFindKey(json, key);
        if (pos < 0) return 0;
        int end = pos;
        if (end < json.length() && json.charAt(end) == '-') end++;
        while (end < json.length() && json.charAt(end) >= '0' && json.charAt(end) <= '9') end++;
        return Integer.parseInt(json.substring(pos, end));
    }}

    static boolean __kcGetBool(String json, String key) {{
        int pos = __kcFindKey(json, key);
        if (pos < 0) return false;
        return json.substring(pos).startsWith("true");
    }}

    static String __kcGetString(String json, String key) {{
        int pos = __kcFindKey(json, key);
        if (pos < 0 || json.charAt(pos) != '"') return "";
        pos++;
        StringBuilder sb = new StringBuilder();
        while (pos < json.length() && json.charAt(pos) != '"') {{
            if (json.charAt(pos) == '\\\\' && pos + 1 < json.length()) {{
                pos++;
                sb.append(json.charAt(pos++));
            }} else {{
                sb.append(json.charAt(pos++));
            }}
        }}
        return sb.toString();
    }}

    static int[] __kcGetIntArray(String json, String key) {{
        int pos = __kcFindKey(json, key);
        if (pos < 0 || json.charAt(pos) != '[') return new int[0];
        int end = json.indexOf(']', pos);
        if (end < 0) return new int[0];
        String inner = json.substring(pos + 1, end).trim();
        if (inner.isEmpty()) return new int[0];
        String[] parts = inner.split(",");
        int[] result = new int[parts.length];
        for (int i = 0; i < parts.length; i++) {{
            result[i] = Integer.parseInt(parts[i].trim());
        }}
        return result;
    }}

    static double __kcGetFloat(String json, String key) {{
        int pos = __kcFindKey(json, key);
        if (pos < 0) return 0.0;
        int end = pos;
        while (end < json.length() && ((json.charAt(end) >= '0' && json.charAt(end) <= '9') || json.charAt(end) == '.' || json.charAt(end) == '-' || json.charAt(end) == 'e' || json.charAt(end) == 'E' || json.charAt(end) == '+')) end++;
        return Double.parseDouble(json.substring(pos, end));
    }}

    static char __kcGetChar(String json, String key) {{
        String s = __kcGetString(json, key);
        return s.length() > 0 ? s.charAt(0) : 0;
    }}

    static double[] __kcGetFloatArray(String json, String key) {{
        int pos = __kcFindKey(json, key);
        if (pos < 0 || json.charAt(pos) != '[') return new double[0];
        int end = json.indexOf(']', pos);
        if (end < 0) return new double[0];
        String inner = json.substring(pos + 1, end).trim();
        if (inner.isEmpty()) return new double[0];
        String[] parts = inner.split(",");
        double[] result = new double[parts.length];
        for (int i = 0; i < parts.length; i++) {{
            result[i] = Double.parseDouble(parts[i].trim());
        }}
        return result;
    }}

    static String[] __kcGetStringArray(String json, String key) {{
        int pos = __kcFindKey(json, key);
        if (pos < 0 || json.charAt(pos) != '[') return new String[0];
        List<String> list = new ArrayList<>();
        pos++;
        while (pos < json.length() && json.charAt(pos) != ']') {{
            while (pos < json.length() && (json.charAt(pos) == ' ' || json.charAt(pos) == ',')) pos++;
            if (json.charAt(pos) == ']') break;
            if (json.charAt(pos) == '"') {{
                pos++;
                StringBuilder sb = new StringBuilder();
                while (pos < json.length() && json.charAt(pos) != '"') {{
                    if (json.charAt(pos) == '\\\\' && pos + 1 < json.length()) {{ pos++; sb.append(json.charAt(pos++)); }}
                    else {{ sb.append(json.charAt(pos++)); }}
                }}
                list.add(sb.toString());
                if (pos < json.length() && json.charAt(pos) == '"') pos++;
            }} else {{
                while (pos < json.length() && json.charAt(pos) != ',' && json.charAt(pos) != ']') pos++;
            }}
        }}
        return list.toArray(new String[0]);
    }}

    static boolean[] __kcGetBooleanArray(String json, String key) {{
        int pos = __kcFindKey(json, key);
        if (pos < 0 || json.charAt(pos) != '[') return new boolean[0];
        int end = json.indexOf(']', pos);
        if (end < 0) return new boolean[0];
        String inner = json.substring(pos + 1, end).trim();
        if (inner.isEmpty()) return new boolean[0];
        String[] parts = inner.split(",");
        boolean[] result = new boolean[parts.length];
        for (int i = 0; i < parts.length; i++) {{
            result[i] = parts[i].trim().equals("true");
        }}
        return result;
    }}

    static Integer[] __kcGetIntegerArrayNullable(String json, String key) {{
        int pos = __kcFindKey(json, key);
        if (pos < 0 || json.charAt(pos) != '[') return new Integer[0];
        int end = json.indexOf(']', pos);
        if (end < 0) return new Integer[0];
        String inner = json.substring(pos + 1, end).trim();
        if (inner.isEmpty()) return new Integer[0];
        String[] parts = inner.split(",");
        Integer[] result = new Integer[parts.length];
        for (int i = 0; i < parts.length; i++) {{
            String p = parts[i].trim();
            if (p.equals("null")) result[i] = null;
            else result[i] = Integer.parseInt(p);
        }}
        return result;
    }}

    static int[][] __kcGetIntMatrix(String json, String key) {{ return new int[0][0]; /* Simplified for space */ }}
    static double[][] __kcGetFloatMatrix(String json, String key) {{ return new double[0][0]; }}
    static String[][] __kcGetStringMatrix(String json, String key) {{ return new String[0][0]; }}
    static boolean[][] __kcGetBooleanMatrix(String json, String key) {{ return new boolean[0][0]; }}

    static ListNode __kcBuildLinkedList(int[] arr) {{
        if (arr == null || arr.length == 0) return null;
        ListNode head = new ListNode(arr[0]);
        ListNode curr = head;
        for (int i = 1; i < arr.length; i++) {{
            curr.next = new ListNode(arr[i]);
            curr = curr.next;
        }}
        return head;
    }}

    static TreeNode __kcBuildBinaryTree(Integer[] arr) {{
        if (arr == null || arr.length == 0 || arr[0] == null) return null;
        TreeNode root = new TreeNode(arr[0]);
        Queue<TreeNode> q = new LinkedList<>();
        q.add(root);
        int i = 1;
        while (!q.isEmpty() && i < arr.length) {{
            TreeNode node = q.poll();
            if (i < arr.length && arr[i] != null) {{
                node.left = new TreeNode(arr[i]);
                q.add(node.left);
            }}
            i++;
            if (i < arr.length && arr[i] != null) {{
                node.right = new TreeNode(arr[i]);
                q.add(node.right);
            }}
            i++;
        }}
        return root;
    }}

    static String __kcSerializeLinkedList(ListNode head) {{
        StringBuilder sb = new StringBuilder("[");
        boolean first = true;
        while (head != null) {{
            if (!first) sb.append(",");
            sb.append(head.val);
            first = false;
            head = head.next;
        }}
        sb.append("]");
        return sb.toString();
    }}

    static String __kcSerializeBinaryTree(TreeNode root) {{
        if (root == null) return "[]";
        List<Integer> res = new ArrayList<>();
        Queue<TreeNode> q = new LinkedList<>();
        q.add(root);
        while (!q.isEmpty()) {{
            TreeNode node = q.poll();
            if (node != null) {{
                res.add(node.val);
                q.add(node.left);
                q.add(node.right);
            }} else {{
                res.add(null);
            }}
        }}
        while (!res.isEmpty() && res.get(res.size() - 1) == null) res.remove(res.size() - 1);
        StringBuilder sb = new StringBuilder("[");
        for (int i = 0; i < res.size(); i++) {{
            if (i > 0) sb.append(",");
            sb.append(res.get(i) == null ? "null" : res.get(i));
        }}
        sb.append("]");
        return sb.toString();
    }}

    static String __kcSerializeJson(Object obj) {{
        // Simplified fallback
        return "[]";
    }}

    static void __kcPrintString(String s) {{
        System.out.print("\\"");
        for (int i = 0; i < s.length(); i++) {{
            char c = s.charAt(i);
            if (c == '\\\\') System.out.print("\\\\\\\\");
            else if (c == '"') System.out.print("\\\\\\"");
            else if (c == '\\n') System.out.print("\\\\n");
            else if (c == '\\r') System.out.print("\\\\r");
            else if (c == '\\t') System.out.print("\\\\t");
            else System.out.print(c);
        }}
        System.out.println("\\"");
    }}

    public static void main(String[] args) throws Exception {{
        BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
        String input;
        while ((input = br.readLine()) != null) {{
            input = input.trim();
            if (input.isEmpty()) continue;

{decls}

            Solution sol = new Solution();
{call_logic}

{print_logic}
            System.out.println("___KC_BATCH_SEP___");
            System.out.flush();
        }}
    }}
}}
'''
