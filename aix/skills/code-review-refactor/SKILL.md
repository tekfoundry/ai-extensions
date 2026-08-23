---
name: code-review-refactor
description: Review project code for maintainability risks, recommend focused refactors, and route substantial changes through developer-approved planning before implementation.
---

# Code Review Refactor

Use this skill when the developer asks for a codebase maintainability review,
refactor recommendations, or help turning review findings into safe refactor
work.

## Pre-flight

1. Read the repository entrypoint instructions, usually `AGENTS.md`.
2. Confirm `.agents/engineering-best-practices.md` exists.
3. If `.agents/engineering-best-practices.md` is missing, stop before reviewing
   code. Tell the developer that the required engineering best-practices
   document is missing and that it should define the project's code-quality,
   ownership, testing, safety, refactor, and verification standards.
4. Read `.agents/engineering-best-practices.md` fresh for this run and follow
   it as the primary review standard.
5. Read the project documentation router when it exists, usually
   `_docs/README.md`, then read only the design docs needed for the requested
   code area.
6. Check the current worktree status. Preserve user-authored files and
   unrelated changes.

Do not hard-code file-size thresholds, ownership rules, testing expectations,
or refactor policy from memory. Use the current best-practices document.

## Default scope

Review project code files by default.

Include ordinary source, test, script, configuration, and package code when
they affect runtime, build, verification, or developer workflows.

Exclude documentation, process files, generated output, dependency folders,
package-manager state, caches, coverage output, build output, and local agent
package stores unless the developer explicitly asks to include them. Common
excluded paths include:

- `_docs/`
- `.agents/`
- `.codex/`
- `.claude/`
- `dist/`
- `build/`
- `coverage/`
- `node_modules/`
- package lockfiles

If the requested scope is broad, start with repository-native file discovery
and size scans. Prefer `rg --files` when available. Use a documented fallback
such as `find` when it is not.

## Review checks

Review for correctness and maintainability before style.

Check for:

- unclear ownership boundaries
- files with multiple reasons to change
- large production files that need a responsibility audit
- duplicated domain rules, validation, error mapping, or contract shapes
- weak module names or locations that hide ownership
- runtime, filesystem, network, persistence, or security behavior mixed into
  presentation or command dispatch code
- missing or brittle tests around non-trivial logic
- error handling that hides failures or leaks sensitive details
- safety-sensitive operations without explicit safeguards
- documentation drift when code behavior has changed

Treat file size as a signal, not a verdict. Generated files, fixtures, schemas,
parsers, and narrow lookup tables may be large for valid reasons.

## Finding format

Lead with findings. Order them by severity and practical risk.

Each finding should include:

- severity, such as `P1`, `P2`, or `P3`
- concrete file reference with line number when possible
- evidence from the code
- why it makes future changes riskier
- recommended refactor direction
- expected verification impact

Keep recommendations focused. Avoid listing every minor style preference.

## Refactor flow

The review produces recommendations first. Do not choose broad refactors for
the developer.

After presenting findings:

1. Ask the developer which recommendation they want to pursue.
2. If the selected work is small, local, and already authorized by an active
   plan or qualifies as a micro-fix under the repository workflow, implement it
   in the smallest safe slice.
3. If the selected work is substantial, crosses ownership boundaries, changes
   public behavior, alters runtime contracts, touches persistence or security,
   reorganizes modules broadly, or is outside the current active plan, create
   or update an implementation plan before editing code.
4. Review the plan with the developer and get approval.
5. Activate the plan when the repository workflow requires activation.
6. Execute the approved plan through its phases and tasks.

The developer may cancel at any point.

## Active-plan behavior

When the review runs inside an active plan, record the review findings,
selected refactor, verification evidence, and residual risks in that active
plan. Do not create a separate plan unless the selected work is outside the
active plan's scope.

When the review runs outside an active plan, keep the review as advisory until
the developer selects work. Route substantial selected refactors through
backlog planning, developer approval, activation, and plan execution before
implementation.

## Guardrails

- Preserve behavior unless the developer explicitly approves a behavior change.
- Preserve user-authored files and unrelated worktree changes.
- Prefer local patterns and existing abstractions.
- Avoid broad rewrites from the recommendation list.
- Do not introduce dependencies or new static-analysis engines unless the
  developer approves that plan.
- Select verification before editing.
- Add characterization tests before risky refactors.
- Stop for unclear product, architecture, security, data-safety, persistence,
  publishing, external-system, transfer, delete, overwrite, trust, or runtime
  contract decisions.

## Closeout

Report files changed, verification run, skipped checks, documentation impact,
and remaining risks. If implementation changed durable behavior or accepted
architecture, update the relevant design documentation.
