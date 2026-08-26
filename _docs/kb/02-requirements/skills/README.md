# Standalone Skill Requirements

This directory records requirements for standalone skills bundled with AIX.
Workflow-owned skill requirements live with their workflow requirements under
`../workflows/`.

## Documents

- [Discover skill](discover-skill.md): requirements for the standalone bundled
  `discover-skill` activated by default during `aix init`.

Use this area for skill-level requirements: trigger behavior, required inputs,
outputs, safety boundaries, artifact ownership, stop conditions, and acceptance
signals for bundled skills that are installed independently of a workflow.
Keep core packaging, activation, lockfile, and drift requirements in
[system requirements](../system-requirements.md).
