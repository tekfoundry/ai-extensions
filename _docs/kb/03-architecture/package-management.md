# Package Management Architecture

## Current Model

AIX separates intent, resolved package state, and active exposure.

```text
aix.json
  declares requested sources, one workflow, standalone skills, and standalone
  roles

aix.lock.json
  records exact resolved package state, ownership, dependency edges, and hashes

.agents/packages/
  stores package-managed copies of skills, roles, and workflows

.agents/skills/ and .agents/roles/
  expose active agent-facing skills and roles
```

The manifest is edited to represent what the user asked to keep installed. The
lockfile is edited to represent what AIX accepted after resolving sources,
copying package files, exposing active files, and hashing the result.

## Package Kinds

- Skill packages are directories with a `SKILL.md` file. They are copied under
  `.agents/packages/skills/<source>/<source-path>/`.
- Active skills are exposed under `.agents/skills/<active-name>/`. Direct
  activation uses a symlink to the package when no alias is needed. Aliased
  activation creates a managed wrapper copy with rewritten `name` front matter.
- Role packages are directory bundles with a `ROLE.md` entrypoint copied under
  `.agents/packages/roles/<source>/<source-path>`.
- Active roles are directory bundles exposed under
  `.agents/roles/<active-name>/ROLE.md`.
- Workflow packages are directory trees copied under
  `.agents/packages/workflows/<source>/<workflow-name>/`.
- Workflow docs are installed into `.agents/`.
- Workflow-owned skills and roles are active artifacts with lockfile owner
  metadata.
- Workflow templates remain in the workflow package unless the project
  publishes overrides under `.agents/templates/`.

## Skill Activation Flow

```text
aix skill activate <source/path> [alias]
  -> parse source/path target
  -> read and validate aix.json
  -> merge default and manifest skill sources
  -> prefer local aix/skills/... source when present
  -> resolve Git source when not local
  -> discover requested skill and inferred dependencies
  -> validate active names and aliases
  -> detect dependency cycles and active-name collisions
  -> preflight package and active drift
  -> copy package files
  -> expose direct symlink or alias wrapper
  -> update manifest only for the requested root skill
  -> upsert lockfile entries for requested and dependency-only skills
```

Dependency-only skills are locked with `requested: false`. They remain active
while reachable from a requested skill and are removed when they become
orphaned.

## Skill Deactivation Flow

```text
aix skill deactivate <active-name>
  -> validate active name
  -> read manifest and lockfile
  -> find lockfile entry
  -> reject workflow-owned or role-owned skills
  -> reject dependency-only skills that still have dependents
  -> preflight active and package hashes
  -> remove manifest request when root-requested
  -> keep dependency package when still reachable
  -> remove orphaned dependency-only packages and active files
  -> write manifest and lockfile
```

The deactivation path protects shared dependency skills by graph reachability,
not by directory heuristics.

## Role Activation Flow

```text
aix role activate <source/path> [alias]
  -> normalize source/path target to a role bundle directory
  -> read or initialize manifest shape
  -> merge default and manifest role sources
  -> prefer local aix/roles/... source when present
  -> resolve Git source when not local
  -> parse ROLE.md front matter and body
  -> require role contract and bundle/name agreement
  -> validate active role name or alias
  -> preflight active-name collisions and drift
  -> copy package role bundle
  -> write active role bundle
  -> update manifest and lockfile
```

Role bundles use directory packages. A role alias changes the active role name
and active bundle path, but not the package role name.

## Diff And Update

Diff commands compare locked package state to a resolved source without
mutating workspace files. Update commands perform local drift checks first,
then replace package and active files from the resolved source and rewrite
lockfile hashes.

```text
diff
  -> read manifest and lockfile
  -> resolve source snapshots
  -> run git diff --no-index package vs source
  -> return only non-empty diffs

update
  -> read manifest and lockfile
  -> select all or targeted unlocked entries
  -> reject workflow-owned direct updates
  -> preflight package and active hashes
  -> resolve source snapshots
  -> replace packages and active wrappers
  -> write lockfile
```

Local source entries compare against editable local `./aix/...` paths. Git
source entries compare against the checked-out resolved Git snapshot.

## Lockfile Contract

The lockfile records:

- lockfile version
- package kind
- source name and source type
- source URL, requested ref, and resolved commit for Git-backed entries
- source-relative path
- package path and active path
- original and active names
- alias metadata
- requested versus dependency-only state
- owner metadata for workflow-owned or role-owned assets
- dependency edges for inferred skill dependencies
- package and active file hashes
- workflow docs, templates, package files, active skills, and active roles

Workflow template hashes are stored both in the workflow package file list and
in the workflow `templates` list so template drift can be reported directly.

## Drift And No-Overwrite Rules

Mutating commands must check package and active files before writing. If a file
exists and does not match the lockfile or expected source content, the command
stops.

Drift checks apply to:

- skill activation, deactivation, update, and diff
- role activation, deactivation, update, and diff
- workflow install, update, diff, and remove
- workflow docs
- managed `AGENTS.md` blocks
- workflow templates
- published template publishing and reset

`copyFilesSafely` refuses to overwrite a target file when the existing bytes do
not equal the source bytes. Hash comparison then records accepted state after
the copy.

## Failure Modes

- Missing manifest: workspace commands that need user intent report an
  uninitialized or malformed workspace.
- Missing lockfile: parsing yields an empty v1 lockfile in supported flows.
- Drifted active or package file: mutating commands stop before writing.
- Name collision: activation stops unless an explicit alias resolves a
  standalone skill or role collision.
- Dependency cycle: skill activation stops while planning inferred dependency
  activation.
- Unknown source: source resolution stops before package writes.
- Workflow ownership mismatch: direct standalone commands refuse to mutate
  workflow-owned assets.
- Role metadata mismatch: role activation stops when front matter name and
  source filename disagree.
