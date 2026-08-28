# Agile Kanban Workflow Requirements

`agile-kanban` is a bundled workflow for project-local Markdown Kanban work. It
is installable as an AIX workflow, but it is not the default workflow installed
by `aix init`.

## Actors

- Project developer: creates, prioritizes, executes, reviews, and completes
  small software work items.
- Agent runtime: follows Kanban lifecycle skills and state-directory rules.
- Reviewer: checks a work item before it is accepted as done.
- Workflow maintainer: ships the Kanban workflow docs, skills, templates, and
  managed `AGENTS.md` guidance as one package.

## Installed Shape Requirements

- The workflow manifest must be named `agile-kanban` and titled
  `Agile Kanban`.
- The workflow must install a managed `AGENTS.md` block marked
  `aix:workflow agile-kanban`.
- The workflow must install `README.md` and `workflow.md` as workflow docs
  under `.agents/`.
- The workflow must install workflow-owned Kanban skills from its `skills/`
  directory.
- The workflow must expose `templates/work-item.md` as the work item template.
- The workflow must treat `_docs/kanban/` as project-owned work history.
  Installing or updating the workflow must not rewrite existing work items.

## Board Requirements

- The board source of truth must be the `_docs/kanban/` directory tree.
- The board must support these state directories: `backlog`, `ready`,
  `in-progress`, `review`, `blocked`, and `done`.
- A work item must live in exactly one state directory at a time.
- Work item movement must be explicit and recorded in the item history.
- A separate generated board file must not become the source of truth.

## User Stories

- As a project developer, I can use `kanban-create-item` so that a bug, change,
  or task becomes a Backlog work item without starting implementation.
  Acceptance signals: the item lands in `_docs/kanban/backlog/`, includes
  outcome, acceptance criteria, risks, verification notes, and initial history.

- As a project developer, I can use `kanban-prioritize` so that clear,
  unblocked backlog work moves to Ready.
  Acceptance signals: only items with enough scope, acceptance criteria, and
  verification expectations move to `_docs/kanban/ready/`; unclear or blocked
  work remains in Backlog or moves to Blocked with a reason.

- As a project developer, I can use `kanban-execute` so that one Ready or
  In Progress item is implemented with bounded scope.
  Acceptance signals: the item moves to `_docs/kanban/in-progress/` while work
  is active, verification evidence is recorded, and the item moves to Review or
  Blocked when execution stops.

- As a reviewer, I can use `kanban-review` so that one item in Review or
  In Progress is checked for correctness, tests, risks, maintainability, and
  documentation gaps.
  Acceptance signals: review findings, verification gaps, and required fixes
  are recorded in the item before completion.

- As a project developer, I can use `kanban-complete` so that one reviewed item
  moves to Done only after acceptance criteria, verification, documentation
  impact, and unresolved risks are resolved or explicitly recorded.
  Acceptance signals: the item moves to `_docs/kanban/done/` and preserves
  history, evidence, and residual risk notes.

## Non-Goals

- The workflow must not depend on Jira, Trello, GitHub Projects, Linear, or
  another external planning system.
- The workflow must not maintain a separate board file as source of truth.
- The workflow must not rewrite work item history during workflow install or
  update.
- The workflow must not execute backlog items that have not been moved to
  Ready or In Progress.

## Acceptance Criteria

- `aix workflow install aix/workflows/agile-kanban` installs the local bundled
  workflow when run from the AIX source tree.
- `aix workflow diff`, `aix workflow update`, `aix status`, and `aix verify`
  report Kanban workflow docs, templates, skills, and drift correctly.
- The workflow package includes exactly the Kanban lifecycle skills listed in
  this document unless a later accepted change updates the workflow contract.
