# Package Management

## Current Model

AIX separates intent, resolved package state, and active exposure:

```text
aix.json
  declares requested sources, one workflow, root skills, and root roles

aix.lock.json
  records exact resolved package state and hashes

.agents/packages/
  stores package-managed copies

.agents/skills/ and .agents/roles/
  expose active agent-facing files
```

## Activation Flow

```text
request source/path
  -> resolve configured, local, or bundled source
  -> validate package metadata
  -> detect active-name collisions
  -> materialize package copy under .agents/packages
  -> expose active file or directory under .agents
  -> write manifest intent when root-requested
  -> write package and active hashes to aix.lock.json
```

Dependency-only skills can be inferred from skill instructions and locked
without becoming root manifest intent. Role-owned skills remain explicit future
package behavior; role `skills` metadata is currently only a delegation hint.

## Lockfile Contract

The lockfile records:

- source name, type, URL, requested ref, and resolved commit when applicable
- source-relative path
- package path and active path
- original and active names
- alias metadata
- requested versus dependency-only state
- owner metadata for workflow-owned or role-owned assets
- package and active file hashes
- workflow docs, templates, package files, active skills, and active roles

Workflow template hashes are stored both in the workflow package file list and
in the workflow `templates` list so template drift can be reported directly.

## Drift And No-Overwrite Rules

Mutating commands must check package and active files before writing. If a file
exists and does not match the lockfile or expected source content, the command
stops. This applies to skill activation, deactivation, update, diff, workflow
install/update/remove, role activation/update/remove, and template publishing.

## Update And Diff

Diff commands compare locked package state against the currently resolved
source. Update commands refresh from that resolved source only after local
drift checks pass.

Local source entries compare against editable local `./aix/...` paths. Git
source entries compare against the resolved Git source snapshot.

## Failure Modes

- Missing manifest: workspace is not initialized.
- Missing lockfile: commands treat the lock as empty only where the workflow
  explicitly allows initialization or repair.
- Drifted active/package file: mutating command stops.
- Name collision: activation stops unless an explicit alias resolves the
  collision.
- Workflow ownership mismatch: direct standalone commands refuse to mutate
  workflow-owned assets.
