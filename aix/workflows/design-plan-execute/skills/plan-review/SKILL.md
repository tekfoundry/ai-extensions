---
name: plan-review
description: Review an implementation plan for scope, authorization, design completeness, risks, and verification readiness without implementing it. Use as a lifecycle procedure selected by project-manager or a delegated role, or when project-manager is not active.
metadata:
  type: skill
version: "1"
---

# Plan Review

Review the referenced plan as an execution contract without changing code or
activating backlog work.

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

`plan-review` owns the review result. Roles can supply bounded specialist
judgment, but they do not own readiness decisions, activation recommendations,
plan edits, lifecycle state, or user-facing findings.

When `.agents/roles/technical-architect/ROLE.md` exists and the plan has
architecture-sensitive scope, use `delegate-to-role` or a prompt-overlay
delegation to request a bounded architecture-readiness pass. Good triggers
include system boundaries, component contracts, module ownership, runtime
contracts, integration choices, data flow, persistence, package-management
behavior, workflow lifecycle behavior, implementation-phase sequencing, or
maintainability tradeoffs.

Fold returned evidence into review findings, activation blockers, risks,
verification gaps, requested plan revisions, or readiness notes as appropriate.
Do not require `technical-architect` for direct use. If the role is unavailable
or the host cannot delegate, continue the review yourself by checking the same
architecture-readiness concerns.

When `.agents/roles/product-owner/ROLE.md` exists and the plan has
product-scope, audience, value, sequencing, prioritization, opportunity-cost,
or product-fit risk, use `delegate-to-role` or a prompt-overlay delegation to
request a bounded product-owner readiness pass.

Fold returned evidence into review findings, activation blockers, risks,
requested plan revisions, open questions, scope boundaries, or readiness notes
as appropriate. Do not require `product-owner` for direct use. If the
role is unavailable or the host cannot delegate, continue the review yourself
by checking the same product-owner readiness concerns.

When `.agents/roles/product-designer/ROLE.md` exists and the plan has
product-facing UX scope, use `delegate-to-role` or a prompt-overlay delegation
to request a bounded design-readiness pass. Good triggers include user flows,
interaction design, accessibility, layout hierarchy, prototypes, terminal UX,
prompts, product-facing states, error or recovery paths, and design-system
fit.

Fold returned evidence into review findings, activation blockers, risks,
verification gaps, requested plan revisions, human-review notes, or readiness
notes as appropriate. Do not require `product-designer` for direct use. If the
role is unavailable or the host cannot delegate, continue the review yourself
by checking the same product-design readiness concerns.

When `.agents/roles/requirements-engineer/ROLE.md` exists and the plan needs
requirements-readiness review, use `delegate-to-role` or a prompt-overlay
delegation to request a bounded requirements pass. Good triggers include
requirements, actors, workflows, inputs, outputs, constraints, non-goals,
boundaries, invariants, acceptance signals, open decisions, Design Intent
readiness, and whether implementation phases were drafted too early.

Fold returned evidence into review findings, activation blockers, risks,
verification gaps, requested plan revisions, open questions, human-review
notes, or readiness notes as appropriate. Do not require
`requirements-engineer` for direct use. If the role is unavailable or the host
cannot delegate, continue the review yourself by checking the same
requirements-readiness concerns.

When `.agents/roles/security-engineer/ROLE.md` exists and the plan has
security-sensitive scope, use `delegate-to-role` or a prompt-overlay delegation
to request a bounded security-readiness pass. Good triggers include trust
boundaries, secrets, authentication, authorization, permissions, dependency or
supply-chain risk, local file writes, overwrites, deletes, renames, external
systems, network access, package trust, workflow installation or updates,
source resolution, lockfile integrity, destructive operations, and no-write
guarantees.

Fold returned evidence into review findings, activation blockers, risks,
verification gaps, requested plan revisions, Security Review notes, human
review notes, or readiness notes as appropriate. Do not require
`security-engineer` for direct use. If the role is unavailable or the host
cannot delegate, continue the review yourself by checking the same
security-readiness concerns.

When `.agents/roles/ux-writer/ROLE.md` exists and the plan has user-facing or
developer-facing copy scope, use `delegate-to-role` or a prompt-overlay
delegation to request a bounded UX writing readiness pass. Good triggers
include labels, prompts, command help, terminal output, errors, empty states,
onboarding copy, README language, workflow instructions, release notes, or
docs copy that tells users what to do.

Fold returned evidence into review findings, activation blockers, risks,
verification gaps, requested plan revisions, human-review notes, or readiness
notes as appropriate. Do not require `ux-writer` for direct use. If the role
is unavailable or the host cannot delegate, continue the review yourself by
checking the same copy, terminology, message-state, recovery, and user-action
concerns.

When `.agents/roles/quality-engineer/ROLE.md` exists and the plan needs
verification-readiness review, use `delegate-to-role` or a prompt-overlay
delegation to request a bounded quality pass. Good triggers include acceptance
checks, targeted verification, regression risk, failure paths, manual
validation, skipped-check rationale, evidence expectations, validation gaps,
and residual risk.

Fold returned evidence into review findings, activation blockers, risks,
verification gaps, requested plan revisions, human-review notes, or readiness
notes as appropriate. Do not require `quality-engineer` for direct use. If the
role is unavailable or the host cannot delegate, continue the review yourself
by checking the same verification-readiness concerns.

## Workflow

1. Resolve the plan and read its context, design intent, phases, risks,
   verification, Security Review, and promotion requirements.
   Compare the plan against the active workflow `plan.md` template when that
   template is available. Local customization is fine, but missing required
   sections are workflow defects.
2. Read the repository instructions, documentation router, relevant `_docs/kb`
   docs, related active or backlog plans, and current worktree state. Read
   completed plans only when specific historical decisions, regressions, or
   migrations are relevant to the review.
3. Check work classification and whether the requested phase is authorized.
4. Flag a missing `Completion Checklist` as a required-section defect that
   must be repaired before the plan is treated as ready or complete.
5. Report findings in priority order: missing decisions, conflicting sources
   of truth, unsafe assumptions, weak success criteria, and verification gaps.
6. State whether the plan is ready for execution and identify the exact
   blocking questions when it is not.

## Guardrails

- A backlog plan may be reviewed and refined, but never activated by review.
- Do not load completed plans as default context or treat them as current-state
  truth without a historical reason to consult them.
- Do not claim readiness when a material data-safety, credential,
  external-system, publishing, persistence, runtime-boundary, or contract
  decision remains unresolved.
- Do not claim readiness when a plan lacks required actors, workflows, inputs,
  outputs, constraints, non-goals, boundaries, acceptance signals, or
  decision timing for unresolved requirements.
- Do not claim readiness when a plan with security-sensitive scope lacks
  trust-boundary, credential, authorization, destructive-operation, dependency,
  failure-path, or safety-verification decisions.
- Do not claim readiness when verification expectations, regression-risk
  coverage, manual validation needs, skipped-check rationale, or acceptance
  evidence are too vague to guide implementation.
