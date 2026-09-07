# workers/src/utils/assignment_parser.py
# ─────────────────────────────────────────────────────────────────────────────
# Robust parser for human-style parameter assignments (e.g. LeetCode format):
# 'n = 4\nboard = [[0,0,0,0], [0,1,0,0], ...]'
# 'nums = [2, 7, 11, 15], target = 9'
# Converts to Python dict mapping parameter names to parsed values.
# Supports raw positional inputs (e.g. [1,2,3]\n3) mapped against signature.params.
# Does NOT silently remap named parameters to prevent masking authoring errors.
# ─────────────────────────────────────────────────────────────────────────────

import json
import re
from typing import Optional, Dict, Any, List


def _parse_val(val_str: str) -> Any:
    val_str = val_str.strip()
    try:
        return json.loads(val_str)
    except Exception:
        if val_str == 'True':
            return True
        elif val_str == 'False':
            return False
        elif val_str in ('None', 'null'):
            return None
        elif re.match(r'^-?\d+$', val_str):
            return int(val_str)
        elif re.match(r'^-?\d+\.\d+$', val_str):
            return float(val_str)
        elif (val_str.startswith('"') and val_str.endswith('"')) or (val_str.startswith("'") and val_str.endswith("'")):
            return val_str[1:-1]
        else:
            return val_str


def _scan_positional_values(text: str) -> List[Any]:
    values = []
    i = 0
    length = len(text)
    val_start = 0
    bracket_depth = 0
    brace_depth = 0
    in_quote = None

    while i < length:
        ch = text[i]
        if in_quote:
            if ch == '\\' and i + 1 < length:
                i += 2
                continue
            if ch == in_quote:
                in_quote = None
            i += 1
            continue

        if ch in ('"', "'"):
            in_quote = ch
            i += 1
            continue

        if ch == '[':
            bracket_depth += 1
        elif ch == ']':
            if bracket_depth > 0:
                bracket_depth -= 1
        elif ch == '{':
            brace_depth += 1
        elif ch == '}':
            if brace_depth > 0:
                brace_depth -= 1
        elif bracket_depth == 0 and brace_depth == 0:
            if ch in (',', '\n', ';'):
                val_chunk = text[val_start:i].strip()
                if val_chunk:
                    values.append(_parse_val(val_chunk))
                val_start = i + 1
        i += 1

    last_chunk = text[val_start:length].strip()
    if last_chunk:
        values.append(_parse_val(last_chunk))
    return values


def parse_assignment_input(text: str, signature: Optional[dict] = None) -> Optional[Dict[str, Any]]:
    if not text or not isinstance(text, str):
        return None
    trimmed = text.strip()
    if not trimmed:
        return None

    # Handle escaped newlines outside literal strings
    if '\n' not in trimmed and '\\n' in trimmed:
        trimmed = re.sub(r'(?<!\\)\\n', '\n', trimmed)

    # 1. Try standard JSON directly
    try:
        parsed = json.loads(trimmed)
        if isinstance(parsed, dict):
            return parsed
        if signature and signature.get('params') and len(signature['params']) == 1:
            return {signature['params'][0]['name']: parsed}
    except Exception:
        pass

    # 2. Quote- and bracket-aware scanner for key = value assignments
    entries = []
    i = 0
    length = len(trimmed)
    id_pattern = re.compile(r'^[a-zA-Z_][a-zA-Z0-9_]*')

    while i < length:
        while i < length and trimmed[i] in ' \t\r\n,;':
            i += 1
        if i >= length:
            break

        match = id_pattern.match(trimmed[i:])
        if not match:
            i += 1
            continue

        key = match.group(0)
        i += len(key)

        while i < length and trimmed[i] in ' \t\r\n':
            i += 1
        if i >= length or trimmed[i] != '=':
            continue
        i += 1  # skip '='

        while i < length and trimmed[i] in ' \t\r\n':
            i += 1

        val_start = i
        bracket_depth = 0
        brace_depth = 0
        in_quote = None

        while i < length:
            ch = trimmed[i]
            if in_quote:
                if ch == '\\' and i + 1 < length:
                    i += 2
                    continue
                if ch == in_quote:
                    in_quote = None
                i += 1
                continue

            if ch in ('"', "'"):
                in_quote = ch
                i += 1
                continue

            if ch == '[':
                bracket_depth += 1
            elif ch == ']':
                if bracket_depth > 0:
                    bracket_depth -= 1
            elif ch == '{':
                brace_depth += 1
            elif ch == '}':
                if brace_depth > 0:
                    brace_depth -= 1
            elif bracket_depth == 0 and brace_depth == 0:
                if ch in (',', ';'):
                    break
                if ch == '\n':
                    rest = trimmed[i + 1:].lstrip()
                    if id_pattern.match(rest) and '=' in rest.split('\n')[0]:
                        break
            i += 1

        val_str = trimmed[val_start:i].strip().rstrip(',;').strip()
        entries.append((key, _parse_val(val_str)))
        if i < length and trimmed[i] in ',;':
            i += 1

    if entries:
        return dict(entries)

    # 3. Raw positional fallback (only when no named assignments are present)
    if signature and signature.get('params'):
        pos_values = _scan_positional_values(trimmed)
        if len(pos_values) == len(signature['params']):
            return {
                signature['params'][idx]['name']: val
                for idx, val in enumerate(pos_values)
            }
        if len(signature['params']) == 1:
            return {signature['params'][0]['name']: _parse_val(trimmed)}

    return None
