# Workflow Template Publishing

## Status

🟨 Active

## Context

Describe why the work matters, what prompted it, and what repository or product
facts shape the work.

Reviewed context:

- `AGENTS.md`
- `.agents/README.md`
- `.agents/workflow.md`
- `_docs/README.md`
- `_docs/kb/README.md`

## High-Level Goal (status: accepted)

State the agreed outcome in terms of what should change and why that change
matters.

## Design Intent (status: accepted)

Capture the accepted implementation direction, ownership boundaries,
interfaces, tradeoffs, safety posture, and verification expectations.

## Non-Goals

- No arbitrary template scripting.

## Boundaries And Invariants

- Published templates must not overwrite local edits.

## Implementation Phases

### Phase 1: Origin Templates (status: completed)

Goal: Define workflow-owned artifact templates.

Tasks:

- ✅ Create the initial `plan.md` origin template.
- ✅ Create reusable section templates.

Verification:

- `npm run build` passed.

Documentation impact:

- Architecture and decisions docs may need template coverage.

Execution notes:

- 2026-08-23: Added document and section templates.
  Verification: `npm run build` passed.

### Phase 2: Template Commands (status: completed)

Goal: Expose editable workflow templates.

Tasks:

- ✅ Add CLI routing for `aix templates list`.
- ⬜️ Review published template docs.

Verification:

- `node --test tests/templates.test.mjs` passed.

Documentation impact:

- Operations docs should mention template commands.

Execution notes:

- 2026-08-23: Added list, publish, diff, and reset commands.
  Verification: `npm test` passed.

## Open Questions / Decisions

- None.

## Documentation Impact

- Product: None.
- Requirements: None.
- Architecture: Template resolution behavior.
- Security: Local edit safety.
- Quality: Template verification coverage.
- Operations: Template publish/reset commands.
- Decisions: Template ownership boundary.
- Glossary: None.

## Product Readiness

- Readiness: internal-use-ready
- Evidence needed: Template commands render and verify locally.

## Operator Closeout Summary

- What changed: Workflow templates can be published and reset.
- Important boundaries: Published overrides remain project-owned.
- Data touched: Template Markdown files only.
- Failure modes: Missing sections or stale placeholders fail verification.
- Evidence: `node --test tests/templates.test.mjs` passed.
- Unverified areas: Manual workflow update review.
- Manual inspection needs: Developer review before archive.

## Risks

- Template drift must be visible during review.

## Security Review

- Status: completed
- Scope reviewed: Template publishing and local override safety.
- Findings: No blocking findings.
- Blocking findings converted to plan tasks: None.
- Residual risk: Published templates may drift and need review.

## Lessons To Carry Forward

- Shared workflow artifacts are the right template boundary.

## Completion Checklist

- ⬜️ Confirm every task and success goal is complete or explicitly deferred.
- ⬜️ Human validation: developer evaluated the completed phased work and accepted it, or explicitly waived manual validation with a recorded reason.
- ⬜️ Run or review required targeted and repository verification.
- ⬜️ Complete Security Review after all implementation phases; record findings, convert blocking findings into normal plan tasks, and document residual risk.
- ⬜️ Review the codebase using `$code-review-refactor`; refactor or record follow-up work if needed.
- ⬜️ Promote accepted durable behavior into `_docs/kb` using `$design-promote`.
- ⬜️ Review documentation structure, formatting, and links using `$review-and-refresh-docs`; fix issues or record follow-up work.
- ⬜️ Record final risks, follow-on work, and documentation impact.
- ⬜️ Harvest reusable lessons and update workflow guidance when appropriate.
- ⬜️ Archive under `_docs/plans/completed/YYYY-MM-DD-<name>.md`.
