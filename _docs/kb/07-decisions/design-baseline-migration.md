# Design Baseline Migration

## Purpose

This document maps the preserved `_docs/design` baseline into the new
`_docs/kb` structure. The old design directory remains untouched for human
review. New links in `_docs/kb` are independent; links inside `_docs/design`
are preserved because those files are not edited during migration.

## Migration Map

| Preserved design source | KB targets | Notes |
| --- | --- | --- |
| `_docs/design/README.md` | `_docs/kb/README.md`, area READMEs, this document | Old index becomes KB navigation and migration context. |
| `_docs/design/overview.md` | `01-product/product-overview.md`, `03-architecture/system-architecture.md`, this document | Product goal, ownership model, TypeScript/Node decision, and module map were split by discipline. |
| `_docs/design/cli.md` | `01-product/product-overview.md`, `02-requirements/current-requirements.md`, `06-operations/release-and-maintenance.md` | Command surface, distribution, terminal UX, and release behavior were classified as product, requirements, and operations. |
| `_docs/design/package-management.md` | `02-requirements/current-requirements.md`, `03-architecture/package-management.md`, `04-security/trust-boundaries.md`, `05-quality/verification-strategy.md` | Manifest/lockfile, source resolution, activation, drift, role lifecycle, and no-overwrite behavior were deepened. |
| `_docs/design/workflows.md` | `03-architecture/workflow-lifecycle.md`, `04-security/trust-boundaries.md`, `05-quality/verification-strategy.md`, `06-operations/release-and-maintenance.md` | Workflow install/update/remove, managed `AGENTS.md`, templates, roles, and docs scaffolding were split by responsibility. |
| `_docs/design/bundled-skills.md` | `01-product/product-overview.md`, `02-requirements/current-requirements.md`, `03-architecture/workflow-lifecycle.md` | Default sources, bundled workflow skills, and default role set moved into current-state product, requirement, and lifecycle docs. |

## Missing Depth Filled In This Migration

- Package store and active exposure boundaries.
- Manifest versus lockfile responsibility.
- Workflow install, update, diff, uninstall, and scaffolding lifecycle.
- Skill and role activation lifecycle.
- Template origin versus published override model.
- Drift detection and no-overwrite failure modes.
- Filesystem trust boundaries and destructive-operation safeguards.
- Verification matrix and release-oriented checks.
- Operational recovery from interrupted workflow execution.

## Human Review Checklist

- Confirm `_docs/design` remains unchanged in the worktree.
- Confirm every preserved design file above has a corresponding KB target.
- Compare command surface, default sources, workflow-owned skills, roles,
  template behavior, and package-management rules against current code.
- Confirm stale baseline terms in `_docs/design`, such as retired role or skill
  names, are corrected in `_docs/kb` rather than edited in the old baseline.
- Confirm new KB links are discoverable from `_docs/kb/README.md` and area
  READMEs.
- Confirm deferred documentation debt below is acceptable for this migration.

## Deferred Documentation Debt

- Add deeper per-command reference docs when the CLI surface stabilizes after
  the documentation workflow migration.
- Add sequence diagrams for activation, workflow update, and template publish
  if future maintainers find the prose traces insufficient.
- Add a dedicated decisions record for the TypeScript-on-Node runtime choice if
  the team wants ADR-style decision numbering.
- Add release checklist examples after the release workflow is exercised
  end-to-end.

## Current Decision

The knowledge base is now the durable current-state documentation home.
`_docs/design` is retained only as a preserved migration review baseline until
the developer manually deletes it.
