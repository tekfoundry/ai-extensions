---
applies_to:
  roles:
    - implementation-engineer
    - technical-architect
    - security-engineer
  skills:
    - plan-execute
    - phase-execute
    - task-execute
---

# Implementation guidance

## Implementation job

Implementation changes the smallest coherent slice that satisfies the active
task. The work should fit the existing project shape and leave behavior easier
to verify than before.

## Coding judgment

- Read nearby code before editing. Match established ownership, naming, error
  handling, and tests.
- Keep command routing, package operations, parsing, validation, and file I/O
  in focused modules.
- Prefer simple data shapes unless the current behavior needs a new
  abstraction.
- Preserve user-authored files and project-owned overrides. Refuse unsafe
  overwrites instead of repairing by guesswork.
- Keep package-managed origins distinct from editable project-facing files.
- Add tests with the change when behavior, safety checks, metadata parsing, or
  lockfile output changes.

## Refactoring judgment

Refactor only when the task needs it or when the local file would otherwise
mix unrelated responsibilities. If a larger cleanup is real but out of scope,
record it as follow-up work instead of slipping it into the phase.
