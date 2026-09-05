# Forced Updates

## Status

🟨 Active Implementation

Human activation approved. Implementation may proceed through the defined
phases and tasks.

## Context

AIX currently protects package-managed files during updates, but its recovery
path is incomplete whenever the user has a reason to force an update. One
known case is an older workflow installation that records roles as flat files
such as `.agents/roles/documentation-specialist.md`, while current workflows
use role directories containing `ROLE.md` and `GUIDANCE.md`.

When the lockfile and installed package layout are from different generations,
`aix update`, `aix workflow update --reconcile-protected`, and
`aix workflow uninstall` can all stop on path mismatches, stale ownership, or
unmanaged workflow blocks in `AGENTS.md`. Projects without intentional AIX
customizations currently require a manual, recoverable reset of `.agents/`,
the manifest, the lockfile, and the managed `AGENTS.md` block. That recovery
pattern is too specific to this migration and does not provide a general
answer for future update failures.

Reviewed context:

- `AGENTS.md`
- `.agents/workflow.md`
- `_docs/README.md`
- `_docs/kb/03-architecture/workflow-lifecycle.md`
- `_docs/kb/03-architecture/roles-and-templates.md`
- `_docs/kb/04-security/trust-boundaries.md`
- `_docs/kb/05-quality/test-matrix.md`
- `_docs/kb/05-quality/verification-strategy.md`
- `_docs/kb/06-operations/release-and-maintenance.md`
- `src/workflows/roles.ts`
- `src/cli/cmds/workflow/index.ts`
- `src/cli/cmds/workspace/update.ts`
- `src/workflows/update.ts`
- `tests/workflow.test.mjs`
- `tests/update.test.mjs`

## High-Level Goal (status: accepted)

AIX should provide an explicit, generic `aix update --force` path for any case
where the user intentionally wants the current AIX installation to be
replaced or repaired. The command should first preserve the existing
installation, then perform a normal update from the current sources, and
finally review the preserved installation for user changes worth recovering.

The command should make recovery practical for projects with no intentional
customizations while preserving project-owned files and giving users a clear
path to recover useful edits. A successful force update should leave the
project in the same verified current layout produced by a clean normal
installation, with the previous installation retained until the user decides
what to do with it.

## Design Intent (status: accepted)

The proposed feature is an explicit backup-and-reinstall mode layered onto the
existing update lifecycle:

- `aix update --force` remains the user-facing command and composes the normal
  workflow and package update operations.
- Before changing the installation, force mode creates a durable, timestamped
  backup of the existing AIX installation in one project-root directory named
  `aix_bak_YYYY_MM_DD_hh_mm_ss`. The directory contains package-managed files,
  active files, manifests, lockfiles, managed instruction blocks, and enough
  ownership/hash information to audit local changes later.
- After the backup succeeds, force mode runs the normal installation/update
  path against the current sources. It should reuse ordinary materialization
  and lockfile generation rather than maintain a separate replacement
  implementation.
- The normal update may repair any known layout or ownership problem because
  the prior state is now recoverable. Project-owned files outside AIX-managed
  boundaries remain protected.
- After the new installation is verified, force mode compares the backup with
  the prior locked/package state and the new installation to identify useful
  user changes. It should report changed managed files, legacy files without a
  direct new location, and content that may need manual recovery.
- AIX must not silently merge or discard detected changes. It should alert the
  user and point to the backup location, with a clear choice to retain it for
  manual recovery.
- After every successful verified force update, AIX should show the audit
  results and ask the user whether to keep or delete the backup, regardless of
  whether useful changes were detected. The default should be keep, and a
  declined deletion reports the exact backup location.
- If the update fails, or if it runs non-interactively, AIX keeps the backup and
  reports the exact path without blocking for input.
- A failed normal update must leave the backup intact and report enough state
  to retry or manually recover. A successful force update must run the
  equivalent verification checks before reporting success.

