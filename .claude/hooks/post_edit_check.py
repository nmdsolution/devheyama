#!/usr/bin/env python3
"""PostToolUse hook for Write|Edit — fast Python syntax safety net.

After Claude edits or creates a .py file, immediately byte-compile it. This
does NOT replace `tester` (which runs the real suite) — it's a near-zero-cost
check that catches syntax errors the instant they're introduced, before the
orchestrator ever hands off to `tester`. Non-.py files are ignored.

A syntax error is also appended to the shared audit trail (`audit_log.py`) —
`.claude/audit/trail.jsonl` — tagged `hook: post_edit_check`.
"""

import json
import py_compile
import sys

from audit_log import append_entry


def main() -> None:
    try:
        payload = json.load(sys.stdin)
    except json.JSONDecodeError:
        print(json.dumps({}))
        return

    file_path = payload.get("tool_input", {}).get("file_path", "")
    if not file_path.endswith(".py"):
        print(json.dumps({}))
        return

    try:
        py_compile.compile(file_path, doraise=True)
    except py_compile.PyCompileError as exc:
        append_entry(
            hook="post_edit_check",
            tool=payload.get("tool_name"),
            file=file_path,
            decision="block",
            reason=exc.msg,
        )
        print(
            json.dumps(
                {
                    "decision": "block",
                    "reason": f"Syntax error in {file_path} — fix before continuing:\n{exc.msg}",
                }
            )
        )
        return
    except OSError:
        # File not found / not yet flushed / permissions issue — stay silent.
        print(json.dumps({}))
        return

    print(json.dumps({}))


if __name__ == "__main__":
    main()
