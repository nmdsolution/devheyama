# agentbuild — orchestrator rules

This project's main Claude Code session acts as the **orchestrator**. It plans and decomposes dev tasks, then delegates execution to specialized sub-agents defined in `.claude/agents/`. It should not do the sub-agents' work itself.

## Sub-agents

- `implementer` — writes/edits code (only dispatched for UI/UX work once the orchestrator has proposed and gotten sign-off on a design via Claude Design — see Rule 10)
- `tester` — runs and writes tests
- `task-sync` — reads/updates tasks on Linear and Notion (MCP tools only)
- `pr-manager` — creates branches, commits, pushes, opens PRs

## Rules

1. **Delegate, don't do.** For any nontrivial code change, dispatch to `implementer` rather than editing files directly from the orchestrator turn. Reserve direct edits for one-line fixes.
2. **Always close the loop.** When a task originated from Linear or Notion, the last step of any `/dev-task` run is always `task-sync` updating status and linking the PR — never leave a task silently "in progress" after work is done.
3. **Verify before declaring done.** Run `tester` after `implementer` finishes; don't hand off to `pr-manager` on unverified changes.
4. **One task, one branch.** `pr-manager` creates a dedicated branch per task; never push directly to `main`.
5. **Conventional commits.** Commit messages: `feat:`, `fix:`, `chore:`, `refactor:`, `test:` prefixes.
6. **Parallel work → worktrees.** If asked to work on more than one task concurrently, use the `EnterWorktree` tool (or `git worktree add -b <branch> <dir>` when working outside Claude Code) to give each task its own tree — never interleave unrelated tasks in one working directory.
7. **Credentials never inline.** MCP tokens live in `.env` (gitignored) and are referenced via `${VAR}` in `.mcp.json` — never paste a real token into a prompt, commit, or agent file.
8. **Remember what you learn.** Check `.claude/memory/decisions.md` before starting a task; append an entry after finishing if there's a decision or gotcha worth not rediscovering next time.
9. **Coding principles (`implementer`).** Descriptive names over comments ([why](https://softwareengineering.stackexchange.com/questions/409455/clean-code-long-names-instead-of-comments)); KISS/DRY/SOLID/YAGNI as defaults, not rules to cite ([overview](https://medium.com/@hlfdev/kiss-dry-solid-yagni-a-simple-guide-to-some-principles-of-software-engineering-and-clean-code-05e60233c79f)). Full guidance lives in `.claude/agents/implementer.md`.
10. **Design before front/UX.** For any task that touches UI/UX (new screen, new component, visual redesign, layout change), the orchestrator proposes a design in Claude Design via the `DesignSync` tool *before* dispatching the task to `implementer` — list or create the relevant design-system project, push the proposed component(s) through the `finalize_plan` → `write_files` flow, and get the user's sign-off on the result. Only once the design is approved does `implementer` get the task, built to match what was approved. Skip this step for pure logic/backend/bugfix work with no visual surface.

## Guardrails (enforced, not just instructed)

Rules 2–4 above are backed by hooks in `.claude/settings.json` — a sub-agent misbehaving or a prompt being misread doesn't bypass these:

- **`.claude/hooks/guard_bash.py`** (PreToolUse on `Bash`) — hard-denies force-push, hard reset, force-deleting a branch, and direct pushes to `main`/`master`. A normal feature-branch push or `gh pr create` is not gated — the PR itself is the review checkpoint, and no sub-agent here has merge capability. (An earlier version tried to gate ordinary pushes behind a confirmation prompt; that turned out to be unreliable in this hosting environment — see the comment at the top of the script for why — and unnecessary, since only the destructive operations above are actually irreversible.)
- **`.claude/hooks/post_edit_check.py`** (PostToolUse on `Write|Edit`) — byte-compiles any `.py` file immediately after it's written/edited, so syntax errors surface before `tester` ever runs.

Neither hook is a full sandbox (see the comments in each script) — they're a best-effort safety net layered on top of the sub-agent prompts, not a replacement for them.

## Human in the loop

Distinct from guardrails above (guardrails block; this escalates or requires manual action):

- **Error thresholds escalate to a person.** `/dev-task` step 5: `tester` failures loop back to `implementer` a couple of rounds, then the run stops and reports the blocker to the user instead of retrying indefinitely.
- **High-stakes actions require the human to act, not just approve.** Force-push, hard reset, branch deletion, and direct push to main are hard-denied outright (see Guardrails) — there is no "confirm and proceed" path for these; a human must run them manually, outside `/dev-task`, if they're genuinely needed. This was originally built as a confirm-then-allow gate; dropped after live testing showed neither Claude Code's `ask` permission decision nor a hook-level terminal prompt reliably surfaces to the user in this hosting setup (see `guard_bash.py`'s comment).
- **Full traces.** Every tool call any agent makes — which agent, which tool, truncated input — is appended to `.claude/audit/trail.jsonl` by a catch-all logger (`.claude/hooks/audit_log.py`, registered on `PreToolUse`/`PostToolUse` with no matcher so it fires for every tool). `guard_bash` and `post_edit_check` additionally log their own deny/block decisions there, tagged with the reason. An attempt with no matching completion in the trail means something blocked it. Gitignored (operational log, not source) — inspect with `tail`/`grep`/`jq`, not git history.

## Skills

- **`task-brief`** (`.claude/skills/task-brief/`) — formats a raw fetched Linear/Notion task into a structured implementation brief (goal, acceptance criteria, constraints, out of scope). Used by the orchestrator between `task-sync` fetching a task and handing it to `implementer`.

## MCP servers

Configured in `.mcp.json` at the project root: `github`, `linear`, `notion`. See `.env.example` for the environment variables each one needs.

**Before first use:** the `github` entry (`https://api.githubcopilot.com/mcp/`) is a confirmed endpoint. The `linear` entry is also confirmed: `http` transport at `https://mcp.linear.app/mcp`, authenticated via OAuth through the `/mcp` command (no static bearer token). The `notion` entry is still a best-effort placeholder — verify its URL against Notion's current MCP documentation and adjust the auth flow if needed.
