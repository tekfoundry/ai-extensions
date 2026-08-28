# Create Project Manager Role

## Status

🟨 Active

## Context

The guidance-library work is moving AIX toward focused role and activity
guidance. The current workflow still makes the main agent choose among roles,
skills, activity context, and documentation before work begins. That can burn
tokens, especially when specialist roles are used only for read-only advice and
the main agent later repeats much of the same context gathering.

The developer wants a cleaner request entry model:

- Every meaningful request starts through one thin entry role.
- That role classifies the request, chooses the smallest useful context, and
  selects one primary role for the work.
- Specialist roles do the work and choose the skills they need.
- Skills remain procedures, not primary worker identities.
- Broad fan-out to every plausible role is avoided because agents tend to find
  work even when a domain only loosely applies.

Reviewed context:

- `AGENTS.md`
- `.agents/workflow.md`
- Focused role and activity guidance
- `_docs/README.md`
- `_docs/kb/03-architecture/workflow-lifecycle.md`
- `_docs/plans/workflow-guidance-library.md`
- Thread discussion on 2026-08-28 about `router`, `bootstrapping`,
  `get-guidance`, `delegate-to-role`, role-owned work, and a
  `project-manager` entry role.
- Thread discussion on 2026-08-28 about deferring workflow guidance routing out
  of `_docs/plans/workflow-guidance-library.md` while keeping the optional
  `get-guidance` skill.
- `_docs/plans/workflow-guidance-library.md` built the root AIX
  `get-guidance` skill as a read-only guidance resolver and deferred default
  request-entry routing to this plan.
- Thread discussion on 2026-08-28 about replacing `requesting_role` and
  `requesting_skill` bootstrap variables with an ordered, minimal role list and
  activity list. The project-manager role should resolve guidance for each role
  and delegate in sequence.
- Bounded sidecar review on 2026-08-28 from `technical-architect`,
  `security-engineer`, `quality-engineer`, and `documentation-specialist` for
  phase sequencing, append safety, verification gates, and documentation
  promotion scope.
- Current implemented append behavior is workflow-owned through each
  workflow's `AGENTS.append.md`; AIX does not yet have a global
  `AGENTS.append.md` source for instructions that should apply across
  workflows.

## High-Level Goal (status: accepted)

Create a `project-manager` role that acts as the universal lightweight entry
point for AIX agent requests. The role should bootstrap each request, identify
the ordered and minimal role list, identify the likely activity list and task
context, resolve focused guidance for each role, delegate work in sequence, and
keep delegation narrow enough to avoid role churn.

This matters because the desired operating model is role-centered:

- The project manager decides who should think about the request and in what
  order.
- Each selected role decides how to work.
- Skills provide repeatable procedures.
- Guidance provides focused judgment.

The entry process should help agents start quickly without loading every role,
skill, or guidance file.

## Design Intent (status: accepted)

Add a top-level `project-manager` role with a focused `ROLE.md` contract and a
`GUIDANCE.md` document that defines request routing behavior.

The project-manager role should be thin. It should not become the agent that
does all implementation, documentation, review, and verification work. Its main
job is to decide the first useful path and hand work to the right specialist
role with compact context.

AIX should ship one generic top-level `project-manager` role rather than
requiring workflows to duplicate a full project-manager role. Workflow-specific
behavior should augment the generic project-manager through additional guidance
documents instead of replacing the role. The standard `GUIDANCE.md` document
remains the base guidance file, and packages may provide focused companion
guidance files named with a domain prefix, such as `workflow.GUIDANCE.md`.
Those files remain separate guidance documents. AIX should not append them into
the base `project-manager/GUIDANCE.md` file.

The expected startup flow is:

1. Review the prompt and produce a startup classification:
   - `roles`: ordered list of roles that have material work or review
     responsibility.
   - `activities`: list of activities that apply across the request.
   - `task_context`: compact description of the request, known constraints,
     and expected output.
   - `sequencing_notes`: why the role order matters, when applicable.
2. Review the role list for scope control. The role list is ordered and
   minimal, not exhaustive. It should include only roles with material work or
   review responsibility.
