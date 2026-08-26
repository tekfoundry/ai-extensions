# Documentation Knowledge Base Workflow

## Status

🟨 Active

This plan was activated by user request on 2026-08-25. It is now the active
implementation record for improving documentation features in the
`design-plan-execute` workflow.

## Context

AI Extensions uses the `design-plan-execute` workflow to help agents and
developers move from design intent to planned implementation, verified work,
and durable project documentation. The current workflow already separates
package-managed agent process files in `.agents/` from project-owned
documentation in `_docs/`, and it treats `_docs/design/` as stable current
design intent.

Recent discussion identified a documentation depth gap. The current AIX design
docs are useful for product and feature intent, but they are comparatively
surface-level. They do not yet provide the deeper engineering material a
professional software team would expect, such as subsystem architecture,
requirements and use cases, lifecycle state models, trust boundaries,
verification strategy, interaction diagrams, or operational behavior.

This matters more in an AI-assisted pipeline. AI makes previously "not worth
it" work worth doing, including tests and documentation, but it can also let
junior developers or non-developers create working-looking applications without
understanding whether the result is secure, maintainable, or product-ready. AIX
should help preserve the apprenticeship value of software development by
requiring the right kind of durable knowledge, owned by the right specialist
roles, at the right points in the workflow.

Reviewed context:

- `AGENTS.md`
- `.agents/README.md`
- `.agents/workflow.md`
- `.agents/engineering-best-practices.md`
- `_docs/README.md`
- `_docs/design/README.md`
- `_docs/design/overview.md`
- `_docs/design/cli.md`
- `_docs/design/package-management.md`
- `_docs/design/workflows.md`
- `_docs/design/bundled-skills.md`
- `_docs/plans/mvp-release.md`
- `_docs/plans/backlog/workflow-external-skill-dependencies.md`

## High-Level Goal (status: accepted)

Improve the documentation model for AIX and the `design-plan-execute` workflow
so project-owned docs become a role-owned knowledge base instead of a shallow
collection of feature summaries.

The workflow should help AI-assisted teams produce professional-grade software
by preserving durable system understanding across product intent,
requirements, architecture, security, quality, operations, and decisions. The
result should make it easier for senior engineers to review AI work, for junior
developers to learn the system under the hood, and for non-developers to work
inside a repeatable pipeline with stronger guardrails.

The proposed documentation shape separates durable knowledge from execution
records:

```text
_docs/
  kb/
  plans/
```

`_docs/kb/` should hold current implemented system knowledge. `_docs/plans/`
should continue to hold intended work, active execution records, backlog work,
and completed implementation history.

## Design Intent (status: accepted)

Introduce a `_docs/kb/` knowledge base structure and update the
`design-plan-execute` workflow so durable project documentation is organized by
discipline and owned by explicit specialist roles.

The knowledge base should always describe the current implemented system. It
should not describe future intent that has not shipped, and it should not keep
past behavior as if it were still true. Historical context, planned future
work, and execution notes belong in `_docs/plans/` unless they have become
accepted current-state knowledge.

The knowledge base should include at least these role-owned areas:

```text
_docs/kb/
  README.md
  01-product/
  02-requirements/
  03-architecture/
  04-security/
  05-quality/
  06-operations/
  07-decisions/
  glossary.md
```

Role ownership should be explicit:

- `product-designer` owns product design intent, user flows, interaction
  behavior, UX principles, and user-facing acceptance signals.
- `requirements-engineer` owns requirements, use cases, user stories,
  non-goals, acceptance criteria, actors, workflows, and open decisions.
- `technical-architect` owns technical architecture, subsystem boundaries,
  runtime contracts, data flow, state machines, lifecycle diagrams, module
  maps, extension points, and major maintainability tradeoffs.
- `security-engineer` owns security documents, threat models, trust
  boundaries, secrets posture, authorization concerns, destructive operations,
  supply-chain risk, local file safety, and auditability.
- `quality-engineer` owns testing strategy, verification matrices, regression
  risk, manual validation expectations, release checks, coverage philosophy,
  and known validation gaps.
