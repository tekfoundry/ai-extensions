---
name: brainstorming-skill
description: Run project-grounded brainstorming sessions that produce approved and in-flight ideas in `_docs/ideas.md`.
---

# Brainstorming Skill

Use this skill when the developer wants to discover, compare, refine, or save
possible project ideas before creating an implementation plan.

Typical prompts:

- "Let's brainstorm."
- "Let's brainstorm new skills."
- "Use brainstorming-skill to find possible README improvements."
- "Review our ideas and help prioritize what should come next."

This skill produces high-level ideas. It does not authorize implementation and
does not create, activate, execute, or complete workflow plans. When the
developer chooses one approved idea for implementation planning, route that
idea through `plan-create`.

## Scope

Brainstorm product, documentation, developer-experience, workflow, testing,
release, marketing, and maintainability ideas that fit the current project.

Marketing-related artifacts are valid brainstorming inputs and outputs. Review
README files, examples, screenshots, install instructions, product pages, and
other docs when they may be stale, unclear, missing new behavior, or undersell
the product.

Stay out of implementation unless the developer separately activates an
implementation plan.

## Session Flow

1. Infer the focus from the developer's prompt.
   - If the prompt has a clear focus, restate it briefly and begin.
   - If the prompt is broad but still usable, treat it as a general project
     brainstorming session.
   - Ask one concise question only when the prompt is too ambiguous to produce
     useful ideas or when safety-sensitive work may be involved.
2. Review the project before generating ideas.
   - Read `AGENTS.md` when present.
   - Read `_docs/README.md` when present, then relevant `_docs/design` docs.
   - Read active and backlog plans that may affect the focus area.
   - Read `_docs/ideas.md` when it exists.
   - Inspect relevant source layout and marketing artifacts such as README
     files when they may reveal gaps or stale messaging.
3. Research comparable products, projects, tools, or workflows when outside
   context would improve the session.
   - Prefer official docs, repositories, project pages, and primary sources.
   - Keep research bounded. Do enough to identify useful feature patterns,
     gaps, or marketing examples.
   - Keep source links with the ideas they informed.
4. Generate an in-flight idea list.
   - Include useful existing in-flight ideas.
   - Preserve approved ideas unless the developer asks to revisit them.
   - Add new candidates grounded in the project review and research.
5. Collaborate with the developer.
   - Review, remove, merge, split, rename, and reprioritize ideas.
   - Move ideas between in-flight and approved sections only when the developer
     accepts that change.
   - Do not silently discard existing ideas.
6. Save only on explicit request.
   - Write `_docs/ideas.md` only after the developer asks to save, commit, or
     persist the list.
   - Preserve extra user-added fields or notes when they do not conflict with
     the requested update.

## Ideas Document

`_docs/ideas.md` is project-owned documentation. Create it with this default
shape when it does not exist:

```md
# Ideas

## Approved prioritized ideas

1. **Idea name**
   - Summary: ...
   - Difficulty: low | medium | high
   - Dependencies: None | Idea name, Idea name
   - Source links:
     - [Label](https://example.com)

## In-flight ideas

1. **Idea name**
   - Summary: ...
   - Difficulty: low | medium | high
   - Dependencies: None | Idea name, Idea name
   - Source links:
     - [Label](https://example.com)
```

The format is the default document shape, not a strict parser contract. If a
project adds fields such as owner, status, dates, or notes, preserve them
unless the developer asks to simplify the file.

Approved ideas go at the top so the durable priority list is easy to scan.
In-flight ideas go at the bottom so unfinished sessions can be resumed later.

## Idea Fields

Every idea should include:

- `Name`: short and stable enough to reference from dependencies.
- `Summary`: one or two sentences describing the work and why it matters.
- `Difficulty`: `low`, `medium`, or `high`.
- `Dependencies`: `None` or exact idea names that should happen first.
- `Source links`: links that informed the idea. Use `None` when no links were
  used.

Reference dependencies by exact idea name. Avoid numbering dependencies because
prioritization changes the order.

## Prioritization

Prioritize approved ideas by value-to-effort:

1. likely business or developer value
2. implementation difficulty
3. strategic fit with current project direction
4. dependency readiness
5. risk
6. urgency

Use judgment instead of a heavy scoring model. Difficulty stays visible as a
field so high-value hard work is not hidden, but the approved list order should
still favor ideas with the best practical return.

## Source Links

Keep source links attached to the ideas they informed.

Useful links may include:

- official product docs
- GitHub repositories or specific files
- project pages
- competitor pages
- README files or docs in this repository
- issue, plan, or design documents

Use clear labels. A later reader should understand why the source was saved
even if the link title is vague.

## Output During a Session

When showing the working list in chat, group ideas under:

- Approved prioritized ideas
- In-flight ideas

For each idea, include name, summary, difficulty, dependencies, and source
links. Keep the list concise enough for the developer to review and edit.

When a session is not ready to save, say what changed in the in-flight list and
ask what the developer wants to adjust next. Do not write `_docs/ideas.md`
until explicitly asked.

## Handoff to Planning

When the developer wants to implement an idea, use `plan-create` to turn that
one idea into a backlog implementation plan. Include relevant source links and
dependencies from `_docs/ideas.md` in the plan context.
