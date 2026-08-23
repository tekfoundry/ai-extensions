# Workflow Template Publishing

## Status

🟨 Active

This plan was activated by user request on 2026-08-23. It is now an active
implementation record for workflow template publishing.

## Context

The `design-plan-execute` workflow produces durable artifacts that carry much
of the workflow's value: plans, design intent, verification evidence,
promotion notes, and completion records. Today, the expected shape of these
artifacts is embedded in workflow docs and skill instructions. That keeps the
MVP simple, but it makes customization harder because a user must edit skills
or workflow prose to adapt artifact formats to a team's preferences.

The preferred direction is to introduce templates only at the workflow level,
not as a general feature for every individual skill. Skills may still include
local output guidance in `SKILL.md` when the output belongs only to that skill.
Workflow templates are for shared artifacts that several workflow-owned skills
create, read, update, review, or complete across a lifecycle.

The first concrete workflow is the bundled `aix` workflow under
`aix/workflows/design-plan-execute`. Its origin templates should live in that
workflow source tree. Publishing templates should expose editable project-local
copies under `.agents/templates/`, with document templates at the top level and
reusable section templates under `.agents/templates/sections/`.

Reviewed context:

- `AGENTS.md`
- `.agents/README.md`
- `.agents/workflow.md`
- `.agents/engineering-best-practices.md`
- `_docs/README.md`
- `_docs/design/README.md`
- `_docs/design/workflows.md`
- `_docs/design/cli.md`
- `_docs/design/package-management.md`
- `_docs/plans/backlog/workflow-external-skill-dependencies.md`
- `_docs/plans/backlog/github-skill-discovery-helper.md`
- `aix/workflows/design-plan-execute/`
- `src/workflows/`
- `src/cli.ts`

## High-Level Goal (status: accepted)

Make workflow artifact formats customizable without requiring users to modify
workflow-owned skills.

The `design-plan-execute` workflow should own the default templates for its
shared artifacts. Users should be able to publish those templates into a
project-local, editable location, modify them to match their team's needs, and
have workflow skills prefer the published version when it exists.

This matters because the artifacts are the workflow's strongest handoff
surface. They should be clear, durable, and easy for a project to adapt while
the workflow behavior remains package-managed and updateable.

## Design Intent (status: accepted)

Templates belong to workflows, not individual skills. An individual skill can
keep one-off output formatting instructions in its `SKILL.md`; external
templates are reserved for shared lifecycle artifacts used across multiple
workflow skills.

For the bundled `aix` workflow, origin templates should live under:

```text
aix/workflows/design-plan-execute/templates/
```

The installed package-managed workflow template location should be:

```text
.agents/packages/workflows/aix/design-plan-execute/templates/
```

The first published template location should keep document templates flat and
section templates grouped:

```text
.agents/templates/
  plan.md
  docs-readme.md
  design-readme.md
  product-summary.md
  competitive-analysis.md
  design-doc.md
  sections/
    phase.md
    task.md
    execution-note.md
    verification.md
    risks.md
    reviewed-context.md
    promotion-to-design.md
```

Flat document publishing is acceptable because the MVP supports only one active
workflow. Section templates get a `sections/` namespace because they are
reusable fragments, not standalone documents, and names such as
`verification.md` would otherwise become ambiguous. Template name collisions
should be treated as workflow activation or update concerns, not as routine
template lookup concerns. If a future version supports multiple active
workflows, template namespacing can be revisited then.

Template resolution should be:

1. Use `.agents/templates/<template-name>.md` when a published local template
   exists.
2. Otherwise fall back to
   `.agents/packages/workflows/aix/design-plan-execute/templates/<template-name>.md`.

Section template resolution should follow the same published-first rule:

1. Use `.agents/templates/sections/<section-name>.md` when a published local
   section template exists.
2. Otherwise fall back to
   `.agents/packages/workflows/aix/design-plan-execute/templates/sections/<section-name>.md`.

