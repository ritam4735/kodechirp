# workers/src/worker/wrapper_generator.py
# ─────────────────────────────────────────────────────────────────────────────
# KodeChirp V3 — Multi-Language Execution Wrapper Generator
# ─────────────────────────────────────────────────────────────────────────────

import json
import re


# ─── Type-mapping helpers ─────────────────────────────────────────────────────

def _c_type(sig_type: str) -> str:
    """Map signature type to C type string."""
    mapping = {
        'Int': 'int',
        'Boolean': 'int',
        'String': 'char*',
        'Array<Int>': 'int*',
    }
    return mapping.get(sig_type, 'int')


def _cpp_type(sig_type: str) -> str:
    """Map signature type to C++ type string."""
    mapping = {
        'Int': 'int',
        'Boolean': 'bool',
        'String': 'string',
        'Array<Int>': 'vector<int>',
    }
    return mapping.get(sig_type, 'int')


def _java_type(sig_type: str) -> str:
    """Map signature type to Java type string."""
    mapping = {
        'Int': 'int',
        'Boolean': 'boolean',
        'String': 'String',
        'Array<Int>': 'int[]',
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
            wrapper += f"    print(json.dumps(__serialize_linked_list(result), separators=(',', ':')))\n"
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
            elif pt == 'Boolean':
                decl_lines.append(f'    int arg_{pn} = 0;')
                parse_lines.append(f'    arg_{pn} = __kc_get_bool(input, "{pn}");')
                call_args.append(f'arg_{pn}')
            elif pt == 'String':
                decl_lines.append(f'    char arg_{pn}[65536]; arg_{pn}[0] = 0;')
                parse_lines.append(f'    __kc_get_string(input, "{pn}", arg_{pn}, sizeof(arg_{pn}));')
                call_args.append(f'arg_{pn}')
            elif pt == 'Array<Int>':
                decl_lines.append(f'    int arg_{pn}[100001]; int arg_{pn}_len = 0;')
                parse_lines.append(f'    arg_{pn}_len = __kc_get_int_array(input, "{pn}", arg_{pn}, 100001);')
                call_args.append(f'arg_{pn}')
                call_args.append(f'arg_{pn}_len')

        # For array return, user must write: int* func(args..., int* returnSize)
        if ret_type == 'Array<Int>':
            call_args.append('&__ret_size')

        decls = '\n'.join(decl_lines)
        parses = '\n'.join(parse_lines)
        args_str = ', '.join(call_args)

        # Build print logic
        if ret_type == 'Int':
            print_logic = '    printf("%d\\n", __result);'
        elif ret_type == 'Boolean':
            print_logic = '    printf("%s\\n", __result ? "true" : "false");'
        elif ret_type == 'String':
            print_logic = '    __kc_print_string(__result);'
        elif ret_type == 'Array<Int>':
            print_logic = '''    printf("[");
    for (int __i = 0; __i < __ret_size; __i++) {
        if (__i > 0) printf(",");
        printf("%d", __result[__i]);
    }
    printf("]\\n");'''
        else:
            print_logic = '    printf("%d\\n", __result);'

        # Return type in C
        c_ret = _c_type(ret_type)
        if ret_type == 'Array<Int>':
            c_ret = 'int*'

        wrapper = f'''#include <stdio.h>
#include <stdlib.h>
#include <string.h>

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
    {c_ret} __result = {func_name}({args_str});

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
            elif pt == 'Boolean':
                decl_lines.append(f'    bool arg_{pn} = __kc_get_bool(input, "{pn}");')
                call_args.append(f'arg_{pn}')
            elif pt == 'String':
                decl_lines.append(f'    string arg_{pn} = __kc_get_string(input, "{pn}");')
                call_args.append(f'arg_{pn}')
            elif pt == 'Array<Int>':
                decl_lines.append(f'    vector<int> arg_{pn} = __kc_get_int_array(input, "{pn}");')
                call_args.append(f'arg_{pn}')

        decls = '\n'.join(decl_lines)
        args_str = ', '.join(call_args)

        # Return type
        cpp_ret = _cpp_type(ret_type)
        if ret_type == 'Array<Int>':
            cpp_ret = 'vector<int>'

        # Print logic
        if ret_type == 'Int':
            print_logic = '    cout << result << "\\n";'
        elif ret_type == 'Boolean':
            print_logic = '    cout << (result ? "true" : "false") << "\\n";'
        elif ret_type == 'String':
            print_logic = '    __kc_print_string(result);'
        elif ret_type == 'Array<Int>':
            print_logic = '''    cout << "[";
    for (int __i = 0; __i < (int)result.size(); __i++) {
        if (__i > 0) cout << ",";
        cout << result[__i];
    }
    cout << "]" << "\\n";'''
        else:
            print_logic = '    cout << result << "\\n";'

        wrapper = f'''#include <iostream>
#include <string>
#include <vector>
#include <sstream>
#include <algorithm>
#include <cstdlib>

using namespace std;

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
    {cpp_ret} result = sol.{func_name}({args_str});

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
            elif pt == 'Boolean':
                decl_lines.append(f'        boolean arg_{pn} = __kcGetBool(input, "{pn}");')
                call_args.append(f'arg_{pn}')
            elif pt == 'String':
                decl_lines.append(f'        String arg_{pn} = __kcGetString(input, "{pn}");')
                call_args.append(f'arg_{pn}')
            elif pt == 'Array<Int>':
                decl_lines.append(f'        int[] arg_{pn} = __kcGetIntArray(input, "{pn}");')
                call_args.append(f'arg_{pn}')

        decls = '\n'.join(decl_lines)
        args_str = ', '.join(call_args)

        # Java return type
        java_ret = _java_type(ret_type)
        if ret_type == 'Array<Int>':
            java_ret = 'int[]'

        # Print logic
        if ret_type == 'Int':
            print_logic = '        System.out.println(result);'
        elif ret_type == 'Boolean':
            print_logic = '        System.out.println(result ? "true" : "false");'
        elif ret_type == 'String':
            print_logic = '        __kcPrintString(result);'
        elif ret_type == 'Array<Int>':
            print_logic = '''        StringBuilder __sb = new StringBuilder("[");
        for (int __i = 0; __i < result.length; __i++) {
            if (__i > 0) __sb.append(",");
            __sb.append(result[__i]);
        }
        __sb.append("]");
        System.out.println(__sb.toString());'''
        else:
            print_logic = '        System.out.println(result);'

        user_code = re.sub(r'public\s+class\s+Solution', 'class Solution', user_code)

        wrapper = f'''import java.io.*;
import java.util.*;

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

    public static void main(String[] args) throws Exception {{
        BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
        StringBuilder sb = new StringBuilder();
        String line;
        while ((line = br.readLine()) != null) sb.append(line);
        String input = sb.toString().trim();
        if (input.isEmpty()) return;

{decls}

        Solution sol = new Solution();
        {java_ret} result = sol.{func_name}({args_str});

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
            arg_lines += f"        a = tc.get('{pn}')\n"
            if pt == 'LinkedList':
                arg_lines += f"        a = __build_linked_list(a)\n"
            arg_lines += f"        args.append(a)\n"

        # Build result serialization
        if ret_type == 'Void':
            serialize = "        print('null')"
        elif ret_type == 'LinkedList':
            serialize = "        print(json.dumps(__serialize_linked_list(r), separators=(',', ':')))"
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
        r = {func_name}(*args)
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
            arg_lines += f"        args.push(a_{pn});\n"

        if ret_type == 'Void':
            serialize = "        console.log('null');"
        elif ret_type == 'LinkedList':
            serialize = "        console.log(JSON.stringify(__serializeLinkedList(r)));"
        else:
            serialize = "        console.log(JSON.stringify(r));"

        return f"""
const fs = require('fs');

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
            elif pt == 'Boolean':
                decl_lines.append(f'        int arg_{pn} = 0;')
                parse_lines.append(f'        arg_{pn} = __kc_get_bool(input, "{pn}");')
                call_args.append(f'arg_{pn}')
            elif pt == 'String':
                decl_lines.append(f'        char arg_{pn}[65536]; arg_{pn}[0] = 0;')
                parse_lines.append(f'        __kc_get_string(input, "{pn}", arg_{pn}, sizeof(arg_{pn}));')
                call_args.append(f'arg_{pn}')
            elif pt == 'Array<Int>':
                decl_lines.append(f'        int arg_{pn}[100001]; int arg_{pn}_len = 0;')
                parse_lines.append(f'        arg_{pn}_len = __kc_get_int_array(input, "{pn}", arg_{pn}, 100001);')
                call_args.append(f'arg_{pn}')
                call_args.append(f'arg_{pn}_len')

        if ret_type == 'Array<Int>':
            call_args.append('&__ret_size')

        decls = '\n'.join(decl_lines)
        parses = '\n'.join(parse_lines)
        args_str = ', '.join(call_args)

        if ret_type == 'Int':
            print_logic = '        printf("%d\\n", __result);'
        elif ret_type == 'Boolean':
            print_logic = '        printf("%s\\n", __result ? "true" : "false");'
        elif ret_type == 'String':
            print_logic = '        __kc_print_string(__result);'
        elif ret_type == 'Array<Int>':
            print_logic = '''        printf("[");
        for (int __i = 0; __i < __ret_size; __i++) {
            if (__i > 0) printf(",");
            printf("%d", __result[__i]);
        }
        printf("]\\n");'''
        else:
            print_logic = '        printf("%d\\n", __result);'

        c_ret = _c_type(ret_type)
        if ret_type == 'Array<Int>':
            c_ret = 'int*'

        return f'''#include <stdio.h>
#include <stdlib.h>
#include <string.h>

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
        {c_ret} __result = {func_name}({args_str});

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
            elif pt == 'Boolean':
                decl_lines.append(f'        bool arg_{pn} = __kc_get_bool(input, "{pn}");')
                call_args.append(f'arg_{pn}')
            elif pt == 'String':
                decl_lines.append(f'        string arg_{pn} = __kc_get_string(input, "{pn}");')
                call_args.append(f'arg_{pn}')
            elif pt == 'Array<Int>':
                decl_lines.append(f'        vector<int> arg_{pn} = __kc_get_int_array(input, "{pn}");')
                call_args.append(f'arg_{pn}')

        decls = '\n'.join(decl_lines)
        args_str = ', '.join(call_args)

        cpp_ret = _cpp_type(ret_type)
        if ret_type == 'Array<Int>':
            cpp_ret = 'vector<int>'

        if ret_type == 'Int':
            print_logic = '        cout << result << "\\n";'
        elif ret_type == 'Boolean':
            print_logic = '        cout << (result ? "true" : "false") << "\\n";'
        elif ret_type == 'String':
            print_logic = '        __kc_print_string(result);'
        elif ret_type == 'Array<Int>':
            print_logic = '''        cout << "[";
        for (int __i = 0; __i < (int)result.size(); __i++) {
            if (__i > 0) cout << ",";
            cout << result[__i];
        }
        cout << "]" << "\\n";'''
        else:
            print_logic = '        cout << result << "\\n";'

        return f'''#include <iostream>
#include <string>
#include <vector>
#include <sstream>
#include <algorithm>
#include <cstdlib>

using namespace std;

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
        {cpp_ret} result = sol.{func_name}({args_str});

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
            elif pt == 'Boolean':
                decl_lines.append(f'            boolean arg_{pn} = __kcGetBool(input, "{pn}");')
                call_args.append(f'arg_{pn}')
            elif pt == 'String':
                decl_lines.append(f'            String arg_{pn} = __kcGetString(input, "{pn}");')
                call_args.append(f'arg_{pn}')
            elif pt == 'Array<Int>':
                decl_lines.append(f'            int[] arg_{pn} = __kcGetIntArray(input, "{pn}");')
                call_args.append(f'arg_{pn}')

        decls = '\n'.join(decl_lines)
        args_str = ', '.join(call_args)

        java_ret = _java_type(ret_type)
        if ret_type == 'Array<Int>':
            java_ret = 'int[]'

        if ret_type == 'Int':
            print_logic = '            System.out.println(result);'
        elif ret_type == 'Boolean':
            print_logic = '            System.out.println(result ? "true" : "false");'
        elif ret_type == 'String':
            print_logic = '            __kcPrintString(result);'
        elif ret_type == 'Array<Int>':
            print_logic = '''            StringBuilder __sb = new StringBuilder("[");
            for (int __i = 0; __i < result.length; __i++) {
                if (__i > 0) __sb.append(",");
                __sb.append(result[__i]);
            }
            __sb.append("]");
            System.out.println(__sb.toString());'''
        else:
            print_logic = '            System.out.println(result);'

        user_code = re.sub(r'public\s+class\s+Solution', 'class Solution', user_code)

        return f'''import java.io.*;
import java.util.*;

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
            {java_ret} result = sol.{func_name}({args_str});

{print_logic}
            System.out.println("___KC_BATCH_SEP___");
            System.out.flush();
        }}
    }}
}}
'''
