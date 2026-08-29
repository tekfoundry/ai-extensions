---
name: plan-execute
description: Orchestrate execution of an active implementation plan across phases. Use as a lifecycle procedure selected by project-manager or a delegated role, or when project-manager is not active.
---

# Plan Execute

Use this skill as the parent orchestration context for whole-plan execution.
It sequences phases and owns integration, verification review, documentation
impact, risk tracking, and closeout. It does not bypass `phase-execute` or
`task-execute`.

## Project-Manager Entry Gate

When the active `project-manager` role is present, meaningful AIX project
requests should reach this skill only after project-manager routing or a
delegated role selects it as the procedure for bounded work. Lifecycle skills
are procedures selected by the project-manager or delegated roles, not default
direct request entrypoints.

If a direct user request reaches this skill without PM routing context or a PM
Context Packet, stop and route through project-manager first.

Allowed bypasses are PM Review, tiny informational requests that require no
file reads or commands, bootstrapping before project-manager is active,
already-routed requests carrying PM routing context or a PM Context Packet,
and explicit developer override.

## Role Collaboration

`plan-execute` owns plan-level phase sequencing, integration review,
verification evidence review, documentation impact, risk tracking, and the
decision to stop or continue. Roles can supply bounded specialist judgment,
but they do not own phase execution, task execution, command execution, plan
status, or final plan completion decisions.

When `.agents/roles/implementation-engineer/ROLE.md` exists and whole-plan
execution depends on phase order, cross-phase dependencies, changed-area
ownership, integration risk, documentation impact, or whether the next phase
is ready for `phase-execute`, use `delegate-to-role` or a prompt-overlay
delegation to request bounded implementation input.

Fold returned evidence into phase ordering, phase readiness, task-boundary
notes, changed-file expectations, integration risk, verification handoff,
documentation impact, residual risk, follow-on tasks, or stop conditions as
appropriate. Do not require `implementation-engineer` for direct use. If the
role is unavailable or the host cannot delegate, continue plan execution
yourself by checking the same implementation readiness and sequencing
concerns.

## Workflow

1. Resolve the active plan using `Active Plan Resolution` in
   `.agents/workflow.md`.
2. Read `AGENTS.md`, `.agents/workflow.md`, `_docs/README.md`, relevant
   design docs, the full active plan, and current worktree status. Read
   completed plans only for relevant historical decisions, regressions, or
   migrations.
3. Classify the work as active-plan execution and state that classification.
4. Review phase order, dependencies, success goals, verification, risks, and
   promotion-to-design requirements. Use the active workflow `plan.md`
   template as a consistency reference for plan sections and status vocabulary
   when it is available.
5. For each open phase, invoke or follow `phase-execute` on that bounded phase.
   After each phase, review plan status, verification evidence, documentation
   impact, risks, and worktree state before continuing.
6. Stop on unclear product or design decisions, missing backlog activation
   authorization, failed or blocked verification, task, phase, or plan scope
   expansion, underspecified safety-sensitive behavior, relevant worktree
   conflicts or unrelated user changes, context that is too large to reason
   about confidently, or unexpected failure.
7. When all phases are complete, run or request `plan-complete` for verification
   review, design promotion, risk closeout, and archiving.
8. Report phases completed, files changed, verification, documentation impact,
   skipped checks, remaining risks, and whether escalation was needed.

## Guardrails

- Never activate backlog work or archive a plan from this skill without the
  matching lifecycle skill and explicit user request.
- Keep the parent context responsible for sequencing and integration even when
  bounded phase or task work is delegated.
- Preserve authoritative plan state in the parent context. Delegated work must
  return files changed, verification performed, remaining risks, documentation
  impact, and scope-expansion status before the parent continues.
- Delegate bounded phase or task work only when context size, risk, or
  parallelism justifies a fresh context and the delegated scope is independent
  enough to review cleanly.
- Preserve local file safety, external-system safety, credentials, trust data,
  publishing, persistence, and runtime-contract safeguards.
