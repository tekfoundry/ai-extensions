# Create Project Manager Role

## Status

📝 Planning Draft

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
- `.agents/engineering-best-practices.md`
- `_docs/README.md`
- `_docs/kb/03-architecture/workflow-lifecycle.md`
- `_docs/plans/workflow-guidance-library.md`
- Thread discussion on 2026-08-28 about `router`, `bootstrapping`,
  `get-guidance`, `delegate-to-role`, role-owned work, and a
  `project-manager` entry role.
- Thread discussion on 2026-08-28 about deferring workflow guidance routing out
  of `_docs/plans/workflow-guidance-library.md` while keeping the optional
  `get-guidance` skill.
- Thread discussion on 2026-08-28 about replacing `requesting_role` and
  `requesting_skill` bootstrap variables with an ordered, minimal role list and
  activity list. The project-manager role should resolve guidance for each role
  and delegate in sequence.
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

## Design Intent (status: draft)

Add a top-level `project-manager` role with a focused `ROLE.md` contract and a
`GUIDANCE.md` document that defines request routing behavior.

The project-manager role should be thin. It should not become the agent that
does all implementation, documentation, review, and verification work. Its main
job is to decide the first useful path and hand work to the right specialist
role with compact context.

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
specialist role, workflow state, file inspection, or delegation is needed.

The `AGENTS.md` integration should stay small. The likely future shape is a
short instruction such as: start each request through the active
`project-manager` role, which resolves the smallest useful context and
delegation path before work begins.

This plan should own any global AIX `AGENTS.append.md` behavior needed to make
the entry role reliable across workflows. A global append source would be for
AIX-level request-entry instructions, such as how to find the active
`project-manager` role, when to answer directly, and how to preserve workflow
lifecycle gates. It should not replace workflow-owned `AGENTS.append.md`
content. If both global AIX append content and workflow append content are
installed, the plan must define ordering, marker ownership, update behavior,
uninstall behavior, drift checks, and instruction precedence before
implementation.

The project-manager role guidance should not depend on
`.agents/engineering-best-practices.md`. Any reusable guardrails needed for
entry routing should live in `project-manager/GUIDANCE.md` or focused activity
guidance.

## Non-Goals

- Do not make the project-manager role a broad executor that performs all work
  itself.
- Do not dispatch every request to every plausible role.
- Do not make every request load every role, skill, or guidance file.
- Do not use the project-manager role to bypass active-plan, backlog,
  verification, security, or documentation lifecycle gates.
- Do not make skills the primary worker identity when a suitable role exists.
- Do not let global AIX append behavior overwrite, blur, or replace
  workflow-owned append instructions.

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
- Global AIX append content, if added, must be marker-delimited,
  package-managed, drift-checked, and clearly ordered relative to
  workflow-owned append content.
- Workflow-owned `AGENTS.append.md` remains the workflow's place for
  workflow-specific lifecycle instructions.

## Implementation Phases

Not drafted until Design Intent is accepted.

## Open Questions / Decisions

- Should `project-manager` be bundled as a top-level AIX role, a
  workflow-owned role, or both?
- Should `AGENTS.md` always point to `project-manager`, or should the workflow
  append point to it only when the role is active?
- Should AIX add a global `AGENTS.append.md` source for cross-workflow
  request-entry behavior, and how should it compose with workflow-owned
  `AGENTS.append.md` blocks?
- Should `get-guidance` be a separate skill, or should the first version use a
  guidance-resolution section inside `project-manager/GUIDANCE.md`?
- Should `get-guidance` return separate guidance sets per role, or a shared
  guidance set annotated by role relevance?
- When can `project-manager` answer directly instead of delegating?

## Documentation Impact

- Product: Update product workflow language if the role becomes the standard
  way requests enter AIX-assisted work.
- Requirements: Document the entry routing expectations and acceptance signals.
- Architecture: Update workflow lifecycle and roles architecture docs for the
  project-manager entry role, role-first execution model, and any global
  AIX append behavior.
- Security: Review delegation, local file safety, authorization, and
  instruction-trust implications, including global append precedence and
  overwrite protection.
- Quality: Add verification expectations for routing, minimal context,
  delegation behavior, no broad role fan-out, and managed append composition.
- Operations: Update install, workflow update, and release notes if bundled
  role defaults, global append behavior, or managed `AGENTS.md` text change.
- Decisions: Consider a decision record for adopting role-first request
  routing.
- Glossary: Add or update terms for project manager, entry role, startup
  classification, ordered role list, activity list, role execution, and role
  review.

## Product Readiness

- Readiness: Planning draft.
- Evidence needed: Developer review and acceptance of Design Intent before
  phases and tasks are generated.

## Risks

- The project-manager role could become too broad and recreate the context pile
  this work is meant to remove.
- Minimal role routing could miss a specialist role unless ordering and
  escalation rules are clear and evidence-based.
- Always starting through one role could add overhead to simple questions if
  the direct-answer path is too strict.
- Changing `AGENTS.md` entry behavior could affect all future agent work and
  needs careful review.
- A global AIX append source could conflict with workflow-owned
  `AGENTS.append.md` behavior unless ownership, ordering, and uninstall rules
  are explicit.
- Role-first execution may require updates to existing lifecycle skills so they
  are clearly procedures used by roles rather than standalone worker identities.
- A separate `get-guidance` skill could become another large context source if
  it summarizes guidance instead of resolving the smallest needed files.

## Security Review

- Status: Planning draft.
- Scope reviewed: Initial discussion only.
- Findings: The role would shape agent routing and delegation behavior, so it
  is instruction-sensitive. Any global AIX append behavior would also affect
  future agent startup instructions. The implementation must preserve lifecycle
  authorization, avoid broad hidden delegation, keep file-operation and
  trust-boundary checks explicit, avoid loading unrelated guidance that could
  alter task behavior, and prevent global append text from silently
  overwriting or outranking workflow-owned instructions.
- Blocking findings converted to plan tasks: Not drafted yet.
- Residual risk: Security review is required after Design Intent acceptance and
  before implementation phases are approved.

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
