# Security knowledge

Owner: `security-engineer`

## Documents

- [Trust boundaries](trust-boundaries.md): local filesystem, Git source,
  package store, lockfile, active exposure, and runtime trust zones.
- [Local file safety](local-file-safety.md): managed/project-owned file
  boundaries, no-overwrite rules, destructive-operation guards, atomic writes,
  and residual local risks.
- [Source and package trust](source-and-package-trust.md): Git source
  resolution, package acceptance, instruction trust, workflow trust, and
  supply-chain non-goals.
- [Auditability and verification](auditability-and-verification.md): manifest
  and lockfile audit records, verify/status/diff coverage, test evidence, and
  residual verification gaps.

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
