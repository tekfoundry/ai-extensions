# System Requirements

This document records implemented requirements for the AIX CLI. It is written
from current behavior, command handlers, source modules, shipped workflow
assets, and regression tests. Planned behavior belongs in `_docs/plans/` until
it ships.

Bundled workflow and skill requirements are organized separately:

- [Workflow requirements](workflows/README.md)
- [Skill requirements](skills/README.md)

## Actors

- Project developer: initializes and maintains a project-local AIX setup,
  installs extension sources, activates skills and roles, reviews diffs, and
  runs health checks.
- Team maintainer: chooses reusable workflow, skill, and role sources for a
  repository and expects those choices to be pinned, reviewable, and safe to
  update.
- Agent runtime: reads `.agents/` guidance, active skills, active roles, and
  project docs after AIX materializes them into the project.
- Workflow maintainer: ships workflow-owned docs, skills, roles, templates,
  and managed `AGENTS.md` guidance through an installable workflow package.
- Role or skill author: publishes reusable Markdown role or skill files with
  front matter that AIX can discover, package, and activate.
- Reviewer: checks drift, lockfile integrity, update diffs, verification
  evidence, and documentation impact before accepting changes.

## System Requirements

- AIX must expose the executable command `aix`.
- AIX must support top-level workspace commands for `init`, `status`,
  `verify`, and `update`.
- AIX must support object-verb command groups for workflow, templates,
  guidance, skills, skill activation, roles, and role activation work.
- AIX must reject old verb-first command forms instead of maintaining them as
  compatibility aliases.
- AIX must store user intent in `aix.json` and exact resolved state in
  `aix.lock.json`.
- AIX must keep package-managed files under `.agents/` and project-owned
  knowledge under `_docs/`.
- AIX must use Git-backed and local `./aix/...` sources for implemented source
  resolution; registry and global project state are not part of the current
  system.
- AIX must provide default source definitions for the bundled `aix` skill,
  workflow, and role sources plus the external `mattpocock` and
  `cursor-pstack` skill sources.

## Actor User Stories

### Project Developer

- As a project developer, I can run `aix init` in a project so that the default
  `design-plan-execute` workflow, managed `.agents/` guidance, workflow-owned
  skills and roles, default `discover-skill`, `_docs/kb` scaffold, `aix.json`,
  and `aix.lock.json` are created together.
  Acceptance signals: the command reports installed workflow docs, workflow
  templates, activated workflow-owned skills and roles, and written manifest
  and lockfile paths; repeated initialization is idempotent when files still
  match locked state.

- As a project developer, I can run `aix status` so that I can inspect whether
  the workspace is initialized, which workflow is active, which sources are
  configured, which skills and roles are active, whether local drift exists,
  and whether updates are available.
  Acceptance signals: status output groups workflow sources, skill sources,
  role sources, active skills, dependency-only skills, workflow-owned skills,
  active roles, workflow-owned roles, health, and updates; update checks may
  report unavailable without failing the whole status command.

- As a project developer, I can run `aix verify` so that I can confirm the
  manifest, lockfile, package files, active files, workflow docs, templates,
  roles, `AGENTS.md` block, hashes, names, owner metadata, and aliases still
  agree.
  Acceptance signals: verification exits successfully with a pass message when
  no issues exist and exits with failure plus actionable issue lines when
  drift, missing files, collisions, path mismatches, or metadata mismatches are
  found.

- As a project developer, I can run `aix update` so that workflow, locked
  skills, and locked roles refresh as one convenience operation.
  Acceptance signals: workflow update runs before skill update, skill update
  runs before role update, failures stop later update groups, and the command
  reports missing available AIX skills after successful updates.

### Team Maintainer

- As a team maintainer, I can install exactly one active workflow with
  `aix workflow install [git-or-github-tree-url] [alias]` so that a repository
  has one coherent agent operating model.
  Acceptance signals: the command stages the workflow package, validates
  workflow docs, templates, workflow-owned skills, workflow-owned roles, and
  managed `AGENTS.md` content before writing; a second active workflow is
  refused until the current workflow is uninstalled.

- As a team maintainer, I can run `aix workflow diff` before accepting an
  update so that workflow package changes are reviewable.
  Acceptance signals: the command returns no-change output when the source and
  locked package match, or a `git diff --no-index` style diff when changes
  exist; it does not mutate package files or lockfile state.

