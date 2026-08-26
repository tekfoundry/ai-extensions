# Design-Plan-Execute Skill Requirements

These are requirements for skills owned by the bundled `design-plan-execute`
workflow. They are installed and removed through the workflow lifecycle, not as
standalone user-managed skills.

## Cross-Skill Requirements

- Workflow-owned skills must live under the workflow package `skills/`
  directory and activate under `.agents/skills/`.
- Direct standalone deactivation must be refused for workflow-owned skills.
- Each skill must have valid `SKILL.md` front matter with a stable `name` and
  `description`.
- Skills that edit plans must preserve backlog, active, deferred, and completed
  lifecycle boundaries.
- Skills that implement work must update task or phase status before execution
  and record verification evidence before closeout.
- Skills that change durable behavior must check documentation impact and route
  current-state knowledge to `_docs/kb`.
- Skills must stop rather than continue when authorization, phase boundaries,
  safety-sensitive behavior, verification, or human validation is unclear.

## Planning Skills

- `brainstorming-skill` must run project-grounded brainstorming sessions and
  preserve approved or in-flight ideas in `_docs/ideas.md`.
- `plan-create` must turn user intent into a backlog implementation plan under
  `_docs/plans/backlog/` and stop before implementation authorization.
- `plan-review` must review a plan for scope, authorization, design
  completeness, risks, and verification readiness without implementing it.
- `plan-activate` must move a human-authorized backlog plan into `_docs/plans/`
  without broadening scope.
- `plan-update` must revise active or backlog plan content without executing
  the plan or changing lifecycle state.
- `plan-defer` must move active planned work back to backlog while preserving
  status, risks, and future activation context.

## Execution Skills

- `plan-execute` must orchestrate active implementation plans across phases and
  route bounded phase work through `phase-execute`.
- `phase-execute` must execute one active-plan phase by repeatedly selecting
  bounded `task-execute` work until the phase completes or a stop condition is
  reached.
- `task-execute` must implement one concrete active-plan task or one approved
  micro-fix, make the smallest coherent change, run targeted verification, and
  update plan evidence.
- `work-verify` must select and run targeted verification for a change and
  report evidence, gaps, residual risk, and success-criteria coverage.
- `code-review-refactor` must review maintainability risks and route
  substantial refactors through developer-approved planning before
  implementation.

## Documentation Skills

- `project-init` must initialize or repair the standard `_docs` structure
  without overwriting existing project-owned content.
- `design-create` must create current-state KB docs in the correct `_docs/kb`
  area and update the relevant index.
- `design-promote` must transfer accepted durable behavior from completed plans
  into `_docs/kb`.
- `review-and-refresh-docs` must compare implementation reality, accepted
  plans, and existing KB content, then refresh `_docs/kb` or record gaps.

## Role And Closeout Skills

- `delegate-to-role` must resolve only explicit role intent, stop on missing or
  ambiguous roles, prefer native bounded handoff only when available, and use a
  prompt-overlay fallback without writing host-native agent files.
- `plan-complete` must close and archive a plan only after tasks,
  verification, human validation, design promotion, risks, and documentation
  impact are resolved or explicitly recorded.

## Acceptance Criteria

- Shipped skill-instruction tests verify the planning, execution,
  verification, role delegation, documentation refresh, and plan completion
  contracts.
- `aix workflow install` activates the skills through workflow ownership.
- `aix verify` detects missing or changed workflow-owned active skill files.
- `aix skill deactivate <workflow-owned-skill>` fails with workflow ownership
  guidance.