- `technical-architect` and `quality-engineer` jointly own operations
  documentation. The technical architect owns build and deployment
  architecture, runtime topology, release mechanics, environment assumptions,
  rollback model, and operational boundaries. The quality engineer owns smoke
  checks, release verification, monitoring expectations, incident validation,
  and regression gates.
- `technical-architect` is the primary owner for decisions documentation,
  especially architecture decision records and cross-system tradeoffs. Other
  specialist roles contribute decisions from their discipline, including
  product behavior, requirements, security risk, verification risk, and
  release readiness. The documentation specialist owns the decisions index and
  cross-links.
- `documentation-specialist` owns the documentation map, placement rules,
  cross-links, freshness checks, duplication checks, and routing to specialist
  doc owners. The documentation specialist coordinates the knowledge base but
  should not become the sole owner of architecture, security, requirements, or
  quality, operations, or decisions truth.

The documentation specialist should also own a repeatable "review and refresh"
workflow for projects whose documentation is behind the implementation. In this
mode, "review" means inspect the current implementation, accepted plans, and
existing documentation. "Refresh" means update the relevant knowledge-base
documents so they fully capture the current state from each domain's point of
view. The documentation specialist should delegate the same review-and-refresh
directive to the specialist roles, collect their findings, resolve placement
and duplication issues, and leave the knowledge base internally consistent.

Plans may guide review-and-refresh work by identifying changed areas,
accepted intent, and expected outcomes, but the plan is not the source of truth
for `_docs/kb/`. For product and requirements documents, the
`product-designer` and `requirements-engineer` may use accepted design intent
from a plan to understand the user value and intended requirements, then
refresh docs to describe what actually shipped. For architecture, security,
quality, operations, and decisions documents, specialist roles should inspect
the implementation and supporting evidence directly, using plans as an
inspection map rather than as proof of current behavior.

When the implementation, accepted plan intent, and existing knowledge-base docs
disagree, the workflow should not silently choose whichever source is most
convenient. It should update `_docs/kb/` to reflect verified implemented
behavior where that behavior is clear, and record unresolved conflicts as open
decisions, risks, or follow-up plan candidates when human judgment is needed.

The workflow should also make documentation depth explicit. Agents should not
treat "update docs" as complete when they only add surface-level prose. When
work changes durable behavior, the workflow should ask what kind of knowledge
changed and route that update to the correct knowledge base area.

Professional documentation patterns should become first-class expectations
where relevant:

- architecture diagrams
- sequence or interaction diagrams
- lifecycle and state-machine diagrams
- requirements and use cases
- "as a user I want to..." stories when they clarify product behavior
- subsystem contracts
- request, data, and command-flow traces
- invariants and failure modes
- threat models and trust-boundary diagrams
- verification matrices
- operational runbooks or release notes

The current `_docs/design` content should not be moved, deleted, or edited
during migration. The old directory remains as a human-review baseline until a
developer manually deletes it. Migration means reading the existing
`_docs/design` content, classifying the kind of truth it contains, creating the
appropriate new `_docs/kb` documents, and adding deeper missing content where
the old docs are too shallow. This may not be a file-to-file copy. Content may
be split across product, requirements, architecture, security, quality,
operations, decisions, and glossary areas as needed.

The workflow should preserve a clean visual split:

- `_docs/kb/` contains current implemented project knowledge.
- `_docs/plans/` contains intended work, temporary execution records, and
  historical implementation records.
- `.agents/` remains package-managed workflow content.

## Non-Goals

- No implementation during plan creation.
- No automatic migration of `_docs/design` without a reviewed migration plan.
- No removal of existing docs without preserving their accepted current-state
  intent.
- No claim that documentation replaces human review for architecture,
  maintainability, security, or product judgment.
- No requirement that every small micro-fix produce heavyweight architecture
  docs.
- No host-specific agent integration changes unless a later plan explicitly
  owns them.
- No edits, deletes, moves, or rewrites of existing `_docs/design` files during
  migration. A developer will delete the old directory manually after review.

## Boundaries And Invariants

- `_docs/` remains project-owned documentation.
- `.agents/` remains package-managed workflow content.
- `_docs/plans/` remains the lifecycle record for backlog, active, and
  completed plans.
- `_docs/kb/` becomes the preferred home for current implemented project
  knowledge.
