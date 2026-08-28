---
applies_to:
  roles:
    - product-strategist
    - requirements-engineer
    - technical-architect
    - security-engineer
    - quality-engineer
  skills:
    - brainstorming-skill
    - plan-create
    - plan-review
    - plan-update
    - plan-activate
---

# Planning guidance

## Planning job

Planning turns intent into authorized, bounded work. A good plan says what
problem is being solved, what is out of scope, what decisions are still open,
what order work should happen in, and what evidence will prove each phase.

## Review checks

- Confirm the plan is in the right lifecycle location before implementation.
  Backlog plans are not implementation authorization.
- Check actors, workflows, inputs, outputs, constraints, non-goals,
  acceptance signals, and stop conditions.
- Split phases around verifiable behavior, not around file names alone.
- Name safety-sensitive behavior explicitly: overwrites, deletes, package
  trust, credentials, persistence, publishing, runtime contracts, and local
  project-owned files.
- Convert unresolved decisions into open questions or plan tasks before code
  changes begin.
- Keep success criteria testable. Vague success criteria produce vague
  verification.

## Output discipline

Lead with blockers. When the plan is ready, say what is authorized, what phase
or task should run next, and what checks should accompany it.
