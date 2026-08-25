# Agent role definitions

## Status

🟨 Active

Activation note: Human activation requested on 2026-08-24.

## Context

AIX currently manages project-local AI workflows and skills. Workflows define
the team's process, and skills define reusable procedures agents can load when
the task calls for them. A new idea has been approved to explore project-local
agent role definitions under `.agents/roles/`, paired with a
`delegate-to-role` skill or workflow behavior.

The intent is to capture role-specific operating guidance without stuffing
every reusable behavior into `AGENTS.md` or forcing every role into a skill. A
role should describe how a delegated agent should think, what it should inspect,
which skills it may use, and what evidence it should return. The specific role
catalog remains intentionally open for more product discussion.

Reviewed context:

- `AGENTS.md`
- `.agents/README.md`
- `.agents/workflow.md`
- `.agents/skills/plan-create/SKILL.md`
- `.agents/skills/unslop/SKILL.md`
- `.agents/packages/workflows/aix/design-plan-execute/templates/plan.md`
- `_docs/README.md`
- `_docs/design/README.md`
- `_docs/design/package-management.md`
- `_docs/design/workflows.md`
- `_docs/ideas.md`
- `README.md`
- Claude Code custom subagents documentation, reviewed 2026-08-24.

## High-Level Goal (status: accepted)

Add a plan for first-class, project-local agent role definitions in AIX. The
plan should preserve the current product direction: workflows remain the
project's operating model, skills remain reusable procedures, and agent roles
become reusable delegation profiles that can guide either native subagents or
prompt-overlay fallback behavior.

The plan should capture the concept, boundaries, role ownership model, and
initial role catalog while leaving exact implementation sequencing flexible.

## Design Intent (status: accepted)

AIX should treat `.agents/roles/` as the canonical project-local home for role
definitions. These definitions should be versioned, reviewable, lockable, and
drift-protected using the same basic product values that already apply to
skills and workflows.

AIX should not use `.agents/agents/` as the canonical location. The term
`agents` is likely to overlap with host-native subagent discovery as model
runtimes evolve. Even if a host does not read `.agents/agents/` today, placing
AIX-managed files there could create surprising behavior later if a runtime
starts auto-discovering that path. AIX should manage role definitions in
`.agents/roles/` and expose them to host-native agent directories only through
an explicit compatibility step.

Role definitions should not replace skills. A skill answers "what procedure
should the agent follow?" A role answers "who should think about this task, what
judgment should they apply, and which skills should they consider using?" This
distinction should guide naming, manifests, docs, and command behavior.

The implementation shape is:

- Define role files as Markdown with YAML front matter. Match Claude Code's
  native subagent shape where practical: `name` and `description` are required,
  common optional fields include `tools`, `disallowedTools`, `model`,
  `maxTurns`, `skills`, and `color`, and the Markdown body is the role's
  operating prompt.
- Keep role `name` values lowercase and hyphenated. Do not use `:` in role
  names because some runtimes reserve it for scoped identifiers.
- Treat runtime fields such as `tools`, `model`, and `skills` as host-specific
  hints, not as AIX's only safety boundary. AIX should still enforce package
  ownership, lockfile integrity, drift detection, and overwrite protection.
- Package workflow-specific project-development roles with the workflow that
  owns their process, starting with
  `aix/workflows/design-plan-execute/roles/project-dev/`.
- AIX-development roles are authoring and review roles that help manage new or
  existing AIX skills and workflows. They should not assume workflow-owned
  skills are installed unless they are intentionally packaged inside that
  workflow.
- Roles can be standalone top-level roles or workflow-owned roles. A role
  belongs inside a workflow when it depends on that workflow's skills. A role
  that does not depend on workflow-owned skills can be top-level. No role may
  depend on more than one workflow.
- Local project extension source belongs under the project root `aix/`
  directory. For a typical npm-installed project this directory may be created
  by authoring flows; in the AIX source repository it already exists and is the
  distributable bundled source tree.
- Local project source under `./aix/` should override default or remote `aix`
  sources. For example, `aix skill activate aix/skills/my-skill` first resolves
  `./aix/skills/my-skill` when present, then falls back to configured or
  bundled/default `aix` sources.
- Locally generated skills and workflows under `./aix/` are source artifacts
  and must not be deleted by deactivate or uninstall behavior. Installed
  materialized package copies under `.agents/packages/skills` and
  `.agents/packages/workflows` may be cleaned only when they are known remote
  package-managed copies, not local source artifacts.
- Materialize active project roles under `.agents/roles/<role-name>.md`.
- Let role files declare metadata such as name, description, routing triggers,
  recommended or required skills, allowed tool posture, model preference when a
  runtime supports it, and output expectations.
- Add or design a `delegate-to-role` skill or workflow behavior that can
  select a role, load its guidance, and create a bounded delegation prompt.
- Support two runtime modes: native subagent handoff when the host supports it,
  and prompt-overlay fallback when it does not.
- Keep the parent context authoritative for plan state, worktree safety,
  verification evidence, and final decisions.

### Role file format

AIX role files should use one Markdown file per role. The file starts with YAML
front matter for machine-readable routing and runtime hints, followed by the
role's operating prompt in Markdown. This matches Claude Code's native
subagent format closely enough that installed role files can work directly in
runtimes that support that shape, while still leaving room for AIX to support
other hosts through adapters.

`name` and `description` are required. `name` is the stable role identifier and
should match the activated filename without `.md`. It must use lowercase
letters, numbers, and hyphens. Do not use `:` because some runtimes reserve it
for scoped identifiers. `description` should say when to delegate to the role,
not merely describe the role's personality.

Optional fields should use native host names where they are already established:
`tools`, `disallowedTools`, `model`, `maxTurns`, `skills`, and `color`. AIX may
also add its own metadata later, but AIX-specific fields should be additive and
safe for other runtimes to ignore.

Example:

```md
---
name: quality-engineer
description: Designs targeted verification and regression coverage for planned work.
tools: Read, Glob, Grep, Bash
model: inherit
skills:
  - work-verify
color: green
---

You are a quality engineer for a project using the design-plan-execute
workflow.

Read the active plan, relevant design docs, and changed files. Recommend the
smallest verification set that proves the intended behavior. Return exact
commands, expected evidence, coverage gaps, and residual risk.
```

The Markdown body is the role's operating prompt. It should define what the
role inspects, the judgment it applies, when it must stop, which workflow
skills it should consider, and what evidence it must return.

### Role and skill interaction

Roles are the preferred human-facing entrypoint for fuzzy or judgment-heavy
work. A user can ask for `requirements-engineer`, `quality-engineer`, or another
role when they want specialist judgment before choosing the exact procedure.

Skills remain valid direct entrypoints for known workflow procedures. A user
can still invoke `plan-create`, `task-execute`, `work-verify`,
`documentation-review`, or another skill directly when they know which workflow
procedure they want.

Roles may recommend, sequence, or delegate through skills. Skills may request
help from roles for bounded specialist judgment. In both directions, the
invoking unit keeps ownership of the task boundary, final decision, artifact,
lifecycle state, verification evidence, and user-facing report.

Role extraction must not weaken existing skills. When role-oriented guidance is
moved out of a skill, the skill still needs to stand alone for direct user
invocation. It should keep its triggers, procedure, guardrails, artifact rules,
verification expectations, and reporting requirements.

Planning skills and roles should collaborate through explicit planning gates.
`plan-create` remains the procedural owner for creating and refining backlog
plan documents, but it should not draft implementation phases or task lists
until the upper planning sections have been reviewed and accepted. The expected
direction is:

- `product-strategist` helps shape product vision, value, audience, scope,
  tradeoffs, sequencing, and candidate ideas. In plan documents this maps most
  directly to `Context` and `High-Level Goal`.
- A future `requirements-engineer` role helps turn accepted vision into
  detailed requirements and constraints. In plan documents this maps most
  directly to `Design Intent`, `Non-Goals`, and `Boundaries And Invariants`.