- `_docs/kb/` must not present planned future behavior or superseded past
  behavior as current system truth.
- Plans may identify areas to inspect, but implementation evidence determines
  what `_docs/kb/` records as current state.
- Documentation role ownership should map to the existing workflow roles rather
  than creating unrelated doc-owner concepts.
- The documentation specialist coordinates structure and freshness, but
  specialist roles own the technical substance for their disciplines.
- Workflow templates and skill instructions should make deeper documentation
  expectations repeatable without forcing unnecessary ceremony on trivial work.
- Migration from `_docs/design` to `_docs/kb` must preserve existing accepted
  intent and links.
- If `_docs/design/` exists during migration, workflow tasks must not delete,
  move, or rewrite those files. The old directory stays intact so a human can
  verify that new `_docs/kb/` content replaces and contains the information
  from the old design docs. Human review owns any later deletion of
  `_docs/design/`.
- The no-rewrite rule applies to the existing `_docs/design` files themselves.
  Agents may and should rewrite, split, deepen, and reorganize that knowledge
  into new `_docs/kb` content.
- Every implementation change, including a micro-fix, should include a
  regression analysis for knowledge-base impact. Most micro-fixes may need
  little or no documentation change, but the agent should decide that from the
  affected behavior instead of assuming docs are unaffected.
- Diagrams may start as Mermaid or diagram-friendly Markdown text. The workflow
  should value clarity over visual polish.

## Implementation Phases

### Phase 1: Knowledge Base Contract And Taxonomy (status: completed)

Goal: define the current-state knowledge-base contract before changing workflow
behavior or moving existing project docs.

Tasks:

- ✅ Define `_docs/kb/` as the current implemented project knowledge base and
      `_docs/plans/` as the intended-work and execution-record area.
- ✅ Define the initial ordered `_docs/kb/` directory structure:
      `01-product`, `02-requirements`, `03-architecture`, `04-security`,
      `05-quality`, `06-operations`, and `07-decisions`.
- ✅ Scaffold `_docs/kb/README.md`, area directories, area owner README files,
      and `_docs/kb/glossary.md` as the Phase 1 deliverable structure.
- ✅ Document `_docs/design/` as a preserved migration review baseline: agents
      may read it but must not edit, move, delete, or rewrite its files.
- ✅ Document the migration safety rule: existing `_docs/design/` files remain
      untouched until a human verifies `_docs/kb/` coverage and deletes the old
      directory manually.
- ✅ Define what belongs in product, requirements, architecture, security,
      quality, operations, decisions, and glossary docs.
- ✅ Define required owner README content for each knowledge base area.
- ✅ Update `_docs/README.md` and workflow documentation routing language so
      agents start from `_docs/kb/` for current implemented knowledge while
      preserving `_docs/design/` as a migration comparison source.
- ✅ Update the workflow's documentation guidance to route current implemented
      knowledge through `_docs/kb/`.
- ✅ Document that `_docs/kb/` represents current implemented state, while
      future intent and historical execution remain in `_docs/plans/`.
- ✅ Document that completed plans guide inspection during closeout but do not
      become the source of truth for `_docs/kb/`.

Verification:

- `_docs/kb/README.md`, area directories, area owner README files, and
  `_docs/kb/glossary.md` exist.
- `_docs/README.md` and workflow routing guidance point current implemented
  knowledge to `_docs/kb/` while preserving `_docs/design/` as a review
  baseline.
- Document review confirms the taxonomy is clear, non-overlapping, and
  compatible with the current workflow lifecycle.
- Plan review confirms `_docs/kb/` and `_docs/plans/` have distinct purposes.
- Git diff review confirms no existing `_docs/design` file was edited, moved,
  deleted, or rewritten.

Evidence:

- Created `_docs/kb/README.md`, `_docs/kb/glossary.md`, and area owner
  READMEs under `01-product`, `02-requirements`, `03-architecture`,
  `04-security`, `05-quality`, `06-operations`, and `07-decisions`.
- Updated `_docs/README.md`, root `AGENTS.md`, the workflow source docs under
  `aix/workflows/design-plan-execute/`, and the installed `.agents` workflow
  copies to route current implemented knowledge through `_docs/kb/`.
