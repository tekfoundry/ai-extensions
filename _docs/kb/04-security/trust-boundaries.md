# Trust Boundaries

## Boundary Map

```text
Git or local extension source
  -> source resolver and cache
  -> package validation and staging
  -> .agents/packages package-managed copy
  -> .agents active exposure
  -> agent runtime reads active skills, roles, workflow docs, and templates
```

Trust does not come from the source itself. Trust increases only after the user
chooses a source, AIX resolves provenance, validates package shape, writes a
package-managed copy, records hashes in `aix.lock.json`, and later checks those
hashes before update or removal.

AIX does not certify third-party skills, roles, or workflows. It provides
provenance, review points, local drift detection, and no-silent-overwrite
behavior.

## Trust Zones

- Remote Git sources: untrusted instructions and files until reviewed and
  installed.
- Git cache under `AIX_CACHE_DIR` or the platform user cache directory:
  mutable resolver cache, not accepted package state.
- Local `./aix/...` bundled source paths: editable developer source, trusted
  only as local project input and recorded as `sourceType: "local"` when used.
- `.agents/packages/`: package-managed accepted copies guarded by lockfile
  hashes.
- `.agents/skills/` and `.agents/roles/`: agent-facing active exposure guarded
  by lockfile hashes. Active role `GUIDANCE.md` files and adjacent
  `*.GUIDANCE.md` companion files are project-editable guidance and must be
  reviewed as instructions before agents rely on them.
- `.agents/templates/`: project-owned template overrides, not package-managed
  workflow origin files.
- `.agents/guidance/`: project-owned workflow guidance overrides, not
  package-managed workflow origin files.
- `_docs/`: project-owned knowledge and plan records, not routine workflow
  update targets.
- Root `AGENTS.md`: mixed ownership; marker-delimited workflow, role, and
  skill append blocks are package-managed by their owning extension. The
  active project-manager role uses its owned append block to publish the
  project-manager entry routing rule.

## Actor Permissions

- The CLI has the local filesystem permissions of the user running `aix`.
- There is no AIX authentication, authorization service, or multi-user
  permission model.
- Authorization is command intent plus local file safety checks. A mutating
  command is allowed to touch only the files its lifecycle owns.
- Agent runtimes are outside AIX's enforcement boundary. AIX controls which
  files it exposes under `.agents/`; it does not sandbox how an agent runtime
  interprets those files.

## Critical Boundaries

- Source to package: source files become accepted package state only after AIX
  copies them into `.agents/packages/` and records hashes.
- Package to active exposure: active skills and roles become runtime-visible
  only through `.agents/skills/` and `.agents/roles/`.
- Workflow package to project docs: workflow install may scaffold missing
  `_docs` routers and directories, but existing project-owned docs stay
  outside routine workflow mutation.
- Workflow package to `AGENTS.md`: only the workflow's marker-delimited block
  is owned by AIX.
- Workflow origin templates to published overrides: origin templates are
  package-managed; published overrides are project-owned and must not be
  overwritten by workflow updates.
- Workflow origin guidance to published overrides: origin guidance is
  package-managed; published guidance is project-owned and must not be
  overwritten by workflow updates.
- Role package guidance to active role guidance: active role guidance and
  companion `*.GUIDANCE.md` files are editable after activation, so update
  paths must preserve local edits and expose upstream changes for review.
- Guidance to runtime behavior: guidance can influence agent behavior, but it
  is lower priority than user requests, repository instructions, workflow
  rules, skill procedures, role contracts, and safety boundaries.

## Security Invariants

- Mutating commands must preflight package-managed drift before overwrite,
  update, removal, reset, or uninstall.
- Direct standalone commands must reject workflow-owned skills and roles.
- Direct skill commands must reject role-owned skills.
- Source removal must be blocked while manifest or lockfile entries still
  depend on that source.
- Diff and status commands are read-oriented and must not mutate package or
  active state.
- `get-guidance` is read-only and must not install, activate, update, publish,
  reset, or edit guidance.
- The project-manager role loads its own active `GUIDANCE.md` and adjacent
  active `*.GUIDANCE.md` files before routing. `get-guidance` is used after
  startup for delegated roles, not to override the project-manager role's own
  startup contract.
- PM Review mode is a no-work boundary for the project-manager role. It emits
  startup classification and guidance planning only, and must stop before
  delegation, file edits, command execution, lifecycle changes, verification,
  or plan state changes.
- PM Context Packets are orientation aids, not authority. Delegated roles may
  accept low-risk baseline facts from a packet, but must re-read source files
  before editing them, verifying them, judging safety-sensitive behavior, or
  citing them as evidence. A stale, incomplete, or conflicting packet must send
  the role back to normal orientation or to the project-manager for review.
- When the active `project-manager` role is present, meaningful AIX project
  requests must route through it before specialist roles, lifecycle skills, or
  file work unless a narrow bypass applies. The allowed bypasses are PM Review,
  tiny informational answers that require no file reads, commands, lifecycle
  state, specialist judgment, or safety-sensitive decisions, bootstrapping
  before project-manager is active, already-routed requests carrying PM routing
  context or a PM Context Packet, and explicit developer override.
- PM-routed work preserves the parent/delegate boundary. The parent context may
  route, preserve worktree safety, review returned evidence, ask blocking
  questions, and report results, but must not implement, verify, run lifecycle
  skills, change lifecycle state, edit repository files, or perform other
  repo-changing work outside delegated roles. Parent review trusts delegated
  role evidence and re-reads files only for concrete exceptions: reported
  uncertainty, out-of-scope changed files, failed tests, incomplete evidence,
  safety-sensitive behavior changes, or another role's need for exact content.
- Guidance metadata is advisory and must not create hidden dependency,
  activation, or routing behavior.
- The lockfile is the integrity record for accepted package and active files,
  not a trust endorsement of source content.

## Known Residual Risk

- Git source URLs may contain credentials. Current errors can include Git
  command failure text, so callers should avoid embedding secrets in source
  URLs.
- AIX executes the local `git` binary for source resolution and diffs. It does
  not verify Git binary provenance.
- AIX does not cryptographically verify upstream releases or signed commits.
  It pins resolved commits and file hashes after resolution.
- AIX does not sandbox installed agent instructions. A malicious skill or role
  can still influence any agent runtime that reads it.
- Project-edited guidance can also influence agent behavior. AIX can show
  provenance and drift, but humans still need to review instruction changes.
