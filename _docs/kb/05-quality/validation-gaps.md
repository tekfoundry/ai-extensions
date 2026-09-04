# Validation Gaps And Residual Risk

## Current Known Gaps

- No persistent coverage report or threshold is configured.
- Real remote Git network behavior is represented mostly by temporary local Git
  repositories.
- No concurrency coverage exists for simultaneous commands mutating manifest,
  lockfile, package, or active files.
- Host adapters and native delegation contracts are implemented and covered by
  contract and integration tests. Authenticated live-provider execution,
  provider-side restart recovery, and native harness UI behavior remain manual
  validation areas.
- No automated semantic review exists for all documentation content.
- No automated credential-redaction test exists for source URLs that might
  contain secrets.
- Release verification does not replace human review of package contents,
  README instructions, release notes, and workflow wording.

## When A Gap Should Become A Plan Task

Create or update a plan when a validation gap affects accepted behavior or
release confidence, for example:

- a new source type is added without resolver and cache tests
- a new package kind is added without lockfile, drift, update, and uninstall
  coverage
- a workflow lifecycle change is not covered by install/update/diff/uninstall
  tests
- a destructive command lacks no-write or refusal-path tests
- a release packaging change is not covered by package smoke tests
- a docs migration cannot be validated by manual review alone

Do not bury those gaps in final prose. Record them as plan risks, tasks,
verification expectations, or completion checklist blockers.

## Skipped Check Record

When a check is skipped, record:

- exact check skipped
- reason it could not run
- affected behavior
- residual risk
- whether a targeted alternative was run
- whether follow-up work is needed

Example:

```text
Skipped: npm run release:verify
Reason: release pack scripts require npm network behavior not available in the sandbox.
Alternative: npm run build, npm test, and npm run release:pack-preview.
Residual risk: local install smoke and publish dry run were not exercised.
Follow-up: run release:verify before publishing.
```

## Coverage Tooling Guidance

Add coverage tooling only when the project needs an objective signal that the
current test suite cannot provide. Good reasons include:

- identifying untested critical refusal paths
- measuring coverage of new command groups
- tracking package lifecycle behavior after a large refactor
- guarding a release-critical module with explicit thresholds

Avoid adding thresholds that encourage shallow tests just to raise coverage
numbers.