3. For each role in order:
   - Use `get-guidance` or the equivalent guidance-resolution procedure with
     the role and activity list to find the smallest relevant guidance set.
   - Read only the selected entrypoint, role, activity, plan, code, docs, or
     guidance context needed for that delegation.
   - Delegate bounded work or review to the role with the prompt, task context,
     sequencing notes, and guidance list.
   - Let the delegated role choose which skills to use and how to complete the
     work under the supplied guidance.
4. Review returned evidence before continuing to the next role when ordering
   creates a dependency.
5. Aggregate the delegation results into a final user-facing summary that
   covers completed work, evidence, unresolved questions, and follow-up needs.

The preferred routing model is conservative sequencing, not role fan-out. The
project-manager role should select the smallest ordered role list that can
handle the request. It may add another role only when the prompt or returned
evidence shows that role's domain is materially affected.

Each delegated role should receive the original user prompt for intent and
traceability, but the original prompt should not become the role's assignment.
The project-manager role should pass a controlled delegation payload:

- `original_prompt`: the user's original request, preserved for intent and
  traceability.
- `role_assignment`: the specific role receiving the work or review request.
- `bounded_task`: what this role should do, including any explicit non-scope.
- `activities`: activity list selected by the project-manager role.
- `guidance`: focused guidance documents resolved for this role and activity
  set.
- `sequencing_notes`: dependency context from earlier or later roles.
- `return_requirements`: expected evidence, reviewed files or docs, decisions,
  risks, verification notes, and handoff notes.

Delegated roles may use the original prompt to understand user intent, but the
`bounded_task`, supplied guidance, lifecycle rules, and repository instructions
define the role's actual scope. A role must not expand its assignment only
because the original prompt touches an adjacent domain.

Role selection should be evidence-based:

- `implementation-engineer`: code changes, task slicing, active-plan execution,
  likely changed files, implementation sequencing, or verification handoff.
- `documentation-specialist`: durable documentation impact, current-state docs,
  README or workflow-doc updates, design promotion, or index/link ownership.
- `technical-architect`: architecture boundaries, module ownership, runtime
  contracts, package-management behavior, or maintainability tradeoffs.
- `requirements-engineer`: requirements, actors, workflows, constraints,
  non-goals, acceptance signals, or plan-readiness questions.
- `quality-engineer`: verification strategy, regression risk, acceptance
  evidence, manual validation, skipped checks, or residual risk.
- `security-engineer`: trust boundaries, credentials, authorization, local file
  overwrite/delete risk, external systems, package trust, or lockfile integrity.
- `product-designer`: user flows, interaction states, accessibility, terminal
  UX, prompts, recovery paths, or design-system fit.
- `product-strategist`: product value, audience, scope, prioritization,
  sequencing, opportunity cost, or idea maturity.
- `ux-writer`: command help, prompts, labels, errors, onboarding copy, README
  language, workflow instructions, or developer-facing wording.

The role should distinguish between role execution and role review:

- Role execution means the specialist role owns the bounded work and chooses
  which skills to use.
- Role review means the specialist role returns findings, gaps, or verification
  advice without taking over the work.

For very small requests, the project-manager role may answer directly when no
specialist role, workflow state, file inspection, or delegation is needed. If
the request does not belong to the project-manager role's managed team and
cannot be delegated to a suitable role, the project-manager should return a
status summary to the calling context instead of completing the work itself.
The calling context remains responsible for handling work outside the
project-manager role's team.

The `AGENTS.md` integration should stay small and activation-owned. Skills,
roles, and workflows should be able to include an optional `AGENTS.append.md`
file whose content is injected into the project `AGENTS.md` file when that
extension is activated. The project-manager entry instruction should appear
only when the project-manager role is active, through that role's append
content or an equivalent workflow-owned append that activates the role.

This plan should own any activation-owned append behavior needed to make the
entry role reliable across workflows. Append content may come from skills,
roles, or workflows. The plan must define ordering, marker ownership, update
behavior, uninstall behavior, drift checks, and instruction precedence before
implementation. Append content should not blur ownership between skills,
roles, and workflows, and it must not let one extension silently overwrite
another extension's managed instructions.

