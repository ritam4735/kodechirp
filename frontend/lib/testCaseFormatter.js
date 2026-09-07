// frontend/lib/testCaseFormatter.js
// ─────────────────────────────────────────────────────────────────────────────
// Competitive Programming Platform Test Case & Output Formatter
// Formats raw JSON inputs & outputs into clean, human-readable representations
// matching LeetCode / HackerRank / GeeksforGeeks conventions.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Checks if a value is a 2D array (matrix).
 */
export function isMatrix(val) {
  return Array.isArray(val) && val.length > 0 && Array.isArray(val[0]);
}

/**
 * Checks if a value is an array of strings.
 */
export function isStringArray(val) {
  return Array.isArray(val) && val.length > 0 && val.every((item) => typeof item === 'string');
}

/**
 * Pretty-prints a 2D array (matrix) with 2-space indentation per row.
 * Example:
 * [
 *   [0,0,0],
 *   [1,0,1],
 *   [0,0,0]
 * ]
 */
export function formatMatrix(mat) {
  if (!Array.isArray(mat)) return String(mat);
  if (mat.length === 0) return '[]';
  const rows = mat.map((row, idx) => {
    const rowStr = Array.isArray(row) ? `[${row.join(',')}]` : String(row);
    return `  ${rowStr}${idx < mat.length - 1 ? ',' : ''}`;
  });
  return `[\n${rows.join('\n')}\n]`;
}

/**
 * Pretty-prints an array of strings with 2-space indentation.
 * Example:
 * [
 *   "DDRDRR",
 *   "DRDDRR"
 * ]
 */
export function formatArrayOfStrings(arr) {
  if (!Array.isArray(arr)) return String(arr);
  if (arr.length === 0) return '[]';
  const rows = arr.map((item, idx) => {
    return `  ${JSON.stringify(item)}${idx < arr.length - 1 ? ',' : ''}`;
  });
  return `[\n${rows.join('\n')}\n]`;
}

/**
 * Formats a linked list array into arrow-separated nodes: 1 -> 2 -> 3 -> 4
 */
export function formatLinkedList(val) {
  if (!Array.isArray(val)) {
    if (typeof val === 'string') {
      try {
        const parsed = JSON.parse(val);
        if (Array.isArray(parsed)) return formatLinkedList(parsed);
      } catch {}
    }
    return String(val ?? '');
  }
  if (val.length === 0) return '[]';
  return val.join(' -> ');
}

/**
 * Builds a binary tree node hierarchy from a level-order array with nulls.
 */
function buildTreeFromLevelOrder(arr) {
  if (!Array.isArray(arr) || arr.length === 0 || arr[0] === null || arr[0] === undefined) {
    return null;
  }
  const root = { val: String(arr[0]), left: null, right: null };
  const queue = [root];
  let i = 1;
  while (queue.length > 0 && i < arr.length) {
    const curr = queue.shift();
    if (i < arr.length) {
      if (arr[i] !== null && arr[i] !== undefined) {
        curr.left = { val: String(arr[i]), left: null, right: null };
        queue.push(curr.left);
      }
      i++;
    }
    if (i < arr.length) {
      if (arr[i] !== null && arr[i] !== undefined) {
        curr.right = { val: String(arr[i]), left: null, right: null };
        queue.push(curr.right);
      }
      i++;
    }
  }
  return root;
}

/**
 * Computes tree height.
 */
function getTreeHeight(node) {
  if (!node) return 0;
  return 1 + Math.max(getTreeHeight(node.left), getTreeHeight(node.right));
}

/**
 * Generates an ASCII representation of a binary tree.
 */
