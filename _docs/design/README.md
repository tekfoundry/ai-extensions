# AI Extensions Design Index

This directory contains stable design intent for AI Extensions.

Start here, then follow the topic documents for the level of detail needed.

## Documents

- [Overview](overview.md): product goal, ownership model, and implementation
  direction.
- [CLI](cli.md): command name, npm distribution, and command surface.
- [Package Management](package-management.md): manifest, lockfile, source
  package flow, activation, drift protection, and skill naming.
- [Workflows](workflows.md): workflow packages, install flow, workflow-owned
  skills, and `.agents` process docs.
- [Bundled Skills](bundled-skills.md): default workflow skills included with AI Extensions.

## Current MVP Shape

AI Extensions is a small package-manager-style CLI for managing AI assets
inside software projects. The MVP starts with agent skills and one installable
agent workflow.

The MVP focuses on Git-based skill sources, project-local skill packages under
`.agents/packages/skills`, explicit `add/remove` source management,
`activate/deactivate` skill workflows, lockfile integrity, collision detection,
local drift protection, an installable workflow package for `.agents` process
docs, templates, workflow-owned skills, and a short `aix` command surface.