- Preserved `_docs/design/` unchanged. `git diff --name-status -- _docs/design`
  produced no output.
- `find _docs/kb -maxdepth 2 -type f | sort` listed all expected KB files.
- `git diff --check` passed.
- Source and installed workflow copies matched for `README.md` and
  `workflow.md` after sync.

### Phase 2: `review-and-refresh-docs` Skill And Replacement Path (status: completed)

Goal: replace the retired docs gate with a skill that reviews
implementation reality and refreshes `_docs/kb/` to match current state.

Tasks:

- ✅ Create the `review-and-refresh-docs` workflow skill as the authoritative
      documentation acceptance gate.
- ✅ Define the skill contract: review current implementation, accepted plans,
      and existing docs; refresh `_docs/kb/` to match implemented current
      state; record unresolved conflicts as decisions, risks, or follow-up
      plan candidates.
- ✅ Include the `_docs/design/` preservation rule in the skill contract: when
      old design docs exist, `review-and-refresh-docs` may read them and use
      them as migration comparison input, but must not delete, move, or rewrite
      them.
- ✅ Fold the useful retired docs-gate checks into
      `review-and-refresh-docs`, including structure, links, placement,
      formatting, stale references, duplication, and current-state accuracy.
- ✅ Define how the skill delegates domain-specific review-and-refresh passes
      through `documentation-specialist` to the specialist roles.
- ✅ Define expected delegated-role return evidence: implementation facts
      inspected, docs updated, current-state gaps found, conflicts, unresolved
      questions, and risks that need a plan.
- ✅ Remove the retired docs gate by finding existing workflow callers and
      updating them to call `review-and-refresh-docs` instead.
- ✅ Update workflow callers such as plan closeout, design promotion, and docs
      catch-up prompts to use `review-and-refresh-docs` instead of
      the retired docs gate.

Verification:

- Skill review confirms `review-and-refresh-docs` always treats `_docs/kb/` as
  current implemented truth.
- Skill review confirms `review-and-refresh-docs` preserves `_docs/design/`
  during migration and leaves any later deletion to explicit human action.
- Workflow review confirms no lifecycle guidance still treats the retired docs
  gate as authoritative.
- Documentation-specialist review confirms the skill owns orchestration without
  taking over each domain's technical substance.

Evidence:

- Added workflow-owned `review-and-refresh-docs` skill with `SKILL.md`,
  `README.md`, and OpenAI prompt metadata.
- Updated workflow README, completion checklist, closeout skill guidance,
  design-promotion handoff language, role references, and non-completed plan
  checklists to call `review-and-refresh-docs`.
- Removed the retired docs-gate skill instead of keeping a compatibility
  wrapper.
- Exposed `.agents/skills/review-and-refresh-docs` and synced installed
  workflow package copies.
- Stale-caller scan found no retired docs-gate usage in workflow source,
  installed workflow guidance, roles, or non-completed plan checklists.
- `git diff --name-status -- _docs/design` produced no output.
- `git diff --check` passed.
- `npm run build` passed.

### Phase 3: Role Duties And Knowledge-Base Templates (status: completed)

Goal: make specialist roles and templates produce the right depth of
current-state documentation for each knowledge-base area.

Tasks:

- ✅ Update `product-designer` guidance so product design intent, user flows,
      interaction behavior, and UX acceptance signals route to
      `_docs/kb/01-product/`.
- ✅ Update `requirements-engineer` guidance so requirements, use cases, user
      stories, non-goals, acceptance criteria, and open decisions route to
      `_docs/kb/02-requirements/`.
- ✅ Update `technical-architect` guidance so subsystem architecture,
      contracts, lifecycle state, data flow, module boundaries, and diagrams
      route to `_docs/kb/03-architecture/`.
- ✅ Rename the `security-reviewer` role to `security-engineer` across workflow
      source, installed role exposure, skill references, and documentation
      without losing the existing security review responsibilities.
- ✅ Update `security-engineer` guidance so threat models, trust boundaries,
      secrets, authorization, destructive operations, supply-chain risk, and
      auditability route to `_docs/kb/04-security/`.