The design should reuse existing ownership, source-resolution, lockfile,
rollback, and workflow-install primitives where possible. It should not create
a separate reset implementation that can drift from normal install/update
behavior.

## Non-Goals

- No silent overwrite of project-owned source files, `_docs/`, arbitrary
  `AGENTS.md` content, or files outside the backed-up AIX installation.
- No automatic merge of detected user changes; recovery remains explicit and
  user-directed.
- No deletion of PM runtime data, active delegations, or unlanded work as a
  side effect of `aix update --force` unless that data is explicitly included
  in the backup contract and restored by the normal installation path.
- No registry, marketplace, global-install, or publishing behavior.
- No forced replacement of an unrelated standalone role or skill that merely
  shares a name with a workflow asset.
- No removal of the existing conservative default behavior for plain
  `aix update`.
- No requirement that users manually edit lockfiles or package contents.

## Boundaries And Invariants

- `aix update` without `--force` retains its current protected-file behavior.
- Force mode is explicit, visible in command output, and available for the
  generic update lifecycle rather than only one known migration.
- The backup must be created and successfully recorded before the first
  destructive or replacement write.
- Each force update owns one top-level `aix_bak_YYYY_MM_DD_hh_mm_ss` directory;
  backup contents should not be scattered across temporary locations or
  multiple project-level folders.
- The normal installation path is the source of truth for the resulting
  installation; force mode does not invent a second package layout.
- The lockfile and dedicated `.agents/packages/` store identify AIX-managed
  package and active files. The old manifest supplies stale-file candidates,
  but manifest-only or ambiguous paths are never deletion authority.
- `.claude/` and `.codex/` are backup-only compatibility scopes unless a future
  design assigns them explicit AIX lifecycle ownership; force mode must not
  overwrite their foreign content.
- Malformed, inconsistent, path-escaping, or unsupported prior state fails
  closed before replacement writes, with the completed backup retained.
- Project-owned documentation and code remain outside AIX's overwrite scope.
- The current one-active-workflow model remains unchanged.
- Lockfile ownership remains the source of truth whenever it is internally
  consistent; legacy path inference is allowed only for recognized AIX
  layouts with unambiguous ownership.
- The backup remains available after success until the user explicitly accepts
  cleanup; failures must leave it available for recovery.
- `aix verify` must pass after a successful force update.

## Implementation Phases

#### Phase 1: Define Force-Update Contracts And Backup Inventory

Objective: establish the typed contracts and deterministic inventory needed to
preserve the complete pre-update state before any replacement writes.

Tasks:

- ✅ Define the force-update options, result states, backup metadata schema,
  audit categories, and user-facing failure states.
- ✅ Define actors and authority: the project operator, AIX CLI, package/workflow
  sources, and project-owned content, including approval for backup deletion.
- ✅ Define command inputs and rejection behavior, including project-root
  assumptions, source resolution, TTY versus non-interactive mode, unsupported
  combinations, exit codes, retries, and missing or malformed state.
- ✅ Define the exact backup inventory for `.agents/`, `.claude/`, `.codex/`,
  `aix.json`, `aix.lock.json`, and `AGENTS.md`, including file types,
  permissions, symlinks, and completion metadata.
- ✅ Define canonical-path and collision checks for backup creation and
  replacement targets while excluding `.aix/` and unrelated project files.
- ✅ Define an ownership and deletion matrix for package-store files, active
  files, `.claude/`, `.codex/`, published overrides, manifests, lockfiles,
  managed `AGENTS.md` blocks, stale files, and ambiguous content.
- ✅ Define symlink and unsupported-file behavior using no-follow inventory,
  including dangling links, special files, hardlinks, permissions, and
  platform-specific metadata.
- ✅ Define the completion marker and recovery protocol, including interrupted
  copies, source changes during backup, disk-full and permission failures, and
  refusal to reuse incomplete or tampered backups.
- ✅ Add focused tests for inventory completeness, backup-name suffixes,
  existing-backup protection, symlink handling, permissions, and
  incomplete-backup refusal.
