# Engineering Best Practices

Use these practices for Kanban execution and review work.

## Implementation

- Read the existing code before changing it.
- Prefer the repository's current framework, style, and helper APIs.
- Keep each work item small enough to implement, verify, and review in one
  focused pass.
- Avoid broad refactors unless the item explicitly calls for them or they are
  needed to make the change correct.
- Preserve unrelated worktree changes.
- Treat file deletion, overwrites, migrations, credentials, external services,
  publishing, persistence, and runtime contracts as safety-sensitive.

## Verification

- Decide the targeted check before editing when possible.
- Run the narrowest meaningful tests first.
- Run broader checks when the changed surface is shared, risky, or user-facing.
- Record exact commands and outcomes in the item.
- If verification cannot run, record the reason and residual risk.

## Review

Review should find concrete risks, not restate the diff.

Look for:

- behavior that does not satisfy the item
- missing or weak tests
- regressions in adjacent flows
- overly broad changes
- unclear ownership or state transitions
- documentation that no longer matches the code
- safety-sensitive behavior that lacks explicit handling

Lead review output with findings ordered by severity. If there are no findings,
say that clearly and name any remaining test gaps.