The append mechanism is part of this plan's design scope, not a separate
follow-up. When implementation phases are drafted, they must include the
storage, activation, update, deactivation, uninstall, verification, and
documentation work needed for optional `AGENTS.append.md` files on supported
extension types.

The project-manager role guidance should not depend on the retired shared
engineering guidance file. Any reusable guardrails needed for entry routing
should live in `project-manager/GUIDANCE.md`, focused companion guidance files
such as `workflow.GUIDANCE.md`, or focused activity guidance.

## Non-Goals

- Do not make the project-manager role a broad executor that performs all work
  itself.
- Do not dispatch every request to every plausible role.
- Do not make every request load every role, skill, or guidance file.
- Do not use the project-manager role to bypass active-plan, backlog,
  verification, security, or documentation lifecycle gates.
- Do not make skills the primary worker identity when a suitable role exists.
- Do not let activation-owned append behavior overwrite, blur, or replace
  instructions owned by another skill, role, or workflow.

## Boundaries And Invariants

- The project-manager role owns request triage, sequencing, delegation choice,
  and scope control.
- Specialist roles own bounded execution or review in their domains.
- Skills remain reusable procedures selected by roles.
- Guidance files must be focused enough to support low-token routing.
- Delegation should use an ordered and minimal role list, not an exhaustive
  list of every plausible specialist.
- Role ordering should preserve dependencies such as requirements before
  architecture, architecture before implementation, and implementation before
  verification when those dependencies apply.
- Delegation payloads should include the original user prompt for intent and
  traceability, but role scope should be governed by the bounded task,
  guidance, lifecycle rules, and repository instructions.
- The parent context remains responsible for final user-facing reporting and
  for preserving worktree safety.
- Backlog work remains unimplemented until explicitly activated.
- Activation-owned append content, if added, must be marker-delimited,
  package-managed, drift-checked, and clearly ordered across skills, roles, and
  workflows.
- Activating, updating, deactivating, or uninstalling an extension must manage
  only that extension's append block and must refuse silent overwrite when a
  managed block has local edits.
- Workflow-owned `AGENTS.append.md` remains the workflow's place for
  workflow-specific lifecycle instructions. Role-owned append content remains
  the role's place for role activation instructions.
- The generic project-manager role should be augmented through separate
  guidance files, not by mutating its base `GUIDANCE.md` file or duplicating
  the full role inside a workflow.

## Implementation Phases

### Phase 1: Define Extension Append Contract (status: accepted)

Goal: replace the workflow-only `AGENTS.md` append implementation with a shared
extension-owned append contract before wiring new lifecycle behavior.

Tasks:

- ⬜️ Inspect current workflow append behavior in `src/workflows/agents-md.ts`,
      workflow install/update/remove paths, lockfile schema, and existing
      workflow append tests.
- ⬜️ Define a shared append block model for skills, roles, and workflows,
      including owner kind, owner name, source, source path, marker, target
      path, source hash, rendered block hash, and installed block hash.
- ⬜️ Define deterministic composition order for managed blocks. Workflow blocks
      should frame role blocks, and role blocks should frame skill blocks,
      with stable ordering inside each extension type.
- ⬜️ Define marker collision behavior. Duplicate managed markers, orphan
      markers, nested managed blocks, malformed managed blocks, and unknown
      owner blocks should fail closed instead of being rewritten silently.
- ⬜️ Extract or replace workflow-specific append helpers with shared helpers
      that can render, find, insert, replace, remove, and verify owned blocks
      without changing unrelated `AGENTS.md` content.
- ⬜️ Add focused tests for shared append rendering, deterministic ordering,
      marker collision refusal, malformed marker refusal, drift refusal,
      missing optional append files, and byte-preserving removal.
- ⬜️ Run targeted append/workflow tests and record verification evidence.

Success criteria:

- AIX has one shared append contract that can represent skill, role, and
  workflow append blocks.