- As a team maintainer, I can run `aix workflow update` so that the active
  workflow package, workflow docs, templates, workflow-owned skills,
  workflow-owned roles, managed `AGENTS.md` block, and lockfile are refreshed
  only after local drift checks pass.
  Acceptance signals: the command reports updated workflow names and changed
  resolved commits when applicable; deleted workflow-owned roles or skills are
  removed through the workflow lifecycle, not standalone commands.

- As a team maintainer, I can run `aix workflow uninstall` so that the active
  workflow and workflow-owned active assets are removed while standalone
  skills, standalone roles, project docs, and unrelated `AGENTS.md` text stay
  intact.
  Acceptance signals: uninstall refuses modified workflow package files,
  workflow docs, templates, managed `AGENTS.md` block, workflow-owned active
  skills, or workflow-owned active roles; on success it removes only locked
  workflow-owned artifacts and clears the manifest workflow entry.

### Skill Author Or Skill Consumer

- As a skill consumer, I can run `aix skills add <git-or-github-tree-url>
  [alias]` so that a Git skill source is recorded and discoverable without
  activating every skill in it.
  Acceptance signals: GitHub tree URLs are normalized to Git URL, ref, and
  source path; existing sources with identical settings are treated as already
  present; existing sources with different settings are refused.

- As a skill consumer, I can run `aix skills list <source> [--missing-only]`
  or use the interactive list prompt so that I can inspect available skills
  before installing them.
  Acceptance signals: output is human-scannable, source metadata is read from
  the cache created by source addition, unknown sources fail clearly, and
  `--missing-only` filters out installed skills.

- As a skill consumer, I can run `aix skill activate <source/path> [alias]` so
  that one requested skill is materialized under `.agents/packages/skills/`,
  exposed under `.agents/skills/`, and recorded in manifest and lockfile.
  Acceptance signals: activation refuses unknown sources, unknown skills,
  unsafe folder names, active-name collisions, dirty untracked package paths,
  and edited active files; aliases produce managed active wrappers while
  direct activation may use the package path directly.

- As a skill consumer, I can activate a skill with inferred dependencies so
  that dependent skills are available to the agent runtime without adding each
  one manually.
  Acceptance signals: dependencies are activated first, recorded as
  dependency-only lockfile entries, and preserved while another active skill
  depends on them.

- As a skill consumer, I can run `aix skill deactivate <active-name>` so that a
  user-requested skill is removed from the manifest and its active/package
  files are removed when safe.
  Acceptance signals: deactivation refuses unknown active skills, workflow-owned
  skills, role-owned skills, dependency-only skills still needed by other active
  skills, edited active files, and edited package copies; orphaned
  dependency-only skills are removed after their last dependent is gone.

- As a skill consumer, I can run `aix skills diff [source/path]` and
  `aix skills update [source/path]` so that locked skills can be reviewed and
  refreshed individually or as a group.
  Acceptance signals: diff is non-mutating, targeted commands affect only the
  matching locked skill, unknown targets fail clearly, and update refuses local
  package or active drift before writing.

- As a skill consumer, I can run `aix skills remove <source-name>` so that an
  unused skill source and its cached metadata are removed.
  Acceptance signals: removal refuses sources referenced by manifest skills or
  lockfile skills and refuses non-empty package source directories.

### Role Author Or Role Consumer

- As a role consumer, I can run `aix roles add <git-or-github-tree-url>
  [alias]` so that a Git role source is recorded and discoverable without
  activating every role in it.
  Acceptance signals: source names are safe, existing identical sources are
  unchanged, different settings for an existing source are refused, and source
  metadata records discovered roles.

- As a role consumer, I can run `aix roles list <source> [--missing-only]` or
  use the interactive list prompt so that I can inspect available roles before
  installing them.
  Acceptance signals: unknown role sources fail clearly and `--missing-only`
  excludes installed roles.

- As a role consumer, I can run `aix role activate <source/path> [alias]` so
  that one role bundle is materialized under `.agents/packages/roles/`,
  exposed under `.agents/roles/<active-name>/`, and recorded in manifest and
  lockfile.
  Acceptance signals: the role bundle must contain `ROLE.md` with valid front
  matter, a valid role name, a description, and bundle/name agreement; bundled
  AIX roles must include `GUIDANCE.md`; external standalone roles may omit
  `GUIDANCE.md`; aliases change only the active role name, not the package role
  name.

- As a role consumer, I can run `aix role deactivate <active-name>` so that a
  user-owned active role and package copy are removed when safe.
  Acceptance signals: deactivation refuses workflow-owned roles, unknown roles,
  edited active role files, and edited package role files.

