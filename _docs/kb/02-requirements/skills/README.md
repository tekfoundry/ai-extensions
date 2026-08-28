# Standalone Skill Requirements

This directory records requirements for standalone skills bundled with AIX.
Workflow-owned skill requirements live with their workflow requirements under
`../workflows/`.

## Documents

- [Discover skill](discover-skill.md): requirements for the standalone bundled
  `discover-skill` activated by default during `aix init`.
- [Get guidance](get-guidance.md): requirements for the optional standalone
  bundled `get-guidance` resolver skill.

Use this area for skill-level requirements: trigger behavior, required inputs,
outputs, safety boundaries, artifact ownership, stop conditions, and acceptance
signals for bundled skills that are installed independently of a workflow.
Keep core packaging, activation, lockfile, and drift requirements in
[system requirements](../system-requirements.md).

## Standalone Bundled Skill Boundaries

Standalone bundled skills should stay project-agnostic. The current bundled
standalone skill set contains `discover-skill` and `get-guidance`; workflow
lifecycle skills live under their owning workflow, not under `aix/skills`.

Skills that depend on a specific application's build scripts, release flow,
runtime stack, deployment target, or operational policy are intentionally not
part of the default standalone skill set. For example, a generic
`release-build` skill is not bundled as a default AIX skill because release
processes vary by project.
