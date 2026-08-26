# Design-Plan-Execute Workflow Requirements

`design-plan-execute` is the default bundled workflow installed by `aix init`.
It standardizes AI-assisted software work around current project knowledge,
reviewed backlog plans, active plan execution, verification, and documentation
promotion.

## Actors

- Project developer: asks agents to create, activate, execute, update, verify,
  defer, or complete implementation plans.
- Agent runtime: follows installed workflow docs, skills, roles, and templates
  from `.agents/`.
- Planning reviewer: reviews backlog plan readiness before implementation.
- Implementation reviewer: checks task execution, verification evidence,
  maintainability, security, and documentation impact.
- Workflow maintainer: ships the workflow docs, skills, roles, templates, and
  managed `AGENTS.md` guidance as one package.

## Installed Shape Requirements

- The workflow manifest must be named `design-plan-execute` and titled
  `Design, Plan, Execute`.
- The workflow must install a managed `AGENTS.md` block marked
  `aix:workflow design-plan-execute`.
- The workflow must install `README.md`, `plan-example.md`, `workflow.md`, and
  `engineering-best-practices.md` as workflow docs under `.agents/`.
- The workflow must install workflow-owned skills from its `skills/` directory.
- The workflow must install workflow-owned project-development roles under
  `.agents/roles/`.
- The workflow must expose templates from its `templates/` directory for plan,
  documentation, design, competitive-analysis, product-summary, section, and
  knowledge-base artifacts.
- Installing or updating the workflow must scaffold `_docs/kb`,
  `_docs/plans`, `_docs/plans/backlog`, and `_docs/plans/completed` when they
  are missing.
- Installing or updating the workflow must preserve existing project-owned
  `_docs` content and treat `_docs/design` as a preserved migration baseline
  when it exists.

## User Stories

- As a project developer, I can initialize a project with `aix init` so that
  this workflow becomes the default operating model for coding agents.
  Acceptance signals: the active workflow is `design-plan-execute`, workflow
  docs are installed, workflow-owned skills and roles are active, templates are
  lockfile-tracked, and project documentation directories exist.

- As a project developer, I can ask an agent to use `plan-create` so that a
  fuzzy implementation idea becomes a reviewed backlog plan instead of jumping
  straight to code.
  Acceptance signals: the plan is created under `_docs/plans/backlog/`, design
  intent is reviewed before phases are accepted, and implementation does not
  begin until later activation.

- As a project developer, I can ask an agent to use `plan-activate` so that a
  human-authorized backlog plan moves into active execution.
  Acceptance signals: the plan moves from backlog into `_docs/plans/`, lifecycle
  state is preserved, and scope is not silently broadened during activation.

- As a project developer, I can ask an agent to use `plan-execute`,
  `phase-execute`, or `task-execute` so that active work proceeds in bounded
  phases and tasks.
  Acceptance signals: task status is updated before work begins, phase
  boundaries are respected, verification evidence is recorded, and execution
  stops when scope, authorization, or safety is unclear.

- As a project developer, I can ask an agent to use `work-verify` so that a
  change has targeted verification evidence before completion claims are made.
  Acceptance signals: verification commands, outcomes, gaps, and residual risk
  are reported and can be copied into the active plan.

- As a project developer, I can ask an agent to use `plan-complete` so that a
  plan closes only after tasks, verification, human validation, documentation
  impact, risks, and promotion work are resolved or explicitly recorded.
  Acceptance signals: completion requires the plan completion checklist,
  security review, verification evidence, documentation promotion, and archive
  readiness; human validation gates are not bypassed.

- As a reviewer, I can ask an agent to use `review-and-refresh-docs` so that
  `_docs/kb` reflects current implemented behavior after a change.
  Acceptance signals: the skill inspects implementation reality, accepted
  plans, and existing KB content; it updates current-state docs or records
  follow-up gaps.

- As a project developer, I can ask an agent to use `delegate-to-role` or name
  an installed role so that specialist judgment is bounded and parent-owned
  execution state stays authoritative.
  Acceptance signals: explicit role intent is required, missing or ambiguous
  roles stop delegation, prompt-overlay fallback does not write host-native
  agent directories, and the parent owns final decisions.

## Required Skills

- `project-init` must initialize or repair project docs without overwriting
  project-owned content.
- `brainstorming-skill` must maintain project-grounded ideas in
  `_docs/ideas.md` before implementation planning.
- `design-create` must create current-state KB docs in the correct area and
  link them from indexes.
- `design-promote` must promote accepted durable behavior from completed plans
  into `_docs/kb`.
- `plan-create`, `plan-review`, `plan-activate`, `plan-update`, `plan-defer`,
  `plan-execute`, `phase-execute`, `task-execute`, and `plan-complete` must
  enforce backlog, active-plan, task, phase, deferral, and closeout lifecycle
  boundaries.
- `work-verify` must select and run targeted verification.
- `code-review-refactor` must review maintainability risks and route substantial
  refactors through approved planning.
- `delegate-to-role` must perform bounded role delegation.
- `review-and-refresh-docs` must refresh `_docs/kb` against implementation
  reality.

## Required Roles

- `product-strategist` must review product value, audience fit, scope,
  tradeoffs, and sequencing.
- `product-designer` must review user flows, interaction design, accessibility,
  layout hierarchy, and terminal UX.
- `requirements-engineer` must own requirements, non-goals, boundaries, and
  acceptance signals.
- `technical-architect` must review system design, module boundaries, runtime
  contracts, and maintainability tradeoffs.
- `security-engineer` must review trust boundaries, destructive operations,
  dependency risk, secrets posture, and safety-sensitive behavior.
- `ux-writer` must review labels, prompts, errors, empty states, onboarding
  copy, and developer-facing language.
- `quality-engineer` must review verification strategy, regression risk,
  acceptance evidence, and residual gaps.
- `documentation-specialist` must review docs placement, current-state
  accuracy, links, and implementation-to-intent drift.
- `implementation-engineer` must review task boundaries, sequencing, likely
  changed areas, verification handoff, and documentation impact.

## Template Requirements

- The workflow must provide reusable document templates for plans,
  documentation routers, design docs, competitive analysis, and product
  summaries.
- The workflow must provide section templates for completion checklists,
  execution notes, phases, promotion guidance, reviewed context, risks,
  security review, tasks, and verification.
- The workflow must provide knowledge-base templates for area readmes,
  architecture, decision records, operational runbooks, requirements/use cases,
  threat models, and verification strategy.
- The default plan template must include security review and completion
  checklist sections.
- Published templates must be project-owned overrides under
  `.agents/templates/` and must resolve before workflow-origin templates.

## Non-Goals

- The workflow must not authorize implementation from backlog-only plans.
- The workflow must not use `_docs/design` as current-state truth.
- The workflow must not edit, move, delete, or rewrite existing `_docs/design`
  files during migration.
- The workflow must not replace explicit lifecycle gates with hidden automatic
  execution.
- The workflow must not create host-native agent directories unless a future
  explicit integration command owns that compatibility output.

## Acceptance Criteria

- `aix init` installs this workflow by default.
- `aix workflow install aix/workflows/design-plan-execute` installs the local
  bundled workflow when run from the AIX source tree.
- `aix workflow diff`, `aix workflow update`, `aix status`, and `aix verify`
  report workflow docs, templates, skills, roles, and drift correctly.
- Workflow skill instruction tests verify that lifecycle skills declare the
  required routing, review, verification, and closeout contracts.