- ✅ Review & Refactor

Phase 1 evidence: `src/force-update/inventory.ts` defines the typed contracts,
exact declared scope, no-follow inventory, canonical path checks,
hardlink/special-file rejection, metadata and completion marker protocol,
atomic unique backup reservation, source-change detection, and tamper
validation (including rejecting escaped paths in untrusted inventory metadata).
`tests/force-update-inventory.test.mjs` covers scope completeness, symlink and
dangling-link non-traversal, hardlink/special-file refusal, deterministic
suffixes, collision protection, metadata, permissions, incomplete backups,
source non-mutation on failed inventory, and tampered path rejection.

Success goals:

- The backup contract is explicit, atomic, repeatable, and safe against path
  escape and accidental overwrite.
- A failed or incomplete backup prevents all later mutation.
- Backup metadata can identify the prior manifest, lockfile, ownership, hashes,
  and preserved content without depending on chat history.

Verification:

- Targeted backup and path-safety tests.
- `npm run typecheck`.
- Manual inspection of backup permissions and completion behavior.

#### Phase 2: Implement Forward Clean-Rebuild Orchestration

Objective: add `aix update --force` as a workspace-level operation that creates a
validated backup, replaces only the AIX-managed state, and reuses the normal
installation/update path.

Tasks:

- ✅ Add `--force` parsing and command help for `aix update` without changing
  plain `aix update` behavior.
- ✅ Create a workspace-level force-update coordinator with typed stage and
  failure results; keep CLI modules limited to parsing and rendering.
- ✅ Implement the validated backup-first boundary and forward clean-rebuild
  orchestration across workflows, skills, roles, manifests, lockfiles, and
  managed instruction blocks.
- ✅ Define and implement the workspace transaction journal/stage marker,
  commit order, interruption detection, and backup-preserving failure state.
- ✅ Use lockfile/package-store ownership to bypass drift checks only for
  proven AIX-managed files; preserve unlisted and ambiguous stale files. The
  force-update integration matrix covers managed replacement, unlisted stale
  preservation, foreign compatibility scopes, PM runtime preservation, and
  path-invalid refusal before mutation.
- ✅ Separate cleanup of proven stale package-store files from preservation of
  legacy active files, manifest-only candidates, and ambiguous content.
- ✅ Refuse malformed, inconsistent, or path-invalid manifests and lockfiles
  before mutation, while covering workflow-only, standalone-only, mixed, and
  no-active-installation cases.
- ✅ Ensure `.aix/pm`, active delegations, decisions, locks, workspaces, and
  unrelated project files remain untouched.
- ✅ Preserve the backup and report the failing stage when rebuild or
  verification fails; do not blindly restore an incompatible legacy layout.
  Isolated coordinator injection now covers workflow, skills, roles,
  manifest/lockfile persistence boundary, cleanup, and post-rebuild verify.
- ✅ Review & Refactor

Success goals:

- `aix update --force` rebuilds the current installation through the normal
  materialization path.
- Plain `aix update` retains its existing protected behavior.
- Force mode cannot write outside its declared boundaries or overwrite
  ambiguous content.
- A failed rebuild leaves an intact, actionable backup.

Verification:

- Targeted CLI and update composition tests.
- `tests/force-update.test.mjs` covers explicit `--force` versus plain-update
  drift refusal, complete backup-before-mutation evidence, malformed-state and
  interrupted-transaction refusal, foreign/PM preservation, stale-file
  preservation, and successful `aix verify`.
- `tests/force-update-inventory.test.mjs` covers backup integrity, path safety,
  symlink/hardlink/special-file behavior, permissions, and tamper refusal.
- Evidence run: `npm run build`, `npm run typecheck`, targeted force/update/
  verify/CLI tests (43 passing), and `git diff --check`.
