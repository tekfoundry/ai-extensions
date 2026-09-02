---
name: plan-defer
description: Move planned work out of active implementation and into backlog. Use as a lifecycle procedure selected by project-manager or a delegated role, or when project-manager is not active while preserving status, risks, and future activation context.
metadata:
  type: skill
version: "1"
---

# Plan Defer

Use this skill only for explicit user requests to defer active planned work.
Deferral is not completion and must preserve enough context for later human
activation.

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

1. Resolve the referenced active plan. Stop if the plan is not under
   `_docs/plans/` or if the user did not explicitly request deferral.
2. Read `AGENTS.md`, `.agents/workflow.md`, `_docs/README.md`, relevant
   design docs, the full active plan, and current worktree status. Read
   completed plans only for relevant historical decisions, regressions, or
   migrations.
3. Confirm deferral is safe: record incomplete tasks, verification gaps,
   unresolved decisions, risks, and any partially implemented work.
4. Update the plan with a deferral note and any reactivation prerequisites.
   Keep the plan aligned with the active workflow `plan.md` template where it
   applies.
5. Move the plan into `_docs/plans/backlog/` without changing its filename
   unless the user requested a rename.
6. Run targeted verification: `git status --short`, `git diff --check` for the
   moved plan, and a search confirming no duplicate active/backlog copy remains.
7. Report the move, preserved context, verification, documentation impact,
   skipped checks, and whether escalation was needed.

## Guardrails

- Do not use deferral to hide failed verification or incomplete implementation;
  record those gaps in the plan.
- Do not archive deferred work under `_docs/plans/completed/`.
- Stop if active code changes need cleanup, revert, or release-risk decisions
  that the user has not explicitly authorized.