- ✅ Update `quality-engineer` guidance so verification strategy, regression
      risk, test matrices, manual validation, release checks, and known gaps
      route to `_docs/kb/05-quality/`.
- ✅ Update `documentation-specialist` guidance so it owns the docs map,
      placement rules, cross-links, freshness checks, duplication checks, and
      role-routing coordination.
- ✅ Define operations ownership across `technical-architect` and
      `quality-engineer`, with `documentation-specialist` coordinating
      placement and links.
- ✅ Define decisions ownership with `technical-architect` as primary owner,
      specialist roles contributing discipline-specific decisions, and
      `documentation-specialist` owning the decisions index and cross-links.
- ✅ Add or update knowledge-base templates for owner READMEs, architecture
      docs, requirements/use cases, threat models, verification strategy,
      operational runbooks, and decision records.
- ✅ Add diagram and trace expectations to the relevant role guidance and
      templates.
- ✅ Store reusable knowledge-base document shapes in workflow origin
      templates, while role guidance owns judgment, ownership, and routing
      rules for when and how to use those templates.
- ✅ Require diagrams, images, or other visual explanations only when they are
      the clearest way to convey architecture, lifecycle, interaction,
      security, data-flow, or operational meaning. When a relevant visual is
      omitted, record why prose is clearer or sufficient.
- ✅ Define conflict handling when implementation, accepted plan intent, and
      existing knowledge-base docs disagree.

Verification:

- Role review confirms each role has clear documentation duties and does not
  duplicate another role's primary ownership, including the renamed
  `security-engineer` role.
- Review-and-refresh documentation work confirms the documentation specialist
  coordinates the whole knowledge base without becoming the owner of every
  technical document.
- Template review confirms each knowledge-base area asks for implementation
  facts, contracts, invariants, failure modes, and evidence where relevant.

Evidence:

- Updated workflow-owned project development roles and installed active role
  copies so product, requirements, architecture, security, quality,
  operations, decisions, and documentation coordination route to the correct
  `_docs/kb` areas.
- Renamed the workflow security role to `security-engineer` in source,
  installed `.agents/roles`, installed workflow package files, tests, and the
  lockfile. Live workflow/source/test/installed scans found no
  `security-reviewer` references.
- Removed the retired docs-gate skill from workflow source, installed active
  skills, installed workflow package files, tests, and the lockfile. Live
  workflow/source/test/installed scans found no `documentation-review`
  references. Preserved historical mentions under `_docs/design` and
  `_docs/plans/completed` because those records are not rewritten during this
  migration.
- Added workflow-origin knowledge-base templates for owner README,
  architecture, requirements/use cases, threat model, verification strategy,
  operational runbook, and decision record documents. Template discovery now
  registers nested `kb/*` document templates.
- Confirmed Phase 3 source and installed role/template/skill files are synced.
  Known Phase 4 source-vs-installed mismatches remain validation gaps until
  Phase 4 is reached in sequence.
- `node --test tests/skill-instructions.test.mjs` passed.
- `node --test tests/templates.test.mjs` passed.
- `node --test tests/init.test.mjs tests/package-smoke.test.mjs` passed.
- `node --test tests/roles.test.mjs` passed.
- `npm run build` passed.
- `git diff --check` passed.
- `git diff --name-status -- _docs/design` produced no output.

### Phase 4: Plan Lifecycle And Workflow Gates (status: completed)

Goal: update the planning, execution, verification, and closeout workflow so
agents produce the right documentation depth at the right time.

Tasks:

- ✅ Update plan templates to distinguish current-state knowledge impact from
      execution notes.
- ✅ Update `plan-create` guidance so every created plan includes the
      `Completion Checklist` section from the active `plan.md` template, even
      when checklist items are still pending.
- ✅ Update plan review and closeout guidance to flag a missing
      `Completion Checklist` as a workflow defect and repair it before the plan
      is treated as ready or complete.
- ✅ Add verification guidance that compares generated or updated plans against
      required template sections, so required sections cannot be skipped just
      because the template was applied manually.
- ✅ Add prompts or template sections that classify documentation impact by
      product, requirements, architecture, security, quality, operations, and
      decisions.
