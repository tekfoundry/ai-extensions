# Workflow Guidance Library

## Status

✅ Completed

This plan was activated by user request on 2026-08-28 and completed on
2026-08-28.

## Context

The `design-plan-execute` workflow currently brings together roles, skills,
templates, workflow instructions, and project documentation. Roles provide
specialist perspective, skills provide repeatable procedures, templates shape
workflow artifacts, and the workflow coordinates those pieces into a reusable
development lifecycle.

The workflow also ships the legacy engineering guidance file, a useful
cross-cutting engineering guidance document. That document is strongest for
implementation, architecture, quality, and review concerns, but it is not
tailored to each specialist role and does not cover product strategy,
requirements, UX writing, documentation ownership, or other role-specific
judgment with the same depth.

The proposed direction is to introduce guidance as a first-class concept in
the workflow ecosystem: editable best-practice material that can be organized
by role and by workflow activity. Role-specific guidance should travel with the
role so standalone external roles and workflow-owned roles can bring their own
discipline guidance. Activity guidance should stay with the workflow because
the workflow defines the lifecycle activities and their meaning.

Reviewed context:

- `AGENTS.md`
- `.agents/README.md`
- `.agents/workflow.md`
- the legacy engineering guidance file
- `.agents/roles/`
- `.agents/packages/workflows/aix/design-plan-execute/templates/plan.md`
- `_docs/README.md`
- `_docs/kb/01-product/product-overview.md`
- `_docs/kb/03-architecture/roles-and-templates.md`
- `_docs/kb/03-architecture/workflow-lifecycle.md`
- Existing discussion in this planning session about roles, skills, guidance,
  workflows, role guidance, activity guidance, and migration from
  the legacy engineering guidance file.
- Existing discussion in this planning session about standalone roles,
  workflow-owned roles, role bundle directories, `ROLE.md`, `GUIDANCE.md`, and
  workflow-owned activity guidance.
- Existing discussion in this planning session about a bundled
  `get-guidance` skill that resolves the recommended guidance documents before
  a role or skill performs its core work.
- Existing template publishing behavior in `.agents/README.md`,
  `_docs/kb/03-architecture/roles-and-templates.md`, and
  `_docs/kb/03-architecture/workflow-lifecycle.md`.
- `README.md` role command docs, including standalone external roles and
  bundled top-level AIX roles that exist outside a workflow.

## High-Level Goal (status: accepted)

Add a guidance model to AIX so reusable best practices can be shipped with
roles and workflows, tailored to the specialist perspectives and lifecycle
activities that participate in agent-assisted development, and customized
safely by project users.

This matters because roles can exist outside workflows, workflows can install
their own roles, and projects may combine one workflow with external
standalone roles. Role-specific judgment needs to stay close to the role that
owns it, while workflow activity practices need to stay close to the workflow
that defines the lifecycle. Skills should stay focused on repeatable
procedures rather than carrying every piece of best-practice guidance.

The desired conceptual model is:

- Roles bring specialist perspective.
- Activities bring work-type practice.
- Skills bring repeatable procedure.
- Templates bring artifact shape.
- Workflows bring sequence and orchestration.
- Guidance brings best-practice judgment.

## Design Intent (status: accepted)

Introduce a hybrid guidance model with two ownership paths:

- Role guidance: discipline-specific judgment that travels with a role package,
  such as how `security-engineer` should reason about trust boundaries or how
  `ux-writer` should avoid copy that overpromises behavior.
- Activity guidance: workflow-owned work-type guidance that can apply across
  roles and skills, such as planning, implementation, verification,
  documentation, and review.

Role package shape should move from a single Markdown file toward a directory
bundle that can hold role-related files together:

```text
roles/<role-name>/
  ROLE.md
  GUIDANCE.md
```

`ROLE.md` is the role entrypoint and replaces the current single-file role
shape. `GUIDANCE.md` is optional role-specific guidance for the same role.
Uppercase file names match the existing `SKILL.md` package entrypoint
convention and make contract files obvious inside package directories.
After this plan is completed, the old single-file role shape
`roles/<role-name>.md` should no longer be supported. The implementation must
migrate bundled workflow roles and bundled top-level AIX roles to role bundles
as part of the same work. AIX role discovery should recognize only role
bundles with `ROLE.md`; no auto-migration path is needed for external
single-file role sources because external role sources are not part of the
current ecosystem.

Workflow-owned roles would use the same bundle shape inside the workflow
package:

```text
aix/workflows/design-plan-execute/roles/project-dev/<role-name>/
  ROLE.md
  GUIDANCE.md
```

Standalone role sources would also be able to use the bundle shape:

```text
roles/<role-name>/
  ROLE.md
  GUIDANCE.md
```

After activation, AIX should expose role bundles in a project-facing active
location that keeps the role and its guidance together:

```text
.agents/roles/<role-name>/
  ROLE.md
  GUIDANCE.md
```

The active role directory is the only active role exposure in the core model.
AIX should not also generate `.agents/roles/<role-name>/ROLE.md` compatibility
files as part of this plan. Host-specific compatibility outputs can be handled
later by explicit integration commands if needed.

Activity guidance should remain workflow-owned because activities are defined
by the workflow lifecycle. The project-facing shape should use short lowercase
names under a dedicated guidance directory:

```text
.agents/guidance/
  README.md
  shared.md
  activities/
    planning.md
    implementation.md
    verification.md
    review.md
    documentation.md
```

Workflow packages should ship default activity guidance in a top-level
`guidance/` directory beside `skills/`, `roles/`, and `templates/`:

```text
aix/workflows/design-plan-execute/guidance/
  README.md
  shared.md
  activities/
    planning.md
    implementation.md
    verification.md
    review.md
    documentation.md
```

Projects should be able to publish or maintain editable overrides for
workflow-owned activity guidance. Activity guidance resolution should follow
the same spirit as template resolution:

1. Use project-owned `.agents/guidance/...` when present.
2. Otherwise use workflow-owned guidance from the active workflow package.

Workflow install should not materialize workflow activity guidance into
`.agents/guidance/`. The `.agents/guidance/` directory is project-owned
override space and should appear only when the project publishes or creates
editable guidance overrides. Before publishing, workflow activity guidance is
read from the active workflow package origin.

