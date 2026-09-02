---
name: kanban-execute
description: Implement one Ready or In Progress Kanban work item, update its state and evidence, run targeted verification, and move it to Review or Blocked.
metadata:
  type: skill
version: "1"
---

# Kanban Execute

Use this skill for one implementation item. Keep the work small and tied to the
selected Kanban item.

## Workflow

1. Resolve the selected item from the user's prompt, the state directories, or
   the first pullable item in `_docs/kanban/ready/`.
2. Read `AGENTS.md`, `.agents/workflow.md`, relevant project docs, the selected
   item, related source and test files, and current worktree status.
3. Classify the request as Kanban execution before editing.
4. Confirm the item is `Ready` or `In Progress`. If it is `Backlog`, stop unless
   the user explicitly authorizes starting it and readiness is satisfied. If it
   is `Blocked`, stop until the blocker is resolved.
5. Move the item file to `_docs/kanban/in-progress/`, set
   `Status: In Progress`, update the `Updated` field, and append a
   `State History` row before implementation when the item was `Ready`.
6. Implement the smallest coherent change that satisfies the item.
7. Run targeted verification first. Add broader checks when the changed surface
   is shared, risky, or user-facing.
8. Update the item with implementation notes, verification evidence, changed
   files, and residual risks.
9. Move the item file to `_docs/kanban/review/` when implementation and
   targeted verification are complete. Move it to `_docs/kanban/blocked/` when
   a decision, dependency, environment issue, or failed check prevents
   completion. Update `Status`, `Updated`, and `State History`.
10. Report files changed, verification performed, item state, and remaining
    risks.

## Guardrails

- Execute only one item unless the user explicitly requests a larger batch.
- Preserve unrelated worktree changes.
- Do not mark the item `Done`; route closeout through review and completion.
- Stop on scope expansion, unclear safety-sensitive behavior, or failed
  verification that needs diagnosis.