The initial CLI should use first-class `aix templates` commands. The preferred
command family is:

```bash
aix templates list
aix templates publish
aix templates diff
aix templates diff <template-name>
aix templates reset <template-name>
```

`aix templates publish` should copy origin templates from the active workflow
into `.agents/templates/`. It must not silently overwrite local edits. A
publish operation should expose the complete active workflow template set,
including document templates and section templates, so users can see the full
composition surface before customizing any one file.

Publishing should not support a targeted `publish <template-name>` form in the
first version. Once document templates can compose section templates, targeted
publishing would make it too easy to publish `plan.md` without the sections it
depends on, or to miss that changing a shared section can affect more than one
document template. Targeted names may still be useful for read-only diff and
explicit reset operations.

`aix templates reset <template-name>` should remove the published local
override for that template. It should not copy the workflow origin over the
published file. After reset, the normal published-first resolution naturally
falls back to the installed package-managed workflow origin. Reset is therefore
a delete-the-override operation with explicit safety checks, not an overwrite
operation.

The first template set should focus on durable workflow-created documents:
`plan.md`, `docs-readme.md`, `design-readme.md`, `product-summary.md`,
`competitive-analysis.md`, and `design-doc.md`. The core template should be a
single plan template because backlog, active, and completed plans are the same
artifact moving through lifecycle states rather than separate artifact types.
Lifecycle-specific differences can be expressed in the template's prose and
status vocabulary for now.

`design-doc.md` should allow flexibility inside a light structure. It should
provide a stable outer shape for current-state design intent, ownership,
constraints, and links, while leaving the document body adaptable to feature,
product, quality, operations, or overview topics.

Composable templates should support standard, deliberately small placeholder
syntax. The initial supported include syntax should be:

```text
{{ section:verification }}
```

Repeat syntax should support the plan's real repetition points without turning
templates into arbitrary code:

```text
{{ repeat:phases section:phase }}
{{ repeat:phase.tasks section:task }}
{{ repeat:phase.execution_notes section:execution-note }}
```

The repeat syntax is declarative: render a named collection with a named
section template. It should not support arbitrary expressions, nested
pseudo-code, filters, mutation, or general `for/endfor` scripting in the first
version. Section templates may use simple domain placeholders such as
`{{ phase:title }}`, `{{ task:status }}`, or `{{ note:verification }}`.

The plan repetition model should be explicit. `plan.md` owns the whole plan
artifact; `sections/phase.md` owns the repeated phase shape;
`sections/task.md` owns repeated task lines; and `sections/execution-note.md`
owns repeated phase execution evidence or notes. Verification, risks,
reviewed context, promotion-to-design, and completion checklist content should
also be available as section templates because they recur across plan, design,
and completion contexts.

The first implementation should keep the syntax small and predictable. It
should support section includes and constrained repeat blocks, but it should
not try to solve conditionals, lifecycle-specific optional sections, shared
headers or footers, filters, computed values, or a full template language.

## Non-Goals

- No template support for arbitrary standalone skills in the first version.
- No multiple-active-workflow template namespace.
- No arbitrary template scripting, conditionals, filters, computed values,
  mutation, or general `for/endfor` pseudo-code in the first version.
- No package registry, marketplace, or publishing service.
- No automatic overwrite of edited `.agents/templates` files.
- No automatic project-wide template customization during normal workflow
  install unless explicitly accepted by the command design.
- No separate backlog, active, and completed plan templates unless later usage
  proves one plan template is not enough.
- No shared header/footer composition in the first version.

## Boundaries And Invariants

- `.agents/` remains package-managed agent process structure with explicit
  user-editable surfaces where published.
- `_docs/` remains project-owned documentation and should not hold workflow
  template origins.
- Workflow origin templates live in the bundled workflow source under
  `aix/workflows/design-plan-execute/templates/`.
- Published document templates live flat under `.agents/templates/`.
- Published section templates live under `.agents/templates/sections/`.
- Published templates are user-editable and must be protected from silent
  overwrites.
