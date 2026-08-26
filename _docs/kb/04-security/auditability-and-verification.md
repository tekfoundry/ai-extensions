# Auditability And Security Verification

## Audit Records

AIX's audit trail is file-based:

- `aix.json` records requested sources, workflow, standalone skills, and
  standalone roles.
- `aix.lock.json` records resolved commits, package paths, active paths,
  aliases, ownership, dependency edges, docs, templates, managed block hashes,
  package hashes, and active hashes.
- `.agents/packages/` contains accepted package copies.
- `.agents/skills/` and `.agents/roles/` expose active runtime-visible assets.
- `_docs/plans/` records implementation evidence while work is active.
- `_docs/kb/` records accepted current-state knowledge.

The lockfile is the primary evidence for current package state. Plans and KB
docs explain intent and history, but verification uses implementation files and
lockfile hashes.

## Verify Command Coverage

`aix verify` aggregates skill, role, and workflow verification.

Skill verification checks:

- active skill name collisions in the lockfile
- package path and active path consistency
- alias consistency
- package and active file hashes
- package and active `SKILL.md` names
- manifest skill requests that are missing from the lockfile
- requested lockfile skills missing from the manifest

Role verification checks active role state and drift for standalone and
workflow-owned roles.

Workflow verification checks:

- single active workflow invariant
- workflow package drift
- workflow docs
- workflow templates
- managed `AGENTS.md` block
- workflow-owned skills listed in the workflow lockfile entry

## Status Command Security Value

`aix status` is read-oriented. It reports:

- initialized state
- manifest and lockfile presence
- active workflow provenance
- skill, role, and workflow sources
- active skills and roles
- dependency-only skills
- workflow-owned skills and roles
- verification issues
- update availability

When update checks cannot resolve sources, status reports the unavailable
reason instead of mutating package state.

## Diff Commands

Diff commands are review tools and must not mutate package or active state.
They compare accepted package copies against resolved source snapshots or
published template overrides against workflow origins.

Diff surfaces include:

- standalone skills
- standalone roles
- active workflow package
- published workflow templates

## Security-Sensitive Test Evidence

The test suite covers security-sensitive failure paths across:

- activation collision checks
- no-write preflight checks
- package and active drift refusal
- workflow-owned lifecycle boundaries
- role-owned skill deactivation refusal
- source removal blockers
- template overwrite refusal
- template reset scoping
- workflow uninstall preserving project-owned `AGENTS.md` text
- verify/status drift reporting

Broad regression evidence comes from `npm test`. Build integrity comes from
`npm run build`. Project installation integrity comes from `node bin/aix.js
verify`.

## Residual Verification Gaps

- There is no automated redaction test for credentials embedded in source URLs.
- There is no concurrency test for simultaneous commands writing manifest or
  lockfile files.
- There is no signed-source or signed-package verification test because that
  behavior is not implemented.
- There is no sandbox test for agent runtime behavior because AIX does not own
  the runtime sandbox.
