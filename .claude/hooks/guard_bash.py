#!/usr/bin/env python3
"""PreToolUse hook for the Bash tool.

Reads the pending Bash command from Claude Code's hook-input JSON on stdin
and hard-denies destructive git operations: force-push, hard reset, branch
deletion, and direct push to main/master. A normal feature-branch push or
`gh pr create` is NOT gated here — a PR is itself the review checkpoint (it
doesn't merge anything, and no sub-agent in this project has merge
capability), so there is no additional confirmation step to add.

Everything else gets no opinion (empty JSON), which lets Claude Code's normal
permission flow decide.

Why hard-deny rather than a confirm-first prompt for the destructive cases
(both alternatives were tried and ruled out empirically, not by assumption):
1. Returning `permissionDecision: "ask"` can be silently pre-empted — if any
   settings source (e.g. a user's global ~/.claude/settings.json) already has
   a broad allow rule that matches, such as `Bash(git push *)` approved once
   in a *different, unrelated* project, Claude Code treats the call as
   already-approved and never surfaces the hook's "ask" as a prompt at all.
2. Having the hook script itself read a confirmation from the controlling
   terminal (CON / /dev/tty) does not work when Claude Code is hosted inside
   an IDE extension (e.g. the VSCode extension) rather than a terminal the
   user is directly watching — there is no console for a spawned hook
   subprocess to attach to outside the chat UI, so the prompt is invisible
   and unanswerable.
A hard "deny" is the one mechanism verified to reliably block the command
regardless of either of those — confirmed by testing an actual `git push`
against this repo's real GitHub remote and seeing it correctly blocked before
reaching git, even with a pre-existing global allow rule for `git push *` in
place.

Every denial is also appended to the shared audit trail (`audit_log.py`) —
`.claude/audit/trail.jsonl` — tagged `hook: guard_bash`, so a blocked command
is traceable to exactly which rule stopped it.

Limitation: this is regex-based pattern matching on a shell command string,
not a real shell parser — it's a best-effort guardrail, not a sandbox. See
shared/tool-use-concepts.md's bash security guidance for the fuller version
of this (allowlist executables, reject shell operators, run in an isolated
environment) if this project needs a harder boundary later.
"""

import json
import re
import sys

from audit_log import append_entry

DENY_PATTERNS = [
    (re.compile(r"\bgit\s+push\b.*(--force\b|-f\b)"), "force-push is forbidden"),
    (re.compile(r"\bgit\s+reset\s+--hard\b"), "hard reset is forbidden"),
    (re.compile(r"\bgit\s+branch\s+-D\b"), "force-deleting a branch is forbidden"),
    (re.compile(r"\bgit\s+push\b.*--delete\b"), "deleting a remote branch is forbidden"),
    (
        re.compile(r"\bgit\s+push\b(?!.*(--force|-f\b))[^|;&]*\b(origin\s+)?(main|master)(?![\w-])"),
        "direct push to main/master is forbidden — use a feature branch and a PR",
    ),
    (re.compile(r"\brm\s+-rf\s+/(\s|$)"), "rm -rf on a filesystem root is forbidden"),
]


def decide(command: str) -> dict:
    for pattern, reason in DENY_PATTERNS:
        if pattern.search(command):
            append_entry(hook="guard_bash", tool="Bash", command=_truncate_for_log(command), decision="deny", reason=reason)
            return {
                "hookSpecificOutput": {
                    "hookEventName": "PreToolUse",
                    "permissionDecision": "deny",
                    "permissionDecisionReason": reason,
                }
            }
    return {}


def _truncate_for_log(command: str, limit: int = 300) -> str:
    return command if len(command) <= limit else command[:limit] + f"... [truncated, {len(command)} chars]"


def main() -> None:
    try:
        payload = json.load(sys.stdin)
    except json.JSONDecodeError:
        print(json.dumps({}))
        return

    if payload.get("tool_name") != "Bash":
        print(json.dumps({}))
        return

    command = payload.get("tool_input", {}).get("command", "")
    print(json.dumps(decide(command)))


if __name__ == "__main__":
    main()
