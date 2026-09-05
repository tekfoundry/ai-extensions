# Forced Update Recovery

## Status

Accepted and implemented for the local workspace update lifecycle.

## Decision

`aix update --force` is the sole force-enabled update command. It must create a
validated, timestamped `aix_bak_YYYY_MM_DD_hh_mm_ss` backup before replacing
AIX-managed state, then reuse the normal workflow, skill, and role update
primitives and pass verification. It does not implement a separate installer
or silently merge edits.

The backup includes `.agents/`, `.claude/`, `.codex/`, `aix.json`,
`aix.lock.json`, and `AGENTS.md`; `.aix/pm`, project-owned documentation,
unrelated root instruction text, and foreign compatibility content remain
outside replacement authority. Proven package-store stale directories may be
cleaned, while legacy active files and ambiguous content are retained.

After successful verification, AIX emits a three-way audit based on the old
lockfile baseline, backup, and rebuilt installation. Interactive cleanup needs
explicit operator approval and defaults to keep; non-interactive and failed
runs retain and report the exact backup path. Interrupted or malformed state
fails closed.

## Rationale

A protected routine update cannot repair incompatible historical layouts, but
an indiscriminate overwrite would discard useful project edits. Backup-first
forward rebuild provides recoverability while preserving ownership boundaries.

## Evidence

- Coordinator: `src/force-update/coordinator.ts`
- Inventory: `src/force-update/inventory.ts`
- Audit: `src/force-update/audit.ts`
- Regression coverage: `tests/force-update.test.mjs` and
  `tests/force-update-inventory.test.mjs`

See [package management](../03-architecture/package-management.md), [local
file safety](../04-security/local-file-safety.md), and [release and maintenance](../06-operations/release-and-maintenance.md).
