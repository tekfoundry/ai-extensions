# AI Extensions Overview

## Goal

Build a small package-manager-style CLI for managing AI assets inside software
projects. The MVP starts with skills and one installable agent workflow.

The tool should let a project declare skill sources, install an agent workflow,
fetch Git sources into a managed local package store, activate selected skills
into the agent-facing skills directory, lock exact resolved versions, update
them intentionally, detect local drift, and avoid accidental overwrites.

## Project Ownership Model

The project separates bundled extension source, package-managed agent process
files, and project-owned documentation:

- `aix/workflows/` is the bundled workflow package source shipped by this
  repository. The default workflow owns reusable `.agents` process docs and
  workflow-local skills.
- `aix/skills/` is reserved for default bundled skills that are not owned by a
  workflow.
- `.agents/` is managed by the skills package manager in consuming projects.
- `.agents/packages/` contains project-local package copies, organized first by
  extension kind. The MVP uses `.agents/packages/skills/<source>/...` for
  active skill packages and should use `.agents/packages/workflows/...` for
  workflow-owned docs and skills.
- `.agents/skills/` contains the active skill set exposed to agents.
- In this repository, `.agents/skills/` remains the local working skill set
  exposed to agents.
- Tool-specific directories such as `.codex/skills` and `.claude/skills` should
  be compatibility symlinks to `.agents/skills` when the tool needs that path.
- `_docs/` is owned by the consuming project.
- `_docs/design/` captures design intent and architecture notes.
- `_docs/plans/` captures implementation plans, active work, and completed plans.

The package manager may scaffold missing `_docs` folders during first init,
but should not routinely update project documentation after that.

## Implementation Direction

The MVP should be implemented in TypeScript and run on Node.js.

This choice is intentional:

- TypeScript is a natural fit for JSON manifests, lockfiles, schema validation,
  front matter parsing, hashing, filesystem operations, and CLI behavior.
- Node.js gives the project a straightforward cross-platform runtime.
- Publishing through npm makes the tool easy to install and try.
- Many target users already work in projects where Node.js tooling is available.
- The project can still move to, or supplement with, a native binary later if
  startup time, distribution, or performance requirements justify it.

Rust remains a good future option for a native implementation, but TypeScript
on Node.js should be the default until there is a clear reason to change.

Recommended implementation modules:

- manifest loading and validation
- lockfile reading and atomic writing
- Git source resolution
- skill validation and front matter parsing
- collision detection
- managed source package storage
- active skill symlink or wrapper creation
- SHA-256 hashing
- local drift detection
- update and diff behavior
- verification checks
- workflow package installation and workflow-owned skill protection
- command orchestration modules separated from domain modules
- shared terminal UI helpers for prompts, tables, colors, and status output

Command orchestration is grouped separately from domain modules. Generated
output should remain easy to scan by mirroring this source layout, with CLI
support under `dist/cli/`, command modules under `dist/cli/cmds/`, and terminal
UI helpers under `dist/ui/`. Command modules should generally map to top-level
command names, with shared CLI support and domain behavior kept outside the
command folder. Terminal UI helpers should be grouped by reusable element, such
as selection prompts and tables, so package-specific implementation details
stay hidden behind project-owned wrappers.

Source-related domain behavior should be grouped under `src/sources/` and
generated under `dist/sources/`. Keep built-in defaults, Git resolution,
source metadata, source-domain types, and add/remove source workflows in
focused modules within that group.

Init behavior should be grouped under `src/init/`, with the root `src/init.ts`
kept as a compatibility facade. Reusable filesystem primitives should live
under `src/fs/`, and product-wide `.agents` path helpers should live under
`src/paths/`, so activation, update, diff, and verify can share them later.

Lockfile behavior should be grouped under `src/lockfile/`, with the root
`src/lockfile.ts` kept as a compatibility facade. Keep parsing, IO, and
lockfile-specific errors in focused modules.

Manifest behavior should be grouped under `src/manifest/`, with the root
`src/manifest.ts` kept as a compatibility facade. Keep source parsing, skill
request parsing, IO, and manifest-specific errors in focused modules. Shared
validation primitives that are not tied to one domain can live under
`src/validation/`.

Skill behavior should be grouped under `src/skills/`, with the root
`src/skills.ts` kept as a compatibility facade. Keep discovery, source-backed
listing, rendering, and skill-domain types in focused modules. Shared
skill-file parsing should live in the skills domain so init and later
activation workflows use the same interpretation of `SKILL.md`.

Workflow behavior should be grouped under `src/workflows/`. Keep workflow
source resolution, conventional workflow discovery, workflow doc installation,
workflow-owned skill activation, drift checks, update, diff, removal, and
verification in focused modules. Workflow command modules should orchestrate
that domain behavior without duplicating skill activation rules.

Shared modules should throw application-level errors without knowing about CLI
exit codes. CLI-specific error mapping, usage failures, and process exit-code
selection should live with the CLI support code.

Each top-level command should export a command object that owns its name,
usage, splash text, summary, and execution entrypoints. The CLI should use an
explicit registry of these command objects for lookup, splash rendering, and
dispatch. Filesystem-based dynamic discovery is deferred until command count or
packaging needs justify the extra runtime and test complexity.

Start with Git-based sources only. Registry support, plugin package support,
external workflow skill dependencies, global installs, workflow replacement,
and richer publishing workflows can come later.
