# AI Extensions knowledge base

This directory holds current implemented knowledge for AI Extensions.

Use this knowledge base when you need to understand how the product works now:
product behavior, requirements, architecture, security posture, quality
strategy, operations, decisions, and project terminology.

Implementation evidence owns current-state truth. Plans can explain intended
work and completed history, but they are not proof that behavior exists. When
code, plans, and knowledge-base docs disagree, inspect the implementation and
record unresolved conflicts as decisions, risks, or follow-up plan candidates.

## Directory map

- [01-product](01-product/README.md): product intent, user workflows,
  interaction behavior, UX principles, and user-facing acceptance signals.
- [02-requirements](02-requirements/README.md): requirements, use cases,
  actors, constraints, non-goals, acceptance criteria, and open decisions.
- [03-architecture](03-architecture/README.md): architecture, subsystem
  boundaries, runtime contracts, data flow, state machines, module maps, and
  maintainability tradeoffs.
- [04-security](04-security/README.md): threat models, trust boundaries,
  secrets posture, authorization concerns, destructive operations,
  supply-chain risk, local file safety, and auditability.
- [05-quality](05-quality/README.md): testing strategy, verification matrices,
  regression risk, manual validation, release checks, coverage philosophy, and
  known validation gaps.
- [06-operations](06-operations/README.md): build, deployment, runtime,
  release, rollback, smoke-check, monitoring, and incident validation
  knowledge.
- [07-decisions](07-decisions/README.md): accepted decisions, tradeoffs,
  discipline-specific decision records, and cross-links.
- [Glossary](glossary.md): shared terms used across the project.

## Key documents

- [Product overview](01-product/product-overview.md)
- [System requirements](02-requirements/system-requirements.md)
- [System architecture](03-architecture/system-architecture.md)
- [Package management](03-architecture/package-management.md)
- [Workflow lifecycle](03-architecture/workflow-lifecycle.md)
- [Trust boundaries](04-security/trust-boundaries.md)
- [Verification strategy](05-quality/verification-strategy.md)
- [Release and maintenance](06-operations/release-and-maintenance.md)

## Plans and history

`_docs/plans/` remains the lifecycle area for backlog work, active execution
records, and completed implementation history. Plans can guide inspection, but
the knowledge base should describe verified implemented behavior.

Completed plans are historical records. Read them when they explain why a
current behavior exists, but do not treat them as current truth without
checking implementation or accepted knowledge-base docs.

## Change impact

Every implementation change needs a knowledge-base impact check. Most
micro-fixes may need little or no docs update, but agents should make that
decision from the behavior touched. If the change affects durable product,
requirements, architecture, security, quality, operations, decisions, or
terminology, update the relevant files here.
