---
applies_to:
  roles:
    - quality-engineer
    - implementation-engineer
    - security-engineer
  skills:
    - work-verify
    - task-execute
    - phase-execute
    - plan-complete
---

# Verification guidance

## Verification job

Verification connects risk to evidence. A passing broad suite is helpful, but
it is not a substitute for a targeted check that exercises the behavior just
changed.

## Choosing checks

- Run focused tests for the changed parser, command, lifecycle path, or safety
  rule first.
- Add failure-path coverage for destructive or overwrite-sensitive behavior.
- Use broad checks after targeted checks pass, or after a targeted failure is
  recorded with its residual risk.
- Verify generated package state, lockfile entries, active files, and status
  output when the task changes installation or package lifecycle behavior.
- Record skipped checks with the exact command, reason, and risk.

## Phase closeout

Before a phase is complete, confirm that every phase task has evidence, every
expected check passed or has a recorded gap, and documentation impact has been
handled or deferred in the plan.
