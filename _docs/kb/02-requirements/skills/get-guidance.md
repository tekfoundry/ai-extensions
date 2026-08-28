# Get Guidance Skill Requirements

`get-guidance` is an optional standalone bundled skill that resolves a bounded
reading list from active role guidance, workflow guidance overrides, workflow
guidance origins, shared guidance, and legacy fallback guidance.

## Actors

- Agent runtime: asks for focused guidance before role, skill, or activity work
  when the runtime already has enough context to make the request specific.
- Project developer: may explicitly ask an agent to resolve guidance for a
  role, skill, activity, and task.
- Reviewer: checks whether the returned reading list is bounded, relevant,
  read-only, and lower priority than repository, workflow, role, skill, and
  safety instructions.

## Installation Requirements

- Existing projects with the default AIX skill source available must be able to
  activate it with `aix skill activate aix/get-guidance`.
- `aix init` does not activate `get-guidance` by default in the current system.
- A future workflow may require automatic activation only after the external
  workflow skill dependency design supports that behavior.

## User Stories

- As an agent runtime, I can provide `requesting_role`, `requesting_skill`,
  `activity`, and `task_context` so that guidance resolution is scoped before
  any files are read.
  Acceptance signals: every field is required, and explicit `none` values are
  accepted when a field does not apply.

- As an agent runtime, I can resolve role, activity, shared, and legacy
  fallback guidance without mutating project files.
  Acceptance signals: the skill returns guidance paths and notes; it does not
  install, activate, publish, reset, update, or edit guidance.

- As a reviewer, I can see missing, unknown, ambiguous, or conflicting guidance
  without treating it as a hidden decision.
  Acceptance signals: unknown activities list available activity names;
  conflicts are reported and higher-priority instructions win.

## Safety Requirements

- Guidance is lower priority than user requests, repository instructions,
  workflow lifecycle rules, skill procedures, role contracts, and safety
  boundaries.
- `applies_to` and `uses_guidance` metadata are advisory hints only.
- Missing guidance must be reported without blocking unless a higher-priority
  workflow or role contract says the guidance is required.
- Default request-entry routing through `get-guidance` is deferred to the
  project-manager plan.

## Acceptance Criteria

- The skill returns no guidance when caller context is missing or too vague.
- The skill returns a bounded reading list rather than dumping all available
  guidance.
- The skill reports no file mutations as part of its normal output.
