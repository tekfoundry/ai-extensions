# Code Review And Refactor Skill

## Status

💤 Backlog

This backlog plan is fully approved for later activation. It does not authorize
implementation until a later explicit `plan-activate` request.

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

## High-Level Goal (status: accepted)

Create a reusable standalone skill for code review and refactoring that is not
owned by the `design-plan-execute` workflow.

The skill should help an agent review the complete codebase for opportunities
to improve maintainability, using `.agents/engineering-best-practices.md` as
the primary standard. It should identify unclear ownership, overly large or
mixed-responsibility files, duplicated logic, weak boundaries, missing tests,
and other issues that make future changes harder.

The skill should support broad review and developer-approved refactoring. It
should not make rewrites directly from the recommendation list. When the
developer selects substantial refactoring work, the skill should organize the
work through the normal plan approval and execution lifecycle before code
changes begin.

## Design Intent (status: accepted)

Add a standalone skill, tentatively named `code-review-refactor`, under the
default `aix` skill source rather than under
`aix/workflows/design-plan-execute/skills`.

The skill should live under:

```text
aix/skills/code-review-refactor/
  SKILL.md
```

It should be discoverable and activatable as an ordinary user-requested skill
from the `aix` source. It should also be installed as part of the default
`aix init` payload. It should not be workflow-owned and should remain useful in
projects that do not use the `design-plan-execute` workflow.

The skill must run a pre-flight check for
`.agents/engineering-best-practices.md` before reviewing code. That file is
project-editable and is the authoritative review and refactor standard for the
current repository. The skill should read it fresh each time, follow its
guidance as written, and avoid hard-coding assumptions about what guidance it
contains.

If `.agents/engineering-best-practices.md` is missing, the skill should stop
before reviewing code. It should tell the developer that the required
engineering best-practices document is missing and explain that the file is
expected to describe the project's review and refactor standards, including
the code-quality, ownership, testing, safety, and verification guidance the
developer wants agents to follow.

The review and refactor scope is limited to project code files. The skill
should exclude documentation, workflow/process files, generated artifacts,
package-manager state, and other non-code areas unless the developer explicitly
asks for a different scope. Excluded paths include `_docs/`, `.agents/`, and
similar non-code directories.

The default workflow is iterative and developer-directed:

1. Review the in-scope project code.
2. Provide an enumerated list of refactor recommendations.
3. Let the developer choose which refactor to complete.
4. Create a new plan to capture the selected refactoring work when the work is
   outside the scope of an active plan.
5. Review the plan with the developer and get full approval before
   implementation.
6. After approval, move the plan into the in-progress plans directory.
7. Execute the review and refactor plan through its approved phases and tasks.
8. Let the developer cancel the process at any time.

Each recommendation should include severity, file references, evidence, the
recommended refactor direction, and the expected verification impact. The skill
should not choose broad refactors on the developer's behalf. When the developer
selects substantial refactoring work, the skill should organize that work into
a plan with phases, tasks, risks, and verification steps before implementation
begins.

If the review runs inside an active plan, the skill should record
recommendations and selected work in that plan instead of creating a separate
plan. If the review runs outside an active plan, the selected refactor should
move through backlog planning, developer approval, activation into the
in-progress plans directory, and plan execution before code changes begin.

## Non-Goals

- No workflow ownership for the default-init skill.
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

### Phase 1: Skill Contract And Review Flow (status: accepted)

Goal: define the standalone skill's user-facing contract, scope, and operating
review-to-plan flow before authoring the skill file.

Tasks:

- ⬜️ Confirm the skill name, active name, and source location.
- ⬜️ Define the review, recommendation, developer selection, plan approval,
      activation, and execution flow.
- ⬜️ Define when the skill may edit files and when it must create or update a
      plan before implementation.
- ⬜️ Define the expected finding format, including severity, file reference,
  evidence, recommendation, and verification impact.
- ⬜️ Define how the skill behaves inside an active plan versus outside a plan.

Verification:

- Review against `.agents/engineering-best-practices.md`.
- Review against `_docs/design/bundled-skills.md` and
  `_docs/design/package-management.md` for standalone skill ownership.

Execution notes:

- None yet.

### Phase 2: Skill Authoring (status: accepted)

Goal: add the standalone skill instructions and any agent metadata needed for
discovery and activation.

Tasks:

- ⬜️ Create `aix/skills/code-review-refactor/SKILL.md`.
- ⬜️ Add front matter with a clear name and description.
- ⬜️ Encode the review workflow around
  `.agents/engineering-best-practices.md`.
- ⬜️ Include a pre-flight check that stops before code review when
  `.agents/engineering-best-practices.md` is missing.
- ⬜️ Include guardrails for preserving unrelated changes, scoping review to
  project code files, and routing substantial refactors through plan approval.
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

### Phase 3: Packaging And Default Init Exposure (status: accepted)

Goal: ensure the standalone skill is discoverable through the normal `aix`
skill-source path and installed as part of the default `aix init` payload.

Tasks:

- ⬜️ Confirm `aix skills list aix` discovers the new skill.
- ⬜️ Confirm `aix skill activate aix/code-review-refactor` installs it as a
  user-requested skill.
- ⬜️ Confirm `aix init` installs the skill as part of the default init payload.
- ⬜️ Confirm activation and init write normal standalone skill package and
  lockfile entries, not workflow-owned entries.
- ⬜️ Update bundled-skill documentation for the default `aix` source and init
  payload.
- ⬜️ Confirm workflow install, update, and uninstall do not own or remove the
  standalone skill.

Verification:

- Targeted CLI tests for listing, activating, and default-init installing the
  standalone skill.
- Existing activation, status, verify, and workflow tests continue to pass.

Execution notes:

- None yet.

### Phase 4: Review Behavior Validation (status: accepted)

Goal: validate that the skill produces useful maintainability findings without
overstepping into unsafe or noisy refactors.

Tasks:

- ⬜️ Add fixture, static instruction, or transcript-style tests for review
  output.
- ⬜️ Test that findings prioritize correctness and maintainability before
  style.
- ⬜️ Test that substantial refactors require plan creation or active-plan
  updates before implementation.
- ⬜️ Test missing `.agents/engineering-best-practices.md` pre-flight behavior.
- ⬜️ Test usage inside an active plan and outside a plan.

Verification:

- Targeted skill fixture tests or transcript review, depending on available
  test patterns.
- Manual prompt smoke test in a scratch project or controlled fixture.

Execution notes:

- None yet.

### Phase 5: Review, Documentation, And Release Readiness (status: accepted)

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

None. Accepted decisions:

- The skill name is `code-review-refactor`.
- The skill is installed as part of the default `aix init` payload.
- The skill is standalone and not workflow-owned.
- Refactors require developer selection from the recommendation list.
- Substantial refactors run through plan approval and execution before code
  changes begin.

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
- Installing a standalone skill by default changes the init payload, so
  documentation and tests must make the ownership model clear.

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
