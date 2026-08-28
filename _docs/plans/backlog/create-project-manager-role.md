# Create Project Manager Role

## Status

📝 Planning Draft

## Context

The guidance-library work is moving AIX toward focused role and activity
guidance. The current workflow still makes the main agent choose among roles,
skills, activity context, and documentation before work begins. That can burn
tokens, especially when specialist roles are used only for read-only advice and
the main agent later repeats much of the same context gathering.

The developer wants a cleaner request entry model:

- Every meaningful request starts through one thin entry role.
- That role classifies the request, chooses the smallest useful context, and
  selects one primary role for the work.
- Specialist roles do the work and choose the skills they need.
- Skills remain procedures, not primary worker identities.
- Broad fan-out to every plausible role is avoided because agents tend to find
  work even when a domain only loosely applies.

Reviewed context:

- `AGENTS.md`
- `.agents/workflow.md`
- `.agents/engineering-best-practices.md`
- `_docs/README.md`
- `_docs/kb/03-architecture/workflow-lifecycle.md`
- `_docs/plans/workflow-guidance-library.md`
- Thread discussion on 2026-08-28 about `router`, `bootstrapping`,
  `get-guidance`, `delegate-to-role`, role-owned work, and a
  `project-manager` entry role.

## High-Level Goal (status: accepted)

Create a `project-manager` role that acts as the universal lightweight entry
point for AIX agent requests. The role should bootstrap each request, identify
the likely activity and task context, resolve focused guidance, select one
primary specialist role when work is needed, and keep delegation narrow enough
to avoid role churn.

This matters because the desired operating model is role-centered:

- The project manager decides who should think about the request.
- The selected role decides how to work.
- Skills provide repeatable procedures.
- Guidance provides focused judgment.

The entry process should help agents start quickly without loading every role,
skill, or guidance file.

## Design Intent (status: draft)

Add a top-level `project-manager` role with a focused `ROLE.md` contract and a
`GUIDANCE.md` document that defines request routing behavior.

The project-manager role should be thin. It should not become the agent that
does all implementation, documentation, review, and verification work. Its main
job is to decide the first useful path and hand work to the right specialist
role with compact context.

The expected startup flow is:

1. Identify bootstrap variables:
   - `requesting_role`
   - `requesting_skill`
   - `activity`
   - `task_context`
2. Use `get-guidance` or the equivalent guidance-resolution procedure to find
   the smallest relevant guidance set.
3. Read only the selected entrypoint, role, skill, activity, plan, code, or docs
   context needed for the request.
4. Choose one primary execution path.
5. Delegate execution to the selected role when specialist work is needed.
6. Review returned evidence and route follow-up only when evidence shows
   another role is materially needed.

The preferred routing model is conservative triage, not role fan-out. The
project-manager role should select one primary role by default. It may add a
secondary reviewer only when inspected evidence shows that role's domain is
materially affected.

Role selection should be evidence-based:

- `implementation-engineer`: code changes, task slicing, active-plan execution,
  likely changed files, implementation sequencing, or verification handoff.
- `documentation-specialist`: durable documentation impact, current-state docs,
  README or workflow-doc updates, design promotion, or index/link ownership.
- `technical-architect`: architecture boundaries, module ownership, runtime
  contracts, package-management behavior, or maintainability tradeoffs.
- `requirements-engineer`: requirements, actors, workflows, constraints,
  non-goals, acceptance signals, or plan-readiness questions.
- `quality-engineer`: verification strategy, regression risk, acceptance
  evidence, manual validation, skipped checks, or residual risk.
- `security-engineer`: trust boundaries, credentials, authorization, local file
  overwrite/delete risk, external systems, package trust, or lockfile integrity.
- `product-designer`: user flows, interaction states, accessibility, terminal
  UX, prompts, recovery paths, or design-system fit.
- `product-strategist`: product value, audience, scope, prioritization,
  sequencing, opportunity cost, or idea maturity.
- `ux-writer`: command help, prompts, labels, errors, onboarding copy, README
  language, workflow instructions, or developer-facing wording.

The role should distinguish between role execution and role review:

- Role execution means the specialist role owns the bounded work and chooses
  which skills to use.
- Role review means the specialist role returns findings, gaps, or verification
  advice without taking over the work.

For very small requests, the project-manager role may answer directly when no
specialist role, workflow state, file inspection, or delegation is needed.

The `AGENTS.md` integration should stay small. The likely future shape is a
short instruction such as: start each request through the active
`project-manager` role, which resolves the smallest useful context and
delegation path before work begins.

