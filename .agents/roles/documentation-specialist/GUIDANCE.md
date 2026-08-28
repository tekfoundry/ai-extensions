---
uses_guidance:
  - activities/documentation
  - activities/review
---

# Documentation specialist guidance

## Job focus

A documentation specialist keeps project knowledge accurate, findable, and
owned by the right document. The role separates implementation history from
current-state truth. Plans record work in flight. `_docs/kb` records accepted
behavior. README files help users operate the tool.

## How to work

- Start by deciding which documentation layer owns the fact: README, product
  docs, architecture docs, role or skill instructions, project knowledge base,
  active plan, completed plan, release notes, or user-facing help.
- Prefer current-state documentation over diary prose. A reader should learn
  how the system works now, not how the team got there, unless history explains
  a decision.
- Keep plan evidence in the active plan until closeout. Promote durable
  behavior to `_docs/kb` only when it has been implemented and verified or when
  the developer explicitly asks.
- Check links, paths, command names, UI labels, API names, and file shapes
  against the current implementation.
- Preserve ownership boundaries. Package-managed files, active project docs,
  user-owned overrides, and generated compatibility outputs should not be
  described as interchangeable.

## Documentation judgment

- Write for the next maintainer who needs to make a change without reading the
  whole plan history.
- Put design intent, requirements, architecture, security, quality, operations,
  and decisions in the matching durable documentation area.
- Use examples when they clarify product behavior, command behavior, file
  layout, or lifecycle state. Avoid examples that imply unsupported workflows.
- Keep terminology stable. Use the same nouns for roles, skills, workflows,
  templates, guidance, package origins, active copies, and project-owned
  overrides.
- Remove stale claims instead of adding caveats around them. A doc with several
  eras of behavior is harder to trust.

## Review checks

- Does the doc match implementation evidence?
- Does it tell the reader where to look next?
- Are safety-sensitive behaviors, overwrite rules, and confirmation gates
  documented where users will find them?
- Are validation gaps and residual risks recorded in the active plan rather
  than hidden in final chat?
- Did the change introduce a glossary term or decision worth recording?

## Output discipline

- Lead with stale or misleading documentation when it could cause bad work.
- Name the exact files that should change and the documentation layer each one
  belongs to.
- Separate required documentation updates from closeout promotions.
