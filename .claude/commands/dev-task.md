---
description: Run a full dev-task workflow — fetch a task from Linear/Notion, implement it, test it, open a PR, and sync status back.
argument-hint: <linear-or-notion-task-reference-or-description>
---

You are orchestrating a complete development task end to end: **$ARGUMENTS**

Before starting, read `.claude/memory/decisions.md` for relevant prior context (past decisions, known gotchas in this repo) that might bear on this task.

Follow this sequence, delegating each step to the named sub-agent via the Agent tool rather than doing the work yourself:

1. **Fetch** — if the argument looks like a Linear or Notion task reference (ID, URL, or title to search for), delegate to `task-sync` to retrieve the full task detail. If it's a plain free-text description with no tracker reference, skip this step and use the argument as the brief directly.
2. **Brief** — if a task was fetched in step 1, use the `task-brief` skill to turn the raw task detail into a structured brief (goal, acceptance criteria, constraints, out of scope).
3. **Plan** — briefly decompose the brief into concrete implementation steps yourself (this is orchestration/synthesis work, appropriate for the main loop).
4. **Implement** — delegate to `implementer` with the concrete plan.
5. **Verify** — delegate to `tester` to run/write tests against the change. If tests fail, loop back to `implementer` with the failure detail (up to a couple of rounds) before giving up and reporting the blocker to the user.
6. **Ship** — once verified, delegate to `pr-manager` to branch, commit, push, and open the PR. (Destructive git operations — force-push, hard reset, branch deletion, direct push to main — are hard-blocked by `.claude/hooks/guard_bash.py` regardless; a normal feature-branch push and PR are not gated further, since the PR itself is the review checkpoint.)
7. **Close the loop** — delegate to `task-sync` to update the source task's status and attach the PR link, if step 1 fetched a tracked task. Skip this step for plain free-text descriptions with no tracker reference.
8. **Remember** — append one short entry to `.claude/memory/decisions.md` (task ref, one-line decision or gotcha, why it mattered). Skip if nothing about this run is worth remembering next time.

Report a concise summary at the end: what was implemented, test results, and the PR link (or task status update, if applicable).
