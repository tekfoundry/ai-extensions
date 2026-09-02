## Project

AIX is a TypeScript/Node.js CLI for managing project-local AI-agent skills,
roles, workflows, templates, and metadata.

## Map

`aix/` bundled assets · `src/` implementation · `bin/aix.js` CLI entrypoint ·
`tests/` test suite · `_docs/` project documentation.

## Safety

- Preserve user files and unrelated worktree changes.
- Never silently overwrite local edits or managed agent assets.
- Treat lockfiles, activation files, and managed instruction blocks as
  safety-sensitive.
- Do not add registry, plugin, global-install, or publishing behavior without
  explicit approval.
- Keep runtime state and secrets out of committed files.

## Verify

Prefer targeted tests; for broad changes run `npm run build` and `npm test`.
Use `npm run verify` for the complete TypeScript and test suite.

## Docs

Read `_docs/README.md` for routing, `_docs/plans/` for active work, and
`_docs/plans/backlog/` for inactive plans.

<!-- Managed workflow sections may be appended below. -->

<!-- aix:workflow design-plan-execute start -->
## Workflow

Read `.agents/README.md` for routing and `.agents/workflow.md` for the process
contract.

Read `_docs/kb/README.md` and the relevant plan before work that depends on
current project knowledge or lifecycle state.

`.agents/` is package-managed; `_docs/` is project-owned. Read a repository
skill's `SKILL.md` when that skill is selected.
<!-- aix:workflow design-plan-execute end -->

<!-- aix:role project-manager start -->
When the active `project-manager` role is present, route repo-changing,
project-mutating, lifecycle-state, planning, verification, documentation, and
other meaningful AIX project requests through it before specialist roles,
lifecycle skills, or file work. Lifecycle skills are role-owned procedures
selected by the project-manager or delegated roles, not default direct request
entrypoints.

The project-manager role should load its own `GUIDANCE.md` and adjacent
`*.GUIDANCE.md` files before it routes or delegates work.

Allowed bypasses are narrow: PM Review, tiny informational answers that require
no file reads, commands, lifecycle state, specialist judgment, or
safety-sensitive decisions, bootstrapping before project-manager is active,
already-routed requests carrying PM routing context or a PM Context Packet, and
explicit developer override.
<!-- aix:role project-manager end -->