- Existing workflow append behavior still passes through the shared contract.
- Unsafe marker states and local edits fail closed.

### Phase 2: Wire Append Lifecycle Into Extensions (status: accepted)

Goal: make activation, update, deactivation, uninstall, verification, and
status behavior manage optional `AGENTS.append.md` files for all supported
extension types.

Tasks:

- ⬜️ Extend package discovery, parsing, and lockfile handling so skills, roles,
      and workflows may declare or carry optional `AGENTS.append.md` content.
- ⬜️ Wire role activation and update to install or replace only the owned role
      append block when no drift exists.
- ⬜️ Wire role deactivation and removal to remove only the owned role append
      block and preserve surrounding user content byte-for-byte.
- ⬜️ Wire skill activation and update to install or replace only the owned
      skill append block when no drift exists.
- ⬜️ Wire skill deactivation and removal to remove only the owned skill append
      block and preserve surrounding user content byte-for-byte.
- ⬜️ Keep workflow install, update, and uninstall behavior compatible while
      moving it onto the shared append lifecycle.
- ⬜️ Update `aix verify` and `aix status` behavior so missing, changed,
      malformed, duplicate, or conflicting managed append blocks are reported
      clearly.
- ⬜️ Add integration tests that activate a workflow, role, and skill with
      append content into one `AGENTS.md`, then update and remove each owner
      independently.
- ⬜️ Run targeted lifecycle tests for skills, roles, workflows, status, and
      verify; record verification evidence.

Success criteria:

- Skills, roles, and workflows all support optional activation-owned
  `AGENTS.append.md` content.
- Each lifecycle command manages only its own extension's managed block.
- Existing workflow append tests continue to pass.

### Phase 3: Add Bundled Project-Manager Role And Guidance Layering (status: accepted)

Goal: ship a top-level default `project-manager` role with activation-owned
entry instructions, focused routing guidance, and support for separate
companion guidance documents.

Tasks:

- ⬜️ Add bundled role assets under the top-level AIX role source, including
      `ROLE.md`, `GUIDANCE.md`, and `AGENTS.append.md`.
- ⬜️ Write `ROLE.md` so `project-manager` owns request triage, ordered minimal
      role selection, sequencing, scope control, delegation choice, result
      aggregation, and handback when work does not belong to its managed team.
- ⬜️ Write `GUIDANCE.md` so startup classification produces `roles`,
      `activities`, `task_context`, and `sequencing_notes`.
- ⬜️ Define the companion guidance naming contract for additional guidance
      files such as `workflow.GUIDANCE.md`, including package discovery,
      activation behavior, ownership metadata, and conflict behavior.
- ⬜️ Update `get-guidance` discovery so it can find standard `GUIDANCE.md`
      files and additional `<domain>.GUIDANCE.md` files without flattening or
      appending them into the base guidance document.
- ⬜️ Add tests proving `get-guidance` can return matching companion guidance
      for the active workflow and project-manager role while keeping unrelated
      companion guidance out of the result.
- ⬜️ Document that each delegated role receives the original prompt for intent
      and traceability, while `bounded_task`, supplied guidance, lifecycle
      rules, and repository instructions govern scope.
- ⬜️ Document the controlled delegation payload:
      `original_prompt`, `role_assignment`, `bounded_task`, `activities`,
      `guidance`, `sequencing_notes`, and `return_requirements`.
- ⬜️ Document per-role `get-guidance` use. For each selected role,
      `project-manager` calls the existing root AIX `get-guidance` skill with
      that role and the shared activity list, then passes only that role's
      tailored guidance into the delegation payload.
- ⬜️ Document direct-answer limits and the handback rule for work that cannot
      be delegated to a suitable managed role.
- ⬜️ Add tests that confirm bundled project-manager role assets are discoverable
      and activation injects/removes only the project-manager append block.
- ⬜️ Run targeted role activation and package tests; record verification
      evidence.

Success criteria:

- The default top-level `project-manager` role can be activated like other AIX
  roles.
- `AGENTS.md` points to `project-manager` only when the role is active.
- The project-manager role remains a manager and does not become a broad
  executor.