- ✅ Add one operator-understanding closeout summary for meaningful work,
      covering what changed, important boundaries, data touched, failure modes,
      evidence, unverified areas, and manual inspection needs. Do not introduce
      separate learning-mode or delivery-mode execution paths.
- ✅ Add request, data, or command-flow trace expectations for product-facing
      or lifecycle-sensitive work.
- ✅ Expand verification guidance beyond command output to include manually
      exercised behavior, security-sensitive paths, data integrity,
      error/recovery paths, and known unverified areas.
- ✅ Add product-readiness categories such as prototype-ready,
      internal-use-ready, beta-ready, and production-ready when a plan moves
      toward user-facing release.
- ✅ Add diagram expectations where architecture, lifecycle, interaction, or
      security behavior is hard to understand from prose alone.
- ✅ Add a promptable docs catch-up entrypoint, such as "use
      documentation-specialist to review and refresh the docs", that inspects
      current implementation state and routes domain-specific refresh work to
      the right roles.
- ✅ Define closeout guidance that uses the completed plan as an inspection
      guide, then verifies and refreshes `_docs/kb/` against the implemented
      state.
- ✅ Define how `design-promote` interacts with `review-and-refresh-docs` so
      accepted plan behavior is promoted only after implementation state is
      checked.
- ✅ Define how the workflow records unresolved implementation-vs-intent
      conflicts without pretending the docs are acceptable.
- ✅ Define the micro-fix documentation impact rule: every change gets a
      regression analysis for knowledge-base impact, while tiny focused fixes
      may explicitly record that no `_docs/kb` update is needed.

Recovery note:

- Phase 4 files were edited before Phase 3 was complete. After Phase 3
  completed, Phase 4 was reviewed in sequence, installed workflow copies were
  synced, and the validation gaps were closed.

Verification:

- Template review confirms new gates are specific enough to prevent shallow
  docs but light enough for small micro-fixes.
- Plan lifecycle review confirms `plan-create`, `plan-review`, and
  `plan-complete` require or repair the `Completion Checklist` section instead
  of treating it as optional.
- Quality review confirms verification guidance records both evidence and gaps.
- Architecture review confirms trace and diagram expectations expose subsystem
  behavior rather than decorative documentation.

Evidence:

- Updated `plan.md` and `sections/phase.md` templates to separate
  documentation impact, product readiness, operator closeout, phase docs
  impact, and execution notes.
- Updated `plan-create`, `plan-review`, and `plan-complete` guidance so
  `Completion Checklist` is required or repaired before readiness/closeout.
- Updated `workflow.md` with micro-fix knowledge-base impact checks,
  expanded verification expectations, diagram/trace guidance, product
  readiness, completed-plan inspection guidance, and unresolved
  implementation-vs-intent conflict handling.
- Updated `design-promote` to promote verified current-state behavior into
  `_docs/kb`, use completed plans as inspection guides rather than proof, and
  hand off current-state accuracy to `review-and-refresh-docs`.
- Added a promptable docs catch-up path in the workflow README:
  "Use documentation-specialist to review and refresh the docs" and
  `review-and-refresh-docs` after implementation.
- Synced workflow source to installed `.agents` router files, active
  `design-promote`, and installed workflow package files; source-vs-installed
  workflow diff is clean.
- Refreshed `aix.lock.json` so workflow package, templates, skills, roles, and
  active skill/role hashes match the installed state.
- `node --test tests/skill-instructions.test.mjs` passed.
- `node --test tests/templates.test.mjs` passed.
- `node --test tests/init.test.mjs tests/package-smoke.test.mjs` passed.
- `node --test tests/roles.test.mjs` passed.
- `node dist/cli.js verify` exited successfully.
- `git diff --check` passed.
- Live workflow/source/test/installed scans found no `documentation-review` or
  `security-reviewer` references.
- `git diff --name-status -- _docs/design` produced no output.

### Phase 5: Existing AIX Documentation Migration Plan (status: completed)

Goal: classify the current `_docs/design` files and prepare a safe migration
into `_docs/kb/` without losing accepted intent.

Tasks:

- ✅ Inventory current `_docs/design` files and classify each section by
      product, requirements, architecture, security, quality, operations, or
      decisions.
- ✅ Identify content that is surface-level and needs deeper technical
      expansion.
