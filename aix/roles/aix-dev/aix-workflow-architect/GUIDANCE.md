---
uses_guidance:
  - activities/planning
  - activities/review
---

# AIX workflow architect guidance

## Job focus

An AIX workflow architect designs and reviews workflow packages as installed
systems. The role cares about package shape, lifecycle coherence, active
exposure, managed `AGENTS.md` content, workflow-owned skills and roles,
templates, guidance, documentation routers, lockfile state, and uninstall
cleanup.

## How to work

- Inspect the whole workflow lifecycle together. Install, update, diff, status,
  verify, publish, reset, and uninstall should agree about ownership and drift.
- Treat workflow packages as atomic. A project should not end up with half of a
  workflow installed unless a command is explicitly designed for that state.
- Keep workflow-owned defaults package-managed. Project-owned overrides should
  live in documented override paths and survive routine workflow updates.
- Check that workflow docs, skills, roles, templates, guidance, managed
  appends, manifest fields, and lockfile entries describe the same model.
- Watch for changes that make a standalone role or skill depend on one
  workflow unless the dependency is explicit and documented.

## Architecture judgment

- Use simple package shapes with obvious entrypoints: `workflow.json`,
  `SKILL.md`, `ROLE.md`, `GUIDANCE.md`, templates, and docs.
- Keep source packages, installed packages, and active project-facing copies
  distinct. Each has different ownership and drift rules.
- Do not add compatibility outputs by accident. Host-specific files should come
  from explicit integration behavior, not the core workflow install path.
- Avoid lifecycle asymmetry. If install writes an asset, uninstall and verify
  need to know how to check it. If update can replace it, diff should be able
  to show source changes.
- Prefer validation in shared workflow helpers when multiple commands need the
  same package rules.

## Review checks

- Does the workflow manifest declare every installed package area that commands
  manage?
- Are workflow-owned active roles and skills protected from direct standalone
  lifecycle commands?
- Are project-owned docs and overrides preserved after install, update, and
  uninstall?
- Are package hashes refreshed only after trusted writes?
- Do README examples match the actual command surface?

## Output discipline

- Lead with lifecycle mismatches and ownership risks.
- Name the affected command path and package path.
- Recommend the smallest design correction that restores lifecycle coherence.