Role guidance has different lifecycle semantics. Role activation copies the
whole role bundle into the active project-facing role directory. That means
role `GUIDANCE.md` is effectively published and editable when the role is
activated:

```text
.agents/roles/<role-name>/
  ROLE.md
  GUIDANCE.md
```

`ROLE.md` remains the role contract and should be protected as package-managed
role behavior. `GUIDANCE.md` is project-editable guidance for that active role.
AIX should still retain enough package-origin information to diff or reset the
active role guidance against the role package origin.

The exact lifecycle details still need design review, but the concept should
preserve the existing AIX safety model: workflow-owned activity defaults are
package-managed and hash-checked, role guidance origins remain inspectable,
and user-editable guidance must not be silently overwritten by workflow or role
updates.

Guidance customization should have explicit commands. Template publishing
currently exposes the complete active workflow template set with:

```bash
aix templates list
aix templates publish
aix templates diff [template-name]
aix templates reset <template-name|--all>
```

Guidance should have a comparable command surface, with one public command
family for all active guidance:

```bash
aix guidance list
aix guidance publish
aix guidance diff [guidance-name]
aix guidance reset <guidance-name|--all>
```

Expected behavior:

- `aix guidance list` aggregates all guidance currently available to the
  project from the active workflow and all active roles, whether those roles
  are workflow-owned, standalone external roles, or bundled top-level AIX
  roles. It should use a compact table with command-ready names, kind, origin,
  status, and relevant metadata such as `applies_to` or `uses_guidance`.
  Example:

  ```text
  Name                       Kind      Origin                         Status
  shared                     shared    workflow:aix/design-plan-execute origin
  activities/verification    activity  workflow:aix/design-plan-execute modified
  roles/quality-engineer     role      role:workflow/design-plan-execute editable
  roles/aix-skill-author     role      role:aix                       modified
  ```

  The `Name` value should be the exact target accepted by
  `aix guidance diff <name>` and `aix guidance reset <name>`.
- `aix guidance publish` publishes the complete active guidance set. For active
  role guidance, publish is a no-op because role `GUIDANCE.md` is already
  published into the active role directory during role activation; the command
  should report those documents as already editable. For workflow shared and
  activity guidance, publish copies all active workflow guidance into
  project-owned editable override locations. Like templates, publish should
  keep the UX simple by refusing targeted publish arguments in the first
  version.
- `aix guidance diff [guidance-name]` compares project-owned guidance against
  its package origin without mutating files. For workflow activity guidance,
  this compares `.agents/guidance/...` overrides with the workflow origin. For
  role guidance, this compares `.agents/roles/<role-name>/GUIDANCE.md` with
  the active role package origin. Guidance names should be path-like:
  `shared`, `activities/<activity-name>`, and `roles/<role-name>`. With no
  name, `aix guidance diff` should list valid guidance documents that can be
  diffed and show the exact command for each one.
- `aix guidance reset <guidance-name>` resets one guidance document. For
  workflow activity guidance, reset removes the project-owned override and lets
  resolution fall back to the workflow origin. For role guidance, reset copies
  the role package origin `GUIDANCE.md` back into the active role directory.
  Guidance names should use the same path-like names as diff: `shared`,
  `activities/<activity-name>`, and `roles/<role-name>`.
- `aix guidance reset --all` resets all project-owned guidance customizations
  for the active guidance set and preserves unrelated files. Because this can
  remove or replace multiple project-edited guidance files, it must preview the
  modified guidance documents grouped by kind and origin, then ask for user
  confirmation before changing files. Targeted reset does not need an extra
  confirmation prompt because the command target is explicit.

The public UX should not require separate role-guidance commands. Under the
hood, AIX still needs to track ownership so workflow activity guidance,
workflow-owned role guidance, standalone external role guidance, and bundled
top-level AIX role guidance resolve, publish, diff, and reset against the
right origin.

Guidance metadata should support both directions. Activity guidance may include
front matter that declares which roles and skills commonly use it:

```yaml
applies_to:
  roles:
    - requirements-engineer
    - technical-architect
    - implementation-engineer
  skills:
    - plan-create
    - plan-review
```

Role `GUIDANCE.md` files may include front matter that references the activity
guidance they normally use:

```yaml
uses_guidance:
  - activities/planning
  - activities/review
```

These relationships should be treated as guidance graph metadata, not as an
automatic dependency resolver. The `get-guidance` skill should use the metadata
to offer the best guidance for the requesting role, requesting skill, activity,
and task context. AIX may later use the metadata for validation, status output,
documentation, publishing, or runtime handoff prompts.

The model should preserve these ownership rules:

- Role-specific guidance travels with the role package.
- Role guidance is published by role activation.
- Workflow activity guidance travels with the workflow package.
- Workflow activity guidance is published by `aix guidance publish`.
- Workflow install does not copy activity guidance into `.agents/guidance/`;
  that directory is project-owned override space.
- Project overrides live in `.agents/` and are protected from package updates.
- Roles from different sources keep their role package boundary, including
  their guidance, instead of flattening role guidance into a single global
  role-guidance directory.
- Activity guidance is not designed as a standalone source type in the first
  version because activities need a workflow lifecycle to define what they
  mean.

The first version should require guidance for the shipped AIX experience while
keeping external role authoring practical:

- Active workflows must provide workflow guidance docs, including
  `guidance/README.md`, `guidance/shared.md`, and the initial
  `guidance/activities/` set for planning, implementation, verification,
  review, and documentation.
- Bundled workflow-owned roles and bundled top-level AIX roles must include
  `GUIDANCE.md` in their role bundles.
- External standalone role bundles may omit `GUIDANCE.md`. Missing external
  role guidance is valid, but `aix guidance list` and `get-guidance` should
  report that no role guidance was provided for that active role.

Add a bundled `get-guidance` skill under the root AIX skill source so roles,
skills, and parent workflow contexts have one consistent read-only recipe for
finding relevant guidance when a caller asks for that help:

```text
@aix/skills/get-guidance
```

