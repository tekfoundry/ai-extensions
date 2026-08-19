# ASM

ASM is Agent Skills Manager, a small package-manager-style CLI for managing
AI-agent skills inside software projects.

The goal is simple: let a project declare the agent skills it depends on,
install them into `.agents/skills`, lock exact versions, update them
intentionally, and refuse to overwrite local edits silently.

ASM is early. The repository currently contains the product design and the
default workflow skills that ASM should eventually install for new projects.

## Why this exists

AI-agent skills are useful across tools like Codex, Cursor, Claude, and other
coding agents, but project-local skill management is still mostly manual.

ASM aims to make skills feel closer to normal project dependencies:

- declare skills in a manifest
- resolve skills from Git sources
- install them into a predictable project-local directory
- lock resolved commits and installed file hashes
- detect local drift before updates
- fail clearly on naming collisions
- keep package-managed agent files separate from project-owned docs

## Planned CLI

The command will be `asm`.

```bash
asm install
asm update
asm diff
asm verify
asm list <source>
```

Later commands may include:

```bash
asm add <source>/<path>
asm remove <source>/<path>
asm outdated
```

The npm package is expected to be scoped because the unscoped `asm` package
name is already taken:

```bash
npm install -g @tekfoundry/asm
```

Users would still run the short command:

```bash
asm install
```

## Project layout

ASM separates package-managed agent files from project-owned documentation.

```text
.agents/
  README.md
  workflow.md
  engineering-best-practices.md
  skills/
    <installed-skill>/
      SKILL.md

_docs/
  design/
  plans/
```

`.agents/` is package-managed agent process structure.

`_docs/` belongs to the project. ASM may create the initial folders, but it
should not routinely rewrite project documentation.

## Default sources

ASM should start with these default sources:

- `asm`: bundled workflow skills from this repository, installed by default
- `mattpocock`: `https://github.com/mattpocock/skills.git`, path `skills`
- `cursor-pstack`: `https://github.com/cursor/plugins.git`, path `pstack/skills`

External sources should be discoverable without automatic installation:

```bash
asm list mattpocock
asm list cursor-pstack
```

Specific skills from those sources should install only after an explicit
command:

```bash
asm install cursor-pstack/tdd
asm install mattpocock/engineering/typescript
```

## Bundled skills

This repository includes the first default ASM workflow skills under
`.agents/skills`.

Current bundled skills:

- `project-init`
- `design-promote`
- `phase-execute`
- `plan-activate`
- `plan-complete`
- `plan-create`
- `plan-defer`
- `plan-execute`
- `plan-review`
- `plan-update`
- `task-execute`
- `work-verify`

The local `unslop` skill is included in this repository for use while building
ASM. It is attributed in its own `SKILL.md` file.

## Design docs

The current design lives in `_docs/design`.

- [_docs/design/README.md](_docs/design/README.md): design index
- [_docs/design/overview.md](_docs/design/overview.md): product goal and implementation direction
- [_docs/design/cli.md](_docs/design/cli.md): command name, distribution, and command surface
- [_docs/design/package-management.md](_docs/design/package-management.md): manifest, lockfile, install flow, drift protection, and naming
- [_docs/design/bundled-skills.md](_docs/design/bundled-skills.md): default sources and bundled skills

## Implementation direction

The MVP should be built in TypeScript on Node.js.

That keeps JSON manifests, lockfiles, front matter parsing, hashing, Git
subprocesses, filesystem copying, and npm distribution straightforward.

The first implementation should focus on Git-based sources only. Registry
support, plugin-package support, dependency resolution, global installs, and
publishing workflows can come later.

## Status

This project is in design and bootstrap mode. The CLI is not implemented yet.
