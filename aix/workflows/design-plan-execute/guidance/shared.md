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