- Phase 2 follow-up evidence: isolated coordinator failure injection covers
  workflow, skills, roles, persistence, cleanup, and post-rebuild verification;
  each case retains a completed backup and reports its active stage. The
  ownership/refusal matrix covers managed package replacement, modified managed
  instruction replacement, unmanaged marker collision refusal, foreign and PM
  preservation, unlisted stale content, and path-invalid state refusal. The
  plain-update regression, malformed state, interrupted transaction, and
  successful post-update `aix verify` paths pass. Phase 3 remains untouched and
  requires its own implementation authorization.

#### Phase 3: Add Backup Audit And Recovery Prompt

Objective: compare the previous state with the rebuilt installation and give
users a clear, non-destructive recovery choice.

Tasks:

- ✅ Define the audit result schema, category counts, stable output, source and
  baseline details, recovery advice, and non-mutating audit guarantee.
- ✅ Implement the three-way comparison using the old lockfile baseline,
  backed-up content, and new installation.
- ✅ Use the old manifest to discover stale candidates while treating old
  lockfile evidence and unambiguous historical layouts as stronger ownership
  evidence.
- ✅ Report user-edited, upstream-only, legacy-only, ambiguous, and collision
  results with exact backup paths and no automatic merging.
- ✅ Always display the audit after successful verification and prompt the user
  to keep or delete the backup, defaulting to keep; define EOF, cancellation,
  prompt failure, and cleanup failure behavior.
- ✅ Define deterministic non-interactive output and exit behavior; retain the
  backup without blocking when no TTY is available.
- ✅ Retain and report the backup on failure and in non-interactive mode.
- ✅ Review & Refactor

Phase 3 evidence: `src/force-update/audit.ts` provides schema-versioned,
stable category counts and sorted findings using old lockfile hashes, backed-up
content, and rebuilt files; manifest paths are candidates only and never delete
authority. Successful verified force updates render the audit and deterministic
backup-retention status; non-interactive runs retain without blocking. Interactive
keep/delete/default/EOF behavior is covered, and cleanup failures retain and
report the backup. `tests/force-update.test.mjs` covers unchanged, local-edit,
upstream-only, legacy-only, ambiguous, collision, deleted, package-version-change,
local-equals-new, non-mutating audit, exact recovery paths, and interactive
retention/deletion. `npm run build`, `npm run typecheck`, targeted force-update
tests, and `git diff --check` pass. Copy review follow-up: completion, failure,
audit, prompt, and cleanup messages now state the action, safe default, exact
backup path, and recovery next step without duplicating the audit.

Success goals:

- Ordinary upstream package changes are not falsely reported as user edits.
- Local edits and legacy-only files remain recoverable and visible.
- Backups are deletable only after successful verification and explicit user
  choice.

Verification:

- Comparison tests covering changed, unchanged, deleted, legacy, ambiguous,
  and package-version-change cases.
- Interactive and non-interactive CLI tests.
- Manual review of audit output and cleanup behavior.

#### Phase 4: Exercise Migration, Safety, And Release Readiness

Objective: complete all automatable migration, safety, documentation, and
package-readiness validation before handing the release-gated manual checks to
Boss.

Tasks:

- ✅ Add a real legacy fixture covering flat role files, older manifest and
  lockfile shapes, edited files, stale files, and managed/unmanaged
  `AGENTS.md` content.
- ✅ Add automated fixtures for `.agents/`, `.claude/`, and `.codex/` user-owned
  content, backup-only compatibility content, standalone name collisions,
  symlinks, missing files, and existing backups.
- ✅ Add automated interrupted-process, rerun, incomplete-backup,
  concurrent-update, and available platform-metadata fixtures.
- ✅ Add automated temporary-project checks for PM runtime preservation and
  registered workspace/worktree safety.
- ✅ Run targeted tests, `npm run build`, `npm test`, and `npm run verify` as
  appropriate; record any manual validation gaps.
- ✅ Update `docs/command-reference.md`, `docs/package-management.md`, and
  related README/help or troubleshooting links with force-update behavior.
