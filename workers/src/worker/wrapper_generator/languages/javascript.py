# workers/src/worker/wrapper_generator/languages/javascript.py

class JavascriptGenerator:
    @staticmethod
    def generate(signature: dict, user_code: str, batch: bool = False) -> str:
        func_name = signature.get('name', 'solve')
        ret_type = signature.get('returnType', 'Void')

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
"""
        if batch:
            wrapper += f"""
    const payload = fs.readFileSync(0, 'utf-8');
    const lines = payload.split('\\n');
    for (let line of lines) {{
        line = line.trim();
        if (!line) continue;
        console.error(`DEBUG raw JSON: ${{line}}`);
        let tc;
        try {{
            tc = JSON.parse(line);
        }} catch (e) {{
            console.error("Invalid JSON input");
            continue;
        }}
        console.error(`DEBUG parsed JSON: ${{JSON.stringify(tc)}}`);
        let args = [];
"""
            for param in signature.get('params', []):
                pn = param['name']
                pt = param['type']
                wrapper += f"        let a_{pn} = tc['{pn}'];\n"
                if pt == 'LinkedList':
                    wrapper += f"        a_{pn} = __buildLinkedList(a_{pn});\n"
                    wrapper += f"        console.error(`DEBUG deserialized {pn}: ${{JSON.stringify(__serializeLinkedList(a_{pn}))}}`);\n"
                elif pt == 'BinaryTree':
                    wrapper += f"        a_{pn} = __buildBinaryTree(a_{pn});\n"
                elif pt == 'Character':
                    wrapper += f"        a_{pn} = (a_{pn} || '')[0] || '';\n"
                wrapper += f"        args.push(a_{pn});\n"

            wrapper += f"""
        let r = {func_name}(...args);
"""
            if ret_type == 'Void':
                wrapper += f"        console.log('null');\n"
            elif ret_type == 'LinkedList':
                wrapper += f"        console.log(JSON.stringify(__serializeLinkedList(r)));\n"
            elif ret_type == 'BinaryTree':
                wrapper += f"        console.log(JSON.stringify(__serializeBinaryTree(r)));\n"
            else:
                wrapper += f"        console.log(JSON.stringify(r));\n"
            wrapper += f"        console.log('___KC_BATCH_SEP___');\n"
            wrapper += f"    }}\n"
        else:
            wrapper += f"""
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

            wrapper += f"""
    // Call user function
    let result = {func_name}(...args);
"""
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
