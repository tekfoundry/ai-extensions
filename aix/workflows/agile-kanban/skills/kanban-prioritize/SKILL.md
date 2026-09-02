---
name: kanban-prioritize
description: Review Kanban backlog items, identify priority and readiness, and move only clear unblocked items to the Ready state directory without implementing them.
metadata:
  type: skill
version: "1"
---

# Kanban Prioritize

Use this skill to review backlog items, order them, and select items that are
ready to pull. This is planning work, not implementation.

## Workflow

1. Read `AGENTS.md`, `.agents/workflow.md`, `_docs/kanban/backlog/`,
   `_docs/kanban/ready/`, relevant backlog items, and current worktree status.
2. Classify the request as Kanban planning before editing.
3. Evaluate each candidate item for impact, urgency, dependency order, size,
   risk, verification clarity, and blocker status.
4. Update item priority fields or notes when the project uses them.
5. Move only ready item files from `_docs/kanban/backlog/` to
   `_docs/kanban/ready/`. Keep vague, blocked, or oversized items in
   `backlog/` and record why.
6. For each moved item, set `Status: Ready`, update the `Updated` field, and
   append a `State History` row.
7. Report the ready queue, blocked or unclear items, and the recommended next
   item to pull. Generate the queue from the state directories.

## Readiness Checklist

An item can move to `Ready` when:

- the outcome is clear
- acceptance criteria are present
- verification is identified
- dependencies are satisfied or explicitly non-blocking
- risk is understood well enough to start
- the item is small enough for focused execution

## Guardrails

- Do not start implementation.
- Do not mark an item `Ready` only because it is important.
- Do not delete low-priority items; leave them ordered in `Backlog`.
- Ask for a decision when prioritization depends on product judgment the repo
  cannot reveal.
