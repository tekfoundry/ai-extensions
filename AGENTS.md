# AGENTS.md

This file is the repo-specific entrypoint for AI coding agents working in
`aix`. Keep project-specific facts and constraints here.

## Read Order

1. Read this file first.
2. Read any appended managed sections below.

## Project Snapshot

`aix` is the CLI for AI Extensions, a package-manager-style tool for managing
AI-agent extensions in software projects.

The CLI command is `aix`. Common commands include:

```bash
aix skills add
aix skills remove
aix skill activate
aix skill deactivate
aix verify
aix status
```

The package is implemented in TypeScript on Node.js and distributed as a scoped
npm package while installing the short `aix` binary.

## Repository Map

- `aix/`: bundled AI Extension assets shipped by the package
- `src/`: TypeScript CLI source
- `tests/`: Node test suite
- `bin/aix.js`: executable CLI entrypoint
- `package.json`: npm package metadata, scripts, dependencies, and binary
  mapping

## Current Design Priorities

1. Provide package-manager-style commands for project-local AI assets.
2. Install skills with natural names by default.
3. Detect naming collisions clearly and require explicit aliases.
4. Lock resolved Git commits and installed file hashes.
5. Refuse to overwrite local edits silently.
6. Keep the MVP focused on Git-backed sources and project-local installs.

## Repo-Specific Safety Rules

- Preserve user-authored files and unrelated worktree changes.
- Treat lockfile writes, skill installs, updates, aliases, and removals as
  safety-sensitive because they can overwrite project-local agent behavior.
- Never silently overwrite local edits in `.agents/skills`.
- Do not add registry, plugin-package, global-install, or publishing behavior
  to the MVP unless approved project documentation explicitly authorizes it.
- Prefer `npm run build` and `npm test` for broad verification. Use targeted
  tests first when the change is narrow.

<!-- aix:workflow design-plan-execute start -->
## AI Agent Workflow

Read `.agents/README.md` for the reusable process router.
Read `.agents/workflow.md` before substantial implementation work.
Read `.agents/engineering-best-practices.md` for agent-facing engineering guidance.

Use root `AGENTS.md` for repo-specific project facts, commands, and safety rules.
Use `_docs/design/README.md` for current design intent when it exists.
Use `_docs/plans/` for active implementation plans and `_docs/plans/backlog/` for backlog plans.

Treat `.agents/` as package-managed workflow content and `_docs/` as project-owned documentation.

Repository-local skills live under `.agents/skills/`. When a task invokes a skill, read that skill's `SKILL.md` and follow it.
<!-- aix:workflow design-plan-execute end -->
