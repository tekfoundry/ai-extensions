# AI Extensions

AI Extensions is a small package-manager-style CLI for managing AI-agent
extensions inside software projects. The first extension type is agent skills.

The goal is simple: let a project declare the agent skills it depends on,
install them into `.agents/skills`, lock exact versions, update them
intentionally, and refuse to overwrite local edits silently.

AI Extensions is early. The repository currently contains the product design
and the default workflow skills that `aix` should eventually install for new
projects.

## Why this exists

AI-agent skills are useful across tools like Codex, Cursor, Claude, and other
coding agents, but project-local skill management is still mostly manual.

AI Extensions aims to make agent extensions feel closer to normal project
dependencies:

- declare skills in a manifest
- resolve skills from Git sources
- install them into a predictable project-local directory
- lock resolved commits and installed file hashes
- detect local drift before updates
- fail clearly on naming collisions
- keep package-managed agent files separate from project-owned docs

## Planned CLI

The command will be `aix`.

```bash
aix install
aix update
aix diff
aix verify
aix list <source>
```

Later commands may include:

```bash
aix add <source>/<path>
aix remove <source>/<path>
aix outdated
```

The npm package is expected to be scoped so the project can publish under a
clear owned namespace:

```bash
npm install -g @tekfoundry/aix
```

Users would still run the short command:

```bash
aix install
```

## Project layout

AI Extensions separates package-managed agent files from project-owned
documentation.

```text
aix/
  skills/
    <bundled-skill>/
      SKILL.md

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

`aix/skills/` is the repository source for the default workflow skills. The
generated `aix.json` points at this path through the remote `aix` Git source.

`.agents/` is the local installed agent process structure for this repository.

`_docs/` belongs to the project. AI Extensions may create the initial folders,
but it should not routinely rewrite project documentation.

## Default sources

AI Extensions should start with these default sources:

- `aix`: `https://github.com/tekfoundry/ai-extension.git`, path `aix/skills`,
  ref `master`
- `mattpocock`: `https://github.com/mattpocock/skills.git`, path `skills`
- `cursor-pstack`: `https://github.com/cursor/plugins.git`, path `pstack/skills`

External sources should be discoverable without automatic installation:

```bash
aix list mattpocock
aix list cursor-pstack
```

Specific skills from those sources should install only after an explicit
command:

```bash
aix install cursor-pstack/tdd
aix install mattpocock/engineering/typescript
```

## Bundled skills

This repository includes the first default AI Extensions workflow skills under
`aix/skills`.

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

The `unslop` skill is imported from `cursor-pstack`, not from the `aix` source.

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

This project is in early implementation. The CLI scaffold exists, and command
behavior is being built through the active MVP plan.
