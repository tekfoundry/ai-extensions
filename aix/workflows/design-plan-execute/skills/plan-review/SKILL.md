---
name: plan-review
description: Review an implementation plan for scope, authorization, design completeness, risks, and verification readiness without implementing it. Use when a user asks to review or assess a plan.
---

# Plan Review

Review the referenced plan as an execution contract without changing code or
activating backlog work.

## Role Collaboration

`plan-review` owns the review result. Roles can supply bounded specialist
judgment, but they do not own readiness decisions, activation recommendations,
plan edits, lifecycle state, or user-facing findings.

When `.agents/roles/technical-architect.md` exists and the plan has
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

When `.agents/roles/product-strategist.md` exists and the plan has
product-scope, audience, value, sequencing, prioritization, opportunity-cost,
or product-fit risk, use `delegate-to-role` or a prompt-overlay delegation to
request a bounded product-strategy readiness pass.

Fold returned evidence into review findings, activation blockers, risks,
requested plan revisions, open questions, scope boundaries, or readiness notes
as appropriate. Do not require `product-strategist` for direct use. If the
role is unavailable or the host cannot delegate, continue the review yourself
by checking the same product-strategy readiness concerns.

When `.agents/roles/product-designer.md` exists and the plan has
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

When `.agents/roles/security-reviewer.md` exists and the plan has
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
`security-reviewer` for direct use. If the role is unavailable or the host
cannot delegate, continue the review yourself by checking the same
security-readiness concerns.

## Workflow

1. Resolve the plan and read its context, design intent, phases, risks,
   verification, Security Review, and promotion requirements.
   Compare the plan against the active workflow `plan.md` template when that
   template is available, but do not treat local template customization as a
   defect by itself.
2. Read the repository instructions, documentation router, relevant design
   docs, related active or backlog plans, and current worktree state. Read
   completed plans only when specific historical decisions, regressions, or
   migrations are relevant to the review.
3. Check work classification and whether the requested phase is authorized.
4. Report findings in priority order: missing decisions, conflicting sources
   of truth, unsafe assumptions, weak success criteria, and verification gaps.
5. State whether the plan is ready for execution and identify the exact
   blocking questions when it is not.

## Guardrails

- A backlog plan may be reviewed and refined, but never activated by review.
- Do not load completed plans as default context or treat them as current-state
  truth without a historical reason to consult them.
- Do not claim readiness when a material data-safety, credential,
  external-system, publishing, persistence, runtime-boundary, or contract
  decision remains unresolved.
- Do not claim readiness when a plan with security-sensitive scope lacks
  trust-boundary, credential, authorization, destructive-operation, dependency,
  failure-path, or safety-verification decisions.
