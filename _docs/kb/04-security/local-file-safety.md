# Local File Safety

## Safety Model

AIX is a local package manager for agent behavior, so local file safety is the
primary security boundary. The implementation favors refusal over overwrite:
when a managed target differs from the expected source bytes or lockfile hash,
the command stops before mutating that target.

## Managed And Project-Owned Areas

```text
Package-managed:
  .agents/packages/
  .agents/skills/
  .agents/roles/
  workflow docs installed under .agents/
  marker-delimited workflow block in AGENTS.md

Project-owned:
  _docs/
  AGENTS.md text outside workflow markers
  .agents/templates/ published overrides
  .agents/guidance/ published workflow guidance overrides
  .agents/roles/<name>/GUIDANCE.md active role guidance
  editable local ./aix/... source files
  unrelated files under .agents/
```

AIX may create missing `_docs` routers and directories during workflow install,
but it must not rewrite existing project-owned docs during routine workflow
install, update, or uninstall.

## Hash-Based Drift Checks

The lockfile records package and active file hashes. Drift comparison reports:

- missing root
- missing locked files
- changed locked files
- unexpected files

Mutating lifecycle commands use this comparison to refuse operations when local
managed files no longer match the accepted lockfile state.

## Overwrite Guards

- `copyFilesSafely` refuses to overwrite target files whose bytes differ from
  the source bytes.
- Skill package activation refuses dirty untracked package directories.
- Active skill activation refuses active-name collisions unless the existing
  symlink points to the expected package.
- Aliased skill activation refuses existing active paths.
- Role activation refuses active role collisions and dirty package role files.
- Workflow doc install refuses modified docs and unmanaged workflow doc
  collisions.
- Workflow `AGENTS.md` install refuses modified managed blocks and unmanaged
  conflicting blocks.
- Template publishing refuses to overwrite locally edited published templates.
- Guidance publishing refuses to overwrite locally edited workflow guidance
  overrides.
- Role updates preserve edited active `GUIDANCE.md` files and expose upstream
  changes through diff or reset behavior.

## Delete And Reset Guards

Destructive commands are scoped to lockfile-derived or workflow-derived paths:

- `aix skill deactivate` removes only the selected active skill, its package,
  and orphaned dependency-only skills after active/package hash checks pass.
- `aix role deactivate` removes only the selected standalone active role and
  role package after role hash checks pass.
- `aix workflow uninstall` removes workflow-owned active skills, roles, docs,
  package files, and managed `AGENTS.md` block after drift checks pass.
- `aix templates reset` removes only published overrides belonging to the
  active workflow template set.
- `aix guidance reset <workflow-guidance>` removes only the selected published
  workflow guidance override.
- `aix guidance reset <role-guidance>` restores only the selected active role
  `GUIDANCE.md` from its package origin.
- `aix guidance reset --all` previews modified guidance grouped by kind and
  origin, then requires confirmation before removing workflow overrides or
  restoring role guidance.
- source removal deletes source metadata and an empty package source directory
  only after manifest, lockfile, and package-directory dependency checks pass.

Published template reset preserves unrelated files under `.agents/templates/`.
Guidance reset preserves unrelated files under `.agents/guidance/` and
unrelated role files.
Workflow uninstall preserves project-owned `_docs` content and unrelated root
`AGENTS.md` text.

## Symlink And File Handling

Active direct skills are symlinks to package directories when no alias is used.
Active aliased skills are managed directory copies with rewritten `SKILL.md`
front matter. Active roles are Markdown files, not symlinks.

When removing an active skill, AIX checks whether the active path is a symlink:

- symlinks are removed with `unlinkSync`
- non-symlink active skill directories are removed recursively only after hash
  checks pass

Role file removal uses a lockfile-derived active path and package path after
hash checks.

## Atomic Writes

Manifest, lockfile, and source metadata writes use a temporary file followed by
rename. Temporary files are created with mode `0644`. Atomic rename reduces the
risk of partially written JSON, but it is not a concurrency lock; concurrent
`aix` processes are not a supported coordination model.

## Force Update Safety

`aix update --force` is the only force-enabled update command. It creates a
completed backup before replacement and validates manifest/lockfile paths,
canonical boundaries, symlinks, hardlinks, special files, and transaction
state. Replacement bypasses drift checks only for files proven AIX-managed by
lockfile/package-store ownership. Unlisted, ambiguous, project-owned, and
foreign compatibility content is preserved; no audit finding is merged
automatically. The backup is retained on failure and without a TTY, and
interactive deletion requires explicit operator approval.

The backup scope includes `.agents/`, `.claude/`, `.codex/`, `aix.json`,
`aix.lock.json`, and `AGENTS.md`; `.aix/pm` is outside the mutation scope.
Backup directories use restrictive permissions and completion metadata. A
transaction lock/journal prevents concurrent or interrupted force updates from
silently starting another rebuild.

## Verification Evidence

Security-sensitive refusal behavior is covered by tests for:

- skill active-name collisions
- dirty package directories
- edited active skill refusal
- edited package refusal
- dependency deactivation blockers
- workflow-owned skill and role deactivation blockers
- workflow package, doc, role, and template drift
- workflow guidance and role guidance drift
- template publish overwrite refusal
- template reset preserving unrelated files
- guidance publish overwrite refusal
- guidance reset preserving unrelated files
- source removal blocked by manifest, lockfile, or non-empty package dirs
- force-update backup inventory, path traversal, symlink, hardlink, special-file,
  tamper, interrupted-transaction, ownership, and preservation checks

## Known Residual Risk

- The current implementation does not use OS-level file locks around manifest
  or lockfile writes.
- Force deletes are used in scoped cleanup paths after preflight checks; a bad
  lockfile path would increase risk.
- AIX does not prevent a separate process from changing files between preflight
  and mutation.
