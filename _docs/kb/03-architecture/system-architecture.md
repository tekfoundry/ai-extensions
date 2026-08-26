# System Architecture

## Runtime Shape

AIX is a TypeScript-on-Node CLI. The executable `bin/aix.js` launches compiled
CLI code from `dist/`, while source modules live under `src/`.

```text
bin/aix.js
  -> dist/cli.js
      -> src/cli registry and command modules
          -> domain modules under src/
              -> filesystem, manifest, lockfile, source, skill, role,
                 workflow, template, status, and UI helpers
```

No daemon or long-running service is required. Commands operate on the current
workspace and local filesystem.

## Module Map

- `src/cli/`: command registry, command dispatch, usage, pending operations,
  and CLI error mapping.
- `src/manifest/`: `aix.json` parsing, source parsing, skill request parsing,
  and manifest-specific IO/errors.
- `src/lockfile/`: `aix.lock.json` parsing, IO, drift helpers, and
  lockfile-specific errors.
- `src/sources/`: default sources, source input normalization, Git/source
  metadata, source management, source removal, and source resolution.
- `src/skills/`: skill discovery, listing, rendering, and skill-domain types.
- `src/activation/`: skill package materialization, active exposure,
  dependency handling, diff/update/deactivate, naming, and verification.
- `src/roles/`: role front matter, discovery, activation, delegation,
  rendering, lockfile handling, validation, listing, and verification.
- `src/workflows/`: workflow manifest parsing, source resolution, install,
  update, diff, remove, docs, managed `AGENTS.md`, workflow-owned skills,
  workflow-owned roles, templates, and verification.
- `src/init/`: project initialization, default sources, default skills,
  workflow activation, manifest/lockfile writes, project docs scaffolding, and
  output rendering.
- `src/fs/`, `src/paths/`, `src/ui/`, and `src/validation/`: shared filesystem,
  path, output, and validation primitives.

## Ownership Boundaries

- Domain modules throw application-level errors.
- CLI modules translate errors into process-level output and exit codes.
- Package-managed files live under `.agents/` and are hash-checked.
- Project-owned docs live under `_docs/` and are not routine workflow-update
  targets.
- Bundled workflow source lives under `aix/workflows/design-plan-execute/`.
- Default standalone bundled skills live under `aix/skills/`.
- Default standalone bundled roles live under `aix/roles/`.

## Invariants

- One workflow is active at a time.
- Active workflow docs, skills, roles, templates, and managed `AGENTS.md` block
  must match the lockfile unless intentionally updated.
- Workflow-owned skills and roles are not managed by direct standalone
  deactivate commands.
- Published templates are project-owned overrides, not workflow-origin files.
- Missing lockfiles load as empty v1 lockfiles, but mutating commands write the
  exact resolved state before treating installation as complete.

## Visuals

The module map above is sufficient for the current architecture because the
runtime is a single-process CLI. A sequence diagram is more useful in the
package-management and workflow lifecycle documents, where source resolution,
materialization, activation, and drift checks interact.
