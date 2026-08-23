# AI Extensions Skills

This directory is reserved for default bundled skills that are not owned by a
workflow.

Default bundled skills:

- `discover-skill`: finds installable software-development skills from a
  natural-language request and guides installation through `aix` commands.
  It searches configured sources and `known-sources.json` first, asks before
  broadening to unreviewed GitHub or internet results, presents review links
  and unsafe-flag notes, and waits for `confirm install #` before running
  install commands.

Workflow-owned lifecycle skills live under
`aix/workflows/design-plan-execute/skills`.
