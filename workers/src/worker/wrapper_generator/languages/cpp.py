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
                decl_lines.append(f'{indent}vector<vector<{inner}>> arg_{pn} = __kc_get_matrix_{inner}(input, "{pn}");')
                call_args.append(f'arg_{pn}')
            elif pt == 'LinkedList':
                decl_lines.append(f'{indent}ListNode* arg_{pn} = __kc_build_linked_list(__kc_get_int_array(input, "{pn}"));')
                call_args.append(f'arg_{pn}')
            elif pt == 'BinaryTree':
                decl_lines.append(f'{indent}TreeNode* arg_{pn} = __kc_build_binary_tree(__kc_get_nullable_array(input, "{pn}"));')
                call_args.append(f'arg_{pn}')

        decls = '\n'.join(decl_lines)
        args_str = ', '.join(call_args)

        c_ret = cpp_type(ret_type)

        if ret_type == 'Void':
            call_logic = f"{indent}sol.{func_name}({args_str});"
        else:
            call_logic = f"{indent}{c_ret} result = sol.{func_name}({args_str});"

        # Serialize the return value to JSON
        if ret_type == 'Int':
            serialize_logic = f'{indent}__kc_out << result;'
        elif ret_type == 'Float':
            serialize_logic = f'{indent}__kc_out << fixed << setprecision(17) << result;'
        elif ret_type == 'Boolean':
            serialize_logic = f'{indent}__kc_out << (result ? "true" : "false");'
        elif ret_type == 'String':
            serialize_logic = f'{indent}__kc_json_string(__kc_out, result);'
        elif ret_type == 'Character':
            serialize_logic = f'{indent}__kc_out << "\\"" << result << "\\"";'
        elif ret_type.startswith('Array') or ret_type.startswith('Matrix'):
            serialize_logic = f'{indent}__kc_json_serialize(__kc_out, result);'
        elif ret_type == 'LinkedList':
            serialize_logic = f'{indent}__kc_json_linked_list(__kc_out, result);'
        elif ret_type == 'BinaryTree':
            serialize_logic = f'{indent}__kc_json_binary_tree(__kc_out, result);'
        elif ret_type == 'Void':
            serialize_logic = f'{indent}__kc_out << "null";'
        else:
            serialize_logic = f'{indent}__kc_out << result;'

        wrapper = f'''#include <iostream>
#include <string>
#include <vector>
#include <sstream>
#include <algorithm>
#include <cstdlib>
#include <iomanip>
#include <queue>
#include <map>
#include <unordered_map>
#include <set>
#include <unordered_set>
#include <cmath>

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

/* ── JSON Parsing Helpers ─────────────────────────────────────────────── */

static string::size_type __kc_skip_ws(const string& json, string::size_type pos) {{
    if (pos == string::npos) return string::npos;
    while (pos < json.size() && (json[pos] == ' ' || json[pos] == '\\t' || json[pos] == '\\n' || json[pos] == '\\r')) pos++;
    return pos;
}}

static string::size_type __kc_find_key(const string& json, const string& key) {{
    string pat = "\\"" + key + "\\"";
    string::size_type pos = 0;
    while ((pos = json.find(pat, pos)) != string::npos) {{
        string::size_type check = pos + pat.size();
        while (check < json.size() && (json[check] == ' ' || json[check] == '\\t' || json[check] == '\\n' || json[check] == '\\r')) check++;
        if (check < json.size() && json[check] == ':') {{
            check++;
            while (check < json.size() && (json[check] == ' ' || json[check] == '\\t' || json[check] == '\\n' || json[check] == '\\r')) check++;
            return check;
        }}
        pos += pat.size();
    }}
    return string::npos;
}}

static int __kc_get_int(const string& json, const string& key) {{
    auto pos = __kc_skip_ws(json, __kc_find_key(json, key));
    if (pos == string::npos || pos >= json.size()) return 0;
    return atoi(json.c_str() + pos);
}}

static double __kc_get_float(const string& json, const string& key) {{
    auto pos = __kc_skip_ws(json, __kc_find_key(json, key));
    if (pos == string::npos || pos >= json.size()) return 0.0;
    return atof(json.c_str() + pos);
}}

static bool __kc_get_bool(const string& json, const string& key) {{
    auto pos = __kc_skip_ws(json, __kc_find_key(json, key));
    if (pos == string::npos || pos >= json.size()) return false;
    return json.substr(pos, 4) == "true";
}}

static string __kc_get_string(const string& json, const string& key) {{
    auto pos = __kc_skip_ws(json, __kc_find_key(json, key));
    if (pos == string::npos || pos >= json.size() || json[pos] != '"') return "";
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

/* Find matching bracket, handling nesting */
static string::size_type __kc_find_bracket_end(const string& json, string::size_type start) {{
    start = __kc_skip_ws(json, start);
    if (start == string::npos || start >= json.size() || json[start] != '[') return string::npos;
    int depth = 1;
    string::size_type pos = start + 1;
    bool in_str = false;
    while (pos < json.size() && depth > 0) {{
        if (json[pos] == '\\\\' && in_str) {{ pos += 2; continue; }}
        if (json[pos] == '"') in_str = !in_str;
        else if (!in_str) {{
            if (json[pos] == '[') depth++;
            else if (json[pos] == ']') depth--;
        }}
        if (depth > 0) pos++;
    }}
    return pos;
}}

static vector<int> __kc_get_int_array(const string& json, const string& key) {{
    auto pos = __kc_skip_ws(json, __kc_find_key(json, key));
    vector<int> result;
    if (pos == string::npos || pos >= json.size() || json[pos] != '[') return result;
    pos++;
    while (pos < json.size() && json[pos] != ']') {{
        while (pos < json.size() && (json[pos] == ' ' || json[pos] == ',' || json[pos] == '\\t' || json[pos] == '\\n' || json[pos] == '\\r')) pos++;
        if (pos < json.size() && json[pos] != ']') {{
            result.push_back(atoi(json.c_str() + pos));
            if (json[pos] == '-') pos++;
            while (pos < json.size() && json[pos] >= '0' && json[pos] <= '9') pos++;
        }}
    }}
    return result;
}}

static vector<double> __kc_get_float_array(const string& json, const string& key) {{
    auto pos = __kc_skip_ws(json, __kc_find_key(json, key));
    vector<double> result;
    if (pos == string::npos || pos >= json.size() || json[pos] != '[') return result;
    pos++;
    while (pos < json.size() && json[pos] != ']') {{
        while (pos < json.size() && (json[pos] == ' ' || json[pos] == ',' || json[pos] == '\\t' || json[pos] == '\\n' || json[pos] == '\\r')) pos++;
        if (pos < json.size() && json[pos] != ']') {{
            result.push_back(atof(json.c_str() + pos));
            if (json[pos] == '-') pos++;
            while (pos < json.size() && ((json[pos] >= '0' && json[pos] <= '9') || json[pos] == '.' || json[pos] == 'e' || json[pos] == 'E' || json[pos] == '+' || json[pos] == '-')) pos++;
        }}
    }}
    return result;
}}

static vector<string> __kc_get_string_array(const string& json, const string& key) {{
    auto pos = __kc_skip_ws(json, __kc_find_key(json, key));
    vector<string> result;
    if (pos == string::npos || pos >= json.size() || json[pos] != '[') return result;
    pos++;
    while (pos < json.size() && json[pos] != ']') {{
        while (pos < json.size() && (json[pos] == ' ' || json[pos] == ',' || json[pos] == '\\t' || json[pos] == '\\n' || json[pos] == '\\r')) pos++;
        if (pos >= json.size() || json[pos] == ']') break;
        if (json[pos] == '"') {{
            pos++;
            string s;
            while (pos < json.size() && json[pos] != '"') {{
                if (json[pos] == '\\\\' && pos + 1 < json.size()) {{
                    pos++;
                    if (json[pos] == 'n') s += '\\n';
                    else if (json[pos] == 'r') s += '\\r';
                    else if (json[pos] == 't') s += '\\t';
                    else s += json[pos];
                    pos++;
                }} else {{
                    s += json[pos++];
                }}
            }}
            if (pos < json.size()) pos++; // skip closing quote
            result.push_back(s);
        }} else {{
            while (pos < json.size() && json[pos] != ',' && json[pos] != ']') pos++;
        }}
    }}
    return result;
}}

static vector<bool> __kc_get_bool_array(const string& json, const string& key) {{
    auto pos = __kc_skip_ws(json, __kc_find_key(json, key));
    vector<bool> result;
    if (pos == string::npos || pos >= json.size() || json[pos] != '[') return result;
    pos++;
    while (pos < json.size() && json[pos] != ']') {{
        while (pos < json.size() && (json[pos] == ' ' || json[pos] == ',' || json[pos] == '\\t' || json[pos] == '\\n' || json[pos] == '\\r')) pos++;
        if (pos >= json.size() || json[pos] == ']') break;
        result.push_back(json.substr(pos, 4) == "true");
        while (pos < json.size() && json[pos] != ',' && json[pos] != ']') pos++;
    }}
    return result;
}}

/* Nullable int array for BinaryTree level-order (supports null entries) */
static vector<pair<int, bool>> __kc_get_nullable_array(const string& json, const string& key) {{
    auto pos = __kc_skip_ws(json, __kc_find_key(json, key));
    vector<pair<int, bool>> result; // (value, is_valid)
    if (pos == string::npos || pos >= json.size() || json[pos] != '[') return result;
    pos++;
    while (pos < json.size() && json[pos] != ']') {{
        while (pos < json.size() && (json[pos] == ' ' || json[pos] == ',' || json[pos] == '\\t' || json[pos] == '\\n' || json[pos] == '\\r')) pos++;
        if (pos >= json.size() || json[pos] == ']') break;
        if (json.substr(pos, 4) == "null") {{
            result.push_back({{0, false}});
            pos += 4;
        }} else {{
            result.push_back({{atoi(json.c_str() + pos), true}});
            if (json[pos] == '-') pos++;
            while (pos < json.size() && json[pos] >= '0' && json[pos] <= '9') pos++;
        }}
    }}
    return result;
}}

/* Matrix parsing helpers — extract nested JSON arrays */
static string __kc_extract_array_at(const string& json, string::size_type pos) {{
    pos = __kc_skip_ws(json, pos);
    if (pos == string::npos || pos >= json.size() || json[pos] != '[') return "[]";
    auto end = __kc_find_bracket_end(json, pos);
    if (end == string::npos) return "[]";
    return json.substr(pos, end - pos + 1);
}}

static vector<string> __kc_split_outer_arrays(const string& json) {{
    vector<string> result;
    size_t pos_start = 0;
    while (pos_start < json.size() && (json[pos_start] == ' ' || json[pos_start] == '\\t' || json[pos_start] == '\\n' || json[pos_start] == '\\r')) pos_start++;
    if (pos_start >= json.size() || json[pos_start] != '[') return result;
    string::size_type pos = pos_start + 1;
    while (pos < json.size() && json[pos] != ']') {{
        while (pos < json.size() && (json[pos] == ' ' || json[pos] == ',' || json[pos] == '\\t' || json[pos] == '\\n' || json[pos] == '\\r')) pos++;
        if (pos >= json.size() || json[pos] == ']') break;
        if (json[pos] == '[') {{
            auto end = __kc_find_bracket_end(json, pos);
            if (end == string::npos) break;
            result.push_back(json.substr(pos, end - pos + 1));
            pos = end + 1;
        }} else {{
            while (pos < json.size() && json[pos] != ',' && json[pos] != ']') pos++;
        }}
    }}
    return result;
}}

static vector<vector<int>> __kc_get_matrix_int(const string& json, const string& key) {{
    auto pos = __kc_skip_ws(json, __kc_find_key(json, key));
    vector<vector<int>> result;
    if (pos == string::npos || pos >= json.size() || json[pos] != '[') return result;
    auto end = __kc_find_bracket_end(json, pos);
    if (end == string::npos) return result;
    string outer = json.substr(pos, end - pos + 1);
    for (auto& row_str : __kc_split_outer_arrays(outer)) {{
        vector<int> row;
        string::size_type rp = 1;
        while (rp < row_str.size() && row_str[rp] != ']') {{
            while (rp < row_str.size() && (row_str[rp] == ' ' || row_str[rp] == ',' || row_str[rp] == '\\t' || row_str[rp] == '\\n' || row_str[rp] == '\\r')) rp++;
            if (rp < row_str.size() && row_str[rp] != ']') {{
                row.push_back(atoi(row_str.c_str() + rp));
                if (row_str[rp] == '-') rp++;
                while (rp < row_str.size() && row_str[rp] >= '0' && row_str[rp] <= '9') rp++;
            }}
        }}
        result.push_back(row);
    }}
    return result;
}}

static vector<vector<double>> __kc_get_matrix_double(const string& json, const string& key) {{
    auto pos = __kc_skip_ws(json, __kc_find_key(json, key));
    vector<vector<double>> result;
    if (pos == string::npos || pos >= json.size() || json[pos] != '[') return result;
    auto end = __kc_find_bracket_end(json, pos);
    if (end == string::npos) return result;
    string outer = json.substr(pos, end - pos + 1);
    for (auto& row_str : __kc_split_outer_arrays(outer)) {{
        vector<double> row;
        string::size_type rp = 1;
        while (rp < row_str.size() && row_str[rp] != ']') {{
            while (rp < row_str.size() && (row_str[rp] == ' ' || row_str[rp] == ',' || row_str[rp] == '\\t' || row_str[rp] == '\\n' || row_str[rp] == '\\r')) rp++;
            if (rp < row_str.size() && row_str[rp] != ']') {{
                row.push_back(atof(row_str.c_str() + rp));
                if (row_str[rp] == '-') rp++;
                while (rp < row_str.size() && ((row_str[rp] >= '0' && row_str[rp] <= '9') || row_str[rp] == '.' || row_str[rp] == 'e' || row_str[rp] == 'E' || row_str[rp] == '+')) rp++;
            }}
        }}
        result.push_back(row);
    }}
    return result;
}}

static vector<vector<string>> __kc_get_matrix_string(const string& json, const string& key) {{
    auto pos = __kc_skip_ws(json, __kc_find_key(json, key));
    vector<vector<string>> result;
    if (pos == string::npos || pos >= json.size() || json[pos] != '[') return result;
    auto end = __kc_find_bracket_end(json, pos);
    if (end == string::npos) return result;
    string outer = json.substr(pos, end - pos + 1);
    for (auto& row_str : __kc_split_outer_arrays(outer)) {{
        // Re-parse as a string array
        string fake_json = "{{\\"__r\\":" + row_str + "}}";
        result.push_back(__kc_get_string_array(fake_json, "__r"));
    }}
    return result;
}}

static vector<vector<bool>> __kc_get_matrix_bool(const string& json, const string& key) {{
    auto pos = __kc_skip_ws(json, __kc_find_key(json, key));
    vector<vector<bool>> result;
    if (pos == string::npos || pos >= json.size() || json[pos] != '[') return result;
    auto end = __kc_find_bracket_end(json, pos);
    if (end == string::npos) return result;
    string outer = json.substr(pos, end - pos + 1);
    for (auto& row_str : __kc_split_outer_arrays(outer)) {{
        string fake_json = "{{\\"__r\\":" + row_str + "}}";
        result.push_back(__kc_get_bool_array(fake_json, "__r"));
    }}
    return result;
}}

/* ── Data Structure Builders ─────────────────────────────────────────── */

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

static TreeNode* __kc_build_binary_tree(const vector<pair<int, bool>>& arr) {{
    if (arr.empty() || !arr[0].second) return nullptr;
    TreeNode* root = new TreeNode(arr[0].first);
    queue<TreeNode*> q;
    q.push(root);
    size_t i = 1;
    while (!q.empty() && i < arr.size()) {{
        TreeNode* node = q.front(); q.pop();
        if (i < arr.size()) {{
            if (arr[i].second) {{
                node->left = new TreeNode(arr[i].first);
                q.push(node->left);
            }}
            i++;
        }}
        if (i < arr.size()) {{
            if (arr[i].second) {{
                node->right = new TreeNode(arr[i].first);
                q.push(node->right);
            }}
            i++;
        }}
    }}
    return root;
}}

/* ── JSON Serialization ──────────────────────────────────────────────── */

static void __kc_json_string(ostream& out, const string& s) {{
    out << '"';
    for (char c : s) {{
        if (c == '\\\\') out << "\\\\\\\\";
        else if (c == '"') out << "\\\\\\"";
        else if (c == '\\n') out << "\\\\n";
        else if (c == '\\r') out << "\\\\r";
        else if (c == '\\t') out << "\\\\t";
        else out << c;
    }}
    out << '"';
}}

static void __kc_json_serialize(ostream& out, const vector<int>& v) {{
    out << "[";
    for (size_t i = 0; i < v.size(); i++) {{ if (i) out << ","; out << v[i]; }}
    out << "]";
}}

static void __kc_json_serialize(ostream& out, const vector<double>& v) {{
    out << "[";
    for (size_t i = 0; i < v.size(); i++) {{ if (i) out << ","; out << v[i]; }}
    out << "]";
}}

static void __kc_json_serialize(ostream& out, const vector<bool>& v) {{
    out << "[";
    for (size_t i = 0; i < v.size(); i++) {{ if (i) out << ","; out << (v[i] ? "true" : "false"); }}
    out << "]";
}}

static void __kc_json_serialize(ostream& out, const vector<string>& v) {{
    out << "[";
    for (size_t i = 0; i < v.size(); i++) {{ if (i) out << ","; __kc_json_string(out, v[i]); }}
    out << "]";
}}

template <typename T>
static void __kc_json_serialize(ostream& out, const vector<vector<T>>& m) {{
    out << "[";
    for (size_t i = 0; i < m.size(); i++) {{
        if (i) out << ",";
        __kc_json_serialize(out, m[i]);
    }}
    out << "]";
}}

static void __kc_json_linked_list(ostream& out, ListNode* head) {{
    out << "[";
    bool first = true;
    while (head) {{
        if (!first) out << ",";
        out << head->val;
        first = false;
        head = head->next;
    }}
    out << "]";
}}

static void __kc_json_binary_tree(ostream& out, TreeNode* root) {{
    if (!root) {{ out << "[]"; return; }}
    vector<string> result;
    queue<TreeNode*> q;
    q.push(root);
    while (!q.empty()) {{
        TreeNode* node = q.front(); q.pop();
        if (node) {{
            result.push_back(to_string(node->val));
            q.push(node->left);
            q.push(node->right);
        }} else {{
            result.push_back("null");
        }}
    }}
    while (!result.empty() && result.back() == "null") result.pop_back();
    out << "[";
    for (size_t i = 0; i < result.size(); i++) {{
        if (i) out << ",";
        out << result[i];
    }}
    out << "]";
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

        // Capture stdout
        streambuf* __kc_orig_buf = cout.rdbuf();
        ostringstream __kc_cap;
        cout.rdbuf(__kc_cap.rdbuf());

{decls}

        Solution sol;
{call_logic}

        // Restore stdout
        cout.rdbuf(__kc_orig_buf);
        string __kc_user_stdout = __kc_cap.str();

        // Serialize result
        ostringstream __kc_out;
{serialize_logic}

        // Output structured JSON
        cout << "{{\\"stdout\\":\\"";
        for (char c : __kc_user_stdout) {{
            if (c == '\\\\') cout << "\\\\\\\\";
            else if (c == '"') cout << "\\\\\\"";
            else if (c == '\\n') cout << "\\\\n";
            else if (c == '\\r') cout << "\\\\r";
            else if (c == '\\t') cout << "\\\\t";
            else cout << c;
        }}
        cout << "\\",\\"result\\":" << __kc_out.str() << "}}" << "\\n";
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

    // Capture stdout
    streambuf* __kc_orig_buf = cout.rdbuf();
    ostringstream __kc_cap;
    cout.rdbuf(__kc_cap.rdbuf());

{decls}

    Solution sol;
{call_logic}

    // Restore stdout
    cout.rdbuf(__kc_orig_buf);
    string __kc_user_stdout = __kc_cap.str();

    // Serialize result
    ostringstream __kc_out;
{serialize_logic}

    // Output structured JSON
    cout << "{{\\"stdout\\":\\"";
    for (char c : __kc_user_stdout) {{
        if (c == '\\\\') cout << "\\\\\\\\";
        else if (c == '"') cout << "\\\\\\"";
        else if (c == '\\n') cout << "\\\\n";
        else if (c == '\\r') cout << "\\\\r";
        else if (c == '\\t') cout << "\\\\t";
        else cout << c;
    }}
    cout << "\\",\\"result\\":" << __kc_out.str() << "}}" << "\\n";
    return 0;
}}
'''
        return wrapper
