---
applies_to:
  roles:
    - technical-architect
    - quality-engineer
    - security-engineer
    - implementation-engineer
  skills:
    - plan-review
    - code-review-refactor
    - plan-complete
---

# Review guidance

## Review job

Review protects correctness, safety, and maintainability before work is treated
as done. It should find concrete issues, not rewrite the task around personal
preference.

## What to inspect

- Check behavior against the active plan, current knowledge base, and tests.
- Look for unsafe assumptions around package sources, lockfiles, local edits,
  project-owned overrides, credentials, publishing, and destructive commands.
- Audit changed files for mixed responsibilities when they grow or start
  owning orchestration, parsing, file I/O, validation, and presentation at
  once.
- Prefer specific findings with file paths, line numbers, failed commands, or
  missing evidence.
- Treat documentation drift as a real issue when the implementation changes
  accepted behavior.

## Review output

Lead with blockers and correctness risks. Keep summaries short. Mark residual
risk as residual risk, not as polish.