- Origin templates are package-managed and should be updated through workflow
  update/install paths.
- The active workflow is authoritative for which templates exist.
- Skills should resolve templates by name through workflow-aware lookup rather
  than hard-coding full repository paths.
- `plan.md` should model the plan lifecycle through status and guidance, not
  through separate files for each plan state.
- Template syntax should stay declarative and domain-oriented:
  `{{ section:name }}` and `{{ repeat:collection section:name }}`.
- Section placeholders should use simple domain names, such as
  `{{ phase:title }}` and `{{ task:status }}`.
- The first implementation should support enough composition to avoid
  monolithic plan templates without becoming a general template language.

## Implementation Phases

### Phase 1: Origin Documents And Sections In The Bundled Workflow (status: completed)

Goal: define the initial workflow-owned document and section templates inside
the bundled `aix` workflow source without changing install behavior yet.

Tasks:

- ✅ Add `aix/workflows/design-plan-execute/templates/`.
- ✅ Create the initial `plan.md` origin template for the shared plan
      lifecycle.
- ✅ Create `docs-readme.md` for the project documentation router generated at
      `_docs/README.md`.
- ✅ Create `design-readme.md` for the design documentation router generated
      at `_docs/design/README.md`.
- ✅ Create `product-summary.md` for the product framing artifact generated at
      `_docs/design/product/product-summary.md`.
- ✅ Create `competitive-analysis.md` for the market and landscape analysis
      artifact generated at `_docs/competitive-analysis.md`.
- ✅ Create `design-doc.md` as a flexible current-state design document
      template for files created under `_docs/design/`.
- ✅ Add `aix/workflows/design-plan-execute/templates/sections/`.
- ✅ Create `sections/phase.md` for repeated plan phase blocks.
- ✅ Create `sections/task.md` for repeated phase task entries.
- ✅ Create `sections/execution-note.md` for repeated phase or task execution
      notes.
- ✅ Create `sections/verification.md` for repeated verification evidence and
      expectations.
- ✅ Create `sections/risks.md` for recurring risk sections.
- ✅ Create `sections/reviewed-context.md` for reviewed context lists.
- ✅ Create `sections/promotion-to-design.md` for design promotion guidance.
- ✅ Create `sections/completion-checklist.md` for plan closeout tasks,
      including the maintainability and cleanup review before archival.
- ✅ Inline lifecycle status guidance in `plan.md` with `{{ plan:status }}`
      instead of keeping a separate `sections/status.md` fragment.
- ✅ Make `plan.md` cover planning draft, backlog, active, and completed
      states through plain Markdown guidance and status vocabulary.
- ✅ Make `plan.md` use or reserve the composable section syntax for repeated
      phases, tasks, execution notes, verification, risks, reviewed context,
      completion checklist, and status.
- ✅ Keep `design-doc.md` structured as a flexible sandwich: stable opening
      and closing guidance around a document body that can adapt to overview,
      feature, product, quality, or operations topics.
- ✅ Update bundled workflow docs or skill guidance to identify the initial
      workflow-owned artifact templates.
- ✅ Avoid conditionals, filters, computed values, shared headers/footers, or
      arbitrary `for/endfor` pseudo-code in this phase.

Verification:

- Completed 2026-08-23: added origin document and section templates under
  `aix/workflows/design-plan-execute/templates/`, kept `plan.md` composition
  to `section` and constrained `repeat` references, and documented template
  ownership in the bundled workflow README.
- Inspect the templates for clear artifact ownership and no
  implementation-only assumptions.
- Confirm repeated plan structures are represented by section templates rather
  than duplicated ad hoc prose in `plan.md`.
- Confirm existing workflow docs and skills still make sense when the artifact
  shapes are externalized.
- Run targeted tests only if repository fixtures or packaged file discovery
  are touched.

### Phase 2: Composable Template Infrastructure (status: completed)