`get-guidance` should be a root AIX skill, not a workflow-owned
`design-plan-execute` skill, because guidance resolution is a cross-cutting AIX
capability that should be usable by any workflow or active role. This plan
creates the skill as an available resolver only. It does not make
`get-guidance` part of default workflow startup, managed `AGENTS.md` routing,
`delegate-to-role`, role execution, or skill execution.

Default routing and mandatory adoption are deferred to the project-manager
entry-role work in `_docs/plans/backlog/create-project-manager-role.md`. That
plan will decide whether `project-manager` calls `get-guidance` as a separate
skill, wraps the same resolution procedure inside
`project-manager/GUIDANCE.md`, or uses another small handoff shape. If later
workflow routing wants `design-plan-execute` to declare and activate
`get-guidance` automatically, it must coordinate with the approved backlog plan
`_docs/plans/backlog/workflow-external-skill-dependencies.md`, because current
workflow manifests do not support external workflow skill declarations.

The skill should be read-only. It should not install, update, activate,
deactivate, publish, reset, or edit guidance. Its job is to resolve and return
a bounded reading list plus any missing, conflicting, or ambiguous guidance
notes.

The caller must provide enough context for the skill to choose useful guidance.
All four context fields are required, even when a value is explicitly `none`:

```yaml
requesting_role: quality-engineer
requesting_skill: plan-review
activity: verification
task_context: reviewing backlog plan verification readiness
```

The accepted field shape is:

```yaml
requesting_role: none | <active-role-name>
requesting_skill: none | <active-skill-name>
activity: none | <activity-name>
task_context: <short summary>
```

Activity names must not be hardcoded into `get-guidance`. The skill should
resolve `<activity-name>` against the active workflow guidance set, such as
`guidance/activities/<activity-name>.md`. If the named activity is unknown, the
skill should report that no matching activity guidance exists and list the
available activity guidance names for the active workflow.

If the caller provides no meaningful role, skill, activity, or task context,
`get-guidance` should return no guidance and ask for a better-scoped call. The
skill should recommend guidance only when the supplied context matches known
guidance documents or guidance metadata.

The skill should resolve guidance in a conservative order:

1. Role package guidance, such as `.agents/roles/<role-name>/GUIDANCE.md`, when
   a requesting role is provided and active role guidance exists.
2. Project-owned activity guidance overrides, such as
   `.agents/guidance/activities/verification.md`, when present.
3. Workflow-owned activity guidance defaults from the active workflow package
   when no project override exists.
4. Shared workflow guidance, using project-owned `.agents/guidance/shared.md`
   first and then the active workflow default when present.
5. Legacy compatibility guidance, such as
   the legacy engineering guidance file, during migration when the newer
   guidance library does not yet cover the relevant activity or role.

The skill should apply conservative fallback behavior:

- If `requesting_role` is `none`, resolve only skill, activity, shared, and
  legacy guidance.
- If `requesting_skill` is `none`, resolve role, activity, shared, and legacy
  guidance.
- If `activity` is `none`, use role and guidance metadata only as a hint.
  Return candidate activity guidance instead of guessing when multiple
  activities fit.
- If guidance is missing, report the gap without blocking unless the calling
  workflow or role says that guidance is required.
- If role guidance and activity guidance conflict, report the conflict and
  prefer the more specific guidance only when it does not violate repository,
  workflow, role, skill, safety, or user instructions.

`get-guidance` should use a strict instruction hierarchy when guidance
conflicts with other instructions. User requests, repo `AGENTS.md`, managed
workflow instructions, skill procedures, role contracts, and safety rules all
outrank guidance. If guidance conflicts with a higher-priority instruction,
`get-guidance` should report the conflict and ignore the conflicting guidance.
Guidance informs judgment; it does not override the work request, lifecycle
rules, role contract, skill procedure, or safety boundaries.

Roles and skills may refer to `get-guidance` later when their own contracts
need it, but this plan should not hand-wire the skill into every role or skill
file. Central workflow routing is also out of scope for this plan. The
project-manager plan owns the question of who resolves guidance during request
startup, what caller payload is passed, and whether `delegate-to-role` should
carry guidance context.

The existing legacy engineering guidance file should be treated as migration
source material. Its content likely belongs across:

- `guidance/shared.md`
- `guidance/activities/implementation.md`
- `guidance/activities/verification.md`
- `guidance/activities/review.md`
- `roles/technical-architect/GUIDANCE.md`
- `roles/implementation-engineer/GUIDANCE.md`
- `roles/security-engineer/GUIDANCE.md`
- `roles/quality-engineer/GUIDANCE.md`

Product, requirements, documentation, and writing guidance will need more new
content because the current engineering guidance does not fully cover those
disciplines.

Keep the legacy engineering guidance file in place and unchanged during this
plan. Its content may be read as source material for new guidance docs, but the
file itself must not be edited or deleted. Internal references may move toward
the new guidance paths, but final deletion is blocked until the developer
explicitly says they have verified the migrated guidance preserves what matters
and the file can be deleted.

## Non-Goals

- No immediate changes to role behavior, skill behavior, or workflow lifecycle.
- No host-native agent integration for guidance loading in the first design
  discussion unless explicitly approved later.
- No automatic installation or execution of skills from guidance metadata.
- No file mutation by `get-guidance`; it is a read-only recommendation skill.
- No standalone activity-guidance source type in the first version.
- No separate public role-guidance command family in the first version.
- No command behavior that loses the ownership distinction between workflow
  activity guidance and role package guidance.
- No broad registry, marketplace, plugin-package, or global guidance system.
- No silent overwrite of project-edited guidance.
- No edits to or deletion of the legacy engineering guidance file unless the
  developer explicitly verifies that the file can be deleted.
- No forced role-specific guidance file for external standalone roles if a role
  does not yet need discipline-specific guidance beyond shared activity
  guidance.
- No flattening of external standalone role guidance into workflow-owned
  guidance paths.

## Boundaries And Invariants

- `.agents/` remains the workflow and package-managed agent process area.
- `_docs/` remains project-owned current-state knowledge and planning history.
- Workflow-owned defaults and project-owned overrides must stay distinct.
- Guidance should not replace roles, skills, templates, plans, or `_docs/kb`
  current-state documentation.
