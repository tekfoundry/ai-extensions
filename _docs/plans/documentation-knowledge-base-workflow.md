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
- `security-reviewer` owns security documents, threat models, trust
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

The current `_docs/design` content should not be moved wholesale without
review. Conceptually, much of it is product or feature intent, but some content
belongs in architecture, security, quality, or operations. Migration should
classify each current document by the kind of truth it contains, then split or
rewrite it at the proper depth.

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
- Diagrams may start as Mermaid or diagram-friendly Markdown text. The workflow
  should value clarity over visual polish.

## Implementation Phases

### Phase 1: Knowledge Base Contract And Taxonomy (status: accepted)

Goal: define the current-state knowledge-base contract before changing workflow
behavior or moving existing project docs.

Tasks:

- ⬜️ Define `_docs/kb/` as the current implemented project knowledge base and
      `_docs/plans/` as the intended-work and execution-record area.
- ⬜️ Define the initial ordered `_docs/kb/` directory structure:
      `01-product`, `02-requirements`, `03-architecture`, `04-security`,
      `05-quality`, `06-operations`, and `07-decisions`.
- ⬜️ Decide whether `_docs/design/` remains as a compatibility alias,
      transitional folder, or deprecated path during migration.
- ⬜️ Document the migration safety rule: existing `_docs/design/` files remain
      untouched until a human verifies `_docs/kb/` coverage and deletes the old
      directory manually.
- ⬜️ Define what belongs in product, requirements, architecture, security,
      quality, operations, decisions, and glossary docs.
- ⬜️ Define required owner README content for each knowledge base area.
- ⬜️ Update the workflow's documentation guidance to route current implemented
      knowledge through `_docs/kb/`.
- ⬜️ Document that `_docs/kb/` represents current implemented state, while
      future intent and historical execution remain in `_docs/plans/`.
- ⬜️ Document that completed plans guide inspection during closeout but do not
      become the source of truth for `_docs/kb/`.

Verification:

- Review-and-refresh documentation work confirms the taxonomy is clear,
  non-overlapping, and compatible with the current workflow lifecycle.
- Plan review confirms `_docs/kb/` and `_docs/plans/` have distinct purposes.

### Phase 2: `review-and-refresh-docs` Skill And Replacement Path (status: accepted)

Goal: replace the old `documentation-review` gate with a skill that reviews
implementation reality and refreshes `_docs/kb/` to match current state.

Tasks:

- ⬜️ Create the `review-and-refresh-docs` workflow skill as the authoritative
      documentation acceptance gate.
- ⬜️ Define the skill contract: review current implementation, accepted plans,
      and existing docs; refresh `_docs/kb/` to match implemented current
      state; record unresolved conflicts as decisions, risks, or follow-up
      plan candidates.
- ⬜️ Include the `_docs/design/` preservation rule in the skill contract: when
      old design docs exist, `review-and-refresh-docs` may read them and use
      them as migration comparison input, but must not delete, move, or rewrite
      them.
- ⬜️ Fold the useful `documentation-review` checks into
      `review-and-refresh-docs`, including structure, links, placement,
      formatting, stale references, duplication, and current-state accuracy.
- ⬜️ Define how the skill delegates domain-specific review-and-refresh passes
      through `documentation-specialist` to the specialist roles.
- ⬜️ Define expected delegated-role return evidence: implementation facts
      inspected, docs updated, current-state gaps found, conflicts, unresolved
      questions, and risks that need a plan.
- ⬜️ Decide and implement the transition path for the old
      `documentation-review` skill: remove it, deprecate it, or keep it as a
      temporary compatibility wrapper around `review-and-refresh-docs`.
- ⬜️ Update workflow callers such as plan closeout, design promotion, and docs
      catch-up prompts to use `review-and-refresh-docs` instead of
      `documentation-review`.

Verification:

- Skill review confirms `review-and-refresh-docs` always treats `_docs/kb/` as
  current implemented truth.
- Skill review confirms `review-and-refresh-docs` preserves `_docs/design/`
  during migration and leaves any later deletion to explicit human action.
- Workflow review confirms no lifecycle guidance still treats
  `documentation-review` as the authoritative docs-acceptance gate.
- Documentation-specialist review confirms the skill owns orchestration without
  taking over each domain's technical substance.

### Phase 3: Role Duties And Knowledge-Base Templates (status: accepted)

Goal: make specialist roles and templates produce the right depth of
current-state documentation for each knowledge-base area.

Tasks:

- ⬜️ Update `product-designer` guidance so product design intent, user flows,
      interaction behavior, and UX acceptance signals route to
      `_docs/kb/01-product/`.
- ⬜️ Update `requirements-engineer` guidance so requirements, use cases, user
      stories, non-goals, acceptance criteria, and open decisions route to
      `_docs/kb/02-requirements/`.