Goal: add the domain model and parser needed to understand workflow templates,
section includes, and constrained repeat syntax without publishing or applying
templates in skills yet.

Tasks:

- ✅ Model workflow templates as document templates and section templates.
- ✅ Discover origin templates from
      `aix/workflows/design-plan-execute/templates/` and origin section
      templates from `templates/sections/`.
- ✅ Parse and validate `{{ section:<name> }}` references.
- ✅ Parse and validate constrained repeat references in the form
      `{{ repeat:<collection> section:<name> }}`.
- ✅ Reject or report unsupported pseudo-code such as `{{ for ... }}`,
      `{{ endfor }}`, arbitrary expressions, filters, or conditionals.
- ✅ Validate that referenced section templates exist in the active workflow
      template set.
- ✅ Keep variable placeholders such as `{{ phase:title }}` inert unless they
      are needed for validation or later rendering.
- ✅ Add tests for valid section includes, valid repeat references, missing
      sections, and unsupported syntax.

Verification:

- Completed 2026-08-23: added `src/workflows/templates.ts`, optional
  `templatesDir` manifest parsing, lockfile parsing for template hashes, and
  `tests/templates.test.mjs`.
- `npm run build` passed.
- `node --test tests/templates.test.mjs` passed.
- Targeted template parser and discovery tests.
- Tests confirm document and section templates can be represented without
  installing or publishing them.
- `npm run build` or the repository's targeted type check command.

### Phase 3: Install Workflow Templates (status: completed)

Goal: include workflow origin templates in workflow install, init, update,
verify, status, diff, and uninstall behavior as package-managed workflow
content.

Tasks:

- ✅ Extend workflow manifest or convention handling so document and section
      templates are discoverable from
      `aix/workflows/design-plan-execute/templates/`.
- ✅ Install origin document and section templates into
      `.agents/packages/workflows/aix/design-plan-execute/templates/`.
- ✅ Record origin document and section template hashes in `aix.lock.json`.
- ✅ Make `aix init` include bundled workflow templates as part of the default
      workflow install.
- ✅ Make `aix verify` detect missing or drifted package-managed origin
      templates.
- ✅ Make `aix status` report workflow template health at a useful summary
      level.
- ✅ Make `aix workflow diff` and `aix workflow update` include origin
      template changes.
- ✅ Make `aix workflow uninstall` remove package-managed origin templates
      only after drift checks pass.

Verification:

- Completed 2026-08-23: workflow install validates template syntax, copies
  origin templates as package-managed workflow files, records template hashes,
  and reports template counts through install/init/status.
- `npm run build` passed.
- `node --test tests/templates.test.mjs tests/workflow.test.mjs tests/init.test.mjs tests/status.test.mjs` passed.
- Workflow install/init tests assert origin templates are installed and locked.
- Verify/status tests cover missing and drifted document and section
  templates.
- Workflow diff/update tests cover changed origin templates.
- Workflow uninstall tests cover template cleanup and drift refusal.
- `npm run build` and targeted workflow tests.

### Phase 4: Template Publishing Commands (status: completed)

Goal: add the user-facing `aix templates` command family for exposing editable
template copies under `.agents/templates/`.

Tasks:

- ✅ Add CLI routing for `aix templates list`.
- ✅ Add `aix templates publish` to publish all document templates and section
      templates from the active workflow into `.agents/templates/`.
- ✅ Support section template names such as `sections/verification` for
      targeted diff and reset.
- ✅ Add `aix templates diff` and `aix templates diff <template-name>` to
      compare published templates with their active workflow origins.
- ✅ Add `aix templates reset <template-name>` to delete one published local
      override after explicit safety checks, allowing fallback to the active
      workflow origin.
- ✅ Refuse to overwrite locally edited published templates during publish.
- ✅ Refuse `aix templates publish <template-name>` with a clear message that
      publish exposes the complete active workflow template set.
- ✅ Ensure command output distinguishes origin templates from published local
      overrides.

Verification:

- Completed 2026-08-23: added the `aix templates` command family, published
  overrides under `.agents/templates/`, section addressing with
  `sections/<name>`, and overwrite protection for locally edited published
  templates.
- `npm run build` passed.
- `node --test tests/templates.test.mjs tests/cli.test.mjs` passed.
- CLI tests for list, publish-all, targeted publish refusal, diff-all,
  diff-one, reset, and section-template addressing.
- Safety tests for existing local templates, local edits, missing active
  workflow, and unknown template names.
- `npm run build` and targeted command tests.

### Phase 5: Template Resolution In Workflow Skills (status: completed)

Goal: update workflow skill instructions so agents use published templates
when available and fall back to workflow origins when not.

Tasks:

- ✅ Define a concise template resolution rule in reusable workflow docs.
- ✅ Update `plan-create` to use the active workflow `plan.md` template when
      drafting a plan.
- ✅ Update `project-init` to use `docs-readme.md` and `design-readme.md` when
      creating missing documentation routers.
- ✅ Update product-framing workflow guidance to use `product-summary.md` when
      creating `_docs/design/product/product-summary.md`.
- ✅ Update competitive-analysis workflow guidance to use
      `competitive-analysis.md` when creating `_docs/competitive-analysis.md`.
- ✅ Update `design-promote` to consider `design-doc.md` when creating a new
      stable design document.
- ✅ Update `plan-review`, `plan-activate`, `plan-update`, `plan-execute`,
      `phase-execute`, `task-execute`, and `plan-complete` so their plan
      expectations refer to the shared plan template where appropriate.
- ✅ Keep skill behavior instructions in `SKILL.md`; move only shared artifact
      and section shape into templates.
- ✅ Preserve the existing lifecycle gates, status markers, drift caution, and
      verification expectations.
- ✅ Document what an agent should do if the template is missing from both the
      published and origin locations.

Verification:

- Completed 2026-08-23: added published-first template resolution guidance to
  bundled workflow docs and updated workflow skill instructions for shared
  artifact creation, review, execution, promotion, and closeout.
- `npm run build` passed.
- `node --test tests/templates.test.mjs tests/cli.test.mjs tests/workflow.test.mjs` passed.
- Manual review of workflow skills against `plan.md` for consistency.
- Run any skill packaging or workflow install tests affected by changed
  bundled workflow files.
- Confirm a fresh project can still follow the workflow without publishing
  templates.

### Phase 6: Review, Documentation, And Release Readiness (status: completed)

Goal: complete the feature with maintainability review, durable design docs,
and clear user-facing behavior.

Tasks:

- ✅ Update `_docs/design/workflows.md` with the accepted template ownership,
      install, publish, and resolution model.
- ✅ Update `_docs/design/cli.md` with the accepted `aix templates` command
      surface.
- ✅ Update `_docs/design/package-management.md` with lockfile, drift, and
      ownership behavior for workflow templates.
- ✅ Run the maintainability review gate for changed production files.
- ✅ Confirm the implementation supports only the accepted composable syntax
      and rejects unsupported template-language features.
- ✅ Record verification evidence and any deferred markup or section
      composition decisions before completing the plan.

Verification:

- Completed 2026-08-23: promoted template ownership, CLI command behavior, and
  package-management rules into stable design docs.
- File-size scan passed after splitting template discovery/validation and
  publish/diff/reset behavior into separate production files:
  `src/workflows/templates.ts` is 159 lines and
  `src/workflows/template-commands.ts` is 195 lines.
- `npm run build` passed.
- `npm test` passed: 115 tests.
- Added automated template output coverage that renders the bundled `plan.md`
  through the real section templates, compares it with a checked-in golden
  fixture, writes a project-local human-inspectable artifact at
  `tests/artifacts/templates/plan.md`, and asserts agent guardrail comments do
  not leak into rendered output.
- The rendered output fixture covers multiple phases, requires `Phase N:`
  headings, and locks task lists to adjacent bullet rows without blank lines
  between tasks.