- Future architecture, design, implementation, and quality roles help turn
  accepted design intent into ordered implementation phases, task lists, and
  verification strategy.

`plan-create` should still run independently when roles are unavailable or not
requested. In that mode it asks the necessary product, requirements,
architecture, and verification questions itself. When relevant roles are
installed, it may delegate bounded judgment to them, but it keeps ownership of
the plan artifact, acceptance gates, final task breakdown, and user-facing
handoff.

Role-specific plan output should usually flow into the existing plan sections,
not into one permanent section per role. `requirements-engineer` output belongs
in `Design Intent`, `Non-Goals`, `Boundaries And Invariants`, and
`Open Questions / Decisions`. `technical-architect` and
`implementation-engineer` output belongs mainly in accepted Design Intent and
the eventual implementation phases/tasks. Product design and UX writing review
should remain human-in-the-loop where product surfaces are involved, with role
findings incorporated into normal design intent, phase, task, and docs-impact
sections rather than replacing human review.

Security review is the exception that should become a formal plan gate. The
plan template should include a `Security Review` section, and the completion
checklist should include one post-phase security review task after all planned
phases are complete. The security review records trust-boundary, secret,
authorization, destructive-operation, dependency, and safety-sensitive findings
in that section. Any blocking finding should create or update normal plan tasks
that must be completed before the plan can be closed.

Role ideas discussed so far fall into two groups.

Project-development roles help an AIX user develop features in their own
project. The first set should be owned by the `design-plan-execute` workflow
because these roles depend on `_docs`, plans, lifecycle status, verification
records, design promotion, and workflow-owned skills. Bundled
project-development roles should live under
`aix/workflows/design-plan-execute/roles/project-dev/`:

- `requirements-engineer`: clarifies product intent, flushes out requirements,
  identifies open decisions, and routes mature ideas into `plan-create`.
- `product-strategist`: evaluates user value, scope, tradeoffs, audience,
  sequencing, and whether a proposed feature belongs in the product.
- `product-designer`: reviews user flows, interaction design, information
  architecture, accessibility expectations, layout hierarchy, prototypes, and
  design-system fit.
- `technical-architect`: reviews system design, component boundaries, runtime
  contracts, integration choices, and long-term maintainability.
- `implementation-engineer`: implements scoped tasks from accepted design
  intent and returns changed files, verification evidence, and remaining risks.
- `quality-engineer`: designs targeted verification, regression coverage, and
  acceptance checks that lock down design intent.
- `documentation-specialist`: maintains `_docs`, design promotion, current-state
  accuracy, and developer-facing documentation.
- `security-reviewer`: reviews trust boundaries, secrets, authorization,
  destructive operations, dependency risk, and safety-sensitive behavior.
- `ux-writer`: reviews labels, prompts, empty states, error messages, onboarding
  text, README language, and other user-facing copy.

AIX-development roles help author and review new or existing AIX skills and
workflows. They are not specific to one workflow, because they help manage AIX
extension assets in whatever project uses AIX. They should use an `aix-` prefix
in their filenames and active names so they are visually grouped and do not
collide with generic project roles. When used in a typical npm-installed
project, they should treat the project's `./aix/` directory as local editable
extension source. When used in the AIX source repository, that same `./aix/`
directory is the distributable bundled source tree and changes should be
documented in AIX `_docs` and README/release material as appropriate:

- `aix-workflow-architect`: reviews workflow package design, workflow-owned
  skills, templates, managed `AGENTS.md` blocks, install/update boundaries, and
  workflow lifecycle rules.
- `aix-package-safety-reviewer`: reviews install, update, diff, lockfile,
  activation, deactivation, drift, and overwrite-protection behavior.
- `aix-skill-author`: reviews skill creation and updates with attention to
  trigger clarity, progressive disclosure, dependency guidance, and safety
  notes.
- `aix-agent-instructions-auditor`: reviews cross-tool instruction drift across
  `AGENTS.md`, `.agents/`, `CLAUDE.md`, Cursor rules, Copilot instructions, and
  similar files.
- `aix-release-readiness-specialist`: reviews package contents, smoke checks,
  release docs, npm metadata, and release artifact readiness.

Overlapping roles should live in the project-development group by default.
Create an `aix-` variant only when the role needs AIX-specific product,
package-management, workflow, lockfile, or release knowledge.

Additional standalone or workflow-owned role catalogs can be added later when a
workflow or project domain needs them.

### CLI behavior

Workflow-owned roles should follow the same ownership rules as workflow-owned
skills. Installing `design-plan-execute` should activate every role shipped by
that workflow under `.agents/roles/`. Users should not activate or deactivate
those workflow-owned roles one by one. `aix role deactivate <active-name>`
should refuse when the active role is owned by the workflow and tell the user
to remove or replace the workflow instead.

`aix status` and `aix verify` should include roles alongside skills and
workflows. Status should show active roles, source or workflow ownership,
aliases, and drift state. Verify should check role front matter, active-file
hashes, missing files, invalid skill references, duplicate active names, and
local edits that would block update or removal.

## Non-Goals

- Do not make `.agents/roles/` a claimed cross-model standard. Treat it as an
  AIX-managed convention that runtimes may map to their own mechanisms.
- Do not replace `.agents/skills/` or move procedural skill content into role
  files.
- Do not require all runtimes to support native subagents before roles are
  useful.
- Do not create a large generic agent catalog as the first proof of value.
- Do not add standalone role package commands, registry, plugin-package,
  global-install, or publishing behavior as part of this plan.

## Boundaries And Invariants

- Root `AGENTS.md` remains the broad repo-specific entrypoint.
- Workflow-owned files remain package-managed and drift-checked.
- Project-owned `_docs/` files remain outside routine workflow updates.
- Skills remain the unit for reusable procedural instructions.
- Roles should be loaded only when routing or user intent justifies the added
  context.
- Host-native agent directories should be compatibility outputs, not AIX's
  canonical role source, and should be written only by explicit integration
  behavior.
- Delegated work must remain bounded. The parent context owns plan continuity,
  worktree safety, verification review, and final reporting.
- Role updates must be reviewable before accepted, just like workflow and skill
  updates.

## Implementation Phases

Phases are ordered by dependency, but implementation can split or combine tasks
when a smaller verified slice is clearer. Stable design docs should be updated
after implementation proves the exact behavior. Until then, this plan remains
the source for intended behavior, verification notes, and promotion guidance.

For Phases 6 through 14, stop after each project-development role phase and
report validation evidence. Do not start the next project-development role
phase in the same run unless the user explicitly approves continuation after
reviewing that evidence.

### Phase 1: Prepare implementation boundaries (status: complete)

Goal: Translate the accepted design intent into concrete implementation
boundaries and checkpoints before changing CLI behavior.

Tasks:

- ✅ Identify the current modules that own workflow package discovery,
  workflow install/update/diff/uninstall, skill activation, source handling,
  lockfile IO, status, and verify.
- ✅ Decide the smallest first implementation slice that proves the role model
  without forcing every CLI command into the same change.
- ✅ Decide which existing skill-management modules can be reused for roles and
  which need role-specific ownership.
- ✅ Define the verification rubric for every role: automated structure checks,
  manual role-file review, manual review of any changed skills, delegation
  verification, and scenario-based output quality review.
- ✅ Record the exact design docs that should receive promotion after the
  implementation is complete.
- ✅ Record any implementation discoveries that refine the accepted design
  intent before code changes rely on them.

Implementation boundaries:

- Workflow package discovery and lifecycle are owned by
  `src/workflows/manifest.ts`, `src/workflows/source.ts`,
  `src/workflows/install.ts`, `src/workflows/update.ts`,
  `src/workflows/diff.ts`, `src/workflows/remove.ts`,
  `src/workflows/docs.ts`, `src/workflows/templates.ts`,
  `src/workflows/skills.ts`, and `src/workflows/shared.ts`.