The project-manager role guidance should not depend on
`.agents/engineering-best-practices.md`. Any reusable guardrails needed for
entry routing should live in `project-manager/GUIDANCE.md` or focused activity
guidance.

## Non-Goals

- Do not make the project-manager role a broad executor that performs all work
  itself.
- Do not dispatch every request to every plausible role.
- Do not make every request load every role, skill, or guidance file.
- Do not use the project-manager role to bypass active-plan, backlog,
  verification, security, or documentation lifecycle gates.
- Do not make skills the primary worker identity when a suitable role exists.

## Boundaries And Invariants

- The project-manager role owns request triage, sequencing, delegation choice,
  and scope control.
- Specialist roles own bounded execution or review in their domains.
- Skills remain reusable procedures selected by roles.
- Guidance files must be focused enough to support low-token routing.
- Delegation should start with one primary role unless evidence justifies more.
- The parent context remains responsible for final user-facing reporting and
  for preserving worktree safety.
- Backlog work remains unimplemented until explicitly activated.

## Implementation Phases

Not drafted until Design Intent is accepted.

## Open Questions / Decisions

- Should `project-manager` be bundled as a top-level AIX role, a
  workflow-owned role, or both?
- Should `AGENTS.md` always point to `project-manager`, or should the workflow
  append point to it only when the role is active?
- Should `get-guidance` be a separate skill, or should the first version use a
  guidance-resolution section inside `project-manager/GUIDANCE.md`?
- What exact payload should `project-manager` pass to `delegate-to-role` so the
  selected role has enough context without duplicating broad reads?
- When can `project-manager` answer directly instead of delegating?

## Documentation Impact

- Product: Update product workflow language if the role becomes the standard
  way requests enter AIX-assisted work.
- Requirements: Document the entry routing expectations and acceptance signals.
- Architecture: Update workflow lifecycle and roles architecture docs for the
  project-manager entry role and role-first execution model.
- Security: Review delegation, local file safety, authorization, and
  instruction-trust implications.
- Quality: Add verification expectations for routing, minimal context,
  delegation behavior, and no broad role fan-out.
- Operations: Update install, workflow update, and release notes if bundled
  role defaults or managed `AGENTS.md` text change.
- Decisions: Consider a decision record for adopting role-first request
  routing.
- Glossary: Add or update terms for project manager, entry role, bootstrap
  variables, role execution, and role review.

## Product Readiness

- Readiness: Planning draft.
- Evidence needed: Developer review and acceptance of Design Intent before
  phases and tasks are generated.

## Risks

- The project-manager role could become too broad and recreate the context pile
  this work is meant to remove.
- Conservative routing could miss a specialist role unless escalation rules are
  clear and evidence-based.
- Always starting through one role could add overhead to simple questions if
  the direct-answer path is too strict.
- Changing `AGENTS.md` entry behavior could affect all future agent work and
  needs careful review.
- Role-first execution may require updates to existing lifecycle skills so they
  are clearly procedures used by roles rather than standalone worker identities.
- A separate `get-guidance` skill could become another large context source if
  it summarizes guidance instead of resolving the smallest needed files.

## Security Review

- Status: Planning draft.
- Scope reviewed: Initial discussion only.
- Findings: The role would shape agent routing and delegation behavior, so it
  is instruction-sensitive. It must preserve lifecycle authorization, avoid
  broad hidden delegation, keep file-operation and trust-boundary checks
  explicit, and avoid loading unrelated guidance that could alter task behavior.
- Blocking findings converted to plan tasks: Not drafted yet.
- Residual risk: Security review is required after Design Intent acceptance and
  before implementation phases are approved.

## Completion Checklist

- ⬜️ Confirm every task and success goal is complete or explicitly deferred.
- ⬜️ Human validation: developer evaluated the completed phased work and
  accepted it, or explicitly waived manual validation with a recorded reason.
- ⬜️ Run or review required targeted and repository verification.
- ⬜️ Complete Security Review after all implementation phases; record findings,
  convert blocking findings into normal plan tasks, and document residual risk.
- ⬜️ Review the codebase using `$code-review-refactor`; refactor or record
  follow-up work if needed.
- ⬜️ Promote accepted durable behavior into `_docs/kb` using `$design-promote`.
- ⬜️ Review documentation structure, formatting, and links using
  `$review-and-refresh-docs`; fix issues or record follow-up work.
- ⬜️ Record final risks, follow-on work, and documentation impact.
- ⬜️ Harvest reusable lessons and update workflow guidance when appropriate.
- ⬜️ Archive under `_docs/plans/completed/YYYY-MM-DD-<name>.md`.
