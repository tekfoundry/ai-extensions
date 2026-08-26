# Workflow Lifecycle Architecture

## Workflow Package Shape

Workflows are directory packages with a `workflow.json` manifest. The current
bundled workflows live under `aix/workflows/`.

```text
workflow.json
AGENTS.append.md
README.md
workflow.md
engineering-best-practices.md
templates/
skills/
roles/project-dev/
```

`workflow.json` declares:

- workflow `name` and optional `title`
- managed `AGENTS.md` integration
- installed workflow docs
- `templatesDir`
- `skillsDir`
- workflow-owned role location, currently discovered from `roles/project-dev`

The workflow package is installed all at once. AIX does not support partially
active workflows.

## Install Flow

```text
aix workflow install [source] [alias]
  -> resolve workflow source
  -> stage workflow package in a temporary package directory
  -> read and validate workflow.json
  -> refuse a second active workflow unless update/init allowed replacement
  -> preflight existing workflow package drift when replacing
  -> preflight active workflow-owned skills and roles
  -> preflight workflow docs
  -> preflight managed AGENTS.md block
  -> preflight workflow-owned skills and roles
  -> discover and validate workflow templates
  -> copy staged package to .agents/packages/workflows/<source>/<workflow>
  -> copy workflow docs into .agents/
  -> insert or replace managed AGENTS.md block
  -> expose workflow-owned skills under .agents/skills/
  -> expose workflow-owned roles under .agents/roles/
  -> scaffold missing _docs routers and directories
  -> replace workflow-owned lockfile skill and role entries
  -> replace the single workflow lockfile entry
  -> write manifest workflow intent and lockfile
```

The staging step keeps validation separate from the final package location.
The final package is replaced only after preflight succeeds.

## Source Routing

Workflow install supports three source paths:

- no input: install the default `aix` workflow source
- local `aix/workflows/<name>` path when it exists in the current checkout
- Git or GitHub tree URL, optionally aliased to a workflow source name

Local `aix/workflows/...` paths always use the `aix` source name and reject an
alias. Missing local default workflow paths fall back to default Git source
resolution.

## Update Flow

```text
aix workflow update
  -> read manifest and lockfile
  -> return no-op when no active workflow is installed
  -> resolve local source path or Git source snapshot
  -> call installResolvedWorkflow with allowExistingWorkflow
  -> reuse full install preflight
  -> replace workflow package, docs, skills, roles, templates, and lockfile
```

Update and install share the same core function so replacement behavior and
first install behavior pass through the same validation surface.

When a workflow update removes a workflow-owned skill or role, the install
helpers compare previous and next active names and remove active files that no
longer exist in the workflow package.

## Diff Flow

```text
aix workflow diff
  -> read lockfile
  -> return no-op when no active workflow is installed
  -> resolve local path or Git source snapshot
  -> compare locked workflow package to resolved source with git diff --no-index
  -> return diff without mutating files
```

Diff compares package content, not active files. Active-file drift is reported
by verify/status.

## Remove Flow

```text
aix workflow uninstall
  -> read manifest and lockfile
  -> require an active workflow
  -> preflight workflow package hash
  -> preflight workflow-owned active skills and package hashes
  -> preflight workflow-owned active roles and package hashes
  -> preflight workflow docs
  -> preflight workflow template origins
  -> preflight managed AGENTS.md block
  -> remove workflow-owned active skills and roles
  -> remove workflow docs
  -> remove managed AGENTS.md block
  -> remove workflow package
  -> remove workflow-owned lockfile skill and role entries
  -> clear workflow lockfile and manifest entries
```

Project-owned `_docs` content and published template overrides are not removed
as part of workflow uninstall.

## Workflow-Owned Assets

Workflow-owned skills and roles are represented as normal lockfile entries with
owner metadata:

```json
{
  "owner": {
    "kind": "workflow",
    "name": "design-plan-execute"
  }
}
```

This lets status and verification reuse the same package/active hash checks
used by standalone assets while still blocking direct standalone lifecycle
commands.

Workflow-owned skills use active skill symlinks when possible. Workflow-owned
roles are active Markdown files generated from package role files.

## Template Lifecycle

Workflow origin templates live in the workflow package and are hash-tracked in
the lockfile. Published templates live under `.agents/templates/` and are
project-owned overrides.

```text
template resolution
  -> .agents/templates/<template>.md when present
  -> workflow package origin otherwise
```

Publishing exposes the complete template set. Targeted publishing is refused
because partial template publication can make workflow artifact resolution
harder to reason about.

Reset removes published overrides and lets normal resolution fall back to the
workflow origin. Reset does not rewrite local files with origin contents.

## Documentation Scaffolding

Workflow install creates missing project documentation routers and directories:

```text
_docs/
  README.md
  kb/
    README.md
    01-product/
    02-requirements/
    03-architecture/
    04-security/
    05-quality/
    06-operations/
    07-decisions/
  plans/
  plans/backlog/
  plans/completed/
```

The scaffolder writes only missing files and directories. Existing project
docs remain project-owned.

## Architectural Invariants

- Only one workflow may be active at a time.
- Workflow install/update/remove must preflight every workflow-owned artifact
  before writing.
- Workflow update must use the same validation path as workflow install.
- Workflow-owned skills and roles are managed by workflow lifecycle commands,
  not direct standalone commands.
- Published templates are local overrides and must survive routine workflow
  updates.
- Project-owned `_docs` content must not be rewritten by routine workflow
  install/update/remove after it exists.