- Role bundles keep role-related files together, with `ROLE.md` as the role
  entrypoint and optional `GUIDANCE.md` as role-specific best-practice
  judgment.
- Role-specific guidance describes specialist judgment; it should not own
  execution.
- Activity guidance is workflow-owned work-type practice; it should not replace
  skill procedures.
- `get-guidance` centralizes guidance retrieval; individual roles and skills
  should not need to duplicate the full resolution algorithm.
- `get-guidance` must receive all required caller-context fields and stay
  bounded to guidance that matches the requesting role, requesting skill,
  workflow-defined activity, and task summary.
- This plan does not wire `get-guidance` into managed `AGENTS.md`,
  `.agents/workflow.md`, `delegate-to-role`, role contracts, skill contracts,
  workflow manifests, or default workflow startup. The project-manager plan
  owns the later routing decision.
- Standalone roles and workflow-owned roles must use compatible role package
  semantics so projects can combine one workflow with external roles.
- Guidance metadata should be inspectable and conservative. It should not make
  hidden runtime decisions that alter files or plan state.
- Guidance is lower priority than user requests, repo instructions, workflow
  lifecycle rules, skill procedures, role contracts, and safety boundaries.
  `get-guidance` must report and ignore conflicting guidance.
- First-version `aix verify` and `aix status` should perform light guidance
  validation. Required shipped guidance files and front matter syntax should be
  checked. Advisory metadata references, such as stale `applies_to` or
  `uses_guidance` entries, should be reported as warnings rather than hard
  failures while the guidance model is new.
- Workflow update, diff, verify, status, publish, and reset behavior for
  guidance should follow existing AIX safety principles if those lifecycle
  commands are extended.
- Guidance publishing and reset commands must preserve unrelated project files.
  Publish must refuse to overwrite edited project-owned workflow guidance
  overrides. Reset must make destructive replacement or removal explicit in its
  command target. `aix guidance reset --all` must add a preview and approval
  gate before changing multiple guidance files.
- Guidance command behavior must respect role ownership under the hood:
  workflow-owned role guidance moves with workflow lifecycle, standalone role
  guidance moves with role lifecycle, and bundled top-level AIX role guidance
  must not depend on an active workflow.

## Implementation Phases

### Phase 1: Role Bundle Cutover (status: completed)

Goal: move the role model to the new directory bundle shape first, so later
guidance work can build on the final role package structure.

Tasks:

- ✅ Update role package discovery to recognize only role bundles with
      `ROLE.md`.
- ✅ Migrate bundled top-level AIX roles from single Markdown files into
      `roles/<role-name>/ROLE.md` bundles.
- ✅ Migrate workflow-owned `design-plan-execute` roles into
      `roles/project-dev/<role-name>/ROLE.md` bundles.
- ✅ Update role activation so active roles are exposed as
      `.agents/roles/<role-name>/ROLE.md` directories instead of
      `.agents/roles/<role-name>.md` files.
- ✅ Update role package, active-file, lockfile, drift, diff, update,
      deactivate, status, verify, and workflow lifecycle behavior for bundled
      role directories.
- ✅ Update `delegate-to-role` and role-related tests/docs to resolve active
      roles through `ROLE.md`.
- ✅ Confirm old single-file role sources are no longer recognized and produce
      clear behavior.

Verification:

- Role lifecycle tests cover add, list, activate, diff, update, deactivate,
  status, verify, and workflow-owned role install/update/uninstall for role
  bundles.
- `npm test -- tests/roles.test.mjs tests/workflow.test.mjs`
- `npm run build`

Execution evidence (2026-08-28):

- Migrated shipped AIX and `design-plan-execute` roles, installed workflow
  package roles under `.agents/packages/workflows/aix/design-plan-execute/roles`,
  and active roles under `.agents/roles` to bundle directories with `ROLE.md`
  entrypoints.
- Updated role discovery, activation, package copy, active role materialization,
  lockfile hashing, drift/diff/update/deactivate/status/verify, workflow
  install/update/uninstall, delegation docs, architecture docs, and tests for
  role bundles.
- Added coverage that legacy single-file role sources are ignored by discovery
  and fail clearly on direct activation.
- Verification passed:
  `npm test -- tests/roles.test.mjs tests/workflow.test.mjs`,
  `npm test -- tests/init.test.mjs tests/package-smoke.test.mjs tests/lockfile.test.mjs`,
  `npm test -- tests/skill-instructions.test.mjs`,
  `npm run build`, `node bin/aix.js verify`, and `git diff --check`.

### Phase 2: Role Guidance Files (status: completed)

Goal: split existing role files into clean role contracts plus role-specific
guidance, then define `GUIDANCE.md` edit, diff, reset, and update behavior.

Tasks:

- ✅ Add `GUIDANCE.md` to every bundled top-level AIX role.
- ✅ Add `GUIDANCE.md` to every bundled `design-plan-execute` workflow role.
- ✅ Review each migrated `ROLE.md` for content that is really reusable
      guidance rather than role contract.
- ✅ Refactor each role bundle so `ROLE.md` stays focused on role identity,
      trigger conditions, context to inspect, stop conditions, and expected
      output.
- ✅ Move best-practice, judgment, heuristic, review, and discipline-specific
      material from the old role content into that role's `GUIDANCE.md`.
- ✅ Augment each role `GUIDANCE.md` with default role guidance so bundled AIX
      and workflow roles have useful guidance beyond mechanically extracted
      text.
- ✅ Treat external standalone role `GUIDANCE.md` as optional while requiring
      bundled AIX and workflow roles to include it.
- ✅ Preserve `ROLE.md` as package-managed role contract behavior while making
      active role `GUIDANCE.md` project-editable after activation.
- ✅ Ensure role update does not silently overwrite edited active
      `GUIDANCE.md`; changed upstream guidance should be visible for diff or
      manual reconciliation.
- ✅ Add guidance metadata parsing for role `GUIDANCE.md`, including optional
      `uses_guidance` entries.
- ✅ Seed role guidance from the legacy engineering guidance file where it
      applies to technical, implementation, quality, and security roles, and
      author missing guidance for product, requirements, documentation, and UX
      writing roles.
