#!/usr/bin/env python3
"""Shared audit trail for the hooks in this directory, and a standalone
catch-all logger in its own right.

Every tool call any agent makes gets one line in `.claude/audit/trail.jsonl`
(newest last): a PreToolUse entry when it's attempted, a PostToolUse entry
when it completes. `guard_bash.py` and `post_edit_check.py` additionally log
their own decisions via `append_entry` so a denial/block is tagged with its
reason right next to the attempt that triggered it. An attempt with no
matching completion in the trail means something blocked it.

This is deliberately just a flat JSONL file, not a database — `tail -f`,
`grep`, or a one-line `jq` filter is enough to answer "what happened during
this run and why."
"""

import json
import sys
from datetime import datetime, timezone
from pathlib import Path

AUDIT_DIR = Path(__file__).resolve().parent.parent / "audit"
AUDIT_FILE = AUDIT_DIR / "trail.jsonl"


def _truncate(value, limit: int = 300):
    if isinstance(value, str) and len(value) > limit:
        return value[:limit] + f"... [truncated, {len(value)} chars]"
    return value


def _summarize_input(tool_input: dict) -> dict:
    """Truncate large values (e.g. a full file's `content` on a Write call)
    so the trail stays readable instead of ballooning."""
    return {key: _truncate(value) for key, value in tool_input.items()}


def append_entry(**fields) -> None:
    AUDIT_DIR.mkdir(parents=True, exist_ok=True)
    entry = {"ts": datetime.now(timezone.utc).isoformat(), **fields}
    with open(AUDIT_FILE, "a", encoding="utf-8") as f:
        f.write(json.dumps(entry, ensure_ascii=False) + "\n")


def main() -> None:
    """Catch-all hook entry point: logs every tool call attempt/completion,
    never blocks anything (always returns no opinion)."""
    try:
        payload = json.load(sys.stdin)
    except json.JSONDecodeError:
        print(json.dumps({}))
        return

    append_entry(
        event=payload.get("hook_event_name", "unknown"),
        agent=payload.get("agent_type") or "orchestrator",
        tool=payload.get("tool_name"),
        input=_summarize_input(payload.get("tool_input", {})),
    )
    print(json.dumps({}))


if __name__ == "__main__":
    main()
