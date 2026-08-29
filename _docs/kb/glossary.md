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
- Project manager: The top-level AIX entry role that classifies meaningful
  project requests, chooses an ordered minimal role list, and delegates bounded
  work without becoming a broad executor.
- PM Review: A project-manager dry-run mode triggered by a case-insensitive
  `pm review` prompt prefix. It emits startup classification and guidance
  planning, then stops before delegation, file edits, command execution,
  lifecycle changes, verification, or plan state changes.
- Startup classification: The project-manager routing summary containing
  `roles`, `activities`, `task_context`, and `sequencing_notes`.
- Activity guidance: Workflow-owned guidance for a lifecycle activity such as
  planning, implementation, verification, review, or documentation.
- Guidance metadata: Advisory front matter, such as `applies_to` or
  `uses_guidance`, that helps route guidance without installing dependencies
  or making hidden runtime decisions.
