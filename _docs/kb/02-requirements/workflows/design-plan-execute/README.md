# Design-Plan-Execute Workflow Requirements

`design-plan-execute` is the default bundled workflow installed by `aix init`.
It standardizes AI-assisted software work around current project knowledge,
reviewed backlog plans, active plan execution, verification, and documentation
promotion.

## Actors

- Project developer: asks agents to create, activate, execute, update, verify,
  defer, or complete implementation plans.
- Agent runtime: follows installed workflow docs, skills, roles, guidance, and
  templates from `.agents/`.
- Planning reviewer: reviews backlog plan readiness before implementation.
- Implementation reviewer: checks task execution, verification evidence,
  maintainability, security, and documentation impact.
- Product owner: owns product intent, backlog ordering, acceptance criteria,
  scope, prioritization, and product tradeoffs through delivery.
- Release engineer: owns bounded CI, build, package, supported-host,
  compatibility, diagnostic, and release-safety work.
- Boss: the human decision principal outside the delegated-role roster and
  worker lifecycle; retains product, priority, risky-approval, exception,
  final-acceptance, and release authority.
- Workflow maintainer: ships the workflow docs, skills, roles, guidance,
  templates, and managed `AGENTS.md` block as one package.

## Installed Shape Requirements

- The workflow manifest must be named `design-plan-execute` and titled
  `Design, Plan, Execute`.
- The workflow must install a managed `AGENTS.md` block marked
  `aix:workflow design-plan-execute`.
- The workflow must install `README.md`, `plan-example.md`, and `workflow.md`
  as workflow docs under `.agents/`.
- The workflow must install workflow-owned skills from its `skills/` directory.
- The workflow must install workflow-owned project-development roles under
  `.agents/roles/`.
- The workflow must include workflow-owned guidance under `guidance/`, including
  shared guidance and activity guidance for planning, implementation,
  verification, review, and documentation.
- The workflow must expose templates from its `templates/` directory for plan,
  documentation, design, competitive-analysis, product-summary, section, and
  knowledge-base artifacts.
- Installing or updating the workflow must scaffold `_docs/kb`,
  `_docs/plans`, `_docs/plans/backlog`, and `_docs/plans/completed` when they
  are missing.
- Installing or updating the workflow must preserve existing project-owned
  `_docs` content.

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

- As a project developer, I can use workflow guidance and role guidance without
  making guidance part of default startup routing.
  Acceptance signals: workflow activity guidance stays in the active workflow
  package until published, role guidance is editable in active role bundles,
  `get-guidance` can be used as an optional resolver for delegated-role
  guidance, and active project-manager startup reads its own guidance before
  routing meaningful AIX project requests.

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

- `product-owner` must review product value, audience fit, scope,
  tradeoffs, sequencing, backlog ordering, acceptance criteria, refinement,
  delivery-time clarification, and product-level acceptance.
- `release-engineer` must review CI, builds, packages, artifact integrity,
  supported-host integration, cross-platform compatibility, diagnostics, and
  release safety within bounded authority.
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

## Guidance Requirements

- The workflow must provide `guidance/README.md`, `guidance/shared.md`, and
  activity guidance for planning, implementation, verification, review, and
  documentation.
- Activity guidance may declare `applies_to` metadata for roles and skills.
  That metadata is advisory and must not install dependencies, activate skills,
  or route requests automatically.
- Workflow install must copy guidance origins into the workflow package but not
  materialize `.agents/guidance/`.
- Project-owned workflow guidance overrides must be created only by explicit
  publishing or direct project edits.
- Guidance must stay lower priority than user requests, repository
  instructions, workflow rules, skill procedures, role contracts, and safety
  boundaries.
- `get-guidance` is not a default request-entry router. The active
  `project-manager` role loads its own guidance at startup, then may use
  `get-guidance` to prepare tailored guidance for selected delegated roles.
- When the active `project-manager` role is present, repo-changing,
  project-mutating, lifecycle-state, planning, verification, documentation, and
  other meaningful AIX project requests must route through it before specialist
  roles, lifecycle skills, or file work unless a narrow bypass applies.
- The project-manager delegation cycle keeps execution role-owned:
  project-manager classifies and delegates bounded work, delegated roles run
  the assigned implementation, verification, documentation, review, or
  lifecycle-skill procedure, and the parent context reviews evidence and
  reports results without doing repo-changing work itself. Parent review is
  minimal and exception-driven: it trusts delegated role evidence and re-reads
  files only for concrete exceptions such as uncertainty, out-of-scope changes,
  failed tests, incomplete evidence, safety-sensitive changes, or another
  role's need for exact content.

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
- The workflow must not replace explicit lifecycle gates with hidden automatic
  execution.
- The workflow must not automatically route request startup through
  `get-guidance`.
- The workflow must not create host-native agent directories unless a future
  explicit integration command owns that compatibility output.

## Acceptance Criteria

- `aix init` installs this workflow by default.
- `aix workflow install aix/workflows/design-plan-execute` installs the local
  bundled workflow when run from the AIX source tree.
- `aix workflow diff`, `aix workflow update`, `aix status`, and `aix verify`
  report workflow docs, guidance, templates, skills, roles, and drift
  correctly.
- Workflow skill instruction tests verify that lifecycle skills declare the
  required routing, review, verification, and closeout contracts.
