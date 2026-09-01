# Glossary

This file defines shared AI Extensions terms used across the knowledge base.

Add terms when repeated wording would otherwise drift across product,
requirements, architecture, security, quality, operations, decisions, plans,
or workflow guidance.

## Terms

- `aix`: The AI Extensions CLI.
- `.agents/`: Package-managed agent process structure installed by AIX.
- `_docs/kb/`: Project-owned knowledge base for current implemented system
  knowledge.
- `_docs/plans/`: Project-owned lifecycle area for backlog plans, active
  execution records, and completed implementation history.
- Knowledge-base impact check: A review of whether a change affects durable
  product, requirements, architecture, security, quality, operations,
  decisions, or terminology documentation.
- Guidance: Reusable best-practice judgment that agents can read while they
  follow roles, skills, or workflow activities.
- Role guidance: Guidance that travels with a role bundle in `GUIDANCE.md` and
  is editable in the active role directory after activation.
- Companion guidance: Role-adjacent guidance files whose names end in
  `.GUIDANCE.md`. The project-manager role loads adjacent companion guidance
  beside its active `GUIDANCE.md` before routing.
- Project manager: The top-level AIX entry role that classifies repo-changing,
  project-mutating, lifecycle-state, planning, verification, documentation,
  and other meaningful project requests, chooses a per-request ordered minimal
  role list from available active roles, and delegates bounded work without
  becoming a broad executor.
- Project-manager entry gate: The lifecycle skill contract that requires
  meaningful AIX project requests to route through active project-manager
  before specialist roles, lifecycle skills, or file work unless PM Review, a
  tiny informational answer, bootstrap-before-activation work, already-routed
  PM context or PM Context Packet, or explicit developer override applies.
- PM delegation cycle: The repo-work handoff contract where the parent context
  routes through project-manager, project-manager delegates bounded work to
  roles, delegated roles perform assigned implementation, verification,
  documentation, review, or lifecycle-skill procedures, and the parent context
  reviews evidence and reports results without doing repo-changing work itself.
  Parent review trusts delegated role evidence and re-reads files only for
  concrete exceptions.
- PM Review: A project-manager dry-run mode triggered by a case-insensitive
  `pm review` prompt prefix. It emits startup classification and guidance
  planning, then stops before delegation, file edits, command execution,
  lifecycle changes, verification, or plan state changes.
- PM Context Packet: A compact, role-specific delegation packet from the
  project-manager. It carries baseline request context, source pointers,
  guidance planning, stop conditions, and return requirements so roles can
  avoid repeated generic orientation while still re-reading authority files.
- Startup classification: The project-manager routing summary containing
  `roles`, `activities`, `task_context`, and `sequencing_notes`.
- Role sequence: The project-manager's per-request ordered role list. It uses
  the smallest adequate set from available active roles and may contain zero
  roles with handback, one role, or multiple roles in dependency order.
- Activity guidance: Workflow-owned guidance for a lifecycle activity such as
  planning, implementation, verification, review, or documentation.
- Guidance metadata: Advisory front matter, such as `applies_to` or
  `uses_guidance`, that helps route guidance without installing dependencies
  or making hidden runtime decisions.