- Workflow command orchestration and CLI registration are owned by
  `src/workflows/commands.ts`, `src/cli/registry.ts`, and the generated CLI
  command modules under `src/cli/cmds/`.
- Skill activation, deactivation, update, diff, verify, active-file handling,
  package-file handling, dependency inference, naming, and skill lockfile
  helpers are owned by `src/activation/`.
- Source normalization, default source definitions, source metadata,
  add/remove behavior, and source resolution are owned by `src/sources/` and
  `src/manifest/sources.ts`.
- Manifest parsing and root intent IO are owned by `src/manifest/` and
  `src/manifest.ts`; lockfile parsing and atomic IO are owned by
  `src/lockfile/`, `src/activation/lockfile.ts`, `src/activation/json.ts`, and
  the shared schema in `src/schema.ts`.
- Workspace status is owned by `src/status/index.ts`. It currently aggregates
  skill verification from `src/activation/verify.ts` and workflow verification
  from `src/workflows/commands.ts`.
- Project-local path helpers are owned by `src/paths/agents.ts`. Role work
  should extend this shared path layer rather than hard-code `.agents/roles/`
  paths in command modules.

Smallest first implementation slice:

- Phase 2 should add a role domain foundation before any user-facing role
  commands: path helpers, Markdown/front-matter parsing, role metadata
  validation, structural contract checks, workflow-owned role lockfile
  representation, file hashing, and active-name collision primitives.
- The first proving slice should use parser, structure, and lockfile tests plus
  fixture role files. It should not wire workflow install, standalone
  `aix roles` commands, or `delegate-to-role` yet.
- Status and verify can gain role primitives in Phase 3, after the foundation
  has one real activation path. Workflow install/update/diff/uninstall should
  wait for Phase 4 so workflow-owned role lifecycle can be verified as a
  coherent slice.

Reuse and ownership decisions:

- Reuse source parsing and resolution concepts from `src/sources/` and
  `src/manifest/sources.ts`, but keep roles attached to workflow sources
  instead of adding role-specific manifest source keys.
- Reuse path, hash, copy, drift, atomic JSON, folder-name safety, and
  active-name collision patterns from `src/paths/agents.ts`, `src/fs/`,
  `src/lockfile/`, and `src/activation/`.
- Do not reuse `src/skills/discovery.ts` directly for role files. Roles use one
  Markdown file per role with YAML front matter, while skills use directory
  packages with `SKILL.md`.
- Do not reuse skill dependency inference for role `skills` metadata. Role
  skill references are routing and verification hints until a later phase
  intentionally defines hard dependency behavior.
- Add a focused `src/roles/` domain for role parsing, discovery, validation,
  workflow-owned activation primitives, drift checks, and role-specific errors.
  Keep CLI command modules as orchestration wrappers over that domain.
- Extend `src/schema.ts` with role lockfile types rather than forcing roles
  into `LockfileSkillEntry`; workflow-owned roles should have their own
  workflow lockfile list instead of appearing as workflow-owned skills.

Role verification rubric:

- Automated structure checks: parse front matter, require `name` and
  `description`, enforce lowercase hyphenated names, reject `:`, preserve known
  runtime hint fields, tolerate safe unknown metadata, and require operating
  prompt sections for purpose, when to use, context to inspect, skills to
  consider, stop conditions, and expected output.
- Automated lifecycle checks: verify role package hashes, active role hashes,
  lockfile serialization, duplicate active names, missing active files, invalid
  skill references according to the selected warning-or-error policy, and
  local drift that would block update or removal.
- Manual role-file review: confirm each role is operating doctrine rather than
  vague persona prose, has bounded authority, names inspected context, preserves
  parent ownership, and returns actionable evidence.
- Manual skill review: when a skill changes because of a role phase, confirm
  direct invocation still works without role context and that the skill retains
  its own trigger rules, procedure, guardrails, artifact rules, verification,
  and reporting requirements.
- Delegation verification: after `delegate-to-role` exists, verify explicit
  role lookup, missing-role errors, ambiguous-role errors, prompt-overlay
  fallback, and parent-context ownership of plan state, worktree safety,
  verification review, and final decisions.
- Scenario-based output review: for each shipped role, run at least one
  representative project scenario and record whether the role returns useful
  findings, decisions, commands, gaps, and residual risk for its specialty.

Promotion targets after implementation:

- `_docs/design/overview.md` should receive the accepted `.agents/roles/`
  active role directory, workflow-owned role model, local `./aix/` source
  precedence, and host-compatibility boundary.
- `_docs/design/package-management.md` should receive the final local `./aix/`
  source precedence, lockfile, workflow-owned role activation, drift, diff,
  update, removal, status, and verify behavior.
- `_docs/design/workflows.md` should receive workflow-owned role lifecycle,
  workflow manifest changes, install/update/uninstall behavior, and
  `delegate-to-role` parent-ownership rules.
- `_docs/design/cli.md` should receive the final `aix skill`,
  `aix workflow`, status, verify, and delegation-related command surface once
  implemented.
- `_docs/design/bundled-skills.md` should receive any durable changes to
  workflow-owned skills, especially `delegate-to-role`, only after direct skill
  invocation remains verified.

Implementation discoveries:

- The existing `PackageKind` type is currently `"skill" | "workflow"`, so role
  support will need an explicit schema expansion rather than treating roles as
  skills with a new source path.
- `LockfileWorkflowEntry` records workflow docs, templates, skills, and full
  package files. Workflow-owned roles should be recorded separately inside this
  entry so they are visible in status and verify without polluting workflow
  skill counts.
- `parseManifest` already supports nested `sources.skills` and
  `sources.workflows`; local `./aix/` source precedence should extend the
  existing skill and workflow source resolution model instead of adding
  standalone role sources.
- `discoverSkills` assumes directory packages containing `SKILL.md`. Role
  discovery should scan Markdown files under a roles directory and validate
  front matter, so a shared generic discovery helper would be premature.
- Workflow-owned skill deactivation protection already exists in
  `src/activation/deactivate.ts`. `aix role deactivate` should mirror the
  message pattern but use role-specific lockfile entries and active paths.
- Stable design docs were intentionally not updated in Phase 1 because this
  phase prepared implementation boundaries before behavior exists.

Verification:

- Completed: reviewed the selected Phase 2 foundation slice against the
  accepted Design Intent. The slice preserves workflows as operating models,
  skills as procedures, and roles as delegation profiles without forcing all
  CLI behavior into the first code change.
- Completed: no stable design docs were updated in Phase 1; design promotion
  targets are recorded above for later implementation closeout.

Execution notes:

- 2026-08-24: Completed Phase 1 boundary preparation. Reviewed repository
  workflow instructions, active plan context, design docs, implementation
  modules, tests, workflow package files, and current worktree status; recorded
  module ownership, the first implementation slice, reuse decisions,
  verification rubric, promotion targets, and implementation discoveries.
  Verification: documentation-only phase review; no CLI behavior changed.

### Phase 2: Role domain foundation (status: complete)

Goal: Add the shared role model, parsing, validation, path handling, hashes, and
lockfile representation without wiring every CLI workflow at once.

Tasks:

- ✅ Add path helpers for `.agents/roles/`, workflow role sources, top-level
  AIX role sources, and role package storage.
- ✅ Add role-file parsing for Markdown with YAML front matter.
- ✅ Validate required `name` and `description` fields, lowercase hyphenated
  names, and invalid `:` usage.
- ✅ Preserve recognized runtime hint fields and tolerate unknown additive
  metadata when it is safe to ignore.
- ✅ Decide and implement how role files reference skills without creating
  fragile hard dependencies.
- ✅ Add automated role contract checks for required role sections such as
  purpose, when to use, context to inspect, skills to consider, stop
  conditions, and expected output.
- ✅ Extend lockfile data structures to represent active roles, role packages,
  workflow-owned roles, file hashes, aliases, and source ownership.
- ✅ Add collision detection for active role names and aliases.

Implementation notes:

- Added canonical path helpers for active role materialization under
  `.agents/roles/<active-name>.md` and workflow role source paths under
  `roles/<group>/<role-file>`.
- Added a focused `src/roles/` domain with role front-matter parsing,
  Markdown role parsing, Markdown-file role discovery, role name validation,
  filename/name agreement, runtime hint extraction, role contract checks, and
  active-role collision detection.
- The role front-matter parser supports the current role metadata needs without
  adding a new dependency: scalar strings, numbers, booleans, inline scalar
  lists, and block scalar lists. Nested YAML values are rejected with a clear
  error until a later phase has a concrete need for richer metadata.
- Recognized runtime hint fields are `tools`, `disallowedTools`, `model`,
  `maxTurns`, `skills`, and `color`. Unknown additive metadata is preserved in
  the parsed `frontMatter` record for later host adapters or workflow policy.
- Role `skills` metadata is validated as safe lowercase hyphenated skill-name
  hints but is not existence-checked. This avoids turning role files into hard
  dependency declarations before later delegation and verify phases define the
  warning or error policy.
- Extended the lockfile schema and parser with first-class `role` entries,
  optional top-level `roles`, and optional workflow-owned role summaries on
  workflow entries.

Verification:

- Completed: added parser and schema tests for valid role files, invalid front
  matter, invalid names, unknown metadata, and skill references in
  `tests/roles.test.mjs`.
- Completed: added structural tests that catch missing role contract sections
  by heading rather than exact prose in `tests/roles.test.mjs`.
- Completed: added lockfile parser tests for standalone and workflow-owned
  roles in `tests/lockfile.test.mjs`.
- Completed: invalid role definitions fail with clear user-facing errors for
  missing front matter, missing required fields, invalid names, invalid `:`
  usage, invalid skill references, missing contract sections, and filename/name
  mismatches.

Execution notes:

- 2026-08-24: Completed Phase 2 role domain foundation. Added
  `src/roles/`, role path helpers, role lockfile schema and parsing, and
  focused role/lockfile tests.
  Verification: `npm run build`; `node --test tests/roles.test.mjs
  tests/lockfile.test.mjs`; `npm run typecheck`; `AIX_CACHE_DIR=/private/tmp/aix-phase2-cache
  npm test`. A first plain `npm test` run failed in one workflow test because
  the shared default temp cache had stale local fixture state for alias
  `first`; rerunning with an isolated cache passed all 139 tests.

### Phase 3: Role activation primitives and AIX-dev role pack (status: complete)

Goal: Prove the role activation path with reusable internals and the top-level
AIX-development role pack before wiring roles into workflow install.

Tasks:

- ✅ Add shared role package discovery for top-level role packs.
- ✅ Add shared role activation into `.agents/roles/`.
- ✅ Add shared role deactivation guardrails for user-owned and owned roles.
- ✅ Add shared role hash, drift, and collision behavior that workflow roles
  can reuse.
- ✅ Add status and verify primitives for active roles.
- ✅ Add the top-level AIX role pack under `aix/roles/aix-dev/`.
- ✅ Author the initial AIX-development roles:
  `aix-workflow-architect`, `aix-package-safety-reviewer`,
  `aix-skill-author`, `aix-agent-instructions-auditor`, and
  `aix-release-readiness-specialist`.
- ✅ Keep each AIX-development role focused on judgment, inspected context,
  relevant AIX assets, stop conditions, and return evidence.
- ✅ Review any workflow or skill files changed to support AIX-development
  roles and confirm direct skill invocation still works.
- ✅ Reconcile the standalone role-package direction with local `./aix/` source
  precedence: standalone roles may exist, but AIX-dev roles should author and
  review skills/workflows through local source rather than workflow-owned skill
  assumptions.
- ✅ Reframe AIX-dev roles as top-level authoring/review guidance for managing
  new or existing AIX skills and workflows, without workflow-owned `skills`
  front matter unless the role is moved inside that workflow.
- ✅ Add validation or review guidance for the role ownership rule: workflow
  skill dependency means workflow-owned role; no workflow skill dependency
  means top-level role is allowed; dependency on more than one workflow is
  invalid.
- ✅ Add or update tasks for local `./aix/` source precedence for
  `aix skill activate aix/skills/<name>` and workflow install behavior.
- ✅ Add or update tasks ensuring locally generated `./aix/skills` and
  `./aix/workflows` source artifacts are never deleted automatically by
  deactivate or uninstall behavior.

Implementation notes:

- Added default top-level role source support for the bundled `aix` role pack
  path under `aix/roles`, without adding manifest role-source syntax or public
  role commands ahead of the standalone role-pack CLI phase.
- Added role activation and deactivation primitives that materialize package
  role files under `.agents/packages/roles/<source>/...`, active role files
  under `.agents/roles/<active-name>.md`, rewrite only active alias front
  matter, record lockfile hashes, refuse active-name collisions before writes,
  and refuse direct deactivation of workflow-owned roles.
- Added role hash and drift verification for package and active role files,
  role front matter, contract sections, lockfile path consistency, duplicate
  active names, aliases, and missing workflow-owned role lockfile entries.
- Extended workspace status primitives and `aix status` rendering with active
  roles and workflow-owned roles, and extended `aix verify` composition with
  role verification.
- Added the initial AIX-development role pack under `aix/roles/aix-dev/` with
  `aix-workflow-architect`, `aix-package-safety-reviewer`, `aix-skill-author`,
  `aix-agent-instructions-auditor`, and
  `aix-release-readiness-specialist`.
- No workflow-owned skills were changed in this phase, so direct skill
  invocation behavior remains untouched.
- Correction needed: follow-up design discussion refined the intended model.
  Roles can be standalone or workflow-owned. A role that depends on a
  workflow's skills belongs in that workflow, a role without workflow-skill
  dependencies can be top-level, and no role may depend on more than one
  workflow. AIX-dev standalone roles should help author and review skills and
  workflows without depending on workflow-owned skills. Local editable
  extension source should live under project `./aix/`, with local `./aix/`
  overriding bundled/default `aix` sources.
- Removed workflow-skill dependencies from the AIX-dev role front matter.
  Their skill guidance is now optional host-project guidance rather than a
  dependency declaration, so the top-level roles remain workflow-independent.
- Added local-first activation support for `aix skill activate
  aix/skills/<name>`. When `./aix/skills/<name>` exists, AIX materializes it
  into `.agents/packages/skills/aix/skills/<name>`, activates it from there,
  and records `sourceType: "local"` in the lockfile without a Git URL. When no
  local skill exists, the command falls back to the configured/default `aix`
  source.
- Added local-first workflow install support for `aix workflow install
  aix/workflows/<name>`. When `./aix/workflows/<name>` exists, AIX installs the
  local workflow package materialization and records `sourceType: "local"`.
  When no local workflow exists, the command falls back to the configured or
  default `aix` workflow source.
- Confirmed locally sourced skill deactivation and workflow uninstall preserve
  the author-owned `./aix/skills/<name>` and `./aix/workflows/<name>` source
  directories while removing only active/package-managed materialization.
- Tightened Git source cache checkout with `git checkout --force --detach` so
  stale deleted files in the package cache do not affect workflow install
  verification.

Verification:

- `npm run build`
- `node --test tests/activation.test.mjs tests/workflow.test.mjs`
- `node --test tests/lockfile.test.mjs`
- `node --test tests/roles.test.mjs`
- `AIX_CACHE_DIR=/private/tmp/aix-phase3-local-cache npm test` (148 tests)
- `npm run smoke:local-assets`
- `npm run smoke:aix-dev-roles`

- Completed: added tests for role package discovery, activation, deactivation
  guardrails, hashes, drift checks, and active-name collisions in
  `tests/roles.test.mjs`.
- Completed: added active role status and verify coverage in
  `tests/roles.test.mjs`; role verification is composed into `aix verify`, and
  active/workflow-owned roles are rendered by `aix status`.
