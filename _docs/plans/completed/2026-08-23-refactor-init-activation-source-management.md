# Refactor Init, Activation, And Source Management

## Status

✅ Completed

Approved, activated, manually verified, and completed on 2026-08-23.

## Context

The review session selected all three findings for refactoring:

1. Init is not transactionally composed.
2. Skill activation has no reusable planning/preflight boundary.
3. Source management mixes several responsibilities in one large module.

These areas all sit near safety-sensitive package-manager behavior. They touch
manifest and lockfile writes, package materialization, active skill paths,
workflow-owned assets, and source removal checks. The refactor should improve
composition and ownership without changing user-facing behavior.

Reviewed context:

- `AGENTS.md`
- `.agents/workflow.md`
- `.agents/engineering-best-practices.md`
- `_docs/README.md`
- `_docs/design/README.md`
- `_docs/design/overview.md`
- `_docs/design/cli.md`
- `_docs/design/package-management.md`
- `_docs/design/workflows.md`
- `_docs/design/bundled-skills.md`
- `src/init/project.ts`
- `src/activation/activate.ts`
- `src/workflows/install.ts`
- `src/sources/management.ts`

Current worktree note:

- The workspace already contains unrelated, user-approved edits to the
  `code-review-refactor` skill, its instruction test, and `aix.lock.json`.
  This plan must preserve those changes.

## High-Level Goal (status: accepted)

Make init, activation, and source management easier to reason about and safer
to compose.

`aix init` should not leave partial manifest, lockfile, package, active skill,
workflow doc, or `AGENTS.md` changes when a later default-skill activation
fails. Skill activation should expose a reusable planning/preflight boundary so
callers can check activation work before committing changes. Source add/remove
management should be split into smaller modules with clearer ownership.

The goal is behavior-preserving refactoring, except for fixing the partial
init failure behavior.

## Design Intent (status: accepted)

The refactor should keep the existing public CLI behavior and lockfile schema.
It should reorganize internal boundaries so write-owning flows can be composed
more safely.

For init:

- Treat `aix init` as the parent orchestration boundary for default workflow
  install plus default standalone skill activation.
- Add a preflight path that can resolve and validate all default work before
  committing persistent changes.
- Ensure a failure in default standalone skill activation does not leave
  workflow package, docs, managed `AGENTS.md`, manifest, lockfile, or active
  skill changes behind.

For activation:

- Extract reusable planning/preflight behavior from the current
  write-owning `activateSkillFromDefinitions` flow.
- Keep `activateSkill()` as the CLI-facing command helper that reads current
  workspace state, applies the plan, and commits manifest/lockfile changes.
- Let other orchestrators, especially init, reuse the activation planner or
  preflight layer without forcing an immediate write.

For source management:

- Split `src/sources/management.ts` around stable responsibilities, likely
  source input parsing/name derivation, manifest source mutation, removal
  safety checks, and source add/remove orchestration.
- Reuse existing shared JSON helpers when doing so does not blur ownership or
  weaken error messages.
- Keep behavior for `aix skills add`, `aix skills remove`, source metadata,
  configured source choices, and package-source removal unchanged.

Safety posture:

- Preserve local drift checks before overwrites or removals.
- Preserve existing manifest and lockfile format.
- Preserve workflow-owned skill protection.
- Do not introduce registry, plugin-package, global-install, or publishing
  behavior.

## Non-Goals

- No new user-facing commands.
- No lockfile schema migration.
- No behavior changes to activation aliases, dependency inference, source add,
  source remove, workflow update, or workflow uninstall beyond fixing partial
  init failure.
- No broad rewrite of the package manager.
- No new dependency or static-analysis engine.

## Boundaries And Invariants

- Manifest and lockfile writes remain atomic at the file level.
- Package-managed files must not be overwritten when drift is detected.
- `.agents/skills` active entries must still preserve alias behavior and
  workflow-owned skill protection.
- Workflow-owned skills remain owned by the active workflow, not by normal
  skill activation.
- Default standalone skills remain normal requested skills, not workflow-owned
  skills.
- Source removal must still refuse configured or locked active dependencies.
- Refactors should follow the existing domain layout under `src/init`,
  `src/activation`, `src/workflows`, `src/sources`, `src/manifest`,
  `src/lockfile`, `src/fs`, and `src/paths`.

## Implementation Phases

### Phase 1: Characterize Current Safety Behavior (status: completed)

Goal: pin the partial-init failure and existing activation/source behavior
before changing structure.

Tasks:

- ✅ Add a targeted failing-default-standalone-skill init test that proves
  manifest, lockfile, workflow package files, workflow docs, active skill
  files, and managed `AGENTS.md` remain unchanged on failure.
- ✅ Add or identify focused activation coverage that distinguishes planning,
  preflight, apply, and commit expectations.
- ✅ Add or identify source-management tests that cover add, remove, blocked
  remove, source metadata, and legacy source-shape handling.
- ✅ Run the targeted tests and record the baseline failure or existing
  coverage gaps.

Verification:

- Targeted init test for standalone activation failure.
- Existing `tests/init.test.mjs`, `tests/activation.test.mjs`, and
  `tests/sources.test.mjs`.

### Phase 2: Extract Activation Planning And Preflight (status: completed)

Goal: give activation a reusable planning/preflight boundary while preserving
CLI behavior.

Tasks:

- ✅ Split activation planning from `activateSkillFromDefinitions` into a
  reusable internal API.
