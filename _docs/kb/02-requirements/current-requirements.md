# Current Requirements

## Actors

- Project developer: initializes and maintains a project-local AIX setup.
- Agent runtime: reads `.agents/` guidance, active skills, active roles, and
  project docs.
- Workflow maintainer: ships workflow-owned docs, skills, roles, and templates
  through the `aix` source.
- Reviewer: checks drift, lockfile integrity, verification evidence, and docs
  impact before accepting changes.

## Implemented Requirements

- `aix init` installs the default `design-plan-execute` workflow and activates
  the default standalone `discover-skill`.
- `aix.json` records root user intent: sources, one active workflow, requested
  skills, and requested standalone roles.
- `aix.lock.json` records exact resolved state, including package hashes,
  active hashes, workflow docs, workflow templates, workflow-owned skills, and
  workflow-owned roles.
- GitHub tree URLs are normalized into Git URL, ref, and source path.
- Local `./aix/...` extension sources take precedence over configured or
  bundled `aix` sources for supported activation/install targets.
- Workflow-owned skills and roles are owned by the active workflow lifecycle,
  not direct standalone deactivation.
- Role front matter metadata is treated as runtime hints while AIX still owns
  package hashes, active hashes, naming, and drift checks.
- Template publishing creates project-editable overrides under
  `.agents/templates/`; reset removes overrides and returns to workflow-origin
  resolution.
- Verification checks manifest, lockfile, package files, active files,
  workflow docs, managed `AGENTS.md`, templates, roles, hashes, front matter,
  owner metadata, and naming rules.

## Non-Goals In The Current System

- No registry-backed package format.
- No automatic installation from role `skills` metadata.
- No host-native agent directory export unless a future explicit integration
  owns it.
- No global install state inside a consuming project.
- No silent overwrite or removal of local edits.
- No routine rewriting of project-owned docs during workflow update.

## Acceptance Criteria

- Mutating commands stop before overwriting package or active files that differ
  from the lockfile.
- Source, package, and active paths are represented consistently in the
  manifest and lockfile.
- The CLI reports actionable errors for collisions, missing sources, drift,
  workflow ownership boundaries, and unsafe removal.
- Tests cover activation, deactivation, source handling, workflow lifecycle,
  roles, templates, init, status, verify, and package smoke behavior.
