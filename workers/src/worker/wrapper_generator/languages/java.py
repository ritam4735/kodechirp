import re
from ..types import java_type

class JavaGenerator:
    @staticmethod
    def generate(signature: dict, user_code: str, batch: bool = False) -> str:
        params = signature.get('params', [])
        func_name = signature.get('name', 'solve')
        ret_type = signature.get('returnType', 'Int')

        decl_lines = []
        call_args = []

        indent = "            " if batch else "        "

        for p in params:
            pn = p['name']
            pt = p['type']
            if pt == 'Int':
                decl_lines.append(f'{indent}int arg_{pn} = __kcGetInt(input, "{pn}");')
                call_args.append(f'arg_{pn}')
            elif pt == 'Float':
                decl_lines.append(f'{indent}double arg_{pn} = __kcGetFloat(input, "{pn}");')
                call_args.append(f'arg_{pn}')
            elif pt == 'Boolean':
                decl_lines.append(f'{indent}boolean arg_{pn} = __kcGetBool(input, "{pn}");')
                call_args.append(f'arg_{pn}')
            elif pt == 'String':
                decl_lines.append(f'{indent}String arg_{pn} = __kcGetString(input, "{pn}");')
                call_args.append(f'arg_{pn}')
            elif pt == 'Character':
                decl_lines.append(f'{indent}char arg_{pn} = __kcGetChar(input, "{pn}");')
                call_args.append(f'arg_{pn}')
            elif pt == 'Array<Int>':
                decl_lines.append(f'{indent}int[] arg_{pn} = __kcGetIntArray(input, "{pn}");')
                call_args.append(f'arg_{pn}')
            elif pt == 'Array<Float>':
                decl_lines.append(f'{indent}double[] arg_{pn} = __kcGetFloatArray(input, "{pn}");')
                call_args.append(f'arg_{pn}')
            elif pt == 'Array<String>':
                decl_lines.append(f'{indent}String[] arg_{pn} = __kcGetStringArray(input, "{pn}");')
                call_args.append(f'arg_{pn}')
            elif pt == 'Array<Boolean>':
                decl_lines.append(f'{indent}boolean[] arg_{pn} = __kcGetBooleanArray(input, "{pn}");')
                call_args.append(f'arg_{pn}')
            elif pt.startswith('Matrix'):
                inner = 'int'
                if 'Float' in pt: inner = 'double'
                elif 'String' in pt: inner = 'String'
                elif 'Boolean' in pt or 'Bool' in pt: inner = 'boolean'
                
                if inner == 'int': decl_lines.append(f'{indent}int[][] arg_{pn} = __kcGetIntMatrix(input, "{pn}");')
                elif inner == 'double': decl_lines.append(f'{indent}double[][] arg_{pn} = __kcGetFloatMatrix(input, "{pn}");')
                elif inner == 'String': decl_lines.append(f'{indent}String[][] arg_{pn} = __kcGetStringMatrix(input, "{pn}");')
                elif inner == 'boolean': decl_lines.append(f'{indent}boolean[][] arg_{pn} = __kcGetBooleanMatrix(input, "{pn}");')
                call_args.append(f'arg_{pn}')
            elif pt == 'LinkedList':
                decl_lines.append(f'{indent}ListNode arg_{pn} = __kcBuildLinkedList(__kcGetIntArray(input, "{pn}"));')
                call_args.append(f'arg_{pn}')
            elif pt == 'BinaryTree':
                decl_lines.append(f'{indent}TreeNode arg_{pn} = __kcBuildBinaryTree(__kcGetIntegerArrayNullable(input, "{pn}"));')
                call_args.append(f'arg_{pn}')

        decls = '\n'.join(decl_lines)
        args_str = ', '.join(call_args)

        java_ret = java_type(ret_type)

        if ret_type == 'Void':
            call_logic = f"{indent}sol.{func_name}({args_str});"
        else:
            call_logic = f"{indent}{java_ret} result = sol.{func_name}({args_str});"

        if ret_type == 'Int':
            print_logic = f'{indent}System.out.println(result);'
        elif ret_type == 'Float':
            print_logic = f'{indent}System.out.println(String.format(Locale.US, "%.17g", result));'
        elif ret_type == 'Boolean':
            print_logic = f'{indent}System.out.println(result ? "true" : "false");'
        elif ret_type == 'String':
            print_logic = f'{indent}__kcPrintString(result);'
        elif ret_type == 'Character':
            print_logic = f'{indent}System.out.println("\\"" + result + "\\"");'
        elif ret_type.startswith('Array') or ret_type.startswith('Matrix'):
            print_logic = f'{indent}System.out.println(__kcSerializeJson(result));'
        elif ret_type == 'LinkedList':
            print_logic = f'{indent}System.out.println(__kcSerializeLinkedList(result));'
        elif ret_type == 'BinaryTree':
            print_logic = f'{indent}System.out.println(__kcSerializeBinaryTree(result));'
        elif ret_type == 'Void':
            print_logic = f'{indent}System.out.println("null");'
        else:
            print_logic = f'{indent}System.out.println(result);'

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
'''

        if batch:
            wrapper += f'''
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
        else:
            wrapper += f'''
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