- ✅ Refactor role and activity `GUIDANCE.md` files to remove dependency on
      the legacy engineering guidance file after mining any remaining
      reusable guidance into the focused role or activity guidance documents.

Verification:

- Tests cover active role guidance editability, role guidance diff/reset, role
  update safety, missing optional external role guidance, and required bundled
  role guidance.
- Guidance review confirms focused `GUIDANCE.md` files are self-contained and
  do not require the legacy engineering guidance file for normal role or
  activity execution.
- Review role `GUIDANCE.md` content for clear ownership, no placeholder text,
  and no conflict with role contracts.
- Review migrated `ROLE.md` files to confirm they are slimmer role contracts
  and no longer carry large blocks of guidance content.

Execution note (2026-08-28, completed):

- Added `GUIDANCE.md` files for all bundled AIX and `design-plan-execute`
  workflow role bundles, copied workflow role guidance into the active
  workflow package under `.agents/packages/workflows/aix/design-plan-execute`,
  copied active workflow role guidance into `.agents/roles/<role-name>/GUIDANCE.md`,
  and slimmed `ROLE.md` contracts.
- Added parser/path primitives for role guidance metadata, active role hashing
  that protects `ROLE.md` while allowing project-editable active guidance, a
  reset primitive for active role guidance, and the
  `aix role guidance reset <active-name>` CLI command.
- Updated standalone and workflow role tests for optional external guidance,
  required bundled guidance, editable active guidance, upstream guidance diff
  visibility, update preservation, and reset behavior.
- Updated README surfaces only. `_docs/kb` promotion is intentionally deferred
  until plan closeout.
- Verification: `npm run build` passes. `npm test --
  tests/roles.test.mjs tests/workflow.test.mjs` passes with 194 tests.
  `node bin/aix.js verify` passes after refreshing active workflow package
  lockfile hashes. `git diff --check` reports pre-existing trailing whitespace
  in `_docs/ideas.md`, which is unrelated to Phase 2 and was left untouched.

Follow-up note (2026-08-28):

- Developer review clarified that focused guidance should not depend on the
  legacy engineering guidance file. The intended end state is that useful
  content from the old file is mined into role and activity guidance, after
  which the broad original file can be deleted or retired without losing
  required behavior.

Execution note (2026-08-28, completed):

- Replaced legacy guidance entries in bundled, installed-package, and active
  role `GUIDANCE.md` metadata with focused activity guidance names such as
  `activities/planning`,
  `activities/implementation`, `activities/verification`,
  `activities/review`, and `activities/documentation`.
- Updated role guidance parser fixtures so `uses_guidance` examples use the
  new activity-guidance naming contract.
- Confirmed no role `GUIDANCE.md` file in `aix/roles`,
  `aix/workflows/design-plan-execute/roles`,
  `.agents/packages/workflows/aix/design-plan-execute/roles`, or
  `.agents/roles` references `legacy engineering guidance`.
- Verification passed: `npm run build`, `npm test --
  tests/roles.test.mjs tests/workflow.test.mjs` with 194 tests, and
  `node bin/aix.js verify`.

Correction note (2026-08-28):

- Developer review found that the previous cleanup removed the legacy
  dependency metadata but did not migrate enough role-specific guidance into
  the focused `GUIDANCE.md` files. Reopened the task to expand each bundled
  role guidance document as job-title guidance that can stand on its own.

Execution note (2026-08-28, completed):

- Expanded all bundled top-level AIX role `GUIDANCE.md` files and all bundled
  `design-plan-execute` project-development role `GUIDANCE.md` files into
  job-title guidance. Each document now describes the role's job focus, how the
  role works, the judgment it should apply, common risks or review checks, and
  output discipline.
- Mined relevant implementation, architecture, maintainability, verification,
  error-handling, state, refactoring, security, and package-safety guidance
  into the roles that need it. Authored role-specific product, requirements,
  product-design, UX-writing, documentation, workflow-architecture,
  skill-authoring, release-readiness, and instruction-audit guidance where the
  legacy engineering document did not cover the job well.
- Synced updated workflow role guidance into the installed workflow package
  under `.agents/packages/workflows/aix/design-plan-execute/roles` and active
  role guidance under `.agents/roles`. Refreshed workflow package and
  workflow-owned role package hashes in `aix.lock.json`.
- Phase 3 still owns creation of workflow activity guidance files. There were
  no activity `GUIDANCE.md` files to refactor during Phase 2.
- Follow-up review generalized the `design-plan-execute` project-development
  role guidance so reusable roles do not assume the project is AIX, a CLI, or a
  package manager. AIX-specific language remains only in bundled AIX
  development roles whose job titles are explicitly AIX-focused.
- Verification passed: source guidance scan found no legacy
  `legacy engineering guidance` dependency, TODO text, placeholder text, or
  selected AI-writing tells; installed-package and active guidance copies match
  source; `npm run build` passes; `npm test --
  tests/roles.test.mjs tests/workflow.test.mjs tests/package-smoke.test.mjs`
  passes with 194 tests; `node bin/aix.js verify` passes. `git diff --check`
  still reports pre-existing trailing whitespace in `_docs/ideas.md`, which is
  unrelated and was left untouched.

### Phase 3: Workflow Activity Guidance (status: completed)

Goal: add workflow-owned shared and activity guidance to the
`design-plan-execute` workflow without materializing editable overrides during
workflow install.

Tasks:

- ✅ Add top-level workflow guidance under
      `aix/workflows/design-plan-execute/guidance/`.
- ✅ Add `guidance/README.md` and `guidance/shared.md`.
- ✅ Add initial activity guidance for planning, implementation, verification,
      review, and documentation.
- ✅ Add front matter parsing for activity guidance metadata, including
      optional `applies_to.roles` and `applies_to.skills`.
- ✅ Extend workflow manifest, install, update, diff, status, verify, and
      lockfile behavior to include workflow guidance origins and hashes.
- ✅ Keep workflow install from copying workflow guidance into
      `.agents/guidance/`; that directory remains project-owned override
      space created by publishing or direct user customization.
