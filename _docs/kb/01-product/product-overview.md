# Product Overview

## Current Purpose

AI Extensions is a package-manager-style CLI for managing AI-agent extensions
inside software projects. The implemented product centers on the short `aix`
command, project-local manifests, exact lockfiles, a managed `.agents/`
package store, active skill and role exposure, and one default
`design-plan-execute` workflow.

The product exists to make agent-assisted development repeatable without
turning project-owned knowledge into package-managed workflow content.

## Strategic Positioning

AI Extensions is local-first infrastructure for agent-assisted development. It
treats skills, roles, workflow guidance, and templates as project assets that
can be installed, verified, updated, diffed, and reviewed with the same
discipline teams expect from package managers.

The strategic product bet is that agent behavior should be explicit,
inspectable, and versioned at the project boundary. AIX is not a registry,
marketplace, or host-specific agent runtime; it gives projects a safer local
operating model for whatever agent host they use.

## Primary Users

- Individual developers who want a consistent local agent workflow without
  hand-assembling `.agents/` content in every project.
- Team maintainers who want AI skills, roles, templates, and workflow
  instructions to be versioned and updateable like other development
  dependencies.
- Reviewers who need clear drift detection before package-managed agent files
  are overwritten, removed, or updated.
- AI-assisted teams that want current project knowledge, plan execution, and
  package-managed workflow behavior to stay separated but connected.

## Jobs To Be Done

- When starting or upgrading a repository, install a known agent workflow
  without manually copying workflow files.
- When adding third-party skills or roles, inspect candidates and lock the
  exact installed state before exposing them to agents.
- When updating package-managed workflow assets, compare drift before accepting
  changes to local agent behavior.
- When reviewing AI-assisted work, use current knowledge-base docs and plan
  evidence to understand what behavior is implemented and why it matters.

## Core User Workflows

- Initialize a project with `aix init`.
- Inspect workspace health with `aix status` and `aix verify`.
- Install, diff, update, or uninstall the active workflow.
- Add, list, activate, update, diff, and deactivate skills.
- Add, list, activate, update, diff, and deactivate standalone roles.
- List, publish, diff, and reset reusable guidance for active workflows and
  roles.
- Publish, diff, and reset editable workflow templates.
- Use `discover-skill` to review installable skill candidates before running
  normal package-management commands.

## Design-plan-execute ownership

Within the default workflow, `product-owner` carries product intent from idea
through delivery. The role preserves product-strategy work such as audience
fit, user value, scope, tradeoffs, prioritization, and sequencing, and adds
backlog ordering, actionable backlog-item shaping, acceptance criteria,
refinement, planning support, delivery-time clarification, and product-level
acceptance evaluation. See the [workflow requirements](../02-requirements/workflows/design-plan-execute/README.md)
for the complete contract.

The human decision principal is Boss. Boss remains outside the delegated-role
roster and retains product decisions, priorities, risky approvals, exceptions,
final acceptance, and release decisions. The PM and specialist roles prepare
work and evidence for those decisions; they do not create a worker or durable
delegation record for Boss.

In direct conversation, the human may address the active project manager as
`pm`, `project manager`, `manager`, or `project-manager`, without regard to
casing. The PM treats these as aliases for the same active entry role and
addresses the human as “Boss”.

## Guidance Model

Guidance is a first-class AIX asset for reusable best-practice judgment. It is
separate from skills, roles, templates, workflows, and `_docs/kb` current-state
knowledge.

Role guidance travels with role bundles. Bundled AIX roles and workflow-owned
roles include `GUIDANCE.md`; external standalone role bundles may omit it.
Activity guidance travels with the workflow because workflows define the
lifecycle activities that guidance describes. The default
`design-plan-execute` workflow ships shared guidance plus planning,
implementation, verification, review, and documentation activity guidance.

Projects can inspect the active guidance set with `aix guidance list`, publish
editable workflow guidance overrides with `aix guidance publish`, compare local
customizations with `aix guidance diff`, and reset selected guidance with
`aix guidance reset`. The `get-guidance` skill is available as an optional
read-only resolver for delegated role guidance. When the active
`project-manager` role is present, meaningful AIX project requests start
through that role before specialist roles, lifecycle skills, or file work.

## Strategic Boundaries

- Prefer project-local state over hidden global agent configuration.
- Prefer Git-backed and local sources over registry or marketplace assumptions.
- Require explicit activation, update, removal, and reset actions for
  safety-sensitive agent behavior.
- Keep package-managed workflow content separate from project-owned knowledge.
- Treat `_docs/kb` as current implemented project truth.

## UX Principles

- Keep the daily command surface short and readable.
- Treat install, update, remove, activation, deactivation, and reset operations
  as explicit user actions.
- Prefer human-scannable terminal output over raw JSON.
- Show copy/pasteable commands when discovery or listing asks a developer to
  take the next step.
- Fail before overwriting local edits or removing drifted package-managed
  files.

## Product Acceptance Signals

- A new project can run `aix init` and receive the default workflow, default
  standalone discovery skill, project documentation scaffolding, and lockfile.
- A project can verify, inspect, update, and remove package-managed AI assets
  without silently changing user-authored files.
- Workflow-owned skills and roles are protected from direct standalone
  deactivation.
- Role and workflow guidance can be inspected, customized, compared, and reset
  without silently overwriting local edits.
- Default workflow documentation routes current implemented knowledge to
  `_docs/kb`.
