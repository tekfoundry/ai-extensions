# Verification Strategy

## Quality Philosophy

AIX uses behavior-focused automated tests instead of arbitrary line coverage
targets. The useful signal is whether accepted CLI behavior, package lifecycle
contracts, refusal paths, lockfile integrity, and release artifacts are locked
down by repeatable checks.

Quality review should answer:

- What user-visible behavior changed?
- Which manifest, lockfile, package, source, workflow, role, skill, template,
  or CLI contract could regress?
- Which targeted test proves the changed contract?
- Which broader smoke or release check proves integration still works?
- What could not be checked, and what residual risk remains?

## Verification Layers

- TypeScript build: compiles source into `dist/`.
- Typecheck: compiles without emitting files.
- Node test suite: behavior and regression tests under `tests/*.test.mjs`.
- CLI-path tests: execute command handlers or compiled entrypoints for
  user-facing behavior.
- Package smoke tests: pack the npm artifact and verify the installed `aix`
  binary and bundled assets.
- Release smoke scripts: validate pack preview, local installation, and publish
  dry run.
- Project install verification: `node bin/aix.js verify` checks the current
  workspace's installed AIX state.
- Markdown whitespace check: `git diff --check` catches trailing whitespace and
  patch formatting issues.

## Test Levels

Use these levels when selecting checks and recording verification evidence:

- Unit/domain tests: focused tests for pure or narrowly scoped contracts such
  as manifest parsing, lockfile parsing, drift comparison, role parsing,
  template syntax, selection-menu rendering, and helper validation.
- Integration tests: multi-module tests that exercise temporary projects,
  local Git repositories, package stores, manifests, lockfiles, active files,
  source metadata, and command-domain interactions.
- CLI behavior tests: tests that verify command routing, usage failures, help
  output, interactive prompts, status output, verify output, color behavior,
  and user-facing command text.
- Safety/refusal-path tests: cross-cutting tests for no-overwrite behavior,
  local drift refusal, active-name collisions, source-removal blockers,
  dependency blockers, workflow-owned asset boundaries, and no-write preflight
  guarantees.
- Workflow contract tests: tests that lock down bundled workflow skills, roles,
  templates, plan sections, lifecycle gates, security-review requirements, and
  completion checklist expectations.
- Guidance lifecycle tests: tests that lock down workflow guidance origin
  discovery, role guidance editability, metadata parsing, guidance commands,
  reset safeguards, and optional `get-guidance` resolver behavior.
- Package smoke tests: tests that pack the npm artifact, unpack it in a
  temporary install shape, verify bundled runtime assets, and run the packaged
  `aix` binary.
- Release verification checks: broader release gates such as pack preview,
  local install smoke, publish dry run, and `npm run release:verify`.

Most changes need one or more targeted unit, integration, CLI, or refusal-path
tests first. Smoke and release checks are broader confidence gates, not
substitutes for targeted coverage of the changed behavior.

PM interaction changes require targeted checks for alias normalization,
first-prompt classification, direct Boss addressing, worker-record neutrality,
and restart-safe open-decision recovery. Manual harness checks remain useful
for confirming how each supported host presents the resulting conversation.

## Common Commands

Use targeted tests first for the changed subsystem:

```bash
npm run build
node --test tests/activation.test.mjs
node --test tests/workflow.test.mjs
node --test tests/roles.test.mjs
node --test tests/guidance.test.mjs
node --test tests/templates.test.mjs
node --test tests/sources.test.mjs
node --test tests/skill-instructions.test.mjs
```

Use broader checks when a change touches shared contracts, package-managed
assets, CLI behavior, lockfile shape, workflow install/update behavior,
release packaging, or multiple subsystems:

```bash
npm test
npm run verify
npm run release:verify
node bin/aix.js verify
git diff --check
```

`npm test` runs `node scripts/run-tests.mjs`, which discovers
`tests/*.test.mjs`, sorts them, and runs Node's test runner with
`--test-concurrency=1`. The test runner sets a temporary `AIX_CACHE_DIR` when
the caller has not provided one, so full-suite runs do not touch the user's
real AIX cache. Serial execution is intentional because many tests change the
current working directory, build temporary projects, create local Git
repositories, and exercise filesystem package state.

## Regression Matrix