- ⬜️ Update `technical-architect` guidance so subsystem architecture,
      contracts, lifecycle state, data flow, module boundaries, and diagrams
      route to `_docs/kb/03-architecture/`.
- ⬜️ Update `security-reviewer` guidance so threat models, trust boundaries,
      secrets, authorization, destructive operations, supply-chain risk, and
      auditability route to `_docs/kb/04-security/`.
- ⬜️ Update `quality-engineer` guidance so verification strategy, regression
      risk, test matrices, manual validation, release checks, and known gaps
      route to `_docs/kb/05-quality/`.
- ⬜️ Update `documentation-specialist` guidance so it owns the docs map,
      placement rules, cross-links, freshness checks, duplication checks, and
      role-routing coordination.
- ⬜️ Define operations ownership across `technical-architect` and
      `quality-engineer`, with `documentation-specialist` coordinating
      placement and links.
- ⬜️ Define decisions ownership with `technical-architect` as primary owner,
      specialist roles contributing discipline-specific decisions, and
      `documentation-specialist` owning the decisions index and cross-links.
- ⬜️ Add or update knowledge-base templates for owner READMEs, architecture
      docs, requirements/use cases, threat models, verification strategy,
      operational runbooks, and decision records.
- ⬜️ Add diagram and trace expectations to the relevant role guidance and
      templates.
- ⬜️ Define conflict handling when implementation, accepted plan intent, and
      existing knowledge-base docs disagree.

Verification:

- Role review confirms each role has clear documentation duties and does not
  duplicate another role's primary ownership.
- Review-and-refresh documentation work confirms the documentation specialist
  coordinates the whole knowledge base without becoming the owner of every
  technical document.
- Template review confirms each knowledge-base area asks for implementation
  facts, contracts, invariants, failure modes, and evidence where relevant.

### Phase 4: Plan Lifecycle And Workflow Gates (status: accepted)

Goal: update the planning, execution, verification, and closeout workflow so
agents produce the right documentation depth at the right time.

Tasks:

- ⬜️ Update plan templates to distinguish current-state knowledge impact from
      execution notes.
- ⬜️ Add prompts or template sections that classify documentation impact by
      product, requirements, architecture, security, quality, operations, and
      decisions.
- ⬜️ Add an operator-understanding gate for meaningful work, covering what
      changed, important boundaries, data touched, failure modes, evidence,
      unverified areas, and manual inspection needs.
- ⬜️ Add request, data, or command-flow trace expectations for product-facing
      or lifecycle-sensitive work.
- ⬜️ Expand verification guidance beyond command output to include manually
      exercised behavior, security-sensitive paths, data integrity,
      error/recovery paths, and known unverified areas.
- ⬜️ Add product-readiness categories such as prototype-ready,
      internal-use-ready, beta-ready, and production-ready when a plan moves
      toward user-facing release.
- ⬜️ Add diagram expectations where architecture, lifecycle, interaction, or
      security behavior is hard to understand from prose alone.
- ⬜️ Add a promptable docs catch-up entrypoint, such as "use
      documentation-specialist to review and refresh the docs", that inspects
      current implementation state and routes domain-specific refresh work to
      the right roles.
- ⬜️ Define closeout guidance that uses the completed plan as an inspection
      guide, then verifies and refreshes `_docs/kb/` against the implemented
      state.
- ⬜️ Define how `design-promote` interacts with `review-and-refresh-docs` so
      accepted plan behavior is promoted only after implementation state is
      checked.
- ⬜️ Define how the workflow records unresolved implementation-vs-intent
      conflicts without pretending the docs are acceptable.

Verification:

- Template review confirms new gates are specific enough to prevent shallow
  docs but light enough for small micro-fixes.
- Quality review confirms verification guidance records both evidence and gaps.
- Architecture review confirms trace and diagram expectations expose subsystem
  behavior rather than decorative documentation.

### Phase 5: Existing AIX Documentation Migration Plan (status: accepted)

Goal: classify the current `_docs/design` files and prepare a safe migration
into `_docs/kb/` without losing accepted intent.

Tasks:

- ⬜️ Inventory current `_docs/design` files and classify each section by
      product, requirements, architecture, security, quality, operations, or
      decisions.
- ⬜️ Identify content that is surface-level and needs deeper technical
      expansion.
- ⬜️ Identify missing technical docs for AIX, such as package store,
      manifest-lockfile model, workflow install lifecycle, skill activation
      lifecycle, template resolution, drift detection, filesystem safety,
      source resolution, and security trust boundaries.
- ⬜️ Identify missing product, requirements, quality, operations, and decisions
      docs needed to explain the current implemented AIX system.
- ⬜️ Draft a migration map from current `_docs/design` paths to target
      `_docs/kb` paths.
- ⬜️ Preserve existing `_docs/design` files unchanged while creating or
      refreshing `_docs/kb` content.