- ✅ Keep the legacy engineering guidance file available during migration
      without editing or deleting it.

Verification:

- Tests cover workflow guidance discovery, package hashes, metadata syntax,
  install/update drift checks, status counts, verify warnings, and no
  `.agents/guidance/` materialization during workflow install.
- Documentation review confirms the legacy engineering guidance file references are
  intentionally retained or moved, with no broken references.

Execution note (2026-08-28, completed):

- Added workflow-origin guidance files under
  `aix/workflows/design-plan-execute/guidance/`: `README.md`, `shared.md`,
  and activity guidance for planning, implementation, verification, review,
  and documentation.
- Added `guidanceDir` support to workflow manifests, workflow guidance
  discovery, safe-name validation, required document validation, `applies_to`
  metadata parsing, guidance hashing, lockfile parsing, install/update
  lockfile writes, status counts, and verify drift checks.
- Kept workflow install package-owned only. Tests confirm workflow install
  copies guidance into `.agents/packages/workflows/.../guidance/` and does not
  create `.agents/guidance/`.
- Kept the legacy engineering guidance file available and unchanged.
  New workflow activity guidance does not depend on it. Existing legacy
  references in skill-instruction tests and workflow fixture docs remain
  intentional until later migration/closeout phases.
- Clarified the Phase 3 verification severity decision in implementation:
  current `aix verify` has only issue/failure reporting, so required guidance
  drift and malformed metadata are reported as normal verify/install issues.
  Advisory stale-reference warnings remain deferred until a warning channel is
  designed.
- Verification passed: `npm run build`; `npm test --
  tests/workflow.test.mjs tests/status.test.mjs tests/lockfile.test.mjs
  tests/package-smoke.test.mjs` ran the repository test runner and passed with
  199 tests; `node bin/aix.js verify`; `git diff --check`.

### Phase 4: Guidance Commands (status: completed)

Goal: provide one compact public command family for listing, publishing,
diffing, and resetting active guidance from workflows and active roles.

Tasks:

- ✅ Add `aix guidance list` with compact table output using command-ready
      names, kind, origin, status, and relevant metadata.
- ✅ Add `aix guidance publish` to publish all workflow shared/activity
      guidance into `.agents/guidance/`, while reporting active role guidance
      as already editable.
- ✅ Add `aix guidance diff` with no target to list valid diff commands.
- ✅ Add `aix guidance diff <name>` for `shared`,
      `activities/<activity-name>`, and `roles/<role-name>`.
- ✅ Add `aix guidance reset <name>` with kind-specific reset behavior for
      workflow guidance overrides and role `GUIDANCE.md`.
- ✅ Add `aix guidance reset --all` with a preview of all modified guidance
      documents and an approval prompt before changing files.
- ✅ Ensure guidance commands preserve unrelated files and refuse unsafe
      overwrites.

Verification:

- Command tests cover list, publish, diff, targeted reset, reset-all preview,
  reset-all confirmation, role guidance reset, workflow guidance reset, and
  no-op role guidance publish reporting.
- CLI help and README examples match the accepted command surface.

Execution note (2026-08-28, completed):

- Added the public `aix guidance` command family with list, publish, diff, and
  reset subcommands. The command layer aggregates active workflow shared and
  activity guidance with active role `GUIDANCE.md` files, reports command-ready
  names, kind, origin, status, and metadata, and lists exact `aix guidance diff
  <name>` targets when diff is run without a target.
- Implemented workflow guidance publishing into `.agents/guidance/` while
  leaving role guidance as already-editable active role files. Publish refuses
  targeted arguments and refuses to overwrite locally edited workflow guidance
  overrides.
- Implemented targeted reset for workflow guidance overrides and role
  guidance, plus `aix guidance reset --all` with a preview table and exact
  confirmation text before removing workflow overrides or restoring modified
  or missing role guidance. Reset behavior preserves unrelated project-owned
  files.
- Updated CLI splash/help metadata and README examples for the accepted
  command surface.
- Verification passed: `npm run build`; `node --test tests/guidance.test.mjs`;
  `node --test tests/cli.test.mjs`; `npm test --
  tests/workflow.test.mjs tests/templates.test.mjs tests/roles.test.mjs
  tests/status.test.mjs` ran the repository test runner and passed with 206
  tests; `node bin/aix.js verify`; `git diff --check`. A manual direct smoke
  of `node bin/aix.js guidance list` also passed against the current checkout.

### Phase 5: Get Guidance Skill (status: completed)

Goal: add the read-only `@aix/skills/get-guidance` skill as an available
guidance resolver without making it part of default workflow startup or role
routing.

Tasks:

- ✅ Add root AIX skill `aix/skills/get-guidance/SKILL.md`.
- ✅ Define the required caller context fields:
      `requesting_role`, `requesting_skill`, `activity`, and `task_context`.
- ✅ Make `get-guidance` resolve role guidance, workflow activity overrides,
      workflow activity origins, shared guidance, and legacy
      the legacy engineering guidance file fallback when needed.
- ✅ Make `get-guidance` use `applies_to` and `uses_guidance` metadata as
      advisory routing hints.
- ✅ Make `get-guidance` report no guidance when context is missing or no
      guidance matches.
- ✅ Make `get-guidance` report and ignore guidance that conflicts with higher
      priority user, repo, workflow, skill, role, or safety instructions.
- ✅ Keep the skill optional for this plan: do not wire it into managed
      `AGENTS.md`, `.agents/workflow.md`, `delegate-to-role`, role contracts,
      skill contracts, workflow manifests, or default workflow startup.
- ✅ Add a plan note that mandatory routing and adoption are deferred to
      `_docs/plans/backlog/create-project-manager-role.md`, with any future
      workflow-required external skill activation depending on
      `_docs/plans/backlog/workflow-external-skill-dependencies.md`.

Verification:

- Skill instruction tests cover required context, missing context, unknown
  activity, metadata-assisted selection, conflict reporting, no file mutation,
  and legacy fallback.
- `get-guidance` examples produce bounded reading lists rather than dumping
  unrelated guidance.
- Tests or review notes confirm no managed workflow append, role, skill,
  delegation, or manifest wiring was added by this phase.