- ✅ Promote verified architecture, security, requirements, quality,
  operations, and decision content to the exact `_docs/kb` documents, creating
  and linking a forced-update decision record.
- ✅ Automate documentation-link and command-example checks; available
  Node/platform release checks remain bounded by the current environment. ✅
  package-smoke behavior verified by `npm run release:pack-preview`, `npm run
  release:local-smoke`, and the package-smoke test. Defer unavailable-platform
  and real-project checks to Phase 5.

Phase 4 documentation evidence: command reference and package-management
recovery guidance describe `aix update --force`, backup scope, audit, retention,
and verification. Current-state product, requirements, architecture, security,
quality, operations, and forced-update decision docs are linked and grounded in
`src/force-update/{inventory,coordinator,audit}.ts` and the force-update tests.
Final Phase 4 gate evidence: targeted force-update, inventory, package-smoke,
update, verify, CLI, and PM preservation tests passed (29 targeted tests);
`npm run verify` passed with 386 tests; `npm run release:pack-preview`, `npm run
release:local-smoke`, and `git diff --check` passed. Package metadata reports
`@tekfoundry/aix@0.5.0`, Node `>=20.17`, and public access. No publish, release,
or Phase 5 external-project validation was performed. Remaining Phase 4 work is
now limited to `Review & Refactor`; unavailable-platform and external-project
validation remain explicitly deferred to Phase 5. Documentation checks covered
20 local links in the force-update documentation set; `npm run build` passed,
and CLI help confirmed `aix update [--force]`.

2026-09-05 release-readiness evidence: on the available host (macOS Darwin
arm64, Node v24.9.0, npm 11.6.0), `npm run build`, `npm run typecheck`,
`npm test` (386 tests), `npm run verify`, `npm run release:pack-preview`, and
`npm run release:local-smoke` passed. The first concurrent `npm test` attempt
was terminated by the worker's 180-second execution limit without a test
failure; the rerun with a 360-second limit passed all 386 tests in 85 seconds.
A direct package metadata assertion passed for `@tekfoundry/aix@0.5.0`,
`aix: bin/aix.js`, `engines.node >=20.17`, and public access. A dry-run pack
assertion passed with archive `tekfoundry-aix-0.5.0.tgz`, 576 entries, and all
required roots (`aix`, `bin/aix.js`, `dist`, `README.md`, `package.json`). CI
configuration was inspected and remains Ubuntu plus Node 24. Windows and
additional supported-host/platform combinations were not available here and
are Phase 5 manual work; no publish, release, published-package install, or
external-project check was run.

2026-09-05 final Phase 4 quality gate: reviewed all Phase 4 implementation,
test, fixture, documentation, knowledge-base, and lockfile changes. Targeted
migration/safety, inventory, package-smoke, update, verify, CLI, roles, and PM
preservation tests passed (113 tests); `npm run build`, `npm run typecheck`,
`npm run verify` (386 tests), `npm run release:pack-preview`, `npm run
release:local-smoke`, and `git diff --check` passed. Documentation validation
checked 114 local Markdown links across `docs/` and the affected `_docs/kb/`
sections; all resolved. Review & Refactor found no blockers or unrecorded
Phase 4 follow-up. Publishing, release, published-package installation,
external-project, and unavailable-platform/manual validation remain solely in
Phase 5 and were not performed.
- ✅ Review & Refactor

Success goals:

- The stated `0.4` to `0.5` legacy migration scenario is covered by an
  automated fixture and produces a verified current installation.

Phase 4 task 1 evidence: `tests/fixtures/legacy-0.4/` captures the flat role,
legacy manifest/lockfile shapes, edited role content, stale package content,
and managed/unmanaged instruction examples. `tests/force-update.test.mjs`
loads that fixture, runs `aix update --force`, verifies the current install,
and confirms legacy/stale content remains recoverable.

