# Security knowledge

Owner: `security-engineer`

## Documents

- [Trust boundaries](trust-boundaries.md): local filesystem, Git source,
  package store, lockfile, overwrite, and destructive-operation safety model.

This area records the current security and safety posture for AI Extensions.
Treat local file writes, overwrites, deletes, source resolution, lockfile
integrity, package trust, and workflow-owned agent behavior as safety-sensitive
topics.

Use this area for:

- threat models and trust-boundary diagrams
- secrets, credential, and redaction posture
- authorization and permission assumptions
- destructive operations and no-write guarantees
- source, package, workflow, role, and skill trust boundaries
- supply-chain risks and auditability
- security-sensitive failure paths and verification expectations

Do not hide unresolved security conflicts in prose. Record them as risks,
open decisions, or follow-up plan candidates.