- As a role consumer, I can run `aix role diff <active-name|source/path>`,
  `aix role update <active-name|source/path>`, `aix roles diff
  [active-name|source/path]`, and `aix roles update
  [active-name|source/path]` so that roles can be reviewed and refreshed
  individually or as a group.
  Acceptance signals: commands accept active names or source paths where
  implemented, diff is non-mutating, update preserves active aliases, and
  local drift blocks writes.

- As a role author, I can include `skills` metadata in role front matter so
  that the agent runtime can treat it as a hint.
  Acceptance signals: AIX validates metadata shape but does not automatically
  install skills from role metadata.

- As a role author, I can include optional `uses_guidance` metadata in
  `GUIDANCE.md` so that guidance readers can see which workflow activities the
  role normally uses.
  Acceptance signals: AIX parses the metadata as advisory routing information;
  it does not install skills, mutate files, or make hidden runtime decisions
  from the metadata.

### Workflow Maintainer

- As a workflow maintainer, I can ship workflow docs, workflow-owned skills,
  workflow-owned roles, templates, and a managed `AGENTS.md` append block so
  that a workflow installs as one coherent package.
  Acceptance signals: install validates referenced files exist, template syntax
  is supported, template section references resolve, and role or skill names do
  not collide with active standalone assets.

- As a workflow maintainer, I can publish editable workflow templates with
  `aix templates publish` so that a project can customize plan and docs
  templates without editing the workflow package.
  Acceptance signals: publishing exposes the complete active workflow template
  set under `.agents/templates/`, leaves matching templates unchanged, and
  refuses targeted publishing.

- As a workflow maintainer, I can run `aix templates list`,
  `aix templates diff [template-name]`, and `aix templates reset
  <template-name|--all>` so that template overrides can be inspected, compared
  with origin templates, and removed.
  Acceptance signals: list reports document and section templates, state, and
  path; diff reports only published override changes; reset removes selected
  overrides while preserving unrelated files and cleaning empty template
  directories when appropriate.

- As a workflow maintainer, I can ship workflow shared and activity guidance so
  that reusable work-type judgment travels with the workflow package.
  Acceptance signals: the active workflow package contains `guidance/README.md`,
  `guidance/shared.md`, and workflow activity guidance; install and update
  hash-check guidance origins without materializing project-owned overrides
  under `.agents/guidance/`.

- As a workflow maintainer or project developer, I can run `aix guidance list`,
  `aix guidance publish`, `aix guidance diff [guidance-name]`, and
  `aix guidance reset <guidance-name|--all>` so that active workflow and role
  guidance can be inspected, customized, compared, and restored.
  Acceptance signals: guidance names are command-ready paths such as `shared`,
  `activities/verification`, and `roles/quality-engineer`; publish refuses
  targeted arguments and refuses to overwrite edited workflow guidance
  overrides; role guidance publish is reported as already editable; targeted
  reset affects only the selected guidance; reset-all previews modified
  guidance and requires explicit confirmation.

### Agent Runtime

- As an agent runtime, I can read active skills from `.agents/skills/` so that
  enabled behavior is exposed through stable project-local paths.
  Acceptance signals: direct activations and alias wrappers both contain valid
  `SKILL.md` front matter with the active skill name expected by the lockfile.

- As an agent runtime, I can read active roles from `.agents/roles/` so that
  delegated perspectives are exposed through stable project-local files.
  Acceptance signals: active role bundles expose `ROLE.md` and optional
  `GUIDANCE.md`; AIX tracks role contract hashes while preserving
  project-editable role guidance.

- As an agent runtime, I can follow installed workflow instructions,
  workflow-owned activity guidance, active role guidance, and project-owned
  current knowledge without conflating their ownership.
  Acceptance signals: workflow package guidance is read from
  `.agents/packages/workflows/.../guidance/` until a project publishes
  overrides under `.agents/guidance/`; workflow installation scaffolds
  `_docs/kb` when missing and does not rewrite project-owned docs during
  routine workflow updates.

- As an agent runtime, I can use the optional `get-guidance` skill to resolve a
  bounded reading list for a requesting role, requesting skill, activity, and
  task context.
  Acceptance signals: `get-guidance` is read-only, requires all caller context
  fields, reports missing or conflicting guidance, uses metadata as advisory
  hints, and does not participate in default routing until a later
  project-manager design adopts it.

### Reviewer

- As a reviewer, I can rely on the lockfile to identify the exact source,
  resolved commit, package files, active files, workflow docs, workflow
  templates, workflow-owned skills, workflow-owned roles, aliases, owners, and
  dependency edges that were accepted.
  Acceptance signals: `aix verify`, `aix status`, and diff commands all derive
  safety and reporting from the same locked state.

