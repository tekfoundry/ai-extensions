# Agile Kanban Workflow

This workflow helps an AI coding agent and developer manage software work using
a lightweight Kanban directory tree stored in the repository.

## Core Files

Use state directories under `_docs/kanban/` as the board source of truth:

```text
_docs/kanban/backlog/
_docs/kanban/ready/
_docs/kanban/in-progress/
_docs/kanban/review/
_docs/kanban/blocked/
_docs/kanban/done/
```

Each work item lives in exactly one state directory. Its `Status` value must
match its containing directory. If they disagree, stop and ask whether to repair
the file metadata or the directory placement.

If the Kanban structure does not exist yet, create only the missing directories
and files needed for the current request. Do not reorganize an existing project
documentation tree unless the user asks.

## Work Item States

Use exactly these lifecycle states in work item front matter or headings:

- `Backlog`: captured, not yet ready to start.
- `Ready`: clarified, sized, unblocked, and available to pull.
- `In Progress`: actively being changed.
- `Review`: implementation is ready for review, testing, or acceptance.
- `Blocked`: waiting on a decision, dependency, environment, or failed check.
- `Done`: accepted and closed.

## Board Rules

Keep the board useful, not ceremonial.

- One work item should have one clear outcome.
- Pull from `Ready`; do not start vague backlog items.
- Keep work in progress small. Prefer finishing an item over starting another.
- Record blockers with the exact decision, dependency, or failure needed to
  unblock the item.
- Move items to `Done` only after verification, review, and documentation
  impact are resolved or explicitly recorded.
- Preserve project-owned work item history.
- Generate board summaries from the directory tree when needed; do not maintain
  a separate board file as source of truth.

## Work Classification

Before editing code or project files, classify the request:

- **Kanban planning:** create, split, clarify, prioritize, or move items without
  implementation.
- **Kanban execution:** implement one `Ready` or `In Progress` item.
- **Kanban review:** inspect an implemented item for defects, risks, missing
  tests, or documentation gaps.
- **Micro-fix:** a narrow fix outside the board may proceed only when the
  project already defines the intended behavior and the change has low blast
  radius.

Backlog and prioritization work is not implementation authorization. Execution
requires a ready item or an explicit developer request for a micro-fix.

## Skill Routing

Use workflow-owned skills when the user names them or when the request clearly
matches their purpose:

- `kanban-create-item`: capture a new backlog item.
- `kanban-prioritize`: order backlog items and select ready work.
- `kanban-execute`: implement one item.
- `kanban-review`: review one item before completion.
- `kanban-complete`: close one reviewed item.

Host projects may also provide optional skills for language-specific testing,
security review, release work, or documentation. Treat those as optional
helpers. This workflow must remain usable without them.

## State Transitions

Allowed forward transitions:

```text
Backlog -> Ready -> In Progress -> Review -> Done
                         |             |
                         v             v
                      Blocked <---------
```

`Blocked` items return to the state they were in when the blocker is resolved,
usually `Ready`, `In Progress`, or `Review`.

When moving an item, move the file to the new state directory, update its
`Status` and `Updated` fields, and append a `State History` row with timestamp,
previous state, new state, user, and notes.

## Execution Loop

For one implementation item:

1. Read `AGENTS.md`, `.agents/workflow.md`, relevant project docs, the Kanban
   state directories, the selected item, and current worktree status.
2. Confirm the item is `Ready` or `In Progress`, or that the user has explicitly
   authorized a micro-fix.
3. Move the item to `in-progress/` before editing when it was in `ready/`.
4. Make the smallest coherent change that satisfies the item.
5. Run targeted verification first, then broader checks only when the changed
   surface calls for them.
6. Move the item to `Review` with evidence, or `Blocked` with the exact blocker.
7. Do not mark the item `Done` until review and closeout criteria are met.

## Closeout Criteria

An item can move to `Done` when:

- the requested behavior or task outcome is implemented
- relevant tests, builds, or manual checks passed, or gaps are recorded
- review findings are resolved or explicitly deferred
- documentation impact is addressed or recorded as not applicable
- no unresolved blocker remains

Keep closeout notes brief and factual.