- ✅ Identify missing technical docs for AIX, such as package store,
      manifest-lockfile model, workflow install lifecycle, skill activation
      lifecycle, template resolution, drift detection, filesystem safety,
      source resolution, and security trust boundaries.
- ✅ Identify missing product, requirements, quality, operations, and decisions
      docs needed to explain the current implemented AIX system.
- ✅ Draft a migration map from current `_docs/design` paths to target
      `_docs/kb` paths.
- ✅ Preserve existing `_docs/design` files unchanged while creating or
      refreshing `_docs/kb` content.
- ✅ Add a human review checklist for confirming `_docs/kb` replaces and
      contains all required information from `_docs/design`.
- ✅ Create new links for `_docs/kb` content and leave links inside
      `_docs/design` unchanged because the old directory remains intact during
      migration.
- ✅ Record any documentation debt that should remain deferred after the first
      migration.

Verification:

- Review-and-refresh documentation work confirms the migration map preserves
  accepted current design intent while updating `_docs/kb/` to reflect
  implemented behavior.
- Human review confirms `_docs/design` remains intact during migration and that
  no deletion is attempted by the workflow.
- Architecture, security, and quality reviews confirm the migration identifies
  the missing under-the-hood docs needed for safe future changes.

Evidence:

- Inventoried preserved design files: `README.md`, `overview.md`, `cli.md`,
  `package-management.md`, `workflows.md`, and `bundled-skills.md`.
- Created migrated KB documents:
  `_docs/kb/01-product/product-overview.md`,
  `_docs/kb/02-requirements/current-requirements.md`,
  `_docs/kb/03-architecture/system-architecture.md`,
  `_docs/kb/03-architecture/package-management.md`,
  `_docs/kb/03-architecture/workflow-lifecycle.md`,
  `_docs/kb/04-security/trust-boundaries.md`,
  `_docs/kb/05-quality/verification-strategy.md`,
  `_docs/kb/06-operations/release-and-maintenance.md`, and
  `_docs/kb/07-decisions/design-baseline-migration.md`.
- Added KB area index links and a top-level key-documents list in
  `_docs/kb/README.md`.
- `design-baseline-migration.md` records the migration map, deeper docs filled
  during migration, human review checklist, deferred documentation debt, and
  the current decision that `_docs/design` remains a preserved review baseline.
- Corrected the new KB security owner to `security-engineer`; stale old names
  are not present in `_docs/kb`.
- `find _docs/kb -maxdepth 3 -type f | sort` listed 18 KB files.
- `grep -RInE "documentation-review|security-reviewer" _docs/kb` produced no
  matches.
- `git diff --name-status -- _docs/design` produced no output.
- `git diff --check` passed.

### Phase 6: Workflow Self-Validation And Closeout (status: completed)

Goal: prove the improved documentation workflow against AIX itself and make
the new model repeatable for consuming projects.

Tasks:

- ✅ Use the improved workflow to update workflow guidance and `_docs/kb`
      documentation with the documentation behavior that is now accepted and
      implemented.
- ✅ Apply the new `_docs/kb` model to AIX's own docs as the first validation
      case.
- ✅ Run review-and-refresh documentation work for links, placement, duplicate
      content, stale references to `_docs/design`, and implemented
      current-state accuracy.
- ✅ Confirm the retired docs-gate transition is complete according to the
      accepted removal path.
- ✅ Run maintainability review for changed workflow skills, templates, and
      role files.
- ✅ Record examples that show how a future plan should route knowledge-base
      updates by role.
- ✅ Update the `design-plan-execute` workflow scaffolding so `aix init`
      creates the new `_docs/kb` structure instead of the old `_docs/design`
      structure.

Verification:

- `npm run build`
- `npm test`
- `aix verify` or the closest available local verification command
- Review-and-refresh documentation work confirms AIX's own docs demonstrate
  the intended knowledge-base structure and reflect implemented current state.
- Workflow review confirms no lifecycle guidance still treats the retired docs
  gate as authoritative.

Evidence:

- Updated `src/workflows/docs.ts` so workflow install/init scaffolds
  `_docs/kb`, seven KB area directories, area README files, `glossary.md`, and
  planning directories without creating `_docs/design` for new projects.
