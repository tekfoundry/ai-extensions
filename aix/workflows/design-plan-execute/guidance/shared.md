---
applies_to:
  roles:
    - implementation-engineer
    - quality-engineer
    - technical-architect
  skills:
    - plan-execute
    - phase-execute
    - task-execute
---

# Shared workflow guidance

## How to use guidance

Guidance helps an agent make better tradeoffs inside an authorized workflow
task. It is advisory. Follow the user request, repository instructions,
workflow lifecycle, skill procedure, role contract, and safety rules first.

## Working style

- Read the active plan and current project knowledge before choosing a change.
- Keep work small enough to implement, verify, and explain in one pass.
- Prefer existing module boundaries, command patterns, and test style.
- Treat local files, package-managed content, lockfiles, active agent behavior,
  and project-owned overrides as safety-sensitive.
- Record evidence in the plan when the work changes code, docs, package
  contents, verification expectations, or residual risk.
- Do not turn guidance into hidden automation. Metadata can help readers choose
  relevant files, but it must not trigger installs, updates, resets, or file
  mutation.

## Conflict handling

When guidance conflicts with a higher-priority instruction, follow the
higher-priority instruction and report the conflict when it could affect the
task outcome.

## Agent-operational contract

Before acting, identify the purpose, `owner`, collaborators, entry conditions,
selected gate, expected outputs, escalation conditions, and exit criteria. The
project-manager owns plan reconciliation; the assigned role owns its bounded
report; Boss owns human approvals. Record `owner` (accountable role), `assigned`
(worker/run ID), status transition, UTC timestamps, evidence, validation,
documentation impact, and residual risk when applicable.

Use `⬜️ → 🟨` before work and `🟨 → ✅` only after evidence. Use `⚠️` with a
reason and next action for blocked, deferred, or incomplete work. Never infer
approval from a recommendation, passing tests, or conversation momentum.
Triggers select procedures and roles but never grant authority. Preserve
unrelated edits and stop on stale/conflicting context, scope changes, safety
waivers, material risk, or a human gate; see [troubleshooting](troubleshooting.md).