function renderTreeAsciiNode(node) {
  if (!node) return { lines: [], pos: 0, width: 0 };
  const valStr = node.val;
  if (!node.left && !node.right) {
    return { lines: [valStr], pos: Math.floor(valStr.length / 2), width: valStr.length };
  }
  if (node.left && !node.right) {
    const left = renderTreeAsciiNode(node.left);
    const pos = left.pos + 2;
    const width = Math.max(pos + valStr.length, left.width);
    const branchLine = ' '.repeat(left.pos + 1) + '/';
    const valLine = ' '.repeat(pos) + valStr;
    const lines = [valLine, branchLine, ...left.lines];
    return { lines, pos, width };
  }
  if (!node.left && node.right) {
    const right = renderTreeAsciiNode(node.right);
    const branchLine = ' \\';
    const valLine = valStr;
    const rightLinesShifted = right.lines.map((l) => '  ' + l);
    const lines = [valLine, branchLine, ...rightLinesShifted];
    return { lines, pos: 0, width: right.width + 2 };
  }
  const left = renderTreeAsciiNode(node.left);
  const right = renderTreeAsciiNode(node.right);
  const gap = 3;
  const leftWidth = left.width;
  const rightShift = leftWidth + gap;
  const pos = Math.floor((left.pos + rightShift + right.pos) / 2);
  const branchLen = rightShift + right.pos - left.pos;
  const branchSpace = Math.max(1, branchLen - 2);
  const branchLine = ' '.repeat(left.pos + 1) + '/' + ' '.repeat(branchSpace) + '\\';
  const maxLines = Math.max(left.lines.length, right.lines.length);
  const merged = [];
  for (let i = 0; i < maxLines; i++) {
    const lLine = left.lines[i] || ' '.repeat(leftWidth);
    const rLine = right.lines[i] || '';
    merged.push(lLine.padEnd(leftWidth) + ' '.repeat(gap) + rLine);
  }
  return {
    lines: [' '.repeat(pos) + valStr, branchLine, ...merged],
    pos,
    width: rightShift + right.width,
  };
}

/**
 * Attempts to render a binary tree to ASCII string.
 * Falls back to null if height > 4 or rendering is overly wide.
 */
export function renderAsciiTree(arr) {
  try {
    const tree = buildTreeFromLevelOrder(arr);
    if (!tree) return null;
    const height = getTreeHeight(tree);
    if (height > 4) return null; // Avoid overly complex ASCII trees
    const res = renderTreeAsciiNode(tree);
    if (res.width > 60) return null;
    return res.lines.join('\n');
  } catch {
    return null;
  }
}

/**
 * Formats a binary tree value.
 * Uses ASCII art if possible and enabled, otherwise falls back to [1,2,3,null,4].
 */
export function formatBinaryTree(val, preferAscii = true) {
  if (!Array.isArray(val)) {
    if (typeof val === 'string') {
      try {
        const parsed = JSON.parse(val);
        if (Array.isArray(parsed)) return formatBinaryTree(parsed, preferAscii);
      } catch {}
    }
    return String(val ?? '');
  }

  if (val.length === 0) {
    return { formatted: '[]', isMultiLine: false, hasAscii: false };
  }

  const arrayFallback = `[${val.map((v) => (v === null || v === undefined ? 'null' : v)).join(',')}]`;

  if (preferAscii) {
    const ascii = renderAsciiTree(val);
    if (ascii) {
      return { formatted: ascii, isMultiLine: true, hasAscii: true, arrayFallback };
    }
  }

  return { formatted: arrayFallback, isMultiLine: false, hasAscii: false, arrayFallback };
}

/**
 * Formats an individual parameter value based on its type and structure.
 * Returns { formatted: string, isMultiLine: boolean, isTree?: boolean, treeArray?: string }
 */
