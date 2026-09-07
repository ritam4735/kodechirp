// gateway/src/utils/assignmentParser.js
// ─────────────────────────────────────────────────────────────────────────────
// Robust parser for human-style parameter assignments (e.g. LeetCode format):
// 'n = 4\nboard = [[0,0,0,0], [0,1,0,0], ...]'
// 'nums = [2, 7, 11, 15], target = 9'
// 's = "abcabcbb"'
// Converts to JSON object mapping parameter names to parsed values.
// Supports raw positional inputs (e.g. [1,2,3]\n3) mapped against signature.params.
// Does NOT silently remap named parameters to prevent masking authoring errors.
// ─────────────────────────────────────────────────────────────────────────────

function parseVal(valStr) {
  valStr = valStr.trim();
  try {
    return JSON.parse(valStr);
  } catch (_) {
    if (valStr === 'True') return true;
    if (valStr === 'False') return false;
    if (valStr === 'None' || valStr === 'null') return null;
    if (/^-?\d+$/.test(valStr)) return parseInt(valStr, 10);
    if (/^-?\d+\.\d+$/.test(valStr)) return parseFloat(valStr);
    if ((valStr.startsWith('"') && valStr.endsWith('"')) || (valStr.startsWith('\'') && valStr.endsWith('\''))) {
      return valStr.slice(1, -1);
    }
    return valStr;
  }
}

function scanPositionalValues(text) {
  const values = [];
  let i = 0;
  const len = text.length;
  let valStart = 0;
  let bracketDepth = 0;
  let braceDepth = 0;
  let inQuote = null;

  while (i < len) {
    const ch = text[i];
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
      if (ch === ',' || ch === '\n' || ch === ';') {
        const valChunk = text.substring(valStart, i).trim();
        if (valChunk) values.push(parseVal(valChunk));
        valStart = i + 1;
      }
    }
    i++;
  }

  const lastChunk = text.substring(valStart, len).trim();
  if (lastChunk) values.push(parseVal(lastChunk));
  return values;
}

function parseAssignmentInput(text, signature = null) {
  if (!text || typeof text !== 'string') return null;
  let trimmed = text.trim();
  if (!trimmed) return null;

  // Handle escaped newlines outside literal strings
  if (!trimmed.includes('\n') && trimmed.includes('\\n')) {
    trimmed = trimmed.replace(/(?<!\\)\\n/g, '\n');
  }

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
    entries.push([key, parseVal(valStr)]);
    if (i < len && (trimmed[i] === ',' || trimmed[i] === ';')) {
      i++;
    }
  }

  if (entries.length > 0) {
    const result = {};
    for (const [k, v] of entries) {
      result[k] = v;
    }
    return result;
  }

  // 3. Raw positional fallback (only when no named assignments are present)
  if (signature && Array.isArray(signature.params) && signature.params.length > 0) {
    const posValues = scanPositionalValues(trimmed);
    if (posValues.length === signature.params.length) {
      const result = {};
      for (let idx = 0; idx < posValues.length; idx++) {
        result[signature.params[idx].name] = posValues[idx];
      }
      return result;
    }
    if (signature.params.length === 1) {
      return { [signature.params[0].name]: parseVal(trimmed) };
    }
  }

  return null;
}

module.exports = {
  parseAssignmentInput,
};
