# Brainstorming Skill

## Status

✅ Completed

Activated by explicit user request on 2026-08-23 and completed on 2026-08-23.
This is the implementation record for the `brainstorming-skill` work.

## Context

The current workflow has `plan-create`, which turns an existing idea into a
backlogged implementation plan. That works when the developer already has at
least a vague idea to shape. The product does not yet provide an explicit agent
process for earlier discovery sessions where the team wants to generate,
compare, prune, and prioritize possible ideas before choosing one to plan.

The proposed `brainstorming-skill` fills that earlier discovery space. It helps
a developer start with a broad or focused prompt, review the current project,
research comparable products or projects when useful, identify gaps, and
maintain a prioritized idea list in a project-owned working document at
`_docs/ideas.md`.

The skill is not part of the `design-plan-execute` workflow lifecycle. Default,
bundled, non-workflow skills live under `aix/skills`, so the accepted source
location is `aix/skills/brainstorming-skill`. The skill is loosely coupled to
the workflow through `_docs/`, but it does not create, activate, execute, or
complete plans.

Reviewed context:

- `AGENTS.md`
- `.agents/README.md`
- `.agents/workflow.md`
- `.agents/engineering-best-practices.md`
- `_docs/README.md`
- `_docs/design/README.md`
- `_docs/design/bundled-skills.md`
- `_docs/design/workflows.md`
- `_docs/design/package-management.md`
- `_docs/plans/mvp-release.md`
- `_docs/plans/backlog/workflow-external-skill-dependencies.md`
- `README.md`
- `.agents/packages/workflows/aix/design-plan-execute/templates/plan.md`
- `.agents/packages/workflows/aix/design-plan-execute/templates/sections/phase.md`
- `.agents/packages/workflows/aix/design-plan-execute/templates/sections/risks.md`
- `.agents/packages/workflows/aix/design-plan-execute/templates/sections/completion-checklist.md`

## High-Level Goal (status: accepted)

Create a standalone `brainstorming-skill` that guides developers through idea
discovery before `plan-create`. The skill supports broad prompts such as
"let's brainstorm" and focused prompts such as "let's brainstorm new skills",
then produces a reviewed, prioritized list of high-level ideas.

The durable output is `_docs/ideas.md`, a project-owned working document with
two sections:

- Approved prioritized ideas, for ideas the developer has accepted into the
  durable list.
- In-flight ideas, for session candidates that should be preserved so the team
  can walk away and resume later.

Each idea entry includes:

- name
- summary
- difficulty
- dependencies
- source links, when external research or project artifacts informed the idea

Dependencies call out other ideas that need to be implemented first. Source
links preserve the research trail so the developer can revisit useful docs,
repositories, project pages, competitor pages, README files, or other artifacts.

The skill should also identify possible improvements to marketing-related
artifacts when those improvements are relevant. For this project, that includes
top-level and nested `README.md` files that may become stale, undersell the
product, omit newly bundled skills, or need better examples.

The result helps the team decide which ideas are ready to feed into
`plan-create`, while keeping brainstorming separate from implementation
planning.

## Design Intent (status: accepted)

Add `brainstorming-skill` as a standalone bundled skill under
`aix/skills/brainstorming-skill`. It must not live under
`aix/workflows/design-plan-execute/skills`, because it is not a workflow-owned
lifecycle skill. The skill can rely on existing project documentation
conventions, especially `_docs/`, but it must not activate, promote, or execute
workflow plans.

The skill defines this brainstorming lifecycle:

1. Start from the developer's prompt and infer whether it has a focus area.
2. Review repository context, including `_docs/design`, active and backlog
   plans, source code structure, marketing-related docs such as `README.md`
   files, and existing `_docs/ideas.md` entries when the file exists.
3. Research comparable products, projects, tools, or workflows when the focus
   area benefits from external context.
4. Identify project gaps, stale docs, marketing opportunities, missing
   examples, and product opportunities.
5. Build an in-flight idea list that merges existing ideas with newly generated
   candidates.
6. Collaborate with the developer to refine, remove, merge, split, and
   reprioritize ideas.
7. Move accepted ideas into the approved prioritized section, keep unresolved
   candidates in the in-flight section, and write `_docs/ideas.md` only when
   the developer asks to persist the session.

The skill separates in-flight discussion from durable writes. During a session,
the agent shows and revises the working list in chat. It writes `_docs/ideas.md`
only after explicit user direction such as "commit these ideas", "save the
list", or equivalent.

`_docs/ideas.md` is a project-owned working document, not a workflow artifact.
The first version should use simple Markdown that humans and agents can edit.
Existing ideas are preserved unless the developer explicitly accepts removal,
merge, or reprioritization.

The accepted `_docs/ideas.md` shape is:

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

Prioritization should use a practical value-to-effort judgment rather than a
heavy scoring model. The approved list is ordered by likely business value or
developer value relative to difficulty, adjusted for strategic fit, dependency
readiness, risk, and urgency. Difficulty remains visible as its own field so
the list can surface high-value hard work without pretending it is cheap.