- Completed: manually reviewed each AIX-development role against the role
  verification rubric. Each role has required metadata, purpose, when-to-use,
  context-to-inspect, skills-to-consider, stop-conditions, and expected-output
  sections, and each focuses on AIX-specific judgment and evidence.
- Completed: no workflow or skill files were changed to support
  AIX-development roles, so no standalone skill re-verification was needed
  beyond the full test suite.
- Completed: reviewed each AIX-development role against representative AIX
  workflow, skill-authoring, instruction-audit, package-safety, and release
  readiness tasks.

Execution notes:

- 2026-08-24: Completed Phase 3 role activation primitives and AIX-dev role
  pack. Also normalized remaining unstarted phase headers to
  `status: approved` as requested.
  Verification: `npm run build`; `node --test tests/roles.test.mjs
  tests/lockfile.test.mjs tests/status.test.mjs tests/verify.test.mjs`;
  `npm run typecheck`; `AIX_CACHE_DIR=/private/tmp/aix-phase3-cache npm test`
  passed with 145 tests.

### Phase 4: Workflow-owned role lifecycle (status: complete)

Goal: Teach workflow install, update, diff, uninstall, status, and verify to
manage workflow-owned roles before individual project-development roles are
added.

Tasks:

- ✅ Modify workflow package discovery to include role files under the workflow
  package path `roles/project-dev/`, for example
  `aix/workflows/design-plan-execute/roles/project-dev/`.
- ✅ Modify workflow install to activate every workflow-owned role into
  `.agents/roles/`.
- ✅ Modify workflow update, diff, uninstall, status, and verify to include
  workflow-owned role files and hashes.
- ✅ Modify `aix role deactivate <active-name>` to refuse workflow-owned roles
  with a clear workflow-owned message.
- ✅ Add fixture workflow role files only as needed for automated lifecycle
  tests.

Implementation notes:

- Added `src/workflows/roles.ts` as the workflow-owned role lifecycle layer.
  It discovers role Markdown files under `roles/project-dev/` inside a workflow
  package, validates the existing role contract, writes active role files under
  `.agents/roles/`, records workflow-owned role lockfile entries, checks active
  and package hashes, and removes workflow-owned active roles during workflow
  uninstall.
- Kept real project-development roles out of the shipped
  `aix/workflows/design-plan-execute/roles/project-dev/` directory in this
  phase. Tests create fixture workflow roles in temporary workflow packages
  only.
- Extended workflow install and update preflight to check workflow-owned active
  roles before replacing package materialization.
- Extended workflow install, update, diff, uninstall, status, and verify through
  existing workflow package hashing plus first-class role lockfile entries.
- Added the narrow `aix role deactivate <active-name>` command wrapper so
  direct deactivation of workflow-owned roles fails through the role domain's
  existing guardrail.

Verification:

- Completed: added workflow install/update/diff/uninstall tests covering
  workflow-owned role activation, hashes, drift, and removal.
- Completed: added an update-removal smoke test proving that when a
  workflow-owned role is deleted from the workflow source, `aix workflow
  update` removes the active `.agents/roles/<role>.md` file, clears role
  lockfile entries, updates status role counts, and leaves `aix verify`
  passing.
- Completed: added status and verify coverage for workflow-owned roles.
- Completed: verified `aix role deactivate <active-name>` refuses
  workflow-owned roles with a clear workflow-owned message.
- Completed: fixture role files are created only in temporary test workflow
  packages and do not become product-shipped project-development roles.

Execution notes:

- 2026-08-25: Completed Phase 4 workflow-owned role lifecycle. Verification:
  `npm run build`; `node --test tests/workflow.test.mjs tests/roles.test.mjs
  tests/status.test.mjs tests/verify.test.mjs`; `AIX_CACHE_DIR=/private/tmp/aix-phase4-cache
  npm test` passed with 152 tests.
- 2026-08-25: Added update-removal smoke coverage for workflow-owned roles.
  Verification: `npm run build`; `node --test tests/workflow.test.mjs`.

### Phase 5: Delegate-to-role baseline (status: complete)

Goal: Provide the basic `delegate-to-role` path so each project-development
role can be validated through the real delegation flow as it is added.

Tasks:

- ✅ Create or modify the workflow-owned `delegate-to-role` skill.
- ✅ Define explicit routing for prompts such as "use quality-engineer" or
  "delegate to documentation-specialist".
- ✅ Keep implicit routing conservative when user intent is ambiguous.
- ✅ Define the bounded delegation prompt shape and required return evidence.
- ✅ Document when delegation is not allowed, especially unresolved product
  decisions, unclear authorization, and safety-sensitive file operations.
- ✅ Preserve parent-context ownership of plans, worktree safety, verification
  review, and final decisions.

Implementation notes:

- Added the workflow-owned `delegate-to-role` skill under
  `aix/workflows/design-plan-execute/skills/delegate-to-role/`. The skill
  resolves only explicit role intent, stops on missing or ambiguous roles,
  prefers native subagent handoff only when a host clearly supports it, and
  otherwise defines prompt-overlay fallback.
- Added `src/roles/delegation.ts` with deterministic role delegation lookup and
  prompt-overlay construction. The helper returns no delegation when role
  intent is only implied, throws clear missing-role and ambiguous-role errors,
  and includes parent-owned boundaries and required return evidence in the
  generated prompt.
- Added `delegate-to-role` to the documented workflow-owned skill list in the
  workflow README and stable bundled-skills design doc.
- Updated init expectations because the default workflow now materializes one
  additional workflow-owned skill.

Verification:

- Completed: added tests for explicit role lookup, missing-role errors,
  ambiguous-role errors, conservative implied routing, and prompt-overlay
  fallback in `tests/roles.test.mjs`.
- Completed: verified the prompt-overlay fallback delegates to a fixture
  `quality-engineer` role and preserves parent-context ownership language for
  plan state, worktree safety, verification review, and final decisions.
- Completed: manually reviewed the `delegate-to-role` skill as a standalone
  skill. It includes direct invocation triggers, lookup rules, native handoff
  preference, fallback shape, stop conditions, parent ownership, and reporting
  requirements.
- Completed: added static skill-instruction checks for `delegate-to-role` in
  `tests/skill-instructions.test.mjs`.

Execution notes:

- 2026-08-25: Completed Phase 5 delegate-to-role baseline. Verification:
  `npm run build`; `node --test tests/roles.test.mjs
  tests/skill-instructions.test.mjs`; `node --test tests/workflow.test.mjs
  tests/init.test.mjs tests/status.test.mjs tests/verify.test.mjs`;
  `AIX_CACHE_DIR=/private/tmp/aix-phase5-cache npm test` passed with 157
  tests.

### Phase 6: Project-dev role: product-strategist (status: validation pending)

Goal: Add the workflow-owned `product-strategist` role with a clean manual
validation checkpoint.

Tasks:

- ✅ Create
  `aix/workflows/design-plan-execute/roles/project-dev/product-strategist.md`.
- ✅ Review `_docs/design`, `_docs/ideas.md`, and planning skills for context.
- ✅ Modify workflow-owned skills only if the role exposes a clear standalone
  skill gap.
- ✅ If any skill is changed, verify the skill still works when invoked
  directly without role context.
- ✅ Refine `plan-create` so it uses gated planning: draft and vet vision
  before detailed design intent, and draft implementation phases/tasks only
  after design intent is accepted.
- ✅ Wire `plan-create` to collaborate with `product-strategist` for the vision
  gate when that role is installed, while preserving a standalone path when
  roles are unavailable.
- ✅ Add or update instruction tests proving `plan-create` does not generate
  phases/tasks before design intent acceptance and still works without role
  context.

Implementation notes:

- Added the workflow-owned `product-strategist` role under
  `aix/workflows/design-plan-execute/roles/project-dev/product-strategist.md`.
  The role focuses on pure product brainstorming, product value, target user,
  scope, tradeoffs, sequencing, fit with AIX design priorities, next workflow
  step, and residual uncertainty.
