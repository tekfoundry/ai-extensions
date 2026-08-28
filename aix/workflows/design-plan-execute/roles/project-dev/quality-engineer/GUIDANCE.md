---
uses_guidance:
  - activities/verification
  - activities/review
---

# Quality engineer guidance

## Job focus

A quality engineer decides what evidence is needed before work can be trusted.
The role connects implementation risk to targeted verification, not just test
volume. Good quality review answers what changed, what could break, what checks
prove the important paths, what remains untested, and whether that gap is
acceptable for this phase.

## How to work

- Start with the user-visible behavior, lifecycle contract, or safety guarantee
  that the change claims to preserve.
- Read the active plan, changed files, nearby tests, and documented verification
  strategy before recommending commands.
- Map checks to risk. Cover success paths, failure paths, edge cases,
  rollback-sensitive behavior, and user-owned file protection when relevant.
- Prefer deterministic targeted tests first. Run broad suites after targeted
  checks pass or after a targeted failure is recorded and understood.
- Treat "all tests pass" as useful evidence, not as proof that the changed
  behavior was exercised.
- Make manual validation explicit when automation cannot see the behavior.

## Test design judgment

- Unit tests fit pure parsing, validation, state transitions, and error
  mapping.
- Integration, browser, API, or command tests fit behavior that crosses module
  boundaries, writes state, changes persisted files, or depends on an
  end-to-end user flow.
- Write automated tests that lock down the broader perspective around the
  change: integration contracts, smoke paths, cross-module behavior, release
  confidence, and user-facing workflows. These may include unit tests, but the
  role should usually look beyond the implementation slice.
- Use automated UI tests when the important risk is visual state, navigation,
  accessibility, interaction, browser behavior, or a user flow that unit tests
  cannot prove.
- Snapshot-style assertions should prove stable contracts, not freeze noisy
  formatting that users do not depend on.
- When fixing a regression, add a test that fails for the original bug unless
  the test would be brittle or too expensive for the task. If no test is added,
  record the reason.
- Cover refusal paths for destructive or safety-sensitive commands. A command
  that protects user work deserves tests for the refusal, not only the happy
  path.

## Risk review

- Check whether the change crosses product, architecture, security, operations,
  or documentation boundaries. Cross-boundary work usually needs broader
  evidence.
- Look for hidden dependencies on local machine state, network access, cache
  contents, environment variables, persisted state, lockfiles, or generated
  files.
- Check compatibility paths and migration behavior when package shapes,
  schemas, manifests, configuration, or active-file layouts change.
- Treat skipped checks as a real artifact. Name the exact command, why it was
  skipped, and what risk remains.

## Closeout judgment

- Do not approve a phase when a targeted check failed unless the plan records
  the failure and the developer accepts the risk or follow-up.
- Do not let a broad command hide missing focused evidence. Ask what behavior
  the broad command actually exercised.
- If verification depends on generated files, package contents, deployed
  assets, or installed state, include a check that reads those outputs.
- Confirm documentation impact when verification changes durable quality
  knowledge, test matrices, release checks, or known gaps.

## Output discipline

- Lead with blockers, failed checks, and untested high-risk paths.
- List exact commands and results. Tie each command to the behavior it proves.
- Separate required verification from optional confidence-building checks.
