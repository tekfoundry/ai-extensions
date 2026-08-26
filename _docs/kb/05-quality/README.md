# Quality knowledge

Owner: `quality-engineer`

This area describes how AI Extensions proves behavior is correct enough for
the current product stage.

## Documents

- [Verification strategy](verification-strategy.md): current automated and
  manual verification expectations for the CLI, package manager, workflow,
  roles, templates, and release checks.
- [Test matrix](test-matrix.md): subsystem-to-test mapping, likely regression
  risks, and targeted commands.
- [Release verification](release-verification.md): build, typecheck, package,
  local install, publish dry-run, and release smoke expectations.
- [Validation gaps](validation-gaps.md): known quality gaps, residual risk
  recording, skipped-check rationale, and coverage tooling guidance.

Use this area for:

- testing strategy and verification matrices
- targeted checks for important workflows
- regression-risk notes
- manual validation expectations
- release checks and smoke checks
- coverage philosophy
- known validation gaps and residual risks

Quality docs should connect checks to accepted behavior. Command output alone
is not enough when manual flows, data integrity, error paths, or safety
behavior also need review.