Execution note (2026-08-28, completed):

- Added the root AIX `get-guidance` skill under `aix/skills/get-guidance/`
  with a `SKILL.md` contract and README. The skill requires
  `requesting_role`, `requesting_skill`, `activity`, and `task_context`, and
  returns no guidance when required context is missing or too vague.
- Defined read-only resolution for active role `GUIDANCE.md`, project-owned
  workflow guidance overrides, active workflow package activity origins, shared
  guidance, and the legacy engineering guidance fallback used during migration.
- Documented advisory `applies_to` and `uses_guidance` metadata behavior,
  unknown-activity handling, bounded reading-list output, missing guidance
  notes, and conflict reporting that ignores guidance when higher-priority
  user, repository, workflow, skill, role, or safety instructions win.
- Kept `get-guidance` optional. It is available from the root AIX skill source
  and appears in `aix skills list`, but default project init still activates
  only `discover-skill` as the standalone bundled skill. No managed workflow
  append, workflow manifest, role contract, `delegate-to-role`, or default
  workflow startup wiring was added.
- Observed the project-manager backlog plan note that defers mandatory
  guidance routing and adoption to
  `_docs/plans/backlog/create-project-manager-role.md`; future workflow-required
  external skill activation still depends on
  `_docs/plans/backlog/workflow-external-skill-dependencies.md`.
- Verification passed: `npm run build`; `node --test
  tests/skill-instructions.test.mjs`; `node --test tests/skills.test.mjs`;
  `node --test tests/skill-instructions.test.mjs tests/skills.test.mjs
  tests/init.test.mjs tests/package-smoke.test.mjs`; `node bin/aix.js
  verify`; `git diff --check`; `npm test` passed with 208 tests.

### Phase 6: Defer Routing Adoption (status: completed)

Goal: confirm this plan does not implement default guidance routing, and hand
request-entry behavior to the project-manager plan.

Tasks:

- ✅ Record a plan-only execution note confirming no default guidance routing is
      being implemented here. `get-guidance` remains optional, and this plan
      does not change managed `AGENTS.md`, workflow `AGENTS.append.md`,
      skill-level append files, `delegate-to-role`, role contracts, skill
      contracts, workflow manifests, or default workflow startup.
- ✅ Confirm that `_docs/plans/backlog/create-project-manager-role.md` owns
      future request-entry routing, guidance payload design, and any default
      use of `get-guidance`.
- ✅ Confirm that automatic workflow activation of `get-guidance`, if later
      needed, depends on the external workflow skill dependency plan unless the
      project-manager plan chooses a different design.

Verification:

- Documentation review confirms routing/adoption decisions are no longer
  claimed by this plan.
- `git diff --check` confirms the plan-only edit is clean.

Execution note (2026-08-28, completed):

- Completed Phase 6 as a documentation-only routing boundary checkpoint. No
  code, workflow manifest, managed `AGENTS.md`, workflow `AGENTS.append.md`,
  skill append, role contract, skill contract, default startup, or
  `delegate-to-role` behavior changed.
- Confirmed that request-entry routing, guidance payload design, and any
  default use of `get-guidance` remain owned by the project-manager backlog
  plan.
- Confirmed that automatic workflow activation of `get-guidance`, if later
  needed, remains dependent on the external workflow skill dependency plan
  unless the project-manager plan chooses a different design.

### Phase 7: Documentation, Migration Review, And Closeout (status: completed)

Goal: align product, requirements, architecture, security, quality,
operations, and README docs with the accepted guidance model before the plan is
completed.

Tasks:

- ✅ Update product docs to describe guidance as a first-class AIX concept
      across role packages and workflow activity guidance.
- ✅ Update requirements docs for role bundles, workflow guidance, guidance
      commands, `get-guidance`, metadata, validation, and customization.
- ✅ Update architecture docs for role bundle package shape, workflow guidance
      package shape, command behavior, optional `get-guidance` behavior, and
      lifecycle ownership.
- ✅ Update security docs for role guidance instruction trust, project-owned
      guidance edits, reset behavior, drift checks, and deferred routing
      adoption.
- ✅ Update quality docs and test matrix for role bundles, guidance commands,
      metadata validation, optional `get-guidance`, and deferred routing
      behavior.
- ✅ Update README and workflow docs with command examples and migration notes.
- ✅ Review the legacy engineering guidance file against the new guidance
      files and record whether any content still needs migration, without
      editing or deleting the original file.
- ✅ Remove live workflow, documentation, skill, and test references to
      the legacy engineering guidance file after developer approval.
- ✅ Run final verification and complete plan closeout requirements.

Verification:

- `npm test`
- `npm run build`
- `aix verify` when available in the local checkout
- Documentation review verifies no stale role-file paths remain and no live
  workflow, knowledge-base, README, managed `AGENTS.md`, skill, or test
  dependency remains on the legacy engineering guidance file.

Execution note (2026-08-28, completed):

- Updated current-state product, requirements, architecture, security, quality,
  operations, decision, glossary, README, and workflow documentation for the
  shipped guidance model.
- Added `_docs/kb/02-requirements/skills/get-guidance.md` for the optional
  read-only resolver skill.
- Added `_docs/kb/07-decisions/guidance-ownership-model.md` and linked it from
  the decision index and top-level KB index.
- Reviewed the legacy engineering guidance file against focused role and
  activity guidance. Its maintainability, ownership-boundary, refactoring,
  testing, error-handling, state, security, performance, and code-review themes
  are represented across workflow activity guidance and technical,
  implementation, quality, security, package-safety, and workflow-architecture
  role guidance. No remaining content gap was found that blocks retiring the
  file after developer approval.
- Removed live references to the legacy engineering guidance file from
  current README, knowledge-base workflow docs, bundled `design-plan-execute`
  and `agile-kanban` workflow manifests and instructions, `get-guidance`, and
  tests.
- Replaced `code-review-refactor`'s required legacy-document preflight with a
  focused-guidance review contract. Missing focused guidance is now a review
  gap to report, not a hard stop caused by a missing legacy file.
