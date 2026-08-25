## Agile Kanban Workflow

Read `.agents/README.md` for the Kanban process router.
Read `.agents/workflow.md` before creating, moving, or executing work items.
Read `.agents/engineering-best-practices.md` before implementation work.

Use `_docs/kanban/<state>/` directories as the board source of truth:
`backlog`, `ready`, `in-progress`, `review`, `blocked`, and `done`.
Move work item files between those directories when state changes.

Treat `.agents/` as package-managed workflow content and `_docs/kanban/` as
project-owned delivery records. Generate board summaries from the directory
tree when needed; do not maintain a separate board file as source of truth.

Repository-local skills live under `.agents/skills/`. When a task invokes a
skill, read that skill's `SKILL.md` and follow it.
