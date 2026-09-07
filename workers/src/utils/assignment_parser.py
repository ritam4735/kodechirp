# workers/src/utils/assignment_parser.py
# ─────────────────────────────────────────────────────────────────────────────
# Robust parser for human-style parameter assignments (e.g. LeetCode format):
# 'n = 4\nboard = [[0,0,0,0], [0,1,0,0], ...]'
# 'nums = [2, 7, 11, 15], target = 9'
# Converts to Python dict mapping parameter names to parsed values.
# ─────────────────────────────────────────────────────────────────────────────

import json
import re
from typing import Optional, Dict, Any

def parse_assignment_input(text: str, signature: Optional[dict] = None) -> Optional[Dict[str, Any]]:
    if not text or not isinstance(text, str):
        return None
    trimmed = text.strip()
    if not trimmed:
        return None

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
        i += 1 # skip '='

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
        try:
            val = json.loads(val_str)
        except Exception:
            if val_str == 'True':
                val = True
            elif val_str == 'False':
                val = False
            elif val_str in ('None', 'null'):
                val = None
            elif re.match(r'^-?\d+$', val_str):
                val = int(val_str)
            elif re.match(r'^-?\d+\.\d+$', val_str):
                val = float(val_str)
            elif (val_str.startswith('"') and val_str.endswith('"')) or (val_str.startswith("'") and val_str.endswith("'")):
                val = val_str[1:-1]
            else:
                val = val_str

        entries.append((key, val))
        if i < length and trimmed[i] in ',;':
            i += 1

    if not entries:
        return None
    return dict(entries)
