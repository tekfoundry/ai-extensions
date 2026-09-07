# Plan Lifecycle Contract

## Status

Accepted current workflow behavior

## Decision

The `design-plan-execute` workflow uses a readable Markdown plan as the
authoritative lifecycle record. Plans become more precise at workflow gates,
and task state transitions preserve evidence without introducing a separate
project-management system. Human approval gates remain explicit; agent-
controlled evidence gates may advance only within accepted scope.

## Current contract

- Routing selects the narrowest procedure or role and preserves plan context;
  it does not grant authority.
- Vision, Design Intent, Plan acceptance, Activation, and Plan Close require
  an explicit Boss approval record.
- Tasks use `⬜️`, `🟨`, `✅`, and `⚠️` for not started, in progress, completed,
  and blocked/follow-up states. Work starts only after `🟨`; completion requires
  implementation and verification evidence.
- Delegated reports are bounded by the section/task assignment. The
  project-manager reconciles them into authoritative plan state, while stale
  or conflicting updates fail closed.
- Backlog plans do not authorize implementation; completed plans remain
  historical records. Adoption is incremental and does not silently migrate
  every existing plan.

## Tradeoffs and limits

This keeps plans human-readable and compatible with existing Markdown editing,
but conventions do not provide runtime atomic mutation, authenticated human
identity, automatic migration, or a transition engine. Those limitations are
residual validation risks, not permissions to weaken approval or evidence
requirements.

## Evidence

- Implementation contract: `.agents/workflow.md`,
  `aix/workflows/design-plan-execute/team.md`, workflow skills, templates, and
  role guidance.
- Verification: `tests/phase2-transition-gates.test.mjs`,
  `tests/phase2-security-contract.test.mjs`,
  `tests/workflow-team.test.mjs`, `tests/roles.test.mjs`,
  `tests/skill-instructions.test.mjs`, and the full suite recorded in
  `_docs/plans/plan-lifecycle-formalization.md`.
- Related architecture: [workflow lifecycle](../03-architecture/workflow-lifecycle.md).
- Related requirements: [design-plan-execute workflow requirements](../02-requirements/workflows/design-plan-execute/README.md).

## Open limitations

No unresolved implementation-versus-intent conflict prevents promotion.
Runtime atomicity and authenticated approval identity remain known gaps.