Phase 4 fixture and preservation evidence: `tests/fixtures/force-update-safety/`
captures user-owned standalone role content and backup-only `.claude/` and
`.codex/` compatibility files. `tests/force-update.test.mjs` verifies those
files are preserved in place and in the completed backup, records missing
compatibility roots, preserves symlinks and available file metadata, refuses
concurrent/interrupted/incomplete reruns, reserves suffixed backups without
overwrite, and preserves PM runtime records plus a registered temporary Git
worktree. The targeted force-update and inventory run now passes 28 tests.
- Protected user content and PM runtime data survive all automated paths.
- Failure and cleanup behavior are documented and package-readiness checks pass
  for the available environments.
- Any unavailable-platform or real-project validation is explicitly deferred to
  Phase 5 rather than treated as complete.

Verification:

- Full migration and failure-path test matrix.
- `npm run verify`.
- Repository and package-readiness checks pass; external-project and
  unavailable-platform validation are reserved for Phase 5.

#### Phase 5: Release-Gated External Project Validation

Objective: validate the published user experience using the actual GitHub and
npm release artifact against the intentionally out-of-sync project.

Tasks:

- ⬜️ Prepare the release candidate, confirm version and package contents, and
  run the required repository/package verification before publishing.
- ⬜️ Publish the approved release to GitHub through the normal release process
  and confirm the release artifact is available.
- ⬜️ Install the published npm package in the validation environment rather
  than using the repository checkout or local build output.
- ⬜️ Run the released `aix update --force` against the intentionally
  out-of-sync project and record the exact package version and project state.
- ⬜️ Inspect the backup inventory, audit classifications, rebuilt layout,
  preserved stale/user-owned content, preserved `.aix/pm` state, verification
  result, prompt behavior, and final backup-retention choice.
- ⬜️ Perform any developer-owned manual validation not covered by automated
  checks, including unavailable-platform checks where applicable, and record
  the exact environment and results.
- ⬜️ Return the manual evidence to the project-manager for review; do not mark
  the phase or plan complete until the developer confirms the result.
- ⬜️ Review & Refactor

Success goals:

- The published GitHub/npm artifact installs successfully in the validation
  environment.
- The released command repairs the out-of-sync project and passes `aix verify`.
- The observed behavior matches the accepted backup, preservation, audit,
  cleanup, and PM-runtime decisions.
- Any failure or discrepancy is recorded as a blocking follow-up rather than
  treated as plan completion.

Verification:

- Release artifact and npm-install smoke checks.
- Manual execution of the released `aix update --force` on the agreed project.
- Developer review and explicit acceptance of the recorded evidence.

## Accepted Decisions

- **Failure recovery:** Force mode uses a validated backup and a forward clean
  rebuild. It does not blindly restore the older installation layout. If the
  rebuild fails, the intact backup and actionable failure details are the
  recovery path; old files are restored only when the current AIX version can
  verify that state as compatible.
- **Backup scope:** Back up the complete contents of `.agents/`, `.claude/`,
  `.codex/`, `aix.json`, `aix.lock.json`, and `AGENTS.md`. Exclude `.aix/` and
  all other project content. Backing up user-owned content does not grant AIX
  permission to overwrite or delete it.
- **Replacement authority:** Force mode bypasses drift protection only for
  files identified as AIX-managed through the lockfile or dedicated package
  store. It does not bypass ownership, collision, path-safety, symlink, or
  unrelated `AGENTS.md` protections.
- **Stale files:** Files absent from the new installation are preserved and
  reported rather than deleted. The prior manifest may identify candidates;
  old lockfile entries or unambiguous historical AIX layouts provide stronger
  ownership evidence.
- **Useful changes:** Use a three-way comparison among the old lockfile
  baseline, backed-up content, and new installation. Report user-edited,
  legacy-only, ambiguous, and collision cases without automatic merging.
- **Backup-name collisions:** Use the timestamped backup name, then an
  atomically reserved numeric suffix when needed. Never overwrite an existing
  backup.