- Verification passed: `npm run build`, `npm test` with 208 tests,
  `git diff --check`, `node bin/aix.js verify`, and a live-reference scan over
  `README.md`, `AGENTS.md`, `_docs/kb`, bundled workflow files, `get-guidance`,
  tests, and installed `.agents` workflow files.
- Reconciled installed `.agents` workflow drift from the local
  `aix/workflows/design-plan-execute` bundle after developer confirmation that
  no local customizations needed preservation. Confirmed the installed package
  directory and active installed workflow docs match the local bundle.

## Open Questions / Decisions

- None for this plan. Completed and backlog plan records may still mention the
  legacy file as historical context; those records are not live workflow
  dependencies.

## Documentation Impact

- Product: Updated to describe guidance as a first-class AIX concept across
  role packages and workflow activity guidance.
- Requirements: Updated for workflow guidance defaults, project overrides, role
  bundles, role guidance, `get-guidance`, metadata, customization, and deferred
  default routing.
- Architecture: Updated workflow lifecycle, package-management, system
  architecture, and roles/templates architecture docs for role bundles,
  guidance origins and overrides, command behavior, metadata, optional
  `get-guidance`, and lifecycle ownership.
- Security: Updated trust-boundary and local-file-safety docs for guidance
  instruction trust, overwrite and reset behavior, drift checks, read-only
  resolver behavior, metadata limits, and deferred routing adoption.
- Quality: Updated verification strategy and test matrix for guidance parsing,
  commands, `get-guidance`, reset safeguards, and deferred request-entry
  routing.
- Operations: Updated release and maintenance docs with guidance package,
  maintenance, incident, and safety-sensitive reset notes.
- Decisions: Added an accepted guidance ownership decision record.
- Glossary: Added guidance, role guidance, activity guidance, and guidance
  metadata terms.

## Product Readiness

- Readiness: Ready for plan completion.
- Evidence: Focused guidance migration is documented, live references to the
  legacy file are removed, installed `.agents` state verifies, and the full
  test suite passes.

## Risks

- Guidance could become another instruction layer that agents fail to discover
  or apply consistently until the project-manager routing plan defines default
  request-entry behavior.
- Too many small guidance files could make the workflow feel heavy and
  increase maintenance cost.
- A single shared guidance file could recreate the current problem by hiding
  role-specific judgment in a long document.
- Moving roles from single Markdown files to role bundles could require a
  careful compatibility path for existing role sources, lockfile entries,
  active role exposure, and host expectations.
- If role guidance is separated from role packages, external standalone roles
  could lose their discipline guidance or collide with workflow-owned role
  guidance for the same active role name.
- Project-owned overrides must be protected carefully because guidance can
  materially alter agent behavior.
- Guidance publish/reset commands could accidentally erase team customization
  unless they mirror template overwrite and reset safeguards.
- Role guidance commands could confuse users if they do not clearly separate
  active workflow activity guidance from role-package guidance.
- Guidance metadata could be mistaken for dependency resolution unless the
  first version keeps that boundary explicit.
- `get-guidance` could become too broad and load irrelevant guidance unless
  caller-context requirements and bounded-output rules are clear.
- Roles or skills may inconsistently call `get-guidance` until the
  project-manager plan decides where guidance resolution belongs.
- Migrating the legacy engineering guidance file too aggressively could break
  existing workflow references before the new guidance library is established.

## Security Review

- Status: Completed for implemented guidance-library work.
- Scope reviewed: Instruction trust, package-managed workflow defaults,
  package-managed role guidance, project-owned guidance overrides, local file
  overwrite risk, and guidance metadata boundaries.
- Findings: Guidance is security-sensitive because it shapes agent behavior.
  Role `GUIDANCE.md` files are also security-sensitive because standalone
  external roles can bring their own instructions. Implemented behavior keeps
  source ownership visible, preserves project-owned workflow guidance
  overrides, keeps active role guidance editable without silent overwrite,
  requires explicit reset behavior, treats guidance metadata as advisory, and
  keeps `get-guidance` read-only.
- Blocking findings converted to plan tasks: none.
- Residual risk: Default request-entry routing through guidance is still
  unresolved and remains owned by the project-manager plan. The legacy
  engineering guidance file remains until the developer approves deletion.

## Closeout Summary

- Completed role bundle support, role guidance files, workflow activity
  guidance, guidance commands, the read-only `get-guidance` skill, routing
  deferral notes, documentation promotion, migration cleanup, and installed
  `.agents` reconciliation.
- Removed live dependencies on the legacy engineering guidance file from the
  current README, managed workflow instructions, bundled workflow manifests,
  current knowledge-base docs, active installed workflow files, `get-guidance`,
  and tests. Completed historical plan records may still mention the old file
  as history.
- Code review closeout found no refactor findings that block completion. The
  changed behavior is covered by updated init, workflow, skill-instruction,
  role, guidance, template, status, verify, and package smoke tests.
- Human validation: developer reviewed the Phase 6 collapse, approved Phase 6
  completion, approved Phase 7 execution, accepted the legacy-reference cleanup
  direction, and requested plan completion on 2026-08-28.
- Reusable lessons: focused role and activity guidance replaced the broad
  shared engineering file as the durable workflow guidance pattern. No
  additional workflow-guidance lesson is needed beyond the shipped guidance
  docs and updated knowledge base.

## Completion Checklist

- ✅ Confirm every task and success goal is complete or explicitly deferred.
- ✅ Human validation: developer evaluated the completed phased work and accepted it, or explicitly waived manual validation with a recorded reason.
- ✅ Run or review required targeted and repository verification.
- ✅ Complete Security Review after all implementation phases; record findings, convert blocking findings into normal plan tasks, and document residual risk.
- ✅ Review the codebase using `$code-review-refactor`; refactor or record follow-up work if needed.
- ✅ Promote accepted durable behavior into `_docs/kb` using `$design-promote`.
- ✅ Review documentation structure, formatting, and links using `$review-and-refresh-docs`; fix issues or record follow-up work.
- ✅ Record final risks, follow-on work, and documentation impact.
- ✅ Harvest reusable lessons and update workflow guidance when appropriate.
- ✅ Archive under `_docs/plans/completed/YYYY-MM-DD-<name>.md`.