export function formatParamValue(val, typeName) {
  const normType = (typeName || '').toLowerCase();

  // Matrix (2D Array)
  if (normType.includes('matrix') || isMatrix(val)) {
    return { formatted: formatMatrix(val), isMultiLine: true };
  }

  // Linked List
  if (normType === 'linkedlist' || normType === 'linked_list') {
    return { formatted: formatLinkedList(val), isMultiLine: false };
  }

  // Binary Tree
  if (normType === 'binarytree' || normType === 'binary_tree') {
    const treeRes = formatBinaryTree(val, true);
    return {
      formatted: treeRes.formatted,
      isMultiLine: treeRes.isMultiLine,
      isTree: true,
      hasAscii: treeRes.hasAscii,
      treeArray: treeRes.arrayFallback,
    };
  }

  // Character
  if (normType === 'character' || normType === 'char') {
    return { formatted: `'${val}'`, isMultiLine: false };
  }

  // String
  if (typeof val === 'string') {
    return { formatted: `"${val}"`, isMultiLine: false };
  }

  // Boolean
  if (typeof val === 'boolean') {
    return { formatted: val ? 'true' : 'false', isMultiLine: false };
  }

  // Array of Strings
  if (normType === 'array<string>' || isStringArray(val)) {
    return { formatted: formatArrayOfStrings(val), isMultiLine: true };
  }

  // Primitive Array (Numbers, etc.)
  if (Array.isArray(val)) {
    return { formatted: `[${val.join(', ')}]`, isMultiLine: false };
  }

  // Null / Undefined
  if (val === null || val === undefined) {
    return { formatted: 'null', isMultiLine: false };
  }

  // Numbers & fallback primitives
  return { formatted: String(val), isMultiLine: false };
}

/**
 * Parses raw input into a JS object or returns raw string if parsing fails.
 */
function parseRaw(raw) {
  if (raw === null || raw === undefined) return null;
  if (typeof raw !== 'string') return raw;
  const trimmed = raw.trim();
  if (!trimmed) return '';
  try {
    return JSON.parse(trimmed);
  } catch {
    return raw;
  }
}

/**
 * Formats a problem input (single or multiple parameters) for display.
 * 
 * Rules:
 * 1. Honors signature parameter order (e.g. signature.params order rather than JSON key order).
 * 2. Primitives: n = 5, k = 2
 * 3. Array: nums = [1, 2, 3, 4]
 * 4. Matrix:
 *    board =
 * 
 *    [
 *      [0,0,0],
 *      [1,0,1],
 *      [0,0,0]
 *    ]
 * 5. String: s = "hello"
 * 6. Character: c = 'a'
 * 7. Boolean: flag = true
 * 8. Linked List: head = 1 -> 2 -> 3 -> 4
 * 9. Binary Tree: ASCII tree if depth <= 4, or root = [1,2,3,null,4]
 * 10. Multi-line parameters separated by \n\n; single-line primitives by \n.
 */
export function formatInput(rawInput, signature) {
  const parsed = parseRaw(rawInput);

  if (parsed === null || parsed === undefined) return '';

  // If input is not a plain object (e.g. primitive, array, or unparseable text)
  if (typeof parsed !== 'object' || Array.isArray(parsed)) {
    if (typeof parsed === 'string' && !parsed.startsWith('[') && !parsed.startsWith('{')) {
      return parsed; // Plain STDIN text
    }
    const singleParam = signature?.params?.[0];
    const { formatted } = formatParamValue(parsed, singleParam?.type);
    if (singleParam?.name) {
      return `${singleParam.name} = ${formatted}`;
    }
    return formatted;
  }

  const sigParams = signature?.params || [];
  const sigParamNames = sigParams.map((p) => p.name);
  const sigParamMap = new Map(sigParams.map((p) => [p.name, p.type]));

  // Collect keys in signature order first, then any extra keys in object
  const orderedKeys = [];
  for (const p of sigParams) {
    if (p.name in parsed) {
      orderedKeys.push(p.name);
    }
  }
  for (const k of Object.keys(parsed)) {
    if (!sigParamNames.includes(k)) {
      orderedKeys.push(k);
    }
  }

  if (orderedKeys.length === 0) {
    return typeof rawInput === 'string' ? rawInput : JSON.stringify(rawInput);
  }

  const parts = orderedKeys.map((k) => {
    const val = parsed[k];
    const type = sigParamMap.get(k);
    const { formatted, isMultiLine } = formatParamValue(val, type);
    if (isMultiLine) {
      return { text: `${k} =\n\n${formatted}`, isMultiLine: true };
    }
    return { text: `${k} = ${formatted}`, isMultiLine: false };
  });

  if (parts.length === 1) {
    return parts[0].text;
  }

  // If any parameter is multi-line (like matrix or tree), separate by blank lines (\n\n)
  const anyMultiLine = parts.some((p) => p.isMultiLine);
  return parts.map((p) => p.text).join(anyMultiLine ? '\n\n' : '\n');
}