- Updated workflow and project-init guidance so current-state docs route to
  `_docs/kb`; `_docs/design` is referenced only as a preserved migration
  comparison source.
- Updated `design-create` to create focused `_docs/kb` documents using `kb/*`
  templates instead of creating new `_docs/design` files.
- Added workflow routing examples for future plans by role and KB area in
  `workflow.md`.
- Applied the KB model to AIX's own docs through the Phase 5 migration docs and
  area links.
- Synced workflow source to installed `.agents` router files and installed
  workflow package files; source-vs-installed workflow diff is clean.
- Refreshed `aix.lock.json`; `node bin/aix.js verify` passed.
- `npm run build` passed.
- `npm test` passed: 187 tests, 187 passed.
- `node --test tests/skill-instructions.test.mjs` passed after the final
  design-create KB contract update.
- `git diff --check` passed.
- `grep -RInE "documentation-review|security-reviewer" aix src tests .agents
  aix.lock.json AGENTS.md _docs/README.md _docs/ideas.md _docs/kb` produced no
  matches.
- `git diff --name-status -- _docs/design` produced no output.
- Maintainability scan for workflow skills, templates, and roles showed only
  `plan-create/SKILL.md` above 250 lines. It is an existing procedural skill
  whose length comes from role-collaboration and planning gates; no mixed
  production-code responsibility or correctness refactor was identified.

## Open Questions / Decisions

None.

## Risks

- The knowledge base could become too ceremonial if every small change requires
  heavy documentation.
- Role ownership could blur if documentation-specialist is treated as the sole
  owner of all docs instead of the coordinator.
- New `_docs/kb` links could be incomplete or hard to navigate if migration
  does not build fresh indexes and cross-links deliberately.
- Technical docs could still remain superficial if templates ask for headings
  but not contracts, state, diagrams, invariants, and failure modes.
- Workflow changes may need updates in package-managed workflow source,
  installed `.agents/` files, templates, roles, and project docs at the same
  time, increasing migration risk.
- Removing the retired docs gate could break prompts, plans, or workflow
  instructions that still reference it unless the removal path is explicit.

## Security Review

- Status: planned
- Scope reviewed: Documentation workflow changes that affect project-owned docs,
  workflow-owned templates and role guidance, local file migration, destructive
  file operations, trust-boundary documentation, and security review ownership.
- Findings: No blocking findings identified during planning. Implementation
  should treat any file moves or path rewrites as safety-sensitive and preserve
  local edits.
- Blocking findings converted to plan tasks: None yet.
- Residual risk: Migration from `_docs/design` to `_docs/kb` may lose accepted
  intent unless backed by an explicit inventory and review step. Existing
  `_docs/design` links are preserved because those files stay unchanged during
  migration.

## Lessons To Carry Forward

- AI lowers the cost of producing code faster than it lowers the cost of
  engineering judgment.
- The workflow should preserve apprenticeship by requiring humans and agents to
  explain boundaries, failure modes, data flow, and verification evidence.
- Surface docs help people use a product; architecture, security, quality, and
  requirements docs help people safely change it.
- Plans are temporary work records. The knowledge base is the durable
  understanding that should survive after work is accepted.

## Completion Checklist

- ⬜️ Confirm every task and success goal is complete or explicitly deferred.
- ⬜️ Human validation: developer evaluated the completed phased work and accepted it, or explicitly waived manual validation with a recorded reason.
- ⬜️ Run or review required targeted and repository verification.
- ⬜️ Complete Security Review after all implementation phases; record findings, convert blocking findings into normal plan tasks, and document residual risk.
- ⬜️ Review the codebase using `$code-review-refactor`; refactor or record follow-up work if needed.
- ⬜️ Promote accepted durable behavior into `_docs/kb` using `$design-promote`.
- ⬜️ Review documentation structure, formatting, and links using `$review-and-refresh-docs`; fix issues or record follow-up work.
- ⬜️ Record final risks, follow-on work, and documentation impact.
- ⬜️ Harvest reusable lessons and update workflow guidance when appropriate.
- ⬜️ Archive under `_docs/plans/completed/YYYY-MM-DD-<name>.md`.