External research is bounded and attributed. When researching similar products
or projects, the skill prefers official docs, repositories, project pages, or
primary sources when possible. It summarizes relevant feature sets and keeps
links with the ideas they informed. External products provide context, not
requirements.

Marketing artifact improvements are valid brainstorming output. The skill
should look for README files, product pages, examples, screenshots, install
instructions, and docs that may need updates because of product changes or
because they do not explain the value clearly enough.

## Non-Goals

- No automatic conversion of ideas into backlog plans.
- No activation, execution, or completion of workflow plans.
- No requirement that `brainstorming-skill` be workflow-owned.
- No registry, plugin-package, or global-install behavior.
- No complex project-management database for ideas.
- No silent overwrites or removals of existing `_docs/ideas.md` entries.
- No treating external competitor research as authoritative product direction.
- No requirement for a numeric scoring model in the first version.

## Boundaries And Invariants

- `.agents/` remains package-managed agent process structure.
- `_docs/` remains project-owned documentation.
- Default bundled non-workflow skills live under `aix/skills`.
- `brainstorming-skill` lives under `aix/skills/brainstorming-skill`.
- `_docs/ideas.md` is a working document for prioritized ideas, not an active
  implementation plan.
- `_docs/ideas.md` has approved prioritized ideas at the top and in-flight
  ideas at the bottom.
- Every idea entry records name, summary, difficulty, dependencies, and source
  links when links were used.
- `brainstorming-skill` produces idea candidates and recommendations, not
  implementation authorization.
- `plan-create` remains the path for turning one accepted idea into a backlog
  implementation plan.
- Existing idea entries must be preserved unless the developer explicitly
  agrees to remove or rewrite them.
- Repository and documentation review happens before generating new ideas so
  brainstorming is grounded in current project state.
- Marketing-related artifacts, including README files, are valid sources of
  improvement ideas.
- External research should be source-aware and should not require a connector
  or plugin for the first version.

## Implementation Phases

### Phase 1: Skill contract and idea document shape (status: accepted)

Goal: define the durable behavior of `brainstorming-skill` and the Markdown
format for `_docs/ideas.md`.

Tasks:

- ✅ Add the standalone skill under `aix/skills/brainstorming-skill`.
- ✅ Define the `SKILL.md` front matter, trigger language, and relationship to
      `plan-create`.
- ✅ Specify the `_docs/ideas.md` document format with `Approved prioritized
      ideas` and `In-flight ideas` sections.
- ✅ Define required idea fields: name, summary, difficulty, dependencies, and
      source links when research or project artifacts informed the idea.
- ✅ Define how approved ideas and in-flight ideas are loaded, preserved,
      reprioritized, merged, split, moved, or removed.
- ✅ Define the explicit user confirmation required before writing
      `_docs/ideas.md`.
- ✅ Define the prioritization guidance as value-to-effort, adjusted by
      strategic fit, dependency readiness, risk, and urgency.

Verification:

- Plan review confirms the skill is standalone, under `aix/skills`, and not
  workflow-owned.
- Documentation review confirms the `_docs/ideas.md` format is readable,
  stable, resumable, and compatible with project-owned documentation rules.
- Completed in `aix/skills/brainstorming-skill/SKILL.md`.

### Phase 2: Brainstorming session workflow (status: accepted)

Goal: write the skill instructions for running a useful brainstorming session
from a broad or focused prompt.

Tasks:

- ✅ Describe how the agent should infer and restate the brainstorming focus.
- ✅ Define required repository review steps for docs, plans, source layout,
      marketing artifacts, README files, and existing ideas.
- ✅ Define when and how the agent should perform external research into
      similar products or projects.
- ✅ Define how the agent should identify project gaps, product opportunities,
      stale docs, weak examples, and marketing improvements.
- ✅ Define the in-flight idea list format used during the conversation.
- ✅ Define collaboration rules for reviewing, pruning, merging, splitting,
      moving between sections, and reprioritizing ideas with the developer.
- ✅ Define how source links are collected and attached to individual ideas.
- ✅ Define the final commit step that writes approved and in-flight ideas to
      `_docs/ideas.md`.

Verification:

- Dry-run the skill instructions against at least one unfocused prompt and one
  focused prompt.
- Confirm the dry runs produce an in-flight list before any durable file write.
- Confirm a dry run can preserve an unfinished session in `_docs/ideas.md`.
- Covered by `tests/skill-instructions.test.mjs`, which asserts the durable
  workflow, ideas sections, source links, and `plan-create` handoff.

### Phase 3: Package and activation integration (status: accepted)

Goal: make the skill discoverable and installable through the existing AI
Extensions skill model without coupling it to the workflow lifecycle.

Tasks:

- ✅ Add the skill folder, `SKILL.md`, and supporting files under
      `aix/skills/brainstorming-skill`.
- ✅ Decide whether `brainstorming-skill` should be activated by default during
      `aix init` or remain discoverable like an optional standalone skill.
- ✅ Update bundled skill design docs if the skill becomes a default standalone
      skill.
