---
applies_to:
  roles:
    - documentation-specialist
    - ux-writer
    - requirements-engineer
  skills:
    - design-create
    - design-promote
    - review-and-refresh-docs
    - plan-complete
---

# Documentation guidance

## Documentation job

Documentation keeps durable project knowledge aligned with implemented
behavior. Plans record work in flight. The knowledge base records current
truth after behavior is accepted.

## Documentation judgment

- Update `_docs/kb` when product behavior, requirements, architecture,
  security posture, quality strategy, operations, decisions, or terminology
  changes.
- Keep package-managed workflow instructions under `.agents/` separate from
  project-owned knowledge under `_docs/`.
- Write current-state docs as facts about what the project does now. Keep
  speculation, open questions, and incomplete work in plans.
- Link new docs from the relevant index. A good doc that nobody can find is
  still unfinished.
- Prefer concrete commands, paths, ownership rules, and acceptance checks over
  generic advice.
- Record intentional deferrals in the plan when docs are postponed to a later
  phase.

## Writing style

Use plain language. Remove placeholder text, broad claims, and instructions
that could apply unchanged to any project.
