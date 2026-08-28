# Workflow guidance

This directory contains workflow-owned guidance for the
`design-plan-execute` lifecycle. Guidance records judgment that is useful
across tasks, roles, and skills. It does not replace the workflow contract,
skill procedures, role contracts, templates, plans, or project knowledge base.

Use `shared.md` for practice that applies across lifecycle activities. Use the
files under `activities/` when a task is centered on a specific kind of work.

Project-owned overrides are intentionally separate. Workflow install reads
these origin files from the active workflow package and does not copy them into
`.agents/guidance/`. A later publish command can create editable overrides in
that project-owned directory.

Instruction priority still matters. User requests, `AGENTS.md`, workflow
rules, skill procedures, role contracts, and safety boundaries outrank this
guidance.
