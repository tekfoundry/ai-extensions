# Code Review And Refactor Skill

## Status

📝 Planning Draft

This backlog plan is a draft created from the initial request. It does not
authorize implementation until the goal, design intent, phases, and final
backlog plan are accepted and later activated.

## Context

AI Extensions currently ships the `design-plan-execute` workflow with
workflow-owned lifecycle skills such as `plan-create`, `task-execute`,
`design-promote`, and `documentation-review`. Those skills help agents manage
plans and documentation, but codebase-wide maintainability review is useful
outside that workflow too.

The repository also includes `.agents/engineering-best-practices.md`, which
already defines reusable engineering expectations: maintainability first,
clear ownership boundaries, SOLID-oriented design, YAGNI, DRY, module topology
checks, file-size review gates, testing expectations, and refactoring guidance.
A dedicated standalone skill can turn those principles into a repeatable
agent workflow for reviewing a codebase, identifying maintainability issues,
and making or recommending safe refactors.

Reviewed context:

- `AGENTS.md`
- `.agents/workflow.md`
- `.agents/engineering-best-practices.md`
- `_docs/README.md`
- `_docs/design/README.md`
- `_docs/design/overview.md`
- `_docs/design/package-management.md`
- `_docs/design/workflows.md`
- `_docs/design/bundled-skills.md`
- `_docs/plans/backlog/github-skill-discovery-helper.md`

## High-Level Goal (status: draft)

Create a reusable standalone skill for code review and refactoring that is not
owned by the `design-plan-execute` workflow.

The skill should help an agent review the complete codebase for opportunities
to improve maintainability, using `.agents/engineering-best-practices.md` as
the primary standard. It should identify unclear ownership, overly large or
mixed-responsibility files, duplicated logic, weak boundaries, missing tests,
and other issues that make future changes harder.

The skill should support both review-only use and careful refactoring use. It
should not make broad rewrites by default. When refactoring is requested or
authorized, it should work in small, verifiable changes and preserve behavior.

## Design Intent (status: draft)

Add a standalone skill, tentatively named `code-review-refactor`, under the
default `aix` skill source rather than under
`aix/workflows/design-plan-execute/skills`.

The skill should live under:

```text
aix/skills/code-review-refactor/
  SKILL.md
```

It should be discoverable and activatable as an ordinary user-requested skill
from the `aix` source. It should not be workflow-owned, should not be installed
automatically as part of the active workflow, and should remain useful in
projects that do not use the `design-plan-execute` workflow.

The skill should use `.agents/engineering-best-practices.md` when it exists in
the consuming project. If that file is missing, it should fall back to the
repository's available engineering guidance, established local patterns, and
the skill's own review checklist while reporting that the canonical best
practices document was unavailable.

The review workflow should separate diagnosis from edits:

1. Read repository instructions, design docs, package manifests, test
   structure, and source layout.
2. Run or request a file-size and ownership scan using repository-appropriate
   commands.
3. Review high-risk areas for mixed responsibilities, blurred boundaries,
   duplicated rules, brittle tests, hidden side effects, and missing
   verification.
4. Report findings with severity, file references, evidence, and suggested
   refactor direction.
5. Ask for explicit approval before broad refactors, multi-file restructuring,
   or changes that could affect behavior.
6. For authorized refactors, make the smallest behavior-preserving change,
   run targeted verification first, and report residual risk.

The skill should support these modes:

- review-only: produce findings and recommendations without editing files
- focused refactor: apply one approved refactor or cleanup
- review-and-refactor: perform review, select safe low-risk improvements, and
  stop before broader changes that need user approval

The skill should avoid duplicating the existing `task-execute` lifecycle. When
used inside an active plan, it should respect the active plan and update only
the plan task it was asked to handle. When used outside a plan, it should stay
within micro-fix boundaries unless the user explicitly asks for a new plan.

## Non-Goals

- No workflow-owned lifecycle skill in the first version.
- No automatic activation during `aix init` unless separately approved.
- No large automated rewrites without explicit user approval.
- No changes to runtime behavior merely to satisfy style preferences.
- No new static-analysis engine or custom parser unless later evidence shows
  shell and repository-native checks are insufficient.
- No replacement for human architectural judgment.
- No guarantee that every maintainability issue can be found automatically.

## Boundaries And Invariants

- The skill belongs under `aix/skills`, not under the workflow package.
- The skill must preserve user-authored files and unrelated worktree changes.
- Review findings should lead with correctness and maintainability risks, not
  aesthetic preferences.
- Refactors must be behavior-preserving unless the user explicitly approves a
  behavior change.
- The skill should prefer repository-local patterns and existing abstractions
  over introducing new structure.
- Broad reorganizations, dependency changes, public API changes, persistence
  changes, and safety-sensitive file operations require explicit approval.
- Verification must be selected before edits when refactoring is requested.
- Findings should include concrete file references and enough evidence for the
  user to decide whether to proceed.

## Implementation Phases

### Phase 1: Skill Contract And Review Modes (status: draft)

Goal: define the standalone skill's user-facing contract, scope, and operating
modes before authoring the skill file.

Tasks:

- ⬜️ Confirm the skill name, active name, and source location.
- ⬜️ Define review-only, focused-refactor, and review-and-refactor modes.
- ⬜️ Define when the skill may edit files and when it must stop for approval.
- ⬜️ Define the expected finding format, including severity, file reference,
  evidence, recommendation, and verification impact.