/**
 * Formats a function return value / test case output.
 * 
 * Rules:
 * - Primitive number: 7
 * - String: "hello"
 * - Character: 'a'
 * - Array: [1,2,3]
 * - Array of strings:
 *   [
 *     "DDRDRR",
 *     "DRDDRR"
 *   ]
 * - Matrix:
 *   [
 *     [1,2],
 *     [3,4]
 *   ]
 * - Boolean: true / false
 * - Linked List: 1 -> 2 -> 3 -> 4
 * - Binary Tree: [1,2,3,null,4]
 */
export function formatOutput(rawOutput, returnType) {
  if (rawOutput === null || rawOutput === undefined) return 'null';

  let parsed = parseRaw(rawOutput);

  // If parsed is null and raw string was literal 'null'
  if (parsed === null && String(rawOutput).trim() === 'null') {
    return 'null';
  }

  const normReturn = (returnType || '').toLowerCase();

  // Matrix
  if (normReturn.includes('matrix') || isMatrix(parsed)) {
    return formatMatrix(parsed);
  }

  // Linked List
  if (normReturn === 'linkedlist' || normReturn === 'linked_list') {
    return formatLinkedList(parsed);
  }

  // Binary Tree
  if (normReturn === 'binarytree' || normReturn === 'binary_tree') {
    if (Array.isArray(parsed)) {
      return `[${parsed.map((v) => (v === null ? 'null' : v)).join(',')}]`;
    }
  }

  // Array of Strings
  if (normReturn === 'array<string>' || isStringArray(parsed)) {
    return formatArrayOfStrings(parsed);
  }

  // Character
  if (normReturn === 'character' || normReturn === 'char') {
    return `'${parsed}'`;
  }

  // String
  if (typeof parsed === 'string') {
    // If raw was unquoted plain text and returnType is string, wrap in quotes
    return `"${parsed}"`;
  }

  // Boolean
  if (typeof parsed === 'boolean') {
    return parsed ? 'true' : 'false';
  }

  // Array (e.g. Array<Int>)
  if (Array.isArray(parsed)) {
    return `[${parsed.join(',')}]`;
  }

  // Number / Other Primitive
  if (typeof parsed === 'number') {
    return String(parsed);
  }

  return String(parsed ?? '');
}

/**
 * Returns structured parameters array for advanced component rendering if needed:
 * [{ name, type, formattedValue, isMultiLine, isTree, hasAscii, treeArray }]
 */
export function parseStructuredParams(rawInput, signature) {
  const parsed = parseRaw(rawInput);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return null;
  }

  const sigParams = signature?.params || [];
  const sigParamNames = sigParams.map((p) => p.name);
  const sigParamMap = new Map(sigParams.map((p) => [p.name, p.type]));

  const orderedKeys = [];
  for (const p of sigParams) {
    if (p.name in parsed) orderedKeys.push(p.name);
  }
  for (const k of Object.keys(parsed)) {
    if (!sigParamNames.includes(k)) orderedKeys.push(k);
  }

  return orderedKeys.map((name) => {
    const val = parsed[name];
    const type = sigParamMap.get(name);
    const formatted = formatParamValue(val, type);
    return {
      name,
      type: type || 'Unknown',
      rawVal: val,
      ...formatted,
    };
  });
}
