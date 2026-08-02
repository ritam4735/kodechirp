# workers/src/utils/batch_parser.py
import json
from typing import List, Dict, Any, Tuple
from src.utils.sanitizer import normalise_output

BATCH_DELIMITER = "___KC_BATCH_SEP___"

def parse_batch_segment(raw_segment: str) -> Tuple[str, str]:
    """
    Parses a single test case output segment from the execution wrapper.
    Returns (actual_output_str, user_console_str).
    """
    if not raw_segment:
        return "", ""

    segment = raw_segment.strip()
    if not segment:
        return "", ""

    user_console = ""
    actual_output = ""

    try:
        parsed = json.loads(segment)
        if isinstance(parsed, dict) and "result" in parsed:
            user_console = parsed.get("stdout", "") or ""
            res_val = parsed.get("result")
            if res_val is None:
                actual_output = "null"
            elif isinstance(res_val, (dict, list)):
                actual_output = json.dumps(res_val, separators=(',', ':'))
            elif isinstance(res_val, bool):
                actual_output = "true" if res_val else "false"
            else:
                actual_output = str(res_val)
        else:
            actual_output = segment
    except Exception:
        actual_output = segment

    return actual_output, user_console

def parse_batch_outputs(stdout: str, expected_count: int) -> List[Tuple[str, str]]:
    """
    Splits stdout by BATCH_DELIMITER and parses each segment into (actual_output, console_stdout).
    Guarantees returning at least expected_count entries (empty for missing).
    """
    if not stdout:
        return [("", "")] * expected_count

    raw_segments = stdout.split(BATCH_DELIMITER)
    results = []
    for raw in raw_segments:
        if raw.strip():
            results.append(parse_batch_segment(raw))
        elif len(results) < len(raw_segments) - 1:
            # Empty segment before delimiter
            results.append(("", ""))

    # Pad if fewer segments were produced (e.g. TLE / Runtime Error mid-execution)
    while len(results) < expected_count:
        results.append(("", ""))

    return results[:expected_count]
