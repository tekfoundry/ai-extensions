# Design, Plan, Execute

`design-plan-execute` is the default `aix` workflow for coding agents. It gives
agents a project-local process for reading design intent, planning work,
executing small tasks, verifying changes, and keeping project documentation in
sync with accepted behavior.

Install it directly:

```bash
aix workflow install https://github.com/tekfoundry/ai-extensions/tree/master/aix/workflows/design-plan-execute aix
```

You can also install it through project initialization:

```bash
aix init
```

## What it installs

`.agents/` owns reusable AI-agent process structure for this repository:
workflow rules, engineering guidance for agents, and reusable workflow skills.

`_docs/` owns project knowledge only: stable design intent, product documents,
analysis, active/backlog/completed plans, and project-specific lessons.

## Files

Workflow package files:

- `workflow.json`, the install manifest
- `AGENTS.append.md`, the managed root `AGENTS.md` block content
- `README.md`, the process router
- `workflow.md`, the agent lifecycle and planning contract
- `engineering-best-practices.md`, reusable engineering guidance
- `skills/*/SKILL.md`, workflow-owned skills

Installed workflow docs:

- [Workflow](workflow.md): reusable agent lifecycle, work classification,
  planning, verification, and completion rules.
- [Engineering best practices](engineering-best-practices.md): reusable
  agent-facing engineering guidance.
- [Skills](skills/): reusable workflow skills for plan and task lifecycle work.
  Use `project-init` for documentation scaffolding and the plan/task skills for
  implementation lifecycle work.

Root integration:

- `AGENTS.md` receives a managed block marked
  `aix:workflow design-plan-execute`.
- Existing `AGENTS.md` content outside the managed block remains
  project-owned.

Project documentation:

- `_docs/design/`
- `_docs/plans/`
- `_docs/plans/backlog/`
- `_docs/plans/completed/`

These directories are project-owned. The workflow may create them when missing,
but routine workflow updates do not rewrite project documents.

## Skills

This workflow owns these skills:

- `project-init`: initialize or repair the project-owned `_docs` structure.
- `plan-create`: turn an idea into a backlog plan for review.
- `plan-review`: review a plan for scope, authorization, design completeness,
  risks, and verification readiness.
- `plan-activate`: move a human-authorized backlog plan into active
  implementation.
- `plan-execute`: orchestrate execution of an active implementation plan.
- `phase-execute`: execute one phase of an active plan through bounded tasks.
- `task-execute`: implement one concrete task or approved micro-fix.
- `work-verify`: select and run targeted verification for a change.
- `plan-update`: revise an active or backlog plan without implementing it.
- `plan-defer`: move active planned work back to the backlog.
- `plan-complete`: close a plan after tasks, verification, docs, and risks are
  resolved or recorded.
- `design-promote`: move accepted durable behavior from completed plans into
  stable design docs.

Workflow-owned skills are activated under `.agents/skills/`, but they are owned
by the workflow. Remove or update the workflow to change them; do not deactivate
them as normal root skills.

## How agents use it

After installation, agents start with the root `AGENTS.md` for repo-specific
instructions, then use `.agents/README.md` as the reusable process router and
`_docs/README.md` for project knowledge when that router exists.
