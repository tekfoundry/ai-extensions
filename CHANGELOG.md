# Changelog

Release Please owns this file after the first release PR.

## 0.2.1

- Publish the KB workflow release with matching package metadata and GitHub
  Release artifact install instructions.

## 0.2.0

- Add the `_docs/kb` knowledge-base documentation model for current-state
  product, requirements, architecture, security, quality, operations,
  decisions, and glossary documentation.
- Update the `design-plan-execute` workflow, skills, roles, templates, and
  scaffolding to route durable documentation to `_docs/kb` instead of the
  retired `_docs/design` structure.
- Backfill AIX documentation into the new KB structure and remove deprecated
  documentation-review and security-reviewer references.
- Add and refine release, operations, quality, security, architecture, and
  requirements documentation for the current implementation.

## 0.1.4

- Fix `aix update` missing-skill output so workflow-owned skills that moved out
  of the standalone `aix` skill source are not advertised as missing.

## 0.1.3

- Add first-class project-local agent roles under `.agents/roles/`.
- Add workflow-owned project-development roles for product strategy, product
  design, requirements, technical architecture, security review, UX writing,
  quality engineering, documentation, and implementation engineering.
- Add top-level AIX development roles for workflow architecture, skill
  authoring, package safety, instruction auditing, and release readiness.
- Add bounded `delegate-to-role` prompt-overlay delegation with conservative
  explicit role routing and no host-native agent file writes.
- Add standalone role source and lifecycle commands:
  `aix roles add/list/diff/update/remove` and
  `aix role activate/diff/update/deactivate`.
- Extend workflow install, update, diff, uninstall, status, and verify to cover
  workflow-owned roles, role hashes, drift checks, aliases, and ownership.
- Add local `./aix/roles`, `./aix/skills`, and `./aix/workflows` source
  precedence while preserving editable local source on deactivate or uninstall.
- Document role ownership, role-vs-skill boundaries, host-native compatibility
  limits, and closeout review gates.

## 0.1.0

- Add the bundled `discover-skill` helper for natural-language skill discovery.
- Activate standalone bundled `aix` skills during `aix init`.
- Add README coverage for bundled skills and the guided install review flow.
- Document discovery safety rules and default skill ownership in design docs.
- Recover malformed Git source caches that are missing an `origin` remote.
- Improve `aix status` messaging when update checks cannot resolve sources.

## 0.0.1

- Add workflow artifact templates and editable published template overrides.
- Move `code-review-refactor` into the `design-plan-execute` workflow.
- Update plan completion guidance to use `$code-review-refactor`.

## 0.0.0

- MVP release preparation is in progress.
