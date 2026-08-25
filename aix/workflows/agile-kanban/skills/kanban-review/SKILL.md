---
name: kanban-review
description: Review one Kanban item in Review or In Progress for correctness, tests, risks, maintainability, and documentation gaps before completion.
---

# Kanban Review

Use this skill to review one implemented item. Lead with concrete findings and
keep the review tied to the item outcome.

## Workflow

1. Resolve the selected item from the prompt, state directories, or active work
   context.
2. Read `AGENTS.md`, `.agents/workflow.md`, `.agents/engineering-best-practices.md`,
   the selected item, changed files, relevant tests, and current worktree
   status.
3. Classify the request as Kanban review.
4. Confirm the item is `Review` or `In Progress`. If implementation has not
   occurred, report that there is nothing ready to review.
5. Inspect the implementation against the item outcome and acceptance criteria.
6. Run or recommend targeted verification when evidence is missing and running
   it is safe.
7. If the item was still in `_docs/kanban/in-progress/`, move it to
   `_docs/kanban/review/`, set `Status: Review`, update the `Updated` field,
   and append a `State History` row before recording review findings.
8. Update the item with review findings, test gaps, documentation impact, and
   required fixes.
9. Leave the item in `review/` when follow-up is needed. Move it to
   `_docs/kanban/blocked/` only when a blocker prevents progress, and append a
   `State History` row.
10. Report findings first, ordered by severity. If there are no findings, say so
   clearly and name any residual risk.

## Review Focus

Check for:

- incorrect or incomplete behavior
- regressions in adjacent flows
- missing tests or weak verification
- unclear data or file safety
- unnecessary complexity
- documentation that no longer matches behavior
- work that exceeded the item scope

## Guardrails

- Do not mark the item `Done`; use `kanban-complete` for closeout.
- Do not rewrite implementation during review unless the user explicitly asks
  for fixes as part of the review.
- Do not hide failed checks inside a positive review.
