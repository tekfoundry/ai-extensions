---
name: plan-activate
description: Move a human-authorized backlog plan into active implementation. Use as a lifecycle procedure selected by project-manager or a delegated role, or when project-manager is not active; never use to autonomously activate backlog work.
---

# Plan Activate

Activation is a human-controlled boundary. Use this skill only when the user
explicitly asks to activate, promote, or start a backlog plan.

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

## Workflow

1. Resolve the referenced backlog plan. Stop if the plan is not under
   `_docs/plans/backlog/` or if the user did not explicitly authorize
   activation.
2. Read `AGENTS.md`, `.agents/workflow.md`, `_docs/README.md`, relevant
   design docs, the full backlog plan, and current worktree status. Read
   completed plans only for relevant historical decisions, regressions, or
   migrations.
3. Check readiness: the plan must have clear design intent, phases, tasks,
   success goals, verification expectations, risks, and promotion-to-design
   guidance. Compare it with the active workflow `plan.md` template when that
   template is available, but do not rewrite a ready plan solely for cosmetic
   template differences.
4. Move the plan into `_docs/plans/` without changing its filename unless the
   user requested a rename. Preserve all execution history.
5. Update the plan only as needed to state that human activation occurred and
   to correct stale backlog-only wording.
6. Run targeted verification: `git status --short`, `git diff --check` for the
   moved plan, and a search confirming no duplicate active/backlog copy remains.
7. Report the move, readiness notes, verification, documentation impact,
   skipped checks, and whether escalation was needed.

## Guardrails

- Never activate a backlog plan because it looks ready; explicit human
  direction is required.
- Do not begin implementation in the same step unless the user also requested
  execution and the relevant execution skill is invoked afterward.
- Stop if activation would require unresolved product, architecture, security,
  external-system, transfer, delete, overwrite, trust, publishing, persistence,
  or runtime-contract decisions.