- Additional workflow guidance can augment the generic project-manager without
  duplicating the full role or mutating its base `GUIDANCE.md`.

### Phase 4: Support Workflow Guidance Augmentation And Routing Examples (status: accepted)

Goal: define how workflow-owned guidance augments the generic top-level
project-manager role and provide reviewable examples for routing behavior.

Tasks:

- ⬜️ Define workflow project-manager guidance augmentation behavior, including
      how an active workflow may provide focused guidance such as
      `workflow.GUIDANCE.md` without replacing the top-level project-manager
      role.
- ⬜️ Add tests or fixtures proving workflow guidance augmentation preserves the
      ordered minimal role-list model and does not install unconditional root
      `AGENTS.md` routing.
- ⬜️ Add routing examples for a small informational request, implementation
      request, documentation request, security-sensitive request, mixed
      architecture plus implementation request, and out-of-team request.
- ⬜️ Verify examples show per-role guidance tailoring, no broad role fan-out,
      dependency-preserving role order, controlled delegation payloads, and
      handback behavior.
- ⬜️ Review existing `get-guidance` terminology for `requesting_role` and
      `requesting_skill`; update examples or add compatibility notes if the
      project-manager caller model needs different vocabulary.
- ⬜️ Run targeted role, guidance, and workflow augmentation tests; record
      verification evidence.

Success criteria:

- Workflow guidance augmentation is explicit, tested, and does not weaken the
  default role's safety or lifecycle rules.
- Example prompts make the routing contract testable by human review even
  where behavior is instruction-level rather than code-level.

Closeout, documentation promotion, final security review, code review,
repository-wide verification, human validation, and archive tasks are tracked
only in the Completion Checklist so the plan does not repeat lifecycle gates in
multiple places.

## Accepted Decisions

- AIX should ship one generic top-level `project-manager` role so request entry
  is reliable across projects. Workflows should augment that role through
  workflow-owned guidance, such as `workflow.GUIDANCE.md`, instead of
  duplicating a full project-manager role. Guidance augmentation must preserve
  lifecycle gates and the ordered, minimal role-list model.
- `AGENTS.md` should point to `project-manager` only when the project-manager
  role is active. This should be handled through activation-owned append
  content, not an unconditional root `AGENTS.md` instruction.
- Skills, roles, and workflows should all support optional
  `AGENTS.append.md` content. AIX should compose those blocks as managed,
  marker-delimited content in the project `AGENTS.md` file. Each block must
  remain owned by its source extension, and activation, update, deactivation,
  or uninstall operations must only manage that extension's block. Composition
  order, marker ownership, drift checks, local-edit refusal, and instruction
  precedence must be defined before implementation.
- `get-guidance` should remain a separate root AIX skill. The
  `_docs/plans/workflow-guidance-library.md` plan already built it as a
  read-only guidance resolver. This plan should use that skill from
  `project-manager` rather than duplicating guidance resolution inside
  `project-manager/GUIDANCE.md`.
- `project-manager` should resolve guidance separately for each selected role.
  For each role in the ordered role list, it should call `get-guidance` with
  that role and the shared activity list, then pass only that role's tailored
  guidance set into the delegation payload.
- AIX should support additional guidance documents named
  `<domain>.GUIDANCE.md` alongside the standard `GUIDANCE.md`. The
  `get-guidance` skill should discover those documents and return matching
  companion guidance separately, without appending it into the base
  `GUIDANCE.md`.
- `project-manager` may answer directly only when the request is small,
  informational or conversational, needs no file inspection or edits, touches
  no workflow lifecycle state, and requires no specialist judgment. If the
  request cannot be delegated to a suitable managed role, `project-manager`
  should return status and hand the work back to the calling context rather
  than completing out-of-team work itself.

## Open Questions / Decisions

Resolved.

## Documentation Impact

- Product: Update product workflow language if the role becomes the standard
  way requests enter AIX-assisted work.
- Requirements: Document the entry routing expectations and acceptance signals.
- Architecture: Update workflow lifecycle and roles architecture docs for the
  project-manager entry role, role-first execution model, and any
  activation-owned append behavior.
