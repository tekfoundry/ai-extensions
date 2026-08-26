# Trust Boundaries

## Boundary Map

```text
remote or local extension source
  -> AIX source resolution and validation
  -> .agents/packages package copy
  -> .agents active exposure
  -> agent runtime reads active files
```

Trust increases only after validation, materialization, hashing, and drift
checks. AIX does not certify third-party sources; it records provenance and
prevents silent local overwrite.

## Local Filesystem Safety

Package-managed writes are safety-sensitive. AIX must preserve:

- project-owned files outside managed blocks
- `_docs` content
- local `.agents` files that drift from lockfile hashes
- published template overrides
- editable local `./aix/...` extension source

Root `AGENTS.md` is mixed ownership. Only the marker-delimited workflow block
is package-managed. Everything outside that block is project-owned.

## Source And Supply-Chain Risk

Git-backed sources can be public, private, or local. GitHub tree URLs are
normalized into Git source metadata, but normalization does not imply trust.
`discover-skill` remains advisory and must route installation through normal
review and package-management commands.

## Destructive Operations

Remove, reset, deactivate, uninstall, and update flows must verify hashes
before deleting or overwriting package-managed files. If package or active
files drift, the command stops.

`aix templates reset` deletes only selected published overrides that belong to
the active workflow template set. It does not copy origin content over local
files.

## Secrets Posture

AIX stores source URLs, refs, paths, lockfile hashes, and package metadata. It
does not intentionally store secret tokens. CLI output and errors should not
log raw credentials from Git URLs, environment variables, or external tools.

## Auditability

The manifest and lockfile provide the audit trail for what was requested,
resolved, packaged, and exposed. Completed plans and `_docs/kb` explain why
durable workflow or product behavior exists, but implementation and lockfile
state remain the evidence for current package state.
