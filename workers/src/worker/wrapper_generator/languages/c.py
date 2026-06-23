# workers/src/worker/wrapper_generator/languages/c.py
from ..types import c_type

class CGenerator:
    @staticmethod
    def generate(signature: dict, user_code: str, batch: bool = False) -> str:
        params = signature.get('params', [])
        func_name = signature.get('name', 'solve')
        ret_type = signature.get('returnType', 'Int')

        decl_lines = []
        parse_lines = []
        call_args = []

        indent = "        " if batch else "    "

        for p in params:
            pn = p['name']
            pt = p['type']
            if pt == 'Int':
                decl_lines.append(f'{indent}int arg_{pn} = 0;')
                parse_lines.append(f'{indent}arg_{pn} = __kc_get_int(input, "{pn}");')
                call_args.append(f'arg_{pn}')
            elif pt == 'Float':
                decl_lines.append(f'{indent}double arg_{pn} = 0.0;')
                parse_lines.append(f'{indent}arg_{pn} = __kc_get_float(input, "{pn}");')
                call_args.append(f'arg_{pn}')
            elif pt == 'Boolean':
                decl_lines.append(f'{indent}int arg_{pn} = 0;')
                parse_lines.append(f'{indent}arg_{pn} = __kc_get_bool(input, "{pn}");')
                call_args.append(f'arg_{pn}')
            elif pt == 'String':
                decl_lines.append(f'{indent}char arg_{pn}[65536]; arg_{pn}[0] = 0;')
                parse_lines.append(f'{indent}__kc_get_string(input, "{pn}", arg_{pn}, sizeof(arg_{pn}));')
                call_args.append(f'arg_{pn}')
            elif pt == 'Character':
                decl_lines.append(f'{indent}char arg_{pn} = 0;')
                parse_lines.append(f'{indent}{{ char __tmp[4]; __kc_get_string(input, "{pn}", __tmp, sizeof(__tmp)); arg_{pn} = __tmp[0]; }}')
                call_args.append(f'arg_{pn}')
            elif pt == 'Array<Int>':
                decl_lines.append(f'{indent}int arg_{pn}[100001]; int arg_{pn}_len = 0;')
                parse_lines.append(f'{indent}arg_{pn}_len = __kc_get_int_array(input, "{pn}", arg_{pn}, 100001);')
                call_args.append(f'arg_{pn}')
                call_args.append(f'arg_{pn}_len')
            elif pt == 'Array<Float>':
                decl_lines.append(f'{indent}double arg_{pn}[100001]; int arg_{pn}_len = 0;')
                parse_lines.append(f'{indent}arg_{pn}_len = __kc_get_float_array(input, "{pn}", arg_{pn}, 100001);')
                call_args.append(f'arg_{pn}')
                call_args.append(f'arg_{pn}_len')
            elif pt == 'Array<String>':
                decl_lines.append(f'{indent}char arg_{pn}[10001][256]; int arg_{pn}_len = 0;')
                parse_lines.append(f'{indent}arg_{pn}_len = __kc_get_string_array(input, "{pn}", arg_{pn}, 10001, 256);')
                call_args.append(f'arg_{pn}')
                call_args.append(f'arg_{pn}_len')
            elif pt == 'Array<Boolean>':
                decl_lines.append(f'{indent}int arg_{pn}[100001]; int arg_{pn}_len = 0;')
                parse_lines.append(f'{indent}arg_{pn}_len = __kc_get_bool_array(input, "{pn}", arg_{pn}, 100001);')
                call_args.append(f'arg_{pn}')
                call_args.append(f'arg_{pn}_len')
            elif pt == 'LinkedList':
                decl_lines.append(f'{indent}int arg_{pn}_arr[100001]; int arg_{pn}_len = 0;')
                decl_lines.append(f'{indent}struct ListNode* arg_{pn} = NULL;')
                parse_lines.append(f'{indent}arg_{pn}_len = __kc_get_int_array(input, "{pn}", arg_{pn}_arr, 100001);')
                parse_lines.append(f'{indent}arg_{pn} = __kc_build_linked_list(arg_{pn}_arr, arg_{pn}_len);')
                call_args.append(f'arg_{pn}')
            elif pt.startswith('Matrix'):
                decl_lines.append(f'{indent}/* Matrix param {pn} - not fully supported in C */')
                decl_lines.append(f'{indent}int arg_{pn}_flat[100001]; int arg_{pn}_rows = 0; int arg_{pn}_cols = 0;')
                parse_lines.append(f'{indent}/* Matrix deserialization for {pn} is not supported in C wrappers */')
                call_args.append(f'arg_{pn}_flat')
                call_args.append(f'arg_{pn}_rows')
                call_args.append(f'arg_{pn}_cols')
            elif pt == 'BinaryTree':
                decl_lines.append(f'{indent}int arg_{pn}_arr[100001]; int arg_{pn}_len = 0;')
                decl_lines.append(f'{indent}struct TreeNode* arg_{pn} = NULL;')
                parse_lines.append(f'{indent}/* BinaryTree not fully supported in C */')
                call_args.append(f'arg_{pn}')

        if ret_type.startswith('Array'):
            call_args.append('&__ret_size')
        elif ret_type.startswith('Matrix'):
            call_args.append('&__ret_size')
            call_args.append('&__ret_col_sizes')

        decls = '\n'.join(decl_lines)
        parses = '\n'.join(parse_lines)
        args_str = ', '.join(call_args)

        c_ret = c_type(ret_type)
        if ret_type.startswith('Array'):
            c_ret = c_type(ret_type) if c_type(ret_type) != 'int' else 'int*'
        elif ret_type == 'LinkedList':
            c_ret = 'struct ListNode*'

        if ret_type == 'Void':
            call_logic = f"{indent}{func_name}({args_str});"
        else:
            call_logic = f"{indent}{c_ret} __result = {func_name}({args_str});"

        if ret_type == 'Int':
            print_logic = f'{indent}printf("%d\\n", __result);'
        elif ret_type == 'Float':
            print_logic = f'{indent}printf("%.17g\\n", __result);'
        elif ret_type == 'Boolean':
            print_logic = f'{indent}printf("%s\\n", __result ? "true" : "false");'
        elif ret_type == 'String':
            print_logic = f'{indent}__kc_print_string(__result);'
        elif ret_type == 'Character':
            print_logic = f'{indent}printf("\\"%c\\"\\n", __result);'
        elif ret_type == 'Array<Int>':
            print_logic = f'''{indent}printf("[");
{indent}for (int __i = 0; __i < __ret_size; __i++) {{
{indent}    if (__i > 0) printf(",");
{indent}    printf("%d", __result[__i]);
{indent}}}
{indent}printf("]\\n");'''
        elif ret_type == 'Array<Float>':
            print_logic = f'''{indent}printf("[");
{indent}for (int __i = 0; __i < __ret_size; __i++) {{
{indent}    if (__i > 0) printf(",");
{indent}    printf("%.17g", __result[__i]);
{indent}}}
{indent}printf("]\\n");'''
        elif ret_type == 'Array<Boolean>':
            print_logic = f'''{indent}printf("[");
{indent}for (int __i = 0; __i < __ret_size; __i++) {{
{indent}    if (__i > 0) printf(",");
{indent}    printf("%s", __result[__i] ? "true" : "false");
{indent}}}
{indent}printf("]\\n");'''
        elif ret_type == 'LinkedList':
            print_logic = f'{indent}__kc_print_linked_list(__result);'
        elif ret_type == 'Void':
            print_logic = f'{indent}printf("null\\n");'
        else:
            print_logic = f'{indent}printf("%d\\n", __result);'

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
'''
        if batch:
            wrapper += f'''
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
        else:
            wrapper += f'''
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
