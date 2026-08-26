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
- Git cache under `AIX_CACHE_DIR` or the OS temp directory: mutable resolver
  cache, not accepted package state.
- Local `./aix/...` bundled source paths: editable developer source, trusted
  only as local project input and recorded as `sourceType: "local"` when used.
- `.agents/packages/`: package-managed accepted copies guarded by lockfile
  hashes.
- `.agents/skills/` and `.agents/roles/`: agent-facing active exposure guarded
  by lockfile hashes.
- `.agents/templates/`: project-owned template overrides, not package-managed
  workflow origin files.
- `_docs/`: project-owned knowledge and plan records, not routine workflow
  update targets.
- Root `AGENTS.md`: mixed ownership; only marker-delimited workflow blocks are
  package-managed.

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

## Security Invariants

- Mutating commands must preflight package-managed drift before overwrite,
  update, removal, reset, or uninstall.
- Direct standalone commands must reject workflow-owned skills and roles.
- Direct skill commands must reject role-owned skills.
- Source removal must be blocked while manifest or lockfile entries still
  depend on that source.
- Diff and status commands are read-oriented and must not mutate package or
  active state.
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
