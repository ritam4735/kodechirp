// gateway/src/utils/assignmentParser.js
// ─────────────────────────────────────────────────────────────────────────────
// Robust parser for human-style parameter assignments (e.g. LeetCode format):
// 'n = 4\nboard = [[0,0,0,0], [0,1,0,0], ...]'
// 'nums = [2, 7, 11, 15], target = 9'
// 's = "abcabcbb"'
// Converts to JSON object mapping parameter names to parsed values.
// ─────────────────────────────────────────────────────────────────────────────

function parseAssignmentInput(text, signature = null) {
  if (!text || typeof text !== 'string') return null;
  const trimmed = text.trim();
  if (!trimmed) return null;

  // 1. Try JSON directly
  try {
    const parsed = JSON.parse(trimmed);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed;
    }
    // If single param signature and parsed is a primitive / array
    if (signature && Array.isArray(signature.params) && signature.params.length === 1) {
      return { [signature.params[0].name]: parsed };
    }
  } catch (_) {}

  // 2. Quote- and bracket-aware scanner for key = value assignments
  const entries = [];
  let i = 0;
  const len = trimmed.length;
  const idRegex = /^[a-zA-Z_][a-zA-Z0-9_]*/;

  while (i < len) {
    // Skip whitespace and separator characters
    while (i < len && /[\s,;]/.test(trimmed[i])) i++;
    if (i >= len) break;

    const idMatch = idRegex.exec(trimmed.substring(i));
    if (!idMatch) {
      i++;
      continue;
    }
    const key = idMatch[0];
    i += key.length;

    // Skip whitespace
    while (i < len && /\s/.test(trimmed[i])) i++;

    // Must be followed by '='
    if (i >= len || trimmed[i] !== '=') {
      continue;
    }
    i++; // skip '='

    // Skip whitespace
    while (i < len && /\s/.test(trimmed[i])) i++;

    const valStart = i;
    let bracketDepth = 0;
    let braceDepth = 0;
    let inQuote = null;

    while (i < len) {
      const ch = trimmed[i];

      if (inQuote) {
        if (ch === '\\' && i + 1 < len) {
          i += 2;
          continue;
        }
        if (ch === inQuote) {
          inQuote = null;
        }
        i++;
        continue;
      }

      if (ch === '"' || ch === '\'') {
        inQuote = ch;
        i++;
        continue;
      }

      if (ch === '[') {
        bracketDepth++;
      } else if (ch === ']') {
        if (bracketDepth > 0) bracketDepth--;
      } else if (ch === '{') {
        braceDepth++;
      } else if (ch === '}') {
        if (braceDepth > 0) braceDepth--;
      } else if (bracketDepth === 0 && braceDepth === 0) {
        if (ch === ',' || ch === ';') {
          break;
        }
        if (ch === '\n') {
          const rest = trimmed.substring(i + 1).trim();
          if (idRegex.test(rest) && rest.includes('=')) {
            const firstLine = rest.split('\n')[0];
            if (/^[a-zA-Z_][a-zA-Z0-9_]*\s*=/.test(firstLine)) {
              break;
            }
          }
        }
      }
      i++;
    }

    const valStr = trimmed.substring(valStart, i).trim().replace(/[,;]\s*$/, '').trim();
    let val = valStr;
    try {
      val = JSON.parse(valStr);
    } catch (_) {
      if (valStr === 'True') val = true;
      else if (valStr === 'False') val = false;
      else if (valStr === 'None' || valStr === 'null') val = null;
      else if (/^-?\d+$/.test(valStr)) val = parseInt(valStr, 10);
      else if (/^-?\d+\.\d+$/.test(valStr)) val = parseFloat(valStr);
      else if ((valStr.startsWith('"') && valStr.endsWith('"')) || (valStr.startsWith('\'') && valStr.endsWith('\''))) {
        val = valStr.slice(1, -1);
      }
    }

    entries.push([key, val]);
    if (i < len && (trimmed[i] === ',' || trimmed[i] === ';')) {
      i++;
    }
  }

  if (entries.length === 0) return null;

  const result = {};
  for (const [k, v] of entries) {
    result[k] = v;
  }
  return result;
}

module.exports = {
  parseAssignmentInput,
};
