# Workflow Requirements

This directory records requirements for workflows bundled with AIX.

## Documents

- [Design-plan-execute](design-plan-execute/README.md): requirements for the
  default planning and execution workflow installed by `aix init`.
- [Design-plan-execute skills](design-plan-execute/skills.md): requirements
  for skills owned by the default workflow.
- [Agile Kanban](agile-kanban/README.md): requirements for the bundled
  lightweight Kanban workflow.
- [Agile Kanban skills](agile-kanban/skills.md): requirements for skills owned
  by the bundled Kanban workflow.

Use this area for workflow-level requirements: installed shape, lifecycle
states, required skills, required roles, workflow-owned skill behavior,
template behavior, documentation expectations, and acceptance signals that
belong to a workflow package rather than the core AIX CLI.

Do not put workflow implementation mechanics here when they are really core AIX
package-management requirements. Keep those in
[system requirements](../system-requirements.md).
