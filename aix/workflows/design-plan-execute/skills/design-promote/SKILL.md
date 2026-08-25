---
name: design-promote
description: Transfer accepted durable behavior from a completed implementation plan into the appropriate stable design documentation. Use when a user asks to document or promote plan intent.
---

# Design Promote

Promote accepted current-state behavior, not speculative plan intent or
execution history.

## Role Collaboration

`design-promote` owns the promotion decision, stable documentation edits, and
user-facing handoff. Roles can supply bounded specialist judgment, but they do
not authorize new design truth or promote behavior that has not been
implemented and accepted.

When `.agents/roles/technical-architect.md` exists and the completed work
changed architecture-sensitive behavior, use `delegate-to-role` or a
prompt-overlay delegation to request bounded architecture-promotion input.
Good triggers include system shape, component boundaries, module ownership,
runtime contracts, integration choices, data flow, persistence,
package-management behavior, workflow lifecycle behavior, or maintainability
tradeoffs.

Fold returned evidence into the stable design update, related-doc placement,
boundary and invariant language, retained follow-up gaps, or promotion report
as appropriate. Do not require `technical-architect` for direct use. If the
role is unavailable or the host cannot delegate, continue promotion yourself by
checking the same architecture-sensitive current-state concerns. Do not use the
role to introduce speculative future behavior into `_docs/design`.

## Workflow

1. Read the completed or substantially completed plan and identify decisions
   that are now true in the codebase.
2. Inspect the design index and ownership rules in `_docs/README.md` and
   `_docs/design/README.md`.
3. Update the smallest appropriate design, quality, operations, product, or
   workflow document and its index links when needed. When a new design
   document is needed, use `$design-create` so placement, template use, and
   index links stay consistent.
4. Remove ambiguity about what is current behavior versus future follow-on
   work.
5. Report promoted documents, retained historical details, and any gaps that
   prevent promotion.

## Guardrails

- Do not promote unimplemented, rejected, or explicitly future behavior.
- Do not duplicate an entire plan in the design directory.
- Keep execution status, migration history, and lessons in the plan or
  workflow guidance where they belong.
- Resolve `design-doc.md` from `.agents/templates/design-doc.md` first, then
  from the active workflow origin. If neither exists, keep the new design doc
  small and report the missing template.