- As a reviewer, I can see actionable failures before destructive or
  safety-sensitive writes occur.
  Acceptance signals: mutating commands preflight package paths, active paths,
  workflow docs, templates, managed `AGENTS.md` content, naming rules, source
  existence, ownership, and dependencies before writing manifest or lockfile
  changes.

- As a reviewer, I can distinguish user-requested assets from dependency-only,
  role-owned, and workflow-owned assets.
  Acceptance signals: status groups those states separately, direct
  deactivation rejects owned assets, and workflow lifecycle commands own
  workflow-owned assets.

## Interaction Requirements

- Commands must render concise human-readable output instead of requiring JSON
  interpretation.
- Usage errors must include the supported command shape and return a usage
  failure.
- Interactive source, skill, role, and workflow selection must include
  numbered choices, a quit option, empty-state messages, and invalid-selection
  errors.
- `NO_COLOR` must disable colored status output; `AIX_FORCE_COLOR` must enable
  color even when stdout is not a TTY.
- Diff commands must be review-only. They must not mutate package files,
  active files, manifest state, or lockfile state.

## Data Requirements

- `aix.json` must record configured skill sources, role sources, workflow
  sources, one active workflow request, requested skill activations, and
  requested role activations.
- `aix.json` must accept legacy flat skill source shape while emitting current
  nested source groups for new writes.
- `aix.json` skill and role requests may use compact `source:path` strings or
  objects when aliases are needed.
- `aix.lock.json` must use lockfile version `1`.
- Lockfile skill entries must record source, source type, optional source URL,
  requested ref, resolved commit, source path, package path, activation path,
  original name, active name, alias when present, requested state, owner when
  present, dependency edges when present, package hashes, and active hashes.
- Lockfile role entries must record source, source type, optional source URL,
  requested ref, resolved commit, source path, package path, activation path,
  original name, active name, alias when present, requested state, workflow
  owner when present, package hashes, and active hashes.
- Lockfile workflow entries must record source, source type, optional source
  URL, requested ref, resolved commit, source path, package path, workflow name,
  title when present, docs, managed `AGENTS.md` block, workflow-owned skills,
  workflow-owned roles, template hashes, workflow guidance hashes, and package
  hashes.

## Safety Requirements

- Mutating commands must refuse to overwrite, refresh, remove, or reset files
  that differ from the lockfile unless that command explicitly owns the changed
  state.
- Active names, aliases, source names, and folder names must be validated before
  filesystem writes.
- AIX must detect active-name collisions before materializing package or active
  files.
- Workflow-owned skills and roles must not be deactivated directly through
  standalone `skill` or `role` commands.
- Role-owned skills must not be deactivated directly through standalone `skill`
  commands.
- Source removal must be blocked while manifest or lockfile state still depends
  on the source.
- Local `./aix/...` workflow, skill, and role sources must take precedence over
  remote default `aix` sources when the matching local source path exists.
- Workflow install and update must stage and validate a workflow package before
  replacing the final package.
- Guidance publish and reset commands must preserve unrelated files and refuse
  unsafe overwrites. `aix guidance reset --all` must preview the affected
  guidance before changing files.
- `get-guidance` must remain read-only and lower priority than user requests,
  repository instructions, workflow lifecycle rules, skill procedures, role
  contracts, and safety boundaries.

## Non-Goals In The Current System

- No registry-backed package format.
- No automatic installation from role `skills` metadata.
- No automatic installation, activation, or routing from guidance metadata.
- No default request-entry routing through `get-guidance` in the current
  system.
- No automatic activation of every configured default external skill source.
- No host-native agent directory export unless a future explicit integration
  owns it.
- No global install state inside a consuming project.
- No silent overwrite or removal of local edits.
- No routine rewriting of project-owned docs during workflow update.
- No support for multiple active workflows in one project.
- No compatibility aliases for old verb-first commands.

## Requirements Acceptance Criteria

- `npm test` covers activation, deactivation, source handling, workflow
  lifecycle, roles, templates, init, status, verify, diff, update, manifest
  parsing, lockfile parsing, UI selection, skill instructions, and package
  smoke behavior.
- `npm run build` compiles the TypeScript command surface and exported modules.
- `node bin/aix.js verify` checks the current project installation state.
- Docs updates that change requirements must be reviewed against the
  implementation and linked architecture, security, quality, operations, and
  decision docs where those areas own deeper detail.

## Current Open Decisions

- None recorded for implemented requirements. New product scope should start in
  `_docs/plans/backlog/` or an active plan before these requirements are
  promoted as current state.
