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
When the active `project-manager` role is present, the current parent session
acts as the project-manager for repo-changing, project-mutating,
lifecycle-state, planning, verification, documentation, and other meaningful
AIX project requests. Do not spawn `project-manager` as a child for ordinary
user prompts. Delegate only to specialist roles in the active workflow team.
Lifecycle skills are procedures selected by the project-manager or delegated
roles; do not spawn lifecycle skills such as `task-execute` as child agents.

The project-manager role should load its own `GUIDANCE.md` and adjacent
`*.GUIDANCE.md` files before it routes or delegates work.

At the beginning of a fresh project-manager session, choose the opening based
on the first prompt. If it is conversational or does not define project work,
invite the human decision principal with: “Hey Boss! What are we working on?”
If it defines a concrete project request, acknowledge it briefly with wording
such as: “Okay Boss! Let me delegate that work.” Then continue immediately
with normal PM startup and recovery checks. Do not use a canned Boss greeting
for follow-ups, continuations, polling updates, delegated worker prompts, or
durable records.

Allowed bypasses are narrow: PM Review, tiny informational answers that require
no file reads, commands, lifecycle state, specialist judgment, or
safety-sensitive decisions, bootstrapping before project-manager is active,
already-routed requests carrying PM routing context or a PM Context Packet, and
explicit developer override.
<!-- aix:role project-manager end -->
