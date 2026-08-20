# AI Extensions Overview

## Goal

Build a small package-manager-style CLI for managing AI-agent extensions inside
software projects. The MVP starts with skills, but the product name leaves room
for other extension types later.

The tool should let a project declare required skills, install them into a
local `.agents/skills` directory, lock exact resolved versions, update them
intentionally, detect local drift, and avoid accidental overwrites.

## Project Ownership Model

The project separates bundled extension source, package-managed agent process
files, and project-owned documentation:

- `aix/skills/` is the bundled workflow skill source shipped by this repository.
- `.agents/` is managed by the skills package manager in consuming projects.
- `.agents/skills/` contains installed skill packages.
- In this repository, `.agents/skills/` remains the local working skill set so
  AI Extensions can later install into it from `aix/skills`.
- `_docs/` is owned by the consuming project.
- `_docs/design/` captures design intent and architecture notes.
- `_docs/plans/` captures implementation plans, active work, and completed plans.

The package manager may scaffold missing `_docs` folders during first install,
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
- deterministic file copying
- SHA-256 hashing
- local drift detection
- update and diff behavior
- verification checks

Start with Git-based sources only. Registry support, plugin package support,
dependency resolution, global installs, compatibility symlinks, and publishing
workflows can come later.
