# workers/src/worker/wrapper_generator/languages/cpp.py
from ..types import cpp_type

class CppGenerator:
    @staticmethod
    def generate(signature: dict, user_code: str, batch: bool = False) -> str:
        params = signature.get('params', [])
        func_name = signature.get('name', 'solve')
        ret_type = signature.get('returnType', 'Int')

        decl_lines = []
        call_args = []

        indent = "        " if batch else "    "

        for p in params:
            pn = p['name']
            pt = p['type']
            if pt == 'Int':
                decl_lines.append(f'{indent}int arg_{pn} = __kc_get_int(input, "{pn}");')
                call_args.append(f'arg_{pn}')
            elif pt == 'Float':
                decl_lines.append(f'{indent}double arg_{pn} = __kc_get_float(input, "{pn}");')
                call_args.append(f'arg_{pn}')
            elif pt == 'Boolean':
                decl_lines.append(f'{indent}bool arg_{pn} = __kc_get_bool(input, "{pn}");')
                call_args.append(f'arg_{pn}')
            elif pt == 'String':
                decl_lines.append(f'{indent}string arg_{pn} = __kc_get_string(input, "{pn}");')
                call_args.append(f'arg_{pn}')
            elif pt == 'Character':
                decl_lines.append(f'{indent}char arg_{pn} = __kc_get_string(input, "{pn}")[0];')
                call_args.append(f'arg_{pn}')
            elif pt == 'Array<Int>':
                decl_lines.append(f'{indent}vector<int> arg_{pn} = __kc_get_int_array(input, "{pn}");')
                call_args.append(f'arg_{pn}')
            elif pt == 'Array<Float>':
                decl_lines.append(f'{indent}vector<double> arg_{pn} = __kc_get_float_array(input, "{pn}");')
                call_args.append(f'arg_{pn}')
            elif pt == 'Array<String>':
                decl_lines.append(f'{indent}vector<string> arg_{pn} = __kc_get_string_array(input, "{pn}");')
                call_args.append(f'arg_{pn}')
            elif pt == 'Array<Boolean>':
                decl_lines.append(f'{indent}vector<bool> arg_{pn} = __kc_get_bool_array(input, "{pn}");')
                call_args.append(f'arg_{pn}')
            elif pt.startswith('Matrix'):
                inner = 'int'
                if 'Float' in pt: inner = 'double'
                elif 'String' in pt: inner = 'string'
                elif 'Boolean' in pt or 'Bool' in pt: inner = 'bool'
                decl_lines.append(f'{indent}vector<vector<{inner}>> arg_{pn} = __kc_get_matrix<{inner}>(input, "{pn}");')
                call_args.append(f'arg_{pn}')
            elif pt == 'LinkedList':
                decl_lines.append(f'{indent}ListNode* arg_{pn} = __kc_build_linked_list(__kc_get_int_array(input, "{pn}"));')
                call_args.append(f'arg_{pn}')
            elif pt == 'BinaryTree':
                decl_lines.append(f'{indent}TreeNode* arg_{pn} = __kc_build_binary_tree(__kc_get_int_array_nullable(input, "{pn}"));')
                call_args.append(f'arg_{pn}')

        decls = '\n'.join(decl_lines)
        args_str = ', '.join(call_args)

        c_ret = cpp_type(ret_type)

        if ret_type == 'Void':
            call_logic = f"{indent}sol.{func_name}({args_str});"
        else:
            call_logic = f"{indent}{c_ret} result = sol.{func_name}({args_str});"

        if ret_type == 'Int':
            print_logic = f'{indent}cout << result << "\\n";'
        elif ret_type == 'Float':
            print_logic = f'{indent}cout << fixed << setprecision(17) << result << "\\n";'
        elif ret_type == 'Boolean':
            print_logic = f'{indent}cout << (result ? "true" : "false") << "\\n";'
        elif ret_type == 'String':
            print_logic = f'{indent}__kc_print_string(result);'
        elif ret_type == 'Character':
            print_logic = f'{indent}cout << "\\"" << result << "\\"" << "\\n";'
        elif ret_type.startswith('Array') or ret_type.startswith('Matrix'):
            print_logic = f'{indent}__kc_print_json(result);'
        elif ret_type == 'LinkedList':
            print_logic = f'{indent}__kc_print_linked_list(result);'
        elif ret_type == 'BinaryTree':
            print_logic = f'{indent}__kc_print_binary_tree(result);'
        elif ret_type == 'Void':
            print_logic = f'{indent}cout << "null" << "\\n";'
        else:
            print_logic = f'{indent}cout << result << "\\n";'

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

struct TreeNode {{
    int val;
    TreeNode *left;
    TreeNode *right;
    TreeNode() : val(0), left(nullptr), right(nullptr) {{}}
    TreeNode(int x) : val(x), left(nullptr), right(nullptr) {{}}
    TreeNode(int x, TreeNode *left, TreeNode *right) : val(x), left(left), right(right) {{}}
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
        curr = curr.next;
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

'''
        if batch:
            wrapper += f'''
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
        else:
            wrapper += f'''
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