- Refined the role/skill boundary after review: `brainstorming-skill` owns the
  brainstorming procedure and `_docs/ideas.md` checkpointing, while
  `product-strategist` owns the product-strategy idea funnel: generating raw
  candidate ideas, framing product vision, and judging audience, value, scope,
  tradeoffs, and sequencing.
- Moved `brainstorming-skill` from standalone `aix/skills/` into the
  workflow-owned skill set under
  `aix/workflows/design-plan-execute/skills/brainstorming-skill/`, because its
  `_docs/ideas.md` output, planning handoff, and product-strategy collaboration
  make it loosely coupled to the workflow.
- Kept `brainstorming-skill` directly runnable. It uses
  `product-strategist` through `delegate-to-role` when that role is installed
  and product strategy would improve the session, but it can still elicit basic
  vision inputs itself when the role is unavailable.
- Updated README, workflow README, bundled-skill design docs, package smoke
  checks, init tests, skill-listing tests, and role/delegation tests for the
  new ownership model.
- Added the gated planning direction to Design Intent: `product-strategist`
  supports the early vision funnel, future `requirements-engineer` supports
  requirements and design intent, and later roles help form phases/tasks only
  after design intent is accepted.
- Updated the workflow-owned `plan-create` skill so it now owns a gated
  planning procedure: create the backlog plan early, vet vision first, use
  `product-strategist` for bounded vision judgment when installed, preserve a
  standalone path when roles are unavailable, and keep implementation
  phases/tasks as an explicit placeholder until Design Intent is accepted.
- Updated the `plan-create` README to describe the vision gate,
  product-strategy collaboration, standalone behavior, and no-phases-before
  Design Intent rule.
- Added non-rendered gatekeeper comments to the bundled `plan.md` template so
  agents editing a plan see the vision gate, design-intent gate, and
  no-phases-before-Design-Intent rule at the relevant template sections.
- Added a human validation gate to the completion checklist, `plan-complete`
  instructions, and workflow design docs so closeout requires developer
  evaluation of the completed phased work, or an explicit recorded waiver,
  before the checklist can be completed.

Verification:

- Completed: automated role formatting, front matter, and contract checks cover
  shipped workflow-owned project-development roles in `tests/roles.test.mjs`.
- Completed: manually reviewed `product-strategist` against the role
  verification rubric. It is operating doctrine rather than persona prose,
  names inspected context, keeps authority bounded, preserves parent ownership,
  and returns actionable evidence.
- Completed: changed `brainstorming-skill` and verified it still stands alone
  through static skill-instruction coverage. It remains directly invokable and
  does not require the product-strategist role to run.
- Completed: verified `delegate-to-role` delegates to the shipped
  `product-strategist` role through prompt-overlay fallback in
  `tests/roles.test.mjs`.
- Completed: verified the `plan-create` gated-planning instruction changes with
  targeted skill-instruction tests.
- ⚠️ Pending human checkpoint: manually verify `product-strategist` produces
  useful product scope, sequencing, tradeoff, and audience guidance in a
  representative scenario.
- ⚠️ Pending human approval before starting the next project-development role
  phase.

Execution notes:

- 2026-08-25: Added `product-strategist`, moved `brainstorming-skill` into the
  workflow-owned skill set, and wired the role/skill collaboration boundary.
  Verification: `npm run build`; `node --test tests/init.test.mjs
  tests/skills.test.mjs tests/package-smoke.test.mjs
  tests/skill-instructions.test.mjs tests/roles.test.mjs
  tests/workflow.test.mjs`; `AIX_CACHE_DIR=/private/tmp/aix-phase6-cache npm
  test` passed with 159 tests.
- 2026-08-25: Completed the new `plan-create` gated-planning tasks. Updated
  `plan-create` to delegate bounded product-vision judgment to
  `product-strategist` when available, keep direct invocation usable when roles
  are absent, and withhold implementation phases/tasks until Design Intent is
  accepted. Verification: `node --test tests/skill-instructions.test.mjs`;
  `npm run build`; `git diff --check`.
- 2026-08-25: Added bundled `plan.md` template gatekeeper comments for the
  vision gate, design-intent gate, and implementation-phase placeholder rule.
  Verification: `node --test tests/templates.test.mjs`; `git diff --check`.
- 2026-08-25: Added a completion-checklist human validation gate and updated
  `plan-complete` so automated checks alone cannot imply developer acceptance.
  Verification: `node --test tests/templates.test.mjs
  tests/skill-instructions.test.mjs`; `npm run build`; `git diff --check`.

### Phase 7: Project-dev role: product-designer (status: approved)

Goal: Add the workflow-owned `product-designer` role with a clean manual
validation checkpoint.

Tasks:

- ⬜️ Create
  `aix/workflows/design-plan-execute/roles/project-dev/product-designer.md`.
- ⬜️ Review existing design docs and any UI/UX guidance in workflow docs for
  context.
- ⬜️ Integrate `product-designer` with `plan-create` where plans involve user
  flows, interaction design, accessibility, layout hierarchy, or design-system
  fit, while keeping `plan-create` directly runnable.
- ⬜️ Modify workflow-owned skills only if the role exposes a clear standalone
  skill gap.
- ⬜️ If any skill is changed, verify the skill still works when invoked
  directly without role context.

Verification:

- Run automated role formatting, front matter, and contract checks.
- Manually review the `product-designer` role file against the role
  verification rubric.
- Manually verify any changed skills still stand alone.
- Manually verify any `plan-create` changes preserve direct planning behavior
  and add useful design-review prompts only when design context applies.
- Manually verify `delegate-to-role` delegates to `product-designer`.
- Manually verify `product-designer` produces useful flow, interaction,
  accessibility, layout, and design-system feedback in a representative
  scenario.
- Record automated checks, manual role review, skill standalone review,
  delegation verification, scenario-quality result, and commit checkpoint
  status.
- Human approval recorded before starting the next project-development role
  phase.

### Phase 8: Project-dev role: technical-architect (status: approved)

Goal: Add the workflow-owned `technical-architect` role with a clean manual
validation checkpoint.

Tasks:

- ⬜️ Create
  `aix/workflows/design-plan-execute/roles/project-dev/technical-architect.md`.
- ⬜️ Review design docs, `design-create`, `plan-create`, and `design-promote`
  for possible interaction points.
- ⬜️ Integrate `technical-architect` with `plan-create` for system boundaries,
  component contracts, integration choices, maintainability tradeoffs, and
  implementation-phase shaping after design intent is accepted.
- ⬜️ Modify workflow-owned skills only if the role exposes a clear standalone
  skill gap.
- ⬜️ If any skill is changed, verify the skill still works when invoked
  directly without role context.

Verification:

- Run automated role formatting, front matter, and contract checks.
- Manually review the `technical-architect` role file against the role
  verification rubric.
- Manually verify any changed skills still stand alone.
- Manually verify any `plan-create` changes preserve direct planning behavior
  and improve architecture readiness before phases/tasks are drafted.
- Manually verify `delegate-to-role` delegates to `technical-architect`.
- Manually verify `technical-architect` produces useful boundary, contract,
  integration, and maintainability guidance in a representative scenario.
- Record automated checks, manual role review, skill standalone review,
  delegation verification, scenario-quality result, and commit checkpoint
  status.
- Human approval recorded before starting the next project-development role
  phase.

### Phase 9: Project-dev role: security-reviewer (status: approved)

Goal: Add the workflow-owned `security-reviewer` role with a clean manual
validation checkpoint.

Tasks:

- ⬜️ Create
  `aix/workflows/design-plan-execute/roles/project-dev/security-reviewer.md`.
- ⬜️ Review workflow safety rules, package-management design, and verification
  skills for context.
- ⬜️ Integrate `security-reviewer` with `plan-create` for trust boundaries,
  secrets, authorization, destructive operations, dependency risk, and
  safety-sensitive verification before implementation is authorized.
