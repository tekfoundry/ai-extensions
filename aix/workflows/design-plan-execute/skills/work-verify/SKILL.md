---
name: work-verify
description: Select and run targeted verification for a change, then report results, gaps, and whether plan success criteria are satisfied. Use as a lifecycle procedure selected by project-manager or a delegated role, or when project-manager is not active.
metadata:
  type: skill
version: "1"
---

# Work Verify

Verify changed behavior from the smallest relevant checks outward. Passing
commands alone do not establish that plan success criteria are complete.

## Project-Manager Entry Gate

When the active `project-manager` role is present, repo-changing,
project-mutating, lifecycle-state, planning, verification, documentation, or
other meaningful AIX project requests should reach this skill only after
project-manager routing and only when the project-manager or a delegated
role selects it as the procedure for bounded work.
Lifecycle skills are role-owned procedures, not default
direct request entrypoints.

If a direct user request or parent-context continuation reaches this skill
without PM routing context or a PM Context Packet, stop and route through
project-manager first. A parent context that received a PM Context Packet may
route, preserve worktree safety, review returned evidence, and report results;
parent review is minimal and exception-driven, trusting delegated role evidence
unless uncertainty, out-of-scope changes, failed tests, incomplete evidence,
safety-sensitive changes, or another role's need for exact file content gives a
concrete reason to re-read files. It must not run this lifecycle skill itself
to implement, verify, change lifecycle state, or perform repo-changing work
outside the delegated role.

Allowed bypasses are PM Review, tiny informational requests that require no
file reads, commands, lifecycle state, specialist judgment, or safety-sensitive
decisions, bootstrapping before project-manager is active, already-routed
requests carrying PM routing context or a PM Context Packet, and explicit
developer override.

## Role Collaboration

For PM-routed work, inspect the complete host/tool registry, including
deferred tools, before dispatch. Native delegation is required. An unknown or
unavailable required capability blocks parent-session and prompt-overlay
fallback. The prompt-overlay options below apply only to direct non-PM use,
bootstrap before PM activation, or explicit developer override.

`work-verify` owns check selection, command execution, verification evidence,
and the final verification report. Roles can supply bounded specialist
judgment, but they do not own command execution, plan status, or the decision
to accept residual risk.

When `.agents/roles/security-engineer/ROLE.md` exists and the changed behavior is
security-sensitive, use `delegate-to-role` or a prompt-overlay delegation to
request a bounded security-verification pass. Good triggers include trust
boundaries, secrets, authentication, authorization, permissions, dependency or
supply-chain risk, local file writes, overwrites, deletes, renames, external
systems, network access, package trust, source resolution, lockfile integrity,
destructive operations, no-write guarantees, or redaction.

Fold returned evidence into selected checks, skipped-check rationale, manual
verification notes, residual risk, or follow-up work as appropriate. Do not
require `security-engineer` for direct use. If the role is unavailable or the
host cannot delegate, continue verification yourself by checking the same
security-sensitive behavior and failure paths.

When `.agents/roles/quality-engineer/ROLE.md` exists and the verification choice or
evidence has meaningful quality risk, use `delegate-to-role` or a
prompt-overlay delegation to request a bounded quality pass. Good triggers
include non-trivial changed behavior, regression risk, failure paths, edge
cases, targeted-test selection, manual validation, skipped-check rationale,
acceptance evidence, validation gaps, or residual risk.

Fold returned evidence into selected checks, manual verification notes,
skipped-check rationale, validation gaps, residual risk, or follow-up work as
appropriate. Do not require `quality-engineer` for direct use. If the role is
unavailable or the host cannot delegate, continue verification yourself by
checking the same targeted coverage, regression, acceptance, and residual-risk
concerns.

When `.agents/roles/implementation-engineer/ROLE.md` exists and selecting checks
depends on changed implementation boundaries, likely touched files, dependency
order, fixtures, compatibility paths, build or package artifacts, or
documentation impact, use `delegate-to-role` or a prompt-overlay delegation to
request bounded implementation input.

Fold returned evidence into selected checks, changed-file coverage notes,
manual verification steps, skipped-check rationale, residual risk, or
follow-up work as appropriate. Do not require `implementation-engineer` for
direct use. If the role is unavailable or the host cannot delegate, continue
verification yourself by checking the same implementation-boundary and
coverage-handoff concerns.

## Workflow

1. Identify the changed subsystem and read its design and quality guidance.
2. Run targeted tests or deterministic checks first.
3. Run applicable repository checks only after targeted verification passes, or
   after a targeted-check failure or blocker has been recorded with residual
   risk.
4. Add linting, smoke, packaging, release, or other repository-specific checks
   when the changed surface requires them.
5. Report exact commands, outcomes, skipped checks and reasons, manual checks,
   documentation impact, remaining risks, and whether the phase success
   criteria are met.

## Safety Matrix

- Runtime-boundary changes require all relevant callers, implementations,
  contracts, and adapters to be verified together.
- External-system changes require connect, disconnect, trust, authentication,
  and failure-path review when those concepts apply.
- File operation changes require path, overwrite, delete, rename,
  cancellation, conflict, and failure-path review.
- Credential-related changes require redaction and persistence-boundary review.
- Dependency and package-management changes require trust, source-resolution,
  lockfile-integrity, drift, and no-write failure-path review when those
  concepts apply.
