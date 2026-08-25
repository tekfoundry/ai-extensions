---
name: kanban-complete
description: Close one reviewed Kanban item by confirming acceptance criteria, verification, documentation impact, unresolved risks, and movement to the Done state directory.
---

# Kanban Complete

Use this skill to close one work item after implementation and review are
complete.

## Workflow

1. Resolve the selected item from the prompt, state directories, or current
   review context.
2. Read `AGENTS.md`, `.agents/workflow.md`, the selected item, review notes,
   verification evidence, and current worktree status.
3. Classify the request as Kanban closeout.
4. Confirm the item is in `Review`. If it is still `Backlog`, `Ready`,
   `In Progress`, or `Blocked`, stop and explain the missing transition.
5. Check closeout criteria:
   - outcome satisfied
   - acceptance criteria met or explicitly deferred
   - relevant verification passed or gaps recorded
   - review findings resolved or explicitly deferred
   - documentation impact addressed or recorded as not applicable
   - no unresolved blocker remains
6. Update the item activity and closeout notes.
7. Move the item file to `_docs/kanban/done/`, set `Status: Done`, update the
   `Updated` field, and append a `State History` row.
8. Report completion evidence and any follow-up items that were intentionally
   left outside scope.

## Guardrails

- Do not close items with unresolved blockers.
- Do not silently drop review findings or verification gaps.
- Create follow-up backlog items for accepted deferrals when they are concrete
  work, but do not create speculative cleanup tasks.