- ✅ Keep dependency resolution, alias handling, active-name collision checks,
  package drift checks, and active file drift checks intact.
- ✅ Keep `activateSkill()` as the CLI-facing write-owning wrapper.
- ✅ Update activation tests or add focused planner tests for the new boundary.

Verification:

- `npm run build`.
- `node --test tests/activation.test.mjs`.
- Targeted planner/preflight tests added in this phase.

### Phase 3: Make Init Commit As One Orchestration (status: completed)

Goal: make `aix init` compose workflow install and default standalone skill
activation without partial persistent writes when later preflight fails.

Tasks:

- ✅ Refactor workflow install internals as needed so init can preflight or
  stage workflow work before final commit.
- ✅ Compose workflow and default standalone skill activation from `initProject`
  through one parent orchestration flow.
- ✅ Ensure standalone activation failure leaves existing workspace files
  unchanged.
- ✅ Keep normal `aix workflow install`, `aix skill activate`, and `aix init`
  output behavior stable unless the plan records an intentional wording
  change.

Verification:

- The failing-default-standalone-skill init test passes.
- `node --test tests/init.test.mjs tests/workflow.test.mjs
  tests/activation.test.mjs`.
- `node bin/aix.js verify` in this repository after local install state is
  expected to be clean.

### Phase 4: Split Source Management Responsibilities (status: completed)

Goal: reduce `src/sources/management.ts` into smaller modules with clear
owners.

Tasks:

- ✅ Move source input parsing and default name derivation into a focused
  source-input module or equivalent local pattern.
- ✅ Move manifest source read/write/migration helpers into a focused module
  or reuse existing shared manifest/JSON helpers where appropriate.
- ✅ Move source removal safety checks into a focused removal module or helper.
- ✅ Keep `src/sources/management.ts` as a small orchestration facade if that
  matches surrounding source-domain patterns.
- ✅ Preserve all existing `aix skills add`, `aix skills remove`, and
  interactive remove/list behavior.

Verification:

- `node --test tests/sources.test.mjs tests/skills.test.mjs`.
- `npm run build`.

### Phase 5: Review, Documentation, And Release Readiness (status: completed)

Goal: close the refactor with maintainability evidence and broad confidence.

Tasks:

- ✅ Run the maintainability review gate from
  `.agents/engineering-best-practices.md`.
- ✅ Update design docs if the accepted internal ownership model changes in a
  durable way.
- ✅ Run targeted tests from earlier phases.
- ✅ Run repository verification.
- ✅ Record residual risks, skipped checks, and documentation impact.

Verification:

- File-size scan for `src` and `tests`.
- `npm run build`.
- `npm test`.
- `git diff --check`.

Notes:

- Promoted the durable `aix init` standalone-skill preflight behavior into
  `_docs/design/bundled-skills.md`.
- Documentation review checked `_docs/README.md`, `_docs/design/README.md`,
  and the relevant design docs. No structure or link repairs were needed.

## Decisions

- Init now preflights default standalone skill activation before workflow
  install writes. This fixes the observed partial-init failure without adding a
  broad project rollback path.
- Source-management helpers moved under `src/sources/`, while JSON file writes
  reuse the existing atomic JSON helper to avoid duplicate write mechanics.

## Risks

- Init touches workflow docs, managed `AGENTS.md`, packages, active skills,
  manifest, and lockfile. A careless refactor could weaken drift protection.
- Activation dependency resolution and alias behavior are easy to regress if
  the planner loses current ordering or requested/dependency state.
- Staging workflow package changes may need careful cleanup on failure.
- Source remove is safety-sensitive because it must not delete package content
  for active or locally edited skills.
- Tests may need richer fixtures to prove no persistent writes happen on
  failure.

## Lessons To Carry Forward

- Review findings that touch write-ordering and ownership boundaries should be
  planned together. Treat manifest, lockfile, package, and active-file changes
  as one safety story, not isolated cleanup.

## Verification Evidence

- `npm run build` passed.
- `node --test tests/init.test.mjs tests/activation.test.mjs tests/workflow.test.mjs`
  passed: 35 tests.
- `node --test tests/sources.test.mjs tests/skills.test.mjs` passed: 16 tests.
- `npm test` passed: 121 tests.
- `node bin/aix.js verify` passed.
- `git diff --check` passed.
- Manual scratch-project `aix init` and `aix verify` passed.
- Repo-local `npm run aix init` passed after the updated default skill source
  was available from the configured source.
- File-size scan completed. `src/sources/management.ts` is now 175 lines;
  `src/activation/activate.ts` is 298 lines.

## Residual Risks

- Init now preflights default standalone skill activation before workflow
  install writes. Unexpected filesystem failures during the later apply step
  are still handled by existing safe-copy and atomic-write behavior rather
  than a broad project rollback.

## Completion Checklist

- ✅ Confirm every task and success goal is complete or explicitly deferred.
- ✅ Run or review required targeted and repository verification.
- ✅ Review the codebase to ensure the code is maintainable and clean; refactor if needed.
- ✅ Promote accepted durable behavior into design docs using `$design-promote`.
- ✅ Review documentation structure, formatting, and links using `$documentation-review`; fix issues or record follow-up work.
- ✅ Record final risks, follow-on work, and documentation impact.
- ✅ Harvest reusable lessons and update workflow guidance when appropriate.
- ✅ Archive under `_docs/plans/completed/YYYY-MM-DD-<name>.md`.
