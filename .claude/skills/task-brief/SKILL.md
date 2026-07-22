---
name: task-brief
description: Formats a fetched Linear/Notion task into a standard implementation brief (goal, acceptance criteria, constraints, out of scope). Use right after fetching a task via task-sync, before handing it off to implementer.
---

Given raw task data (title, description, comments, labels), produce a structured brief:

## Goal
One or two sentences: what needs to change and why.

## Acceptance criteria
Bullet list, only criteria explicitly stated in the source task.

## Constraints / non-negotiables
Anything the task or its comments explicitly call out as required or forbidden.

## Out of scope
Anything adjacent that the task does *not* ask for — call this out explicitly
so `implementer` doesn't over-reach.

Rules:

- Only include acceptance criteria explicitly stated in the source task — never invent requirements to fill out the brief.
- If constraints conflict (e.g. a comment contradicts the description), flag the conflict in the brief rather than silently picking one.
- Keep the whole brief under ~200 words — this is a working handoff to another agent, not documentation.
