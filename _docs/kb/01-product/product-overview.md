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
- Publish, diff, and reset editable workflow templates.
- Use `discover-skill` to review installable skill candidates before running
  normal package-management commands.

## Strategic Boundaries

- Prefer project-local state over hidden global agent configuration.
- Prefer Git-backed and local sources over registry or marketplace assumptions.
- Require explicit activation, update, removal, and reset actions for
  safety-sensitive agent behavior.
- Keep package-managed workflow content separate from project-owned knowledge.
- Treat `_docs/kb` as current implemented truth and `_docs/design` as a
  preserved migration baseline when it exists.

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
- Default workflow documentation routes current implemented knowledge to
  `_docs/kb` while preserving `_docs/design` as a migration baseline when it
  exists.