- ⬜️ Define how the skill behaves inside an active plan versus outside a plan.

Verification:

- Review against `.agents/engineering-best-practices.md`.
- Review against `_docs/design/bundled-skills.md` and
  `_docs/design/package-management.md` for standalone skill ownership.

Execution notes:

- None yet.

### Phase 2: Skill Authoring (status: draft)

Goal: add the standalone skill instructions and any agent metadata needed for
discovery and activation.

Tasks:

- ⬜️ Create `aix/skills/code-review-refactor/SKILL.md`.
- ⬜️ Add front matter with a clear name and description.
- ⬜️ Encode the review workflow around
  `.agents/engineering-best-practices.md`.
- ⬜️ Include guardrails for preserving unrelated changes and avoiding broad
  rewrites without approval.
- ⬜️ Include concrete review checks for file size, responsibility boundaries,
  duplicated rules, tests, error handling, safety-sensitive behavior, and
  documentation impact.
- ⬜️ Add agent metadata if the default `aix` skill source uses it by then.

Verification:

- Static review of the skill against the accepted contract.
- Confirm the skill does not depend on `design-plan-execute` workflow-only
  paths.

Execution notes:

- None yet.

### Phase 3: Packaging And Discovery Exposure (status: draft)

Goal: ensure the standalone skill is discoverable and installable through the
normal `aix` skill-source path.

Tasks:

- ⬜️ Confirm `aix skills list aix` discovers the new skill.
- ⬜️ Confirm `aix skill activate aix:code-review-refactor` installs it as a
  user-requested skill.
- ⬜️ Confirm activation writes normal skill package and lockfile entries, not
  workflow-owned entries.
- ⬜️ Update bundled-skill documentation if the default `aix` source now
  contains this standalone skill.
- ⬜️ Confirm workflow install, update, and uninstall do not own or remove the
  standalone skill.

Verification:

- Targeted CLI tests for listing and activating the standalone skill.
- Existing activation, status, verify, and workflow tests continue to pass.

Execution notes:

- None yet.

### Phase 4: Review Behavior Validation (status: draft)

Goal: validate that the skill produces useful maintainability findings without
overstepping into unsafe or noisy refactors.

Tasks:

- ⬜️ Add fixture or transcript-style tests for review-only output.
- ⬜️ Test that findings prioritize correctness and maintainability before
  style.
- ⬜️ Test that broad refactors require explicit approval.
- ⬜️ Test fallback behavior when `.agents/engineering-best-practices.md` is
  missing.
- ⬜️ Test usage inside an active plan and outside a plan.

Verification:

- Targeted skill fixture tests or transcript review, depending on available
  test patterns.
- Manual prompt smoke test in a scratch project or controlled fixture.

Execution notes:

- None yet.

### Phase 5: Review, Documentation, And Release Readiness (status: draft)

Goal: close the implementation with maintainability review, docs updates, and
release confidence.

Tasks:

- ⬜️ Run the maintainability review gate for changed production files if any
  production code changes were needed.
- ⬜️ Update `_docs/design/bundled-skills.md` with the accepted standalone
  skill ownership and installation behavior.
- ⬜️ Update README or command examples if the new skill changes the advertised
  bundled skill set.
- ⬜️ Run targeted and repository verification.
- ⬜️ Record residual risks, deferred follow-up, and documentation impact.

Verification:

- `npm run build`.
- `npm test`.
- `git diff --check`.
- Documentation review confirms standalone skill ownership is clear.

Execution notes:

- None yet.

## Open Questions / Decisions

- Should the final skill name be `code-review-refactor`,
  `review-refactor`, or something shorter?
- Should the skill be installed automatically by `aix init`, or should it only
  be discoverable and activatable from the default `aix` skill source?
- Should the first version allow automatic low-risk refactors, or should all
  edits require explicit user approval after the findings list?
- What exact severity vocabulary should findings use?
- Should the skill create a separate review report artifact, update an active
  plan, or only report in chat by default?

## Risks

- A whole-codebase review can become noisy if the skill lists every minor style
  issue instead of prioritizing meaningful maintainability risks.
- A refactor-oriented skill can overstep if it makes broad structural changes
  without a plan or explicit approval.
- File-size thresholds are useful signals but can produce false positives for
  generated files, fixtures, schemas, parsers, or intentionally dense tables.
- Applying generic best practices without reading local design docs could push
  the code away from established repository patterns.
- Review output can become stale quickly if it is written as a persistent
  artifact without a clear owner.
- Activating a standalone skill by default may surprise users who expect only
  workflow lifecycle skills to appear after `aix init`.

## Lessons To Carry Forward

- Reusable engineering guidance is valuable enough to deserve a dedicated
  review skill, but the skill should still defer to repository-specific design
  intent and local patterns.

## Completion Checklist

- ⬜️ Confirm every task and success goal is complete or explicitly deferred.
- ⬜️ Run or review required targeted and repository verification.
- ⬜️ Review the codebase to ensure the code is maintainable and clean; refactor if needed.
- ⬜️ Promote accepted durable behavior into design docs using `$design-promote`.
- ⬜️ Review documentation structure, formatting, and links using `$documentation-review`; fix issues or record follow-up work.
- ⬜️ Record final risks, follow-on work, and documentation impact.
- ⬜️ Harvest reusable lessons and update workflow guidance when appropriate.
- ⬜️ Archive under `_docs/plans/completed/YYYY-MM-DD-<name>.md`.
