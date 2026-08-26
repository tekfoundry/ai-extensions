# Agile Kanban Skill Requirements

These are requirements for skills owned by the bundled `agile-kanban`
workflow. They manage project-local Markdown work items under `_docs/kanban/`.

## Cross-Skill Requirements

- Kanban skills must treat `_docs/kanban/` as project-owned work history.
- Work items must move through explicit state directories: `backlog`, `ready`,
  `in-progress`, `review`, `blocked`, and `done`.
- Each skill must preserve work item history, verification notes, acceptance
  criteria, risks, and documentation-impact notes.
- Skills must stop when the selected work item is missing, ambiguous, in the
  wrong state, blocked by an unresolved decision, or unsafe to modify.
- Direct standalone deactivation must be refused for workflow-owned Kanban
  skills.

## Skill Requirements

- `kanban-create-item` must create or refine one lightweight work item in
  `_docs/kanban/backlog/` from user intent.
  Acceptance signals: the item records outcome, scope, acceptance criteria,
  risks, verification notes, and initial state history without starting
  implementation.

- `kanban-prioritize` must review backlog items and move only clear, unblocked
  items to `_docs/kanban/ready/`.
  Acceptance signals: priority and readiness are recorded; blocked or unclear
  items do not move to Ready without enough information.

- `kanban-execute` must implement one Ready or In Progress item.
  Acceptance signals: the item moves to In Progress while implementation is
  active, targeted verification is run or recorded as blocked, and the item
  moves to Review or Blocked when execution stops.

- `kanban-review` must review one item in Review or In Progress for
  correctness, tests, risks, maintainability, and documentation gaps.
  Acceptance signals: findings and required fixes are recorded before
  completion is allowed.

- `kanban-complete` must close one reviewed item by confirming acceptance
  criteria, verification, documentation impact, unresolved risks, and movement
  to Done.
  Acceptance signals: the item moves to `_docs/kanban/done/` only after
  completion evidence is recorded.

## Acceptance Criteria

- `aix workflow install aix/workflows/agile-kanban` activates the Kanban skills
  through workflow ownership.
- `aix verify` detects missing or changed workflow-owned active skill files.
- `aix skill deactivate <kanban-skill>` fails with workflow ownership guidance.
- Work item source of truth remains the state-directory file location, not a
  generated board summary.
