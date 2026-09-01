# Guidance Ownership Model

## Status

Accepted

## Decision

AIX treats guidance as a first-class asset for reusable best-practice judgment,
separate from roles, skills, workflows, templates, and `_docs/kb` current-state
knowledge.

Role guidance travels with role bundles in `GUIDANCE.md`. Workflow activity
guidance travels with workflow packages under `guidance/`. Projects can publish
workflow guidance overrides under `.agents/guidance/`, while active role
guidance is editable beside each active role's `ROLE.md`.

The public `aix guidance` command family lists, publishes, diffs, and resets
the active guidance set. The optional `get-guidance` skill resolves bounded
reading lists for delegated roles. It does not route project-manager startup.
When the active `project-manager` role is present, repo-changing and other
meaningful AIX project requests route through project-manager before
specialist roles, lifecycle skills, or file work.

## Context

Roles, skills, templates, and workflows solve different parts of agent-assisted
development. The old broad engineering guidance file was useful, but it mixed
general engineering practice with role-specific judgment and workflow activity
practice.

The accepted model keeps discipline guidance close to the role that owns it
and keeps activity guidance close to the workflow that defines the activity.
It also preserves AIX's local file safety model by separating package-owned
origins from project-owned overrides.

## Options Considered

- Single shared guidance file: simpler to find, but it recreates the large
  mixed-purpose document that this work is replacing.
- Workflow-only guidance: good for lifecycle activities, but standalone roles
  would lose the judgment that belongs to their role package.
- Role-only guidance: good for specialist judgment, but repeated planning,
  implementation, verification, review, and documentation practice would drift
  across roles.
- Hybrid role and workflow guidance: more structure, but it keeps ownership
  aligned with how AIX packages roles and workflows.

## Consequences

- Positive: role-specific judgment, workflow activity practice, and project
  overrides now have clear homes.
- Positive: guidance customization uses explicit publish, diff, and reset
  commands instead of silent package rewrites.
- Negative or tradeoff: projects now have another instruction layer to review
  and keep current.
- Follow-up: future workflow dependency work may decide whether any skills
  require automatic activation, but `get-guidance` remains a delegated-role
  guidance resolver rather than the project-manager startup path.

## Owners

- Primary owner: `technical-architect`
- Contributors: `requirements-engineer`, `security-engineer`,
  `quality-engineer`, `documentation-specialist`
- Index and links: `documentation-specialist`

## Evidence

- Implementation inspected: role bundles, workflow guidance origins, guidance
  commands, optional `get-guidance` skill, lockfile guidance state, and active
  role guidance behavior.
- Related plans: `_docs/plans/workflow-guidance-library.md`,
  `_docs/plans/backlog/create-project-manager-role.md`, and
  `_docs/plans/backlog/workflow-external-skill-dependencies.md`.
- Verification or review: Phase 7 documentation review and final plan
  verification.
- Open conflicts: none. The active `project-manager` role now owns entry
  routing for repo-changing and other meaningful AIX project requests, while
  `get-guidance` remains optional delegated-role guidance support.