- Security: Review delegation, local file safety, authorization, and
  instruction-trust implications, including append precedence and
  overwrite protection.
- Quality: Add verification expectations for routing, minimal context,
  delegation behavior, no broad role fan-out, and managed append composition.
- Operations: Update install, workflow update, and release notes if bundled
  role defaults, activation-owned append behavior, or managed `AGENTS.md` text
  change.
- Decisions: Consider a decision record for adopting role-first request
  routing.
- Glossary: Add or update terms for project manager, entry role, startup
  classification, ordered role list, activity list, role execution, and role
  review.

## Product Readiness

- Readiness: Design Intent accepted on 2026-08-28. Open questions are
  resolved, implementation phases are accepted, and the plan was activated on
  2026-08-28.
- Evidence needed: Complete the accepted implementation phases, run required
  verification, promote durable behavior into `_docs/kb`, and finish closeout
  gates before archive.

## Risks

- The project-manager role could become too broad and recreate the context pile
  this work is meant to remove.
- Minimal role routing could miss a specialist role unless ordering and
  escalation rules are clear and evidence-based.
- Always starting through one role could add overhead to simple questions if
  the direct-answer path is too strict.
- Changing `AGENTS.md` entry behavior could affect all future agent work and
  needs careful review.
- Activation-owned append content from skills, roles, and workflows could
  conflict unless ownership, ordering, and uninstall rules are explicit.
- Role-first execution may require updates to existing lifecycle skills so they
  are clearly procedures used by roles rather than standalone worker identities.
- A separate `get-guidance` skill could become another large context source if
  it summarizes guidance instead of resolving the smallest needed files.
- Companion guidance files could become noisy if naming, discovery, and
  matching rules are too loose.

## Security Review

- Status: Planning draft with security-sensitive phase tasks identified.
- Scope reviewed: Initial discussion, accepted design decisions, and bounded
  `security-engineer` sidecar review on 2026-08-28.
- Findings: The role would shape agent routing and delegation behavior, so it
  is instruction-sensitive. Activation-owned append content from skills, roles,
  and workflows would also affect future agent startup instructions. The
  implementation must preserve lifecycle authorization, avoid broad hidden
  delegation, keep file-operation and trust-boundary checks explicit, avoid
  loading unrelated guidance that could alter task behavior, and prevent append
  text from silently overwriting or outranking instructions owned by another
  skill, role, or workflow.
- Blocking findings converted to plan tasks: Phase 1 and Phase 2 include append
  ownership, marker collision refusal, malformed marker refusal, drift checks,
  local-edit refusal, owned-block-only lifecycle behavior, and verification.
  Phase 3 and Phase 4 include delegation-safety and routing-safety tasks.
- Residual risk: Any extension that can inject startup instructions expands the
  instruction-trust surface. The planned mitigations are ownership metadata,
  deterministic precedence, fail-closed parsing, drift refusal, owned-block-only
  lifecycle operations, and lifecycle tests. Security review is required again
  after implementation and before closeout.

## Completion Checklist

- ⬜️ Confirm every task and success goal is complete or explicitly deferred.
- ⬜️ Human validation: developer evaluated the completed phased work and
  accepted it, or explicitly waived manual validation with a recorded reason.
- ⬜️ Run or review required targeted and repository verification.
- ⬜️ Complete Security Review after all implementation phases; record findings,
  convert blocking findings into normal plan tasks, and document residual risk.
- ⬜️ Review the codebase using `$code-review-refactor`; refactor or record
  follow-up work if needed.
- ⬜️ Promote accepted durable behavior into `_docs/kb` using `$design-promote`.
- ⬜️ Review documentation structure, formatting, and links using
  `$review-and-refresh-docs`; fix issues or record follow-up work.
- ⬜️ Record final risks, follow-on work, and documentation impact.
- ⬜️ Harvest reusable lessons and update workflow guidance when appropriate.
- ⬜️ Archive under `_docs/plans/completed/YYYY-MM-DD-<name>.md`.
