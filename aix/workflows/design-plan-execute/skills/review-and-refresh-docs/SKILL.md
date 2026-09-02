---
name: review-and-refresh-docs
description: Review implementation reality and refresh `_docs/kb` so current-state project knowledge matches the code, accepted plans, and verified evidence. Use as a lifecycle procedure selected by project-manager or a delegated role, or when project-manager is not active.
metadata:
  type: skill
version: "1"
---

# Review And Refresh Docs

Use this skill as the documentation acceptance gate after planned work,
knowledge-base migration, closeout preparation, or substantial documentation
changes.

This skill reviews implementation reality and refreshes `_docs/kb/` so the
knowledge base describes the current implemented system. It is the workflow's
authoritative docs gate.

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

`review-and-refresh-docs` owns documentation-system review, knowledge-base
placement, focused documentation edits, conflict recording, final docs
evidence, and user-facing handoff. Roles can supply bounded domain judgment,
but they do not own final docs acceptance, plan state, verification approval,
or lifecycle decisions.

When `.agents/roles/documentation-specialist/ROLE.md` exists, use
`delegate-to-role` or a prompt-overlay delegation for documentation-system
judgment. Good triggers include `_docs/kb` placement, area ownership,
cross-links, freshness, duplication, stale references, implementation-to-plan
conflicts, and whether a documentation gap should become follow-up plan work.

When domain-specific knowledge is material, use the documentation specialist
to route bounded review-and-refresh passes to the relevant roles:

- `product-designer` for product behavior, user flows, interaction states, UX
  principles, and user-facing acceptance signals.
- `requirements-engineer` for actors, workflows, use cases, constraints,
  non-goals, acceptance criteria, and requirements decisions.
- `technical-architect` for subsystem boundaries, runtime contracts, data
  flow, state machines, module maps, diagrams, extension points, and
  maintainability tradeoffs.
- `security-engineer` for threat models, trust boundaries, secrets posture,
  authorization, destructive operations, supply-chain risk, local file safety,
  and auditability.
- `quality-engineer` for verification strategy, test matrices, regression
  risk, manual validation, release checks, coverage philosophy, and known
  validation gaps.
- `ux-writer` for developer-facing or user-facing copy when docs tell people
  what to do.

Delegated role evidence should include implementation facts inspected, docs
updated or recommended, current-state gaps, conflicts, unresolved questions,
risks that need a plan, skipped checks, residual risk, and whether scope
expanded.

If role delegation is unavailable, continue directly by checking the same
placement, current-state accuracy, structure, link, and domain-ownership
concerns yourself.

## Workflow

1. Read `AGENTS.md`, `.agents/workflow.md`, `_docs/README.md`, and
   `_docs/kb/README.md` when they exist.
2. Inspect the active or completed plan, accepted design intent, changed
   implementation files, tests, verification evidence, and existing docs
   needed to determine current behavior.
3. Read current `_docs/kb` docs and relevant implementation evidence.
4. Review structure and placement. Decide which `_docs/kb` area owns each
   current-state fact and whether new or updated index links are needed.
5. Review documentation depth. Confirm the affected knowledge includes
   implementation facts, contracts, invariants, failure modes, diagrams, trace
   expectations, verification evidence, or operational notes where relevant.
6. Refresh `_docs/kb/` so it matches verified implemented behavior.
7. Fix routine documentation issues in touched or routed docs: heading levels,
   spacing, list style, fenced-code language labels, file names, relative
   links, stale placeholders, and duplicated current-state claims.
8. When implementation, plan intent, and existing docs disagree, update
   `_docs/kb/` to reflect verified implemented behavior where clear. Record
   unresolved conflicts as open decisions, risks, or follow-up plan
   candidates.
9. Report documents reviewed, implementation evidence inspected, docs updated,
   links or structure fixed, current-state gaps, conflicts, skipped checks,
   residual risk, and follow-up work.

## Guardrails

- Do not invent design truth to make docs look complete.
- Do not promote future intent, rejected behavior, or historical execution
  notes into `_docs/kb/` as if they are current.
- Do not reorganize large documentation trees without clear benefit or user
  authorization.
- Prefer relative links inside `_docs/`.
- Keep docs readable as plain Markdown.
- Preserve unrelated project documentation edits.