| Area | Primary Evidence |
| --- | --- |
| CLI command routing | `tests/cli.test.mjs` |
| Manifest parsing | `tests/manifest.test.mjs` |
| Lockfile parsing and drift | `tests/lockfile.test.mjs`, `tests/lockfile-drift.test.mjs` |
| Source resolution and source removal | `tests/sources.test.mjs` |
| Skill discovery and listing | `tests/skills.test.mjs` |
| Skill activation/deactivation/dependencies | `tests/activation.test.mjs` |
| Skill diff/update | `tests/diff.test.mjs`, `tests/update.test.mjs` |
| Role parsing/delegation/lifecycle | `tests/roles.test.mjs` |
| Guidance discovery, commands, metadata, and reset behavior | `tests/guidance.test.mjs` |
| Workflow install/update/diff/uninstall | `tests/workflow.test.mjs`, `tests/init.test.mjs` |
| Templates | `tests/templates.test.mjs` |
| Status and verification output | `tests/status.test.mjs`, `tests/verify.test.mjs` |
| Interactive prompts and tables | `tests/ui-selection-prompt.test.mjs` |
| Workflow skill/role instruction contracts and `get-guidance` | `tests/skill-instructions.test.mjs`, `tests/roles.test.mjs` |
| Package artifact | `tests/package-smoke.test.mjs` |
| Phase 11 workflow roles and authority | `tests/roles.test.mjs`, `tests/workflow-team.test.mjs`, `tests/pm-orchestrator.test.mjs`, `tests/pm-runtime.test.mjs` |
| Legacy role migration and rollback | `tests/workflow.test.mjs` |

## Test Isolation

Tests should avoid mutating the developer's real workspace. Existing tests use:

- `mkdtemp` under the OS temp directory for fixture projects
- disposable local Git repositories for source-resolution tests
- temporary AIX cache roots through `AIX_CACHE_DIR` or explicit cache options
- temporary npm cache directories for package smoke tests
- `process.chdir` with `finally` blocks to restore the previous workspace
- local `git` identity environment variables for fixture commits
- symlinked dependencies inside unpacked package smoke tests

New tests that exercise filesystem, Git, npm cache, package store, or active
agent files should follow the same isolation model.

## Manual Validation Expectations

Manual validation is still appropriate for:

- README and docs readability
- workflow prompt clarity
- release notes and public-facing examples
- human review of installable skill or role instructions
- final release readiness
- large documentation migrations where semantic coverage matters more than
  automated link or whitespace checks

Manual validation should record what was inspected, what was accepted, what was
not checked, and the residual risk.

## Phase 11 acceptance coverage

The Phase 11 role contract is covered by product-owner inheritance and backlog
responsibility checks, release-engineer scope and denied-domain checks, roster
validation, package smoke, PM routing, and Boss exclusion tests. Migration
tests cover clean replacement, edited-file and collision refusal, rollback,
and lifecycle reactivation paths.

Manual acceptance remains necessary for clean and existing-state installs,
installed guidance readability, concise Boss-facing language, and the full
cross-platform release-engineer workflow. Lockfile and package/active-state
consistency must also be checked against the exact artifact being accepted.

## Coverage Philosophy

There is no persistent coverage threshold or coverage reporter in the current
project. That is an intentional current-state gap, not evidence that coverage
does not matter.

Coverage tooling should be added only when it answers a concrete question,
such as whether critical refusal paths, package lifecycle contracts, or command
groups are missing regression tests. Do not add tooling or thresholds just to
raise a percentage.

## Known Validation Gaps

- Real remote Git network behavior is usually represented by temporary local
  Git repositories.
- Host adapters and native delegation contracts are implemented and covered by
  contract and integration tests. Authenticated live-provider execution,
  provider-side restart recovery, and native harness UI behavior remain manual
  validation areas.
- Default request-entry routing through `get-guidance` is intentionally
  deferred and is not covered beyond checks that this plan did not add managed
  workflow, role, skill, delegation, or manifest wiring.
- There is no persistent code coverage report or threshold.
- There is no concurrency test for simultaneous commands mutating manifest,
  lockfile, package, or active files.
- There is no automated semantic quality check for all documentation content.
- Manual review remains required for release readiness, workflow wording, and
  documentation depth.