- ⬜️ Update the plan template and `plan-create` instructions to include a
  formal `Security Review` section for post-phase findings.
- ⬜️ Update the completion checklist so every plan performs one security review
  after all implementation phases are complete and before plan completion.
- ⬜️ Ensure security-review findings are recorded in the `Security Review`
  section and any blocking findings become normal plan tasks before closeout.
- ⬜️ Modify workflow-owned skills only if the role exposes a clear standalone
  skill gap.
- ⬜️ If any skill is changed, verify the skill still works when invoked
  directly without role context.

Verification:

- Run automated role formatting, front matter, and contract checks.
- Manually review the `security-reviewer` role file against the role
  verification rubric.
- Manually verify any changed skills still stand alone.
- Manually verify any `plan-create` changes preserve direct planning behavior
  and surface security questions, non-goals, risks, and verification needs at
  the right planning gate.
- Manually verify the `Security Review` template section and completion
  checklist item capture post-phase findings without replacing normal phases,
  tasks, risks, or verification sections.
- Manually verify `delegate-to-role` delegates to `security-reviewer`.
- Manually verify `security-reviewer` produces useful trust-boundary, secret,
  authorization, destructive-operation, dependency, and safety findings in a
  representative scenario.
- Record automated checks, manual role review, skill standalone review,
  delegation verification, scenario-quality result, and commit checkpoint
  status.
- Human approval recorded before starting the next project-development role
  phase.

### Phase 10: Project-dev role: ux-writer (status: approved)

Goal: Add the workflow-owned `ux-writer` role with a clean manual validation
checkpoint.

Tasks:

- ⬜️ Create
  `aix/workflows/design-plan-execute/roles/project-dev/ux-writer.md`.
- ⬜️ Review README, CLI help, documentation, and workflow docs for language
  patterns.
- ⬜️ Integrate `ux-writer` with `plan-create` for user-facing labels, prompts,
  errors, empty states, onboarding copy, and README language requirements when
  the planned work changes product or developer-facing text.
- ⬜️ Modify workflow-owned skills only if the role exposes a clear standalone
  skill gap.
- ⬜️ If any skill is changed, verify the skill still works when invoked
  directly without role context.

Verification:

- Run automated role formatting, front matter, and contract checks.
- Manually review the `ux-writer` role file against the role verification
  rubric.
- Manually verify any changed skills still stand alone.
- Manually verify any `plan-create` changes preserve direct planning behavior
  and capture copy/content requirements without forcing copy review on
  unrelated plans.
- Manually verify `delegate-to-role` delegates to `ux-writer`.
- Manually verify `ux-writer` produces useful labels, prompts, empty states,
  error messages, onboarding text, and README language in a representative
  scenario.
- Record automated checks, manual role review, skill standalone review,
  delegation verification, scenario-quality result, and commit checkpoint
  status.
- Human approval recorded before starting the next project-development role
  phase.

### Phase 11: Project-dev role: requirements-engineer (status: approved)

Goal: Add the workflow-owned `requirements-engineer` role while preserving
direct `plan-create` quality.

Tasks:

- ⬜️ Create
  `aix/workflows/design-plan-execute/roles/project-dev/requirements-engineer.md`.
- ⬜️ Review `plan-create` for requirement elicitation, backlog plan boundaries,
  template ownership, and direct invocation behavior.
- ⬜️ Integrate `requirements-engineer` with `plan-create` as the primary
  design-intent collaborator after the vision gate is accepted, including
  requirements, non-goals, boundaries, acceptance signals, open decisions, and
  plan-readiness judgment.
- ⬜️ Modify `plan-create` only if role extraction exposes a clear standalone
  skill gap.
- ⬜️ Keep `plan-create` responsible for template resolution, file placement,
  lifecycle status, plan structure, verification, and final reporting.
- ⬜️ If `plan-create` changes, verify it still elicits requirements when invoked
  directly with an under-specified idea.
- ⬜️ Verify `plan-create` waits for accepted design intent before generating
  implementation phases/tasks, even when `requirements-engineer` delegation is
  used.

Verification:

- Run automated role formatting, front matter, and contract checks.
- Manually review the `requirements-engineer` role file against the role
  verification rubric.
- Manually verify `plan-create` still stands alone.
- Manually verify `delegate-to-role` delegates to `requirements-engineer`.
- Manually verify `requirements-engineer` produces a useful requirements brief,
  open decisions, non-goals, acceptance signals, and plan-readiness judgment in
  a representative scenario.
- Record automated checks, manual role review, skill standalone review,
  delegation verification, scenario-quality result, and commit checkpoint
  status.
- Human approval recorded before starting the next project-development role
  phase.

### Phase 12: Project-dev role: quality-engineer (status: approved)

Goal: Add the workflow-owned `quality-engineer` role while preserving direct
verification-skill quality.

Tasks:

- ⬜️ Create
  `aix/workflows/design-plan-execute/roles/project-dev/quality-engineer.md`.
- ⬜️ Review `work-verify`, `task-execute`, `phase-execute`, and `plan-complete`
  for verification ownership and direct invocation behavior.
- ⬜️ Integrate `quality-engineer` with `plan-create` for acceptance checks,
  verification strategy, regression-risk notes, and evidence expectations in
  implementation phases after design intent is accepted.
- ⬜️ Modify verification-related skills only if role extraction exposes a clear
  standalone skill gap.
- ⬜️ Keep `work-verify` responsible for selecting and reporting checks when
  invoked directly.
- ⬜️ If any verification-related skill changes, verify it still works without
  role context.

Verification:

- Run automated role formatting, front matter, and contract checks.
- Manually review the `quality-engineer` role file against the role
  verification rubric.
- Manually verify changed verification skills still stand alone.
- Manually verify any `plan-create` changes preserve direct planning behavior
  and improve verification quality without taking over `work-verify`.
- Manually verify `delegate-to-role` delegates to `quality-engineer`.
- Manually verify `quality-engineer` produces useful targeted checks,
  regression coverage, acceptance evidence, gaps, and residual risk in a
  representative scenario.
- Record automated checks, manual role review, skill standalone review,
  delegation verification, scenario-quality result, and commit checkpoint
  status.
- Human approval recorded before starting the next project-development role
  phase.

### Phase 13: Project-dev role: documentation-specialist (status: approved)

Goal: Add the workflow-owned `documentation-specialist` role while preserving
direct documentation-skill quality.

Tasks:

- ⬜️ Create
  `aix/workflows/design-plan-execute/roles/project-dev/documentation-specialist.md`.
- ⬜️ Review `documentation-review`, `design-promote`, `design-create`, and
  `plan-complete` for documentation ownership and direct invocation behavior.
- ⬜️ Integrate `documentation-specialist` with `plan-create` for documentation
  impact, design-promotion notes, `_docs` placement, current-state docs, and
  closeout expectations when the planned work changes durable behavior.
- ⬜️ Modify documentation-related skills only if role extraction exposes a clear
  standalone skill gap.
- ⬜️ Keep documentation skills responsible for their own procedures, review
  gates, design-promotion rules, and final reporting when invoked directly.
- ⬜️ If any documentation-related skill changes, verify it still works without
  role context.

Verification:

- Run automated role formatting, front matter, and contract checks.
- Manually review the `documentation-specialist` role file against the role
  verification rubric.
- Manually verify changed documentation skills still stand alone.
- Manually verify any `plan-create` changes preserve direct planning behavior
  and capture documentation impact without taking over documentation-review or
  design-promotion procedures.
- Manually verify `delegate-to-role` delegates to `documentation-specialist`.
- Manually verify `documentation-specialist` produces useful documentation
  impact, design-promotion, structure, link, and current-state accuracy output
  in a representative scenario.
- Record automated checks, manual role review, skill standalone review,
  delegation verification, scenario-quality result, and commit checkpoint
  status.
- Human approval recorded before starting the next project-development role
  phase.

