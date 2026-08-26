# Product Overview

## Current Purpose

AI Extensions is a package-manager-style CLI for managing AI-agent extensions
inside software projects. The implemented product centers on the short `aix`
command, project-local manifests, exact lockfiles, a managed `.agents/`
package store, active skill and role exposure, and one default
`design-plan-execute` workflow.

The product exists to make agent-assisted development repeatable without
turning project-owned knowledge into package-managed workflow content.

## Primary Users

- Developers who want a consistent local agent workflow across projects.
- Teams that want AI skills, roles, templates, and workflow instructions to be
  versioned and updateable like other development dependencies.
- Reviewers who need clear drift detection before package-managed agent files
  are overwritten, removed, or updated.

## Core User Workflows

- Initialize a project with `aix init`.
- Inspect workspace health with `aix status` and `aix verify`.
- Install, diff, update, or uninstall the active workflow.
- Add, list, activate, update, diff, and deactivate skills.
- Add, list, activate, update, diff, and deactivate standalone roles.
- Publish, diff, and reset editable workflow templates.
- Use `discover-skill` to review installable skill candidates before running
  normal package-management commands.

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
