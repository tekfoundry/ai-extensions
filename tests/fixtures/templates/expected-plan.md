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
- `_docs/design/README.md`

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

Execution notes:

- 2026-08-23: Added list, publish, diff, and reset commands.
  Verification: `npm test` passed.

## Open Questions / Decisions

- None.

## Risks

- Template drift must be visible during review.

## Lessons To Carry Forward

- Shared workflow artifacts are the right template boundary.

## Completion Checklist

- ⬜️ Confirm every task and success goal is complete or explicitly deferred.
- ⬜️ Run or review required targeted and repository verification.
- ⬜️ Review the codebase to ensure the code is maintainable and clean; refactor if needed.
- ⬜️ Promote accepted durable behavior into design docs using `$design-promote`.
- ⬜️ Review documentation structure, formatting, and links using `$documentation-review`; fix issues or record follow-up work.
- ⬜️ Record final risks, follow-on work, and documentation impact.
- ⬜️ Harvest reusable lessons and update workflow guidance when appropriate.
- ⬜️ Archive under `_docs/plans/completed/YYYY-MM-DD-<name>.md`.