### Phase 14: Project-dev role: implementation-engineer (status: approved)

Goal: Add the workflow-owned `implementation-engineer` role while preserving
direct task execution quality.

Tasks:

- ⬜️ Create
  `aix/workflows/design-plan-execute/roles/project-dev/implementation-engineer.md`.
- ⬜️ Review `task-execute`, `phase-execute`, and `plan-execute` for execution
  ownership and direct invocation behavior.
- ⬜️ Integrate `implementation-engineer` with `plan-create` for implementation
  phase/task decomposition after design intent is accepted, including scoped
  task boundaries, sequencing, likely changed areas, and verification handoff.
- ⬜️ Modify execution-related skills only if role extraction exposes a clear
  standalone skill gap.
- ⬜️ Keep execution skills responsible for task status, scoped code changes,
  verification, plan updates, and final reporting when invoked directly.
- ⬜️ If any execution-related skill changes, verify it still works without role
  context.

Verification:

- Run automated role formatting, front matter, and contract checks.
- Manually review the `implementation-engineer` role file against the role
  verification rubric.
- Manually verify changed execution skills still stand alone.
- Manually verify any `plan-create` changes preserve direct planning behavior
  and improve implementation-task readiness without authorizing execution.
- Manually verify `delegate-to-role` delegates to `implementation-engineer`.
- Manually verify `implementation-engineer` produces useful scoped
  implementation, changed-file, verification, documentation-impact, and
  residual-risk output in a representative scenario.
- Record automated checks, manual role review, skill standalone review,
  delegation verification, scenario-quality result, and commit checkpoint
  status.
- Human approval recorded before starting the next project-development role
  phase.

### Phase 15: Local AIX source precedence and cleanup safety (status: approved)

Goal: Make local project `./aix/skills` and `./aix/workflows` the editable
source of truth for locally generated extension artifacts, while keeping
`.agents/packages` as installed materialization that is cleaned only when safe.

Tasks:

- ⬜️ Update skill source resolution so `aix skill activate
  aix/skills/<skill-name>` checks `./aix/skills/<skill-name>` before
  configured or bundled/default `aix` sources.
- ⬜️ Update workflow source resolution so `aix workflow install
  aix/workflows/<workflow-name>` checks `./aix/workflows/<workflow-name>`
  before configured or bundled/default `aix` sources.
- ⬜️ Represent local `./aix/` source ownership in the manifest or lockfile so
  deactivate, uninstall, update, diff, status, and verify can distinguish
  editable local source from remote package-managed materialization.
- ⬜️ Ensure deactivating a locally sourced skill removes only active exposure
  and lockfile/manifest activation state, while preserving
  `./aix/skills/<skill-name>`.
- ⬜️ Ensure uninstalling a locally sourced workflow removes only active
  exposure and lockfile/manifest activation state, while preserving
  `./aix/workflows/<workflow-name>`.
- ⬜️ Ensure `.agents/packages/skills` and `.agents/packages/workflows` cleanup
  happens only for package-managed materialized copies, not local source
  artifacts.
- ⬜️ Update `aix status`, `aix verify`, `aix diff`, and `aix update` messaging
  to make local source ownership explicit.

Verification:

- Add CLI tests for local `./aix/skills` precedence over default `aix` skill
  sources.
- Add CLI tests for local `./aix/workflows` precedence over default `aix`
  workflow sources.
- Add package-safety tests confirming locally sourced skill deactivation and
  workflow uninstall preserve local `./aix/` source artifacts.
- Add status, verify, diff, and update tests for local source ownership and
  remote fallback behavior.

### Phase 16: Delegation and host compatibility (status: approved)

Goal: Make roles usable by agents while keeping AIX in control of when roles
are loaded and when host-native files are written.

Tasks:

- ⬜️ Implement or design the workflow-owned `delegate-to-role` behavior.
- ⬜️ Define explicit routing for prompts such as "use quality-engineer" or
  "delegate to documentation-specialist".
- ⬜️ Decide how much implicit routing the workflow should encourage, and keep
  conservative defaults when user intent is ambiguous.
- ⬜️ Define the bounded delegation prompt shape and required return evidence.
- ⬜️ Document when delegation is not allowed, especially unresolved product
  decisions, unclear authorization, and safety-sensitive file operations.
- ⬜️ Preserve parent-context ownership of plans, worktree safety, verification
  review, and final decisions.
- ⬜️ Keep host-native agent directories as explicit compatibility outputs, not
  canonical role storage.
- ⬜️ Document any host-native exposure command or config only if it is included
  in this plan's implementation scope.
- ⬜️ Update README and workflow docs with examples that avoid implying
  `.agents/roles/` is a cross-model standard.

Verification:

- Test role selection and prompt-overlay fallback with fixture role files.
- Test that host-native agent files are not written without explicit
  integration behavior.
- Manually verify `delegate-to-role` can delegate to each shipped role.
- Manually verify each shipped role produces artifacts or review output at the
  expected quality level in representative scenarios.
- Review documentation examples to make sure delegation remains explicit and
  bounded.
- Run targeted role-management tests.
- Run `npm run build`, `npm run typecheck`, and `npm test` when implementation
  touches CLI behavior.

## Open Questions / Decisions

- What exact lockfile shape should represent standalone role packages and
  workflow-owned roles?
- What exact manifest shape should represent standalone role sources?
- Should role `skills` metadata be a hard validation requirement, a warning
  when missing, or only a delegation hint?
- Which host-native compatibility output should be implemented first, if any?
- Should host-native exposure use a command, manifest setting, workflow setting,
  or remain deferred?
- How much implicit role routing should `delegate-to-role` allow versus
  requiring users to name the intended role?

## Risks

- Role files could become vague persona prose instead of useful operating
  guidance.
- Implicit routing could surprise users if the wrong role is loaded for a task;
  keep defaults conservative and prefer explicit role names.
- Runtime-specific fields could make AIX role definitions less portable; keep
  native field names as hints and preserve AIX safety checks outside those
  fields.
- Role updates could change agent behavior in subtle ways if diff and verify
  output are weak.
- Hard role-to-skill dependencies could make workflow updates harder to explain
  if roles break whenever a recommended skill is absent.
- Moving role-oriented guidance out of skills could weaken direct skill
  invocation if each changed skill is not reviewed as a standalone procedure.
- Delegation could hide plan state or worktree risks if the parent context does
  not remain authoritative.
- Added role layers could lower current workflow quality if verification only
  checks installation mechanics and skips scenario-based role output review.
- Workflow install could activate too many roles if the catalog grows without
  discipline; keep workflow-owned catalogs small and specific.
- Host-native agent integration could accidentally bypass AIX lifecycle rules
  if compatibility files become treated as source of truth.

## Lessons To Carry Forward

- Roles should prove their value through operating doctrine, not personality
  adjectives.
- Workflow-owned project-development roles are part of workflow adoption, not a
  separate generic catalog.
- AIX-development roles belong at the top level when they help author and
  review extension assets across workflows.
- `.agents/roles/` keeps AIX in control of role loading while still allowing
  explicit host-native compatibility later.
- A small role catalog is more useful than a broad catalog with vague
  responsibilities.

## Completion Checklist

- ⬜️ Confirm every task and success goal is complete or explicitly deferred.
- ⬜️ Human validation: developer evaluated the completed phased work and accepted it, or explicitly waived manual validation with a recorded reason.
- ⬜️ Run or review required targeted and repository verification.
- ⬜️ Review the codebase using `$code-review-refactor`; refactor or record follow-up work if needed.
- ⬜️ Promote accepted durable behavior into design docs using `$design-promote`.
- ⬜️ Review documentation structure, formatting, and links using `$documentation-review`; fix issues or record follow-up work.
- ⬜️ Record final risks, follow-on work, and documentation impact.
- ⬜️ Harvest reusable lessons and update workflow guidance when appropriate.
- ⬜️ Archive under `_docs/plans/completed/YYYY-MM-DD-<name>.md`.