- ⬜️ Add a human review checklist for confirming `_docs/kb` replaces and
      contains all required information from `_docs/design`.
- ⬜️ Decide how to preserve or redirect links from existing docs and plans.
- ⬜️ Record any documentation debt that should remain deferred after the first
      migration.

Verification:

- Review-and-refresh documentation work confirms the migration map preserves
  accepted current design intent while updating `_docs/kb/` to reflect
  implemented behavior.
- Human review confirms `_docs/design` remains intact during migration and that
  no deletion is attempted by the workflow.
- Architecture, security, and quality reviews confirm the migration identifies
  the missing under-the-hood docs needed for safe future changes.

### Phase 6: Workflow Self-Validation And Closeout (status: accepted)

Goal: prove the improved documentation workflow against AIX itself and make
the new model repeatable for consuming projects.

Tasks:

- ⬜️ Use the improved workflow to promote accepted documentation behavior into
      the workflow design docs.
- ⬜️ Apply the new `_docs/kb` model to AIX's own docs as the first validation
      case.
- ⬜️ Run review-and-refresh documentation work for links, placement, duplicate
      content, stale references to `_docs/design`, and implemented
      current-state accuracy.
- ⬜️ Confirm the old `documentation-review` transition is complete according to
      the accepted transition path.
- ⬜️ Run maintainability review for changed workflow skills, templates, and
      role files.
- ⬜️ Record examples that show how a future plan should route knowledge-base
      updates by role.
- ⬜️ Decide whether `aix init` should scaffold `_docs/kb/` immediately or only
      after the knowledge-base workflow is accepted for the default workflow.

Verification:

- `npm run build`
- `npm test`
- `aix verify` or the closest available local verification command
- Review-and-refresh documentation work confirms AIX's own docs demonstrate
  the intended knowledge-base structure and reflect implemented current state.
- Workflow review confirms no lifecycle guidance still treats
  `documentation-review` as the authoritative docs-acceptance gate.

## Open Questions / Decisions

- Should `_docs/design/` be removed, kept as a transitional compatibility
  folder, or kept as a narrowly scoped product-design folder?
- Should `aix init` scaffold the full `_docs/kb/` directory tree by default, or
  create only `_docs/kb/README.md` plus folders as they become needed?
- Should role-owned documentation templates be part of the workflow origin
  templates, or should roles describe structure in their role prompts only?
- Should diagrams be required for specific document types, or should the
  workflow require agents to justify when diagrams are omitted?
- Should "security-engineer" become a distinct role name, or should the
  existing `security-reviewer` role continue to own security documentation?
- Should the workflow include a learning-mode versus delivery-mode distinction
  for operator understanding gates?
- Should the old `documentation-review` skill be removed immediately, kept as a
  temporary compatibility wrapper around `review-and-refresh-docs`, or
  deprecated for one workflow update before removal?

## Risks

- The knowledge base could become too ceremonial if every small change requires
  heavy documentation.
- Role ownership could blur if documentation-specialist is treated as the sole
  owner of all docs instead of the coordinator.
- Moving existing `_docs/design` content could break links from plans, README
  files, or agent instructions if migration is not staged carefully.
- Deleting or rewriting `_docs/design` during migration could remove the human
  comparison baseline before `_docs/kb` coverage is verified.
- Technical docs could still remain superficial if templates ask for headings
  but not contracts, state, diagrams, invariants, and failure modes.
- Non-developer users may find the knowledge-base model intimidating unless the
  workflow distinguishes prototype, internal, beta, and production readiness.
- Workflow changes may need updates in package-managed workflow source,
  installed `.agents/` files, templates, roles, and project docs at the same
  time, increasing migration risk.
- Replacing `documentation-review` could break prompts, plans, or workflow
  instructions that still reference the old skill unless the transition path is
  explicit.

## Security Review

- Status: planned
- Scope reviewed: Documentation workflow changes that affect project-owned docs,
  workflow-owned templates and role guidance, local file migration, destructive
  file operations, trust-boundary documentation, and security review ownership.
- Findings: No blocking findings identified during planning. Implementation
  should treat any file moves or path rewrites as safety-sensitive and preserve
  local edits.
- Blocking findings converted to plan tasks: None yet.
- Residual risk: Migration from `_docs/design` to `_docs/kb` may break links or
  lose accepted intent unless backed by an explicit inventory and review step.

## Lessons To Carry Forward

- AI lowers the cost of producing code faster than it lowers the cost of
  engineering judgment.
- The workflow should preserve apprenticeship by requiring humans and agents to
  explain boundaries, failure modes, data flow, and verification evidence.
- Surface docs help people use a product; architecture, security, quality, and
  requirements docs help people safely change it.
- Plans are temporary work records. The knowledge base is the durable
  understanding that should survive after work is accepted.