- Added `sections/completion-checklist.md` to formalize plan closeout tasks,
  including codebase maintainability review and refactoring when needed.
- Removed the `promotion-to-design` section from the default rendered
  `plan.md` template so new plans do not guess final `_docs/design` targets
  before implementation is complete. The completion checklist now calls out
  `$design-promote` explicitly.
- Added `design-create` and `documentation-review` as workflow-owned skills.
  `plan-complete` now routes promotion through `$design-promote`, uses
  `$documentation-review` for documentation structure, formatting, links, and
  accuracy, and `design-promote` uses `$design-create` guidance when a new
  design document is needed.
- Added bundled publish coverage that installs the real bundled workflow from
  a local git source, publishes all 14 templates, and verifies the published
  templates preserve hidden guardrail comments.
- `npm test` emitted a local `lerd` warning about syncing
  `/Users/rcravens/.local/share/lerd/bin/aix`; the test command still exited
  successfully.
- `git diff --check` passed.
- Documentation review confirms design docs, workflow templates, and command
  behavior agree.

## Open Questions / Decisions

- Should `workflow.json` explicitly declare `templatesDir`, or should
  `templates/` be discovered by convention for the first version?
- Should `aix templates publish` be part of `aix init`, or should publishing
  always be explicit? The current design leans explicit to keep fresh projects
  quieter.
- What exact text should skills use when referencing a template so agents
  reliably resolve the published-first fallback path?
- Should repeat syntax render automatically in the first command
  implementation, or should v1 only validate and expose templates while agents
  perform expansion from the visible pattern?
- What exact collection names should `plan.md` standardize for phases, tasks,
  and execution notes?
- Should a future version support common headers and footers, or should
  section templates stay limited to named reusable content blocks?

## Risks

- Publishing templates could create confusion if users edit a local template
  and later expect workflow updates to update it automatically.
- If template lookup rules are only documented in prose, agents may apply them
  inconsistently.
- Adding too many templates early could create ceremony and make the workflow
  feel heavier than it is.
- Template syntax may expand beyond the accepted small surface if loops,
  conditionals, filters, and computed values are not explicitly rejected.
- Section-template composition could make template resolution harder to explain
  if document templates and section templates are not clearly separated.
- Template drift and workflow origin drift need distinct reporting so users
  understand what is package-managed and what is intentionally local.

## Lessons To Carry Forward

- Shared workflow artifacts are the right unit for templates.
- Individual skills should keep local output guidance in `SKILL.md` unless the
  artifact participates in a workflow lifecycle.
- Flat published document templates match the existing flat active-skill
  experience and are acceptable while the product supports one active
  workflow.
- Section templates need a `sections/` namespace because they are reusable
  fragments rather than standalone workflow documents.
- A single plan template should represent lifecycle states while section
  templates capture repeated phase, task, verification, risk, context,
  promotion, status, and execution-note structure.
- `{{ section:name }}` and `{{ repeat:collection section:name }}` are enough
  composition for the first version; arbitrary pseudo-code should stay out of
  scope.

## Completion Checklist

- ⬜️ Confirm every task and success goal is complete or explicitly deferred.
- ⬜️ Run or review required targeted and repository verification.
- ⬜️ Review the codebase to ensure the code is maintainable and clean; refactor if needed.
- ⬜️ Promote accepted durable behavior into design docs using `$design-promote`.
- ⬜️ Review documentation structure, formatting, and links using `$documentation-review`; fix issues or record follow-up work.
- ⬜️ Record final risks, follow-on work, and documentation impact.
- ⬜️ Harvest reusable lessons and update workflow guidance when appropriate.
- ⬜️ Archive under `_docs/plans/completed/YYYY-MM-DD-<name>.md`.

## Promotion To Design

When this plan is activated and completed, promote the accepted current-state
behavior into:

- `_docs/design/workflows.md`
- `_docs/design/cli.md`
- `_docs/design/package-management.md`