- **Backup cleanup:** After a successful verified update, always show the
  audit results and prompt the user to keep or delete the backup, defaulting to
  keep. On failure or in non-interactive mode, retain and report the backup.
- **PM runtime:** `.aix/pm` remains outside the backup and mutation scope. Force
  mode must preserve PM runtime data, active delegations, decisions, locks, and
  workspaces untouched.
- **Command scope:** Support force recovery through `aix update --force` only.
  Do not add `aix workflow update --force` unless a later concrete use case
  justifies a shared force engine and separately defined scope.
- **Lockfile history:** Do not add migration or recovery history to
  `aix.lock.json` beyond the normal update result. Store force-update audit
  metadata in the backup and report the backup path in command output.

## Open Questions / Decisions

None remaining from the current design discussion.

## Documentation Impact

- Product: document the recovery promise, backup audit, cleanup prompt, and
  boundary between normal and forced updates.
- Requirements: add acceptance criteria for legacy layout repair, ownership
  protection, rollback, and post-update verification.
- Architecture: document update transaction boundaries, ownership inference,
  and legacy role migration.
- Security: document force-mode overwrite limits and ambiguous-collision
  behavior.
- Quality: add a migration matrix and manual validation using `_capsule`.
- Operations: update update/recovery guidance and troubleshooting commands.
- Decisions: record the accepted semantics of `aix update --force`.
- Glossary: likely no change unless “forced update” becomes a defined term.

## Product Readiness

- Readiness: internal-use-ready when the migration path is verified.
- Evidence needed: automated migration, backup-integrity, ownership,
  failure-recovery, and verification tests, plus manual validation on a
  developer-approved fixture or project state inside the agreed scope.

## Risks

- A backup that is incomplete or inaccessible could create false confidence
  before replacement writes begin.
- Backup storage could expose secrets or sensitive project-local instructions
  if its location and permissions are not controlled.
- A backup audit could misclassify ordinary version drift as a user change, or
  miss a useful edit in a legacy file with no direct new path.
- Users may delete a backup before recovering a change they did not recognize.
- Legacy projects may contain active PM runtime data that must survive a force
  update.
- The recovery path could become a second, inconsistent installer if it does
  not share the normal workflow materialization logic.

## Security Review

- Status: planned
- Scope reviewed: backup completeness and permissions, force-enabled local file
  replacement, managed instruction blocks, lockfile integrity, PM runtime data,
  source resolution, secret exposure, and explicit backup cleanup.
- Findings: no implementation findings yet; design must preserve fail-closed
  behavior for unowned or ambiguous files.
- Blocking findings converted to plan tasks: pending design acceptance.
- Residual risk: pending implementation and manual validation.

## Lessons To Carry Forward

- A protected update path is incomplete if it cannot repair a known package
  layout migration.
- “Force” should mean explicit backup, normal reinstall, and change recovery,
  not indiscriminate overwrite.
- Repeated manual recovery across projects is evidence that migration behavior
  belongs in the product lifecycle, not in user troubleshooting instructions.

## Completion Checklist

- ⬜️ Confirm every task and success goal is complete or explicitly deferred.
- ⬜️ Human validation: developer evaluated the completed phased work and
  accepted it, or explicitly waived manual validation with a recorded reason.
- ⬜️ Run or review required targeted and repository verification.
- ⬜️ Complete Security Review after all implementation phases; record findings,
  convert blocking findings into normal plan tasks, and document residual risk.
- ⬜️ Review the codebase using `$code-review-refactor`; refactor or record
  follow-up work if needed.
- ⬜️ Promote accepted durable behavior into `_docs/kb` using `$design-promote`.
- ⬜️ Review documentation structure, formatting, and links using
  `$review-and-refresh-docs`; fix issues or record follow-up work.
- ⬜️ Record final risks, follow-on work, and documentation impact.
- ⬜️ Harvest reusable lessons and update workflow guidance when appropriate.
- ⬜️ Archive under `_docs/plans/completed/YYYY-MM-DD-forced-updates.md`.
