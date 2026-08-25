---
name: plan-complete
description: Close an implementation plan only after tasks, verification, design promotion, risks, and documentation impact are resolved or explicitly recorded. Use when a user asks to complete or archive a plan.
---

# Plan Complete

Use this skill for plan closeout. Do not archive a plan merely because files
changed or most tasks are marked complete.

## Role Collaboration

`plan-complete` owns closeout, checklist updates, final risk recording, design
promotion, documentation review, and archive placement. Roles can supply
bounded specialist judgment, but they do not own completion approval,
developer acceptance, lifecycle state, or final residual-risk decisions.

When `.agents/roles/security-reviewer.md` exists and the plan includes
security-sensitive behavior, use `delegate-to-role` or a prompt-overlay
delegation to request the required post-phase security review before
completion. Good triggers include trust boundaries, secrets, authentication,
authorization, permissions, dependency or supply-chain risk, local file writes,
overwrites, deletes, renames, external systems, network access, package trust,
source resolution, lockfile integrity, destructive operations, no-write
guarantees, or redaction.

Fold returned evidence into the plan's `Security Review` section, completion
checklist, final risks, follow-on work, or blocking task list as appropriate.
Do not require `security-reviewer` for direct use. If the role is unavailable
or the host cannot delegate, continue closeout yourself by checking the same
security-sensitive behavior and recording the review evidence.

## Workflow

1. Resolve the plan explicitly, or infer it only when exactly one active plan
   exists. Fail clearly when multiple candidates exist.
2. Confirm every task and success goal, including documented validation gaps.
3. Confirm the human validation gate before completing the checklist: the
   developer has evaluated the completed phased work and accepted it, or the
   developer explicitly waived manual validation and the plan records the
   reason. Do not infer acceptance from passing automated tests.
4. Run or review required targeted and repository verification.
5. Complete the Security Review gate. Record post-phase findings in the
   plan's `Security Review` section. Convert blocking security findings into
   normal plan tasks before closeout instead of archiving with unresolved
   blockers.
6. Promote durable accepted behavior using `$design-promote`.
7. Review documentation structure, formatting, links, and current-state
   accuracy using `$documentation-review`.
8. Harvest reusable lessons and update workflow guidance when appropriate.
9. Record final risks, follow-on work, documentation impact, and verification.
   Keep the completed record consistent with the active workflow `plan.md`
   template where it applies.
10. Archive only completed plans under `_docs/plans/completed/` with the
   required `YYYY-MM-DD-<name>.md` filename.

When the plan contains `## Completion Checklist`, update it during closeout.
The checklist is visible planning guidance, not the sole source of truth. Still
enforce this skill's workflow and guardrails if the section is missing or was
edited locally.

## Guardrails

- Never archive a backlog plan or activate one implicitly.
- Refuse closeout when incomplete work or undocumented verification gaps remain.
- Refuse closeout when the human validation gate is missing, incomplete, or
  only implied by automated checks.
- Refuse closeout when a required Security Review is missing, blocking
  security findings remain unresolved, or residual security risk is not
  recorded.
- Preserve unrelated worktree changes.
- Keep the archived plan as historical execution evidence, not the sole source
  of current design truth.