- ✅ Update source/package fixtures or lockfile expectations if default
      activation changes.
- ✅ Preserve the rule that workflow-owned skills remain limited to the
      lifecycle skills required by `design-plan-execute`.

Verification:

- Targeted tests or fixture checks for skill discovery and default activation,
  depending on the accepted packaging decision.
- `npm run build`.
- Completed as default activation because `aix init` activates standalone
  bundled skills discovered from `aix/skills`.
- Verified with `npm run build`, targeted init/list/package tests, and
  `npm test`.

### Phase 4: Documentation and examples (status: accepted)

Goal: document how developers use the brainstorming skill and how it connects
to later planning.

Tasks:

- ✅ Create `aix/skills/brainstorming-skill/README.md`.
- ✅ Add user-facing examples for unfocused and focused brainstorming prompts.
- ✅ Document the expected `_docs/ideas.md` entry shape, including approved and
      in-flight sections.
- ✅ Document that committing brainstormed ideas requires explicit user
      approval.
- ✅ Document the handoff from an accepted idea to `plan-create`.
- ✅ Document how marketing artifact improvements, including README updates,
      can appear as valid brainstorming ideas.
- ✅ Update the top-level `README.md` bundled skills table to include
      `brainstorming-skill`.
- ✅ Add or update stable design docs if `brainstorming-skill` becomes part of
      the default bundled skill set.

Verification:

- Documentation review for links, terminology, and consistency with workflow
  ownership boundaries.
- Confirm examples do not imply that brainstorming authorizes implementation.
- Confirm the top-level `README.md` bundled skills table links to the new skill
  README.
- Updated `README.md`, `aix/skills/README.md`, and
  `_docs/design/bundled-skills.md`.

### Phase 5: Review and release readiness (status: accepted)

Goal: close the implementation with verification, maintainability review, and
clear residual-risk notes.

Tasks:

- ✅ Run targeted tests for changed skill discovery, init, packaging, or docs
      behavior.
- ✅ Run `npm test` if implementation changes command behavior or fixtures.
- ✅ Run `npm run build`.
- ✅ Run `git diff --check`.
- ✅ Run the maintainability review gate for changed production files.
- ✅ Promote accepted durable behavior into `_docs/design` if the skill becomes
      part of default product behavior.
- ✅ Record any remaining follow-up work around richer idea metadata,
      prioritization, or research depth.

Verification:

- Targeted checks from earlier phases pass.
- Broad verification runs or documented gaps are recorded before completion.
- `npm run build` passed.
- `npm run typecheck` passed.
- `node --test tests/skill-instructions.test.mjs tests/skills.test.mjs tests/init.test.mjs tests/package-smoke.test.mjs` passed.
- `npm test` passed: 124 tests.
- `git diff --check` passed.
- Maintainability scan: new production docs are focused; no new production code
  files were added. Existing large files were not broadened.

## Open Questions / Decisions

- Default activation was accepted and implemented. `aix init` activates
  `brainstorming-skill` by default because standalone bundled skills are
  discovered from `aix/skills`.
- The accepted idea entry format includes source links. Future metadata such as
  dates, owner, status, or priority rationale can be added later if sessions
  show they are useful.
- Dependencies should reference ideas by exact idea name in the first version.
  Number references are too fragile because the approved list is intentionally
  reprioritized.
- Difficulty uses `low`, `medium`, and `high` in the first version.
- Prioritization uses value-to-effort, adjusted by strategic fit, dependency
  readiness, risk, and urgency.
- External research is expected when comparable products or projects can
  improve the session. The skill should keep it bounded and attach links to
  the ideas they informed.

## Risks

- Writing `_docs/ideas.md` too early could make exploratory suggestions look
  like accepted product direction.
- Removing or rewriting existing ideas without explicit acceptance could lose
  project-owned planning context.
- Overly broad external research could slow sessions and distract from the
  current project's actual gaps.
- A heavy scoring model could make the skill feel bureaucratic before the team
  has learned what metadata is useful.
- Default activation during `aix init` changed expected installed skill state;
  fixture, lockfile, package, and documentation expectations were updated and
  verified.
- Source links can go stale. The skill should preserve useful labels so later
  readers still understand why a link was saved.
- Marketing artifact ideas can blur into implementation work. The skill should
  list them as candidates only, then use `plan-create` when the team chooses
  one.

## Completion Checklist

- ✅ Confirm every task and success goal is complete or explicitly deferred.
- ✅ Run or review required targeted and repository verification.
- ✅ Review the codebase using `$code-review-refactor`; refactor or record follow-up work if needed.
- ✅ Promote accepted durable behavior into design docs using `$design-promote`.
- ✅ Review documentation structure, formatting, and links using `$documentation-review`; fix issues or record follow-up work.
- ✅ Record final risks, follow-on work, and documentation impact.
- ✅ Harvest reusable lessons and update workflow guidance when appropriate.
- ✅ Archive under `_docs/plans/completed/YYYY-MM-DD-<name>.md`.
