---
name: plan-update
description: Update an active or backlog implementation plan without executing it. Use when Codex is asked to revise plan scope, task status, risks, verification, lessons, or promotion guidance while preserving backlog/active/completed lifecycle boundaries.
---

# Plan Update

Use this skill for plan maintenance only. Do not implement code, activate
backlog work, or archive completed work from this skill.

## Workflow

1. Resolve the referenced plan. If none is referenced, infer one only when the
   user intent and active/backlog plan context identify exactly one plan.
2. Read `AGENTS.md`, `.agents/workflow.md`, `_docs/README.md`, relevant
   design docs, and the target plan section. Read completed plans only for
   relevant historical decisions, regressions, or migrations.
3. Classify the plan location as active, backlog, or completed and state that
   classification before editing.
4. Apply the smallest plan-only edit that matches the user request: clarify
   scope, refine tasks, update status, record risks, add verification, capture
   lessons, or update promotion-to-design notes.
5. Preserve lifecycle boundaries: do not move plans between active, backlog,
   and completed locations unless the user explicitly requested that transition
   and the matching transition skill applies.
6. Run targeted document verification, usually `git diff --check` for the
   changed plan and any touched workflow docs.
7. Report files changed, verification, documentation impact, skipped checks,
   and whether escalation was needed.

## Guardrails

- Stop when the requested update would authorize backlog implementation,
  archive incomplete work, or make a product/security/data-safety decision not
  already supported by the plan or design docs.
- Keep execution history in plans and stable current-state truth in
  `_docs/design`.
- Preserve unrelated worktree changes.
