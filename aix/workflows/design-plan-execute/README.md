# Agent Process

`.agents/` owns reusable AI-agent process structure for this repository:
workflow rules, engineering guidance for agents, and reusable workflow skills.

`_docs/` owns project knowledge only: stable design intent, product documents,
analysis, active/backlog/completed plans, and project-specific lessons.

## Process Sources

- [Workflow](workflow.md): reusable agent lifecycle, work classification,
  planning, verification, and completion rules.
- [Engineering best practices](engineering-best-practices.md): reusable
  agent-facing engineering guidance.
- [Skills](skills/): reusable workflow skills for plan and task lifecycle work.
  Use `project-init` for documentation scaffolding and the plan/task skills for
  implementation lifecycle work.

Start with the root [`AGENTS.md`](../AGENTS.md) for repo-specific instructions,
then use this router for reusable process guidance and [`_docs/README.md`](../_docs/README.md)
for project knowledge when that router exists.
