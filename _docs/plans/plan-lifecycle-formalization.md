# Plan Lifecycle Formalization

## Status

🟨 Active

Human activation approved by Boss. Implementation may proceed through the
accepted phases and tasks. Task execution must follow the ownership, gate,
status-transition, evidence, and Boss-collaboration rules defined in this plan.

## Context

The design-plan-execute workflow already uses plans as the durable record of
project direction, design intent, implementation phases, task status,
verification evidence, risks, and closeout. In practice, the plan is being
shaped throughout Design, Plan, and Execute, but those responsibilities and
transitions are not yet formalized consistently.

The workflow also needs a clear task lifecycle. A task should not appear
completed before work begins or remain ambiguously active after implementation.
The plan should show when work is intentionally started, what evidence was
produced, and when the task was completed.

## High-Level Goal (status: accepted)

Formalize how plans are created and evolved through the Design, Plan, and
Execute workflow so that:

- Design records the direction, vision, design intent, boundaries, tradeoffs,
  and acceptance signals.
- Plan turns accepted design intent into ordered incremental phases and concrete
  tasks, with dependencies, verification expectations, and risks.
- Execute keeps the plan as the authoritative implementation record while work
  proceeds.
- Every task has an explicit lifecycle transition: mark it in progress before
  work starts, perform and verify the work, then mark it complete with evidence.

This should make plan state legible to the developer, project manager,
delegated roles, and future maintainers without adding unnecessary ceremony.

## Design Intent (status: accepted)

The plan should be a living artifact whose sections become more precise at
specific workflow gates rather than being filled speculatively at creation
 time.

Initial intended responsibilities:

- **Design:** establish the accepted problem, audience, value, scope,
  non-goals, boundaries, invariants, and design direction. Do not draft
  implementation tasks against unresolved intent.
- **Plan:** decompose accepted design intent into ordered phases and concrete
  tasks. Define task dependencies, ownership, expected files or boundaries,
  verification, documentation impact, risks, and phase completion criteria.
- **Execute:** update the task marker to `🟨` before beginning work, record the
  task's implementation and verification evidence, then update it to `✅` only
  after the task's acceptance conditions pass. Blocked work should use `⚠️`
  with a reason and next action rather than being silently left active.
- **Closeout:** confirm all tasks and success goals, preserve evidence and
  residual risks, promote accepted durable behavior, refresh documentation,
  and archive the completed plan.

The final design should decide whether task state is represented only by the
existing markers (`⬜️`, `🟨`, `✅`, `⚠️`) or whether a more explicit task schema
is needed. It should preserve readable Markdown and remain compatible with
human editing and delegated execution.

### Proposed Section Ownership Model

Each plan section should have one accountable owner role. Collaborators may
provide input or draft changes, but the accountable owner performs the final
review, resolves conflicting suggestions, and confirms that the section is
current before a gate or closeout transition.

| Plan section | Accountable owner | Typical collaborators |
| --- | --- | --- |
| Status and lifecycle state | `project-manager` | All active roles; developer for activation and acceptance |
| Context | `product-owner` | `requirements-engineer`, `technical-architect`, `project-manager` |
| High-Level Goal | `product-owner` | `requirements-engineer`, developer |
| Design Intent | `product-owner` | `requirements-engineer`, `technical-architect`, `security-engineer`, `quality-engineer` |
| Non-Goals | `product-owner` | `requirements-engineer`, `technical-architect` |
| Boundaries and Invariants | `technical-architect` | `security-engineer`, `requirements-engineer`, `quality-engineer` |
| Implementation Phases | `project-manager` | `technical-architect`, `requirements-engineer`, `implementation-engineer`, `quality-engineer` delegated to propose and shape phases |
| Phase status and acceptance | `project-manager` | Phase contributors, `quality-engineer`, `security-engineer`, developer when human approval is required |
| Task status and execution report | `project-manager` for authoritative plan state; assigned task owner for status, evidence, and completion report | `quality-engineer` for evidence review; relevant specialist collaborators |
| Task scope and acceptance conditions | `project-manager` for plan acceptance; assigned task owner for execution interpretation | `requirements-engineer`, `implementation-engineer`, `quality-engineer` |
| Open Questions / Decisions | `project-manager` | `product-owner`, `technical-architect`, `requirements-engineer`, developer |
| Documentation Impact | `documentation-specialist` | `project-manager`, affected specialist roles |
| Product Readiness | `product-owner` | `release-engineer`, `quality-engineer`, developer |
| Operator Closeout Summary | `project-manager` | `quality-engineer`, `security-engineer`, `documentation-specialist` |
| Risks | `project-manager` | `security-engineer`, `quality-engineer`, `technical-architect`, affected owners |
| Security Review | `security-engineer` | `technical-architect`, `quality-engineer`, `project-manager` |
| Lessons To Carry Forward | `project-manager` | Any role contributing reusable lessons |
| Completion Checklist | `project-manager` | `quality-engineer`, `security-engineer`, `documentation-specialist`, developer |

This model distinguishes accountability from authorship and reporting:
collaborators may make bounded edits or recommendations; delegated phase
contributors may propose sequencing and task boundaries; the assigned task owner
reports task state and evidence; and the project-manager reconciles the
authoritative plan state and accepts the phase/task record before the plan
advances.

### Proposed Workflow Artifact Placement

The accountability model should be distributed by responsibility rather than
copied into every document:

- `team.md` is the canonical workflow-team contract for section ownership,
  role accountability, allowed plan write domains, collaboration boundaries,
  and machine-readable ownership metadata consumed by the project-manager.
- `.agents/workflow.md` defines the lifecycle rules: design and plan gates,
  task transitions, who may change state, required evidence, reconciliation,
  and closeout authority.
- The workflow `plan.md` template renders an accountable owner for each major
  section and task, making ownership visible in the project-owned plan.
- Each role's `ROLE.md`/`GUIDANCE.md` states that role's specific planning
  obligations and evidence expectations, while referring to `team.md` rather
  than duplicating the complete ownership matrix.

This keeps `team.md` authoritative for “who owns what,” the workflow contract
authoritative for “how state changes,” and the plan template authoritative for
“what the current plan says.” The final design must define how disagreements,
unavailable roles, delegated drafting, and ownership changes are recorded.

### Accepted Delegation Handoff And Conflict-Resolution Contract

The project-manager owns the authoritative plan and delegates bounded phase
drafting with a handoff record containing the plan and phase identifiers,
section owner, assigned contributor or run ID, accepted constraints, expected
outputs, and evidence requirements. A delegated contributor may propose phase
sequencing, task boundaries, verification expectations, and unresolved
questions, but may not change accepted intent, phase or gate status, unrelated
sections, or Phase 2+ mechanics while this Phase 1 contract is being defined.
The project-manager reconciles the proposal into the owned phase section.

The assigned task owner owns the task report: mark the task `🟨` before work,
then report `✅` or `⚠️` with the status transition, timestamp, files or
artifacts, commands and results, verification outcome, documentation impact,
and residual risks. Updates are limited to that assigned task's localized
status and evidence. The quality-engineer validates the evidence, records the
validation result and timestamp, and identifies gaps or recommends a blocked
outcome; validation does not expand scope, rewrite accepted intent, or waive
material risk.

The project-manager performs reconciliation by comparing the delegated report
and validation against task scope, dependencies, and accepted decisions, then
records authoritative phase/task state. Overlapping or stale edits fail closed:
the project-manager preserves the conflicting inputs, requests clarification or
records a bounded decision, and records actor, timestamp, affected task/phase,
conflict, resolution, and evidence reference. Conflicts that change accepted
scope/design, cross a safety boundary, accept material residual risk, or require
a human approval gate escalate to Boss. An unavailable contributor or changed
assignment is recorded as a new assignment with rationale; it does not grant
broader write authority. This is a planning/documentation contract only and
does not implement runtime transitions, triggers, scheduling, or Phase 2+ flow.

### Proposed Lifecycle Gate Model

The gate model should be explicit and visible in the workflow contract, with
acceptance recorded inline on the relevant plan section or phase heading:

1. **Routing gate:** classify the request as backlog planning, active-plan work,
   or a micro-fix; select the project-manager path and relevant roles.
2. **Vision gate:** `Context` and `High-Level Goal` are clear, with product
   intent and scope accepted by the developer and product owner.
3. **Design-intent gate:** requirements, boundaries, invariants, tradeoffs,
   safety posture, and verification direction are reviewed and accepted.
4. **Plan gate:** only after Design Intent is accepted, ordered phases, tasks,
   dependencies, success goals, and evidence expectations are drafted and
   accepted.
5. **Activation gate:** a completed backlog plan moves into active implementation
   only through explicit developer authorization.
6. **Task-start gate:** the accountable task owner changes the task from `⬜️`
   to `🟨` before implementation or delegated execution begins.
7. **Task-completion gate:** the owner records implementation and verification
   evidence before changing the task to `✅`; blocked or incomplete work uses
   `⚠️` with a reason and next action.
8. **Phase-close gate:** all phase tasks, success goals, verification, and the
   final `Review & Refactor` task are complete or have an explicit recorded
   follow-on risk before the phase is accepted.
9. **Plan-close gate:** human validation, security review, quality evidence,
   design promotion, documentation refresh, final risks, and completion
   checklist are complete before archival.

The final design should identify one accountable owner for each gate, the
required collaborators, the exact acceptance signal, and the authoritative
location for that gate. Existing rules in `plan-create/SKILL.md`,
`.agents/workflow.md`, and the `plan.md` template should be reconciled rather
than duplicated inconsistently.

### Proposed Gate Authority Classes

Not every gate should pause execution for human approval:

**Human approval gates — pause for explicit Boss approval:**

- Vision and High-Level Goal acceptance
- Design Intent acceptance
- Final plan and phase/task sequencing acceptance before activation
- Explicit backlog activation into implementation
- Final plan closeout and archival acceptance after human validation

These gates should record the approving human, date, decision, and any scope
or risk conditions inline in the plan. An agent must not infer approval from
conversation momentum, passing tests, or a delegated role's recommendation.

**Agent-controlled gates — advance from evidence without an automatic pause:**

- Request routing and work-mode classification
- Role/section ownership checks
- Task start transition to `🟨`
- Task verification and transition to `✅` or `⚠️`
- Dependency and sequencing checks
- Security, quality, documentation, and release-readiness evidence collection
- Phase completion checks when the accepted scope and success criteria are
  unchanged

An agent-controlled gate must escalate to a human approval gate when it would
change accepted design intent, expand scope, waive a safety or quality finding,
accept material residual risk, activate a backlog plan, publish externally, or
close the plan. The final design should define machine-readable evidence for
agent-controlled gates and a durable approval record for human gates.

### Proposed Trigger and Routing Model

The workflow should recognize both natural-language intent and a small set of
canonical trigger phrases. Triggers select a procedure or specialist; they do
not grant authority or bypass a gate.

| Intent | Example triggers | Likely procedure or role |
| --- | --- | --- |
| Explore direction | “brainstorm”, “explore ideas”, “what should we build?” | `brainstorming-skill`, `product-owner` |
| Clarify vision | “define the goal”, “capture the why”, “set scope” | `product-owner`, `requirements-engineer` |
| Shape design | “design intent”, “define boundaries”, “design this” | `requirements-engineer`, `technical-architect`, `security-engineer` |
| Build the plan | “plan phases”, “break into tasks”, “sequence the work” | `plan-create`, `project-manager`, `implementation-engineer` |
| Review the plan | “review this plan”, “plan readiness” | `plan-review`, `requirements-engineer`, `quality-engineer` |
| Activate work | “activate this plan”, “start implementation” | `plan-activate` after human approval |
| Execute work | “execute Phase 1”, “start this task”, “work on task” | `plan-execute`, `phase-execute`, `task-execute` |
| Verify work | “verify the work”, “run the quality gate” | `work-verify`, `quality-engineer` |
| Review/refactor | “review and refactor”, “maintainability review” | `code-review-refactor`, `implementation-engineer` |
| Update durable docs | “promote the design”, “refresh the KB” | `design-promote`, `review-and-refresh-docs` |
| Close the plan | “complete the plan”, “close out”, “archive” | `plan-complete` after human approval |

Canonical triggers should be documented as aliases and remain optional when
natural-language intent is unambiguous. Routing should prefer the narrowest
matching procedure, preserve the current plan and phase context, and ask for
clarification when multiple procedures match. Approval phrases such as
“approve the design intent,” “activate this plan,” and “approve closeout” must
be handled separately from descriptive phrases such as “the design looks
ready.”

The final design should define trigger precedence, aliases, ambiguity handling,
context preservation, and whether explicit slash commands or object-verb
commands are needed for deterministic automation.

#### Compact Task Assignment Metadata

Task records should remain readable while retaining execution accountability:

- `owner`: accountable workflow role, such as `implementation-engineer`.
- `assigned`: concrete execution actor or subagent run ID, such as
  `subagent-123`; this identifies the worker for the current execution and does
  not replace the role owner.
- `completed-at`: timestamp for the completion transition when the task reaches
  `✅`.

Show `owner` on tasks by default. Show `assigned` while a task is delegated or
in progress, and retain `completed-at` with the completion evidence. Keep
verbose handoff packets, prompts, and correlation details in the execution
record rather than repeating them in every task line.

Design Intent accepted by Boss. Phase decomposition and task sequencing may now
be drafted for review; implementation remains unauthorized until the backlog
plan is fully accepted and explicitly activated.

### Agent-Operational Documentation Requirements

The formalized workflow must be optimized for agent consumption while remaining
readable to humans. Normative instructions should use direct, unambiguous
language and distinguish required behavior from examples or recommendations.
Each lifecycle step, gate, section, and task contract should make the following
fields discoverable:

- **Purpose:** what the step accomplishes and why it exists.
- **Owner:** the accountable role and whether the owner reports, reviews, or
  authorizes the result.
- **Collaborators:** roles that may be delegated bounded input or execution.
- **Entry conditions:** accepted decisions, plan state, dependencies, and
  required context before starting.
- **Actions:** the ordered behavior the agent should perform.
- **Outputs:** plan sections, task markers, evidence, artifacts, or decisions
  that must be produced.
- **Gate authority:** whether the step advances automatically or requires Boss
  approval, including the exact approval signal.
- **Escalation:** conditions that require clarification, a different role, a
  blocked marker, or human review.
- **Exit criteria:** the evidence required before the step or task can close.

Role routing should be explicit enough for an agent to select a role from
`team.md` without guessing. Markdown remains the durable representation, but
stable headings, tables, status markers, and machine-readable metadata should
be used where they improve reliable parsing and delegation. Examples must not
be mistaken for authority, acceptance, or permission to implement.

### Boss–Team Two-Way Collaboration Model

The workflow should treat the human decision principal, Boss, and the workflow
team as collaborative participants. The team contributes specialist judgment,
asks focused questions, exposes tradeoffs, and requests missing context; Boss
provides vision, decisions, constraints, approvals, and corrections. The team
must not silently guess when Boss input is material to product intent, scope,
safety, acceptance, or a human approval gate.

Agent questions should be classified so the workflow can respond correctly:

- **Clarification request:** missing factual or contextual information needed
  to continue safely; may pause only the affected task.
- **Expert recommendation:** a role presents options, tradeoffs, and a proposed
  direction for Boss consideration; it does not imply approval.
- **Decision request:** the team needs Boss to choose among materially
  different options or resolve conflicting expert advice.
- **Approval request:** an explicit human gate is ready for Boss review and
  approval or rejection.
- **Status update:** evidence or progress is reported without requiring a
  response unless a stated escalation condition is present.

Each question or request should identify the asking role, affected plan
section/task, context, why the answer matters, options or recommendation when
available, blocking impact, and the response expected from Boss. When a human
approval is recorded, include an approval ID, approver name, optional actor ID,
timestamp, decision, and scope conditions. Boss responses
that affect direction, scope, design, acceptance, or risk must be recorded in
the plan as a decision or approval rather than left only in conversation
history.

The team may continue independent, already-authorized work while awaiting a
response when the unanswered question does not affect that work. It must pause
or mark the affected task blocked when proceeding would require guessing,
change accepted intent, waive a safety or quality boundary, or cross a human
approval gate. The project-manager coordinates question routing and prevents
multiple roles from asking duplicate or conflicting questions.

Boss collaboration is a first-class workflow output: plans should show not
only what the team decided, but also what it asked Boss, what Boss answered,
which role incorporated the answer, and what work was unblocked or changed as a
result.

#### Decision-Request Protocol

When a role needs Boss to resolve an open question, it should use a structured
request containing:

1. **Decision needed:** the precise choice or clarification requested.
2. **Why it matters:** the affected goal, design, task, risk, or gate.
3. **Options:** the reasonable alternatives and their tradeoffs.
4. **Recommendation:** the asking role's preferred option and rationale.
5. **Impact if unresolved:** whether work can continue, must pause, or can
   proceed independently.
6. **Boss response:** the selected option, correction, approval, or rejection.
7. **Plan update:** the section, task, phase, or decision record changed as a
   result, including the responsible role and evidence.

The Open Questions / Decisions section is the durable home for these records.
Structured IDs and local references should connect a decision request to the
affected section or task without duplicating the full conversation.

## Non-Goals

- Implementing a new project-management application or external task tracker.
- Replacing the existing Design, Plan, and Execute workflow with a different
  lifecycle.
- Authorizing implementation of this plan before explicit activation.
- Adding host-specific automation or unrestricted project-manager authority.
- Requiring verbose status updates when a concise plan marker and evidence are
  sufficient.

## Boundaries And Invariants

- Backlog planning does not authorize implementation; explicit activation is
  required before changes to workflow behavior or managed assets.
- Design intent must be accepted before implementation phases and task lists
  are treated as authoritative.
- A task cannot be marked complete before its implementation and verification
  evidence exist.
- A task must be marked in progress before delegated or direct implementation
  begins.
- Blocked, deferred, skipped, and superseded work must remain distinguishable
  from completed work.
- The plan remains the authoritative lifecycle record; chat output alone is not
  sufficient evidence.
- Status changes must preserve unrelated plan content and user edits.
- Task transitions must identify the responsible role or actor and relevant
  evidence when the workflow requires that detail.

## Implementation Phases

### Phase 1: Establish the Agent-Readable Ownership Contract (status: accepted)

**Objective:** make role accountability and plan-section ownership explicit in
the workflow team contract and plan template without changing execution
behavior yet.

**Tasks:**

- ✅ Update `team.md` with canonical accountable owners, collaborators, plan
  write domains, and machine-readable planning responsibilities for each
  section and gate. **Owner:** `technical-architect`; **assigned:**
  `technical-architect`; **collaborators:** `project-manager`,
  `requirements-engineer`, `documentation-specialist`; **completed-at:**
  `2026-09-06T15:01:22Z`; **evidence:** added and parsed the canonical
  machine-readable contract (18 section owners, 9 gate owners), then passed
  focused structural validation and `git diff --check`.
- ✅ Update the plan template with visible section-owner fields, task-owner
  fields, collaborator fields, and stable agent-readable headings/metadata.
  **Owner:** `documentation-specialist`; **collaborators:** `project-manager`,
  `technical-architect`; **completed-at:** `2026-09-06T15:03:40Z`;
  **evidence:** updated `templates/plan.md`, `templates/sections/phase.md`, and
  `templates/sections/task.md` with stable owner/collaborator labels plus
  conditional assignment, validation, completion timestamp, evidence, and
  metadata fields; ran template/link/diff checks and `git diff --check`.
- ✅ Update role guidance so each planning role states its section obligations,
  allowed plan edits, required evidence, and final-review responsibility.
  **Owner:** `project-manager`; **collaborators:** all affected role owners;
  **assigned:** `project-manager`; **started-at:** `2026-09-06T15:10:00Z`;
  **completed-at:** `2026-09-06T15:18:00Z`; **evidence:** added a `Planning
  contract` to all 22 workflow and project-manager ROLE.md/GUIDANCE.md source
  assets, covering section obligations, bounded edits, evidence, final review,
  and Boss escalation; `node --test tests/roles.test.mjs
  tests/skill-instructions.test.mjs` passed (79 tests) and `git diff --check`
  passed.
- ✅ Define the ownership handoff and conflict-resolution record for delegated
  drafting, task reporting, and project-manager reconciliation. **Owner:**
  `project-manager`; **collaborators:** `product-owner`, `quality-engineer`;
  **assigned:** `requirements-engineer`; **completed-at:**
  `2026-09-06T15:30:00Z`; **evidence:** recorded the accepted handoff,
  task-reporting, validation, reconciliation, conflict-escalation, and
  reassignment rules in this plan and the machine-readable `team.md`
  `handoffConflictContract`; verified scope excludes runtime transitions,
  triggers, scheduling, and Phase 2+ behavior.
- ✅ Review & Refactor — confirm ownership metadata is consistent, parseable,
  non-duplicative, and does not grant roles broader write authority.
  **Owner:** `technical-architect`; **reviewer:** `quality-engineer`; **assigned:**
  `quality-engineer`; **completed-at:** `2026-09-06T15:35:00Z`;
  **validation:** passed; **evidence:** parsed the `team.md` ownership block
  (10 roles, 18 section owners, 9 gate owners), checked all role guidance
  planning contracts and template guardrails, reviewed the handoff/conflict
  boundaries, and found no Phase 1 consistency, parseability, readability, or
  authority-boundary blocker; `node --test tests/roles.test.mjs
  tests/skill-instructions.test.mjs` (79 tests) and `git diff --check` passed.

**Success goals:** `team.md`, the plan template, and selected role guidance
provide one unambiguous accountable owner for each plan section and task
responsibility, with no conflicting authority declarations.

**Verification:** inspect the machine-readable roster, render or parse a sample
plan, review write domains and denied areas, and confirm unrelated workflow
behavior is unchanged.

**Phase 1 evidence (2026-09-06T15:35:00Z):** The roster metadata parsed as JSON
with 10 roles, 18 section owners, and 9 gate owners. Owner references, role
write/denied domains, handoff/conflict limits, template output guardrails, and
role planning contracts were reviewed for consistency and bounded authority.
Focused role/skill tests passed (79 tests); no runtime behavior or unrelated
workflow files were changed by this review. No residual Phase 1 risk was found.

### Phase 2: Formalize Gates and Task State Transitions (status: accepted)

**Objective:** define and enforce the lifecycle gates, task status transitions,
and human-versus-agent authority model.

**Tasks:**

- ✅ Specify the routing, vision, design-intent, plan, activation, task-start,
  task-completion, phase-close, and plan-close gates in `.agents/workflow.md`
  and the relevant lifecycle skills. **Owner:** `project-manager`;
  **assigned:** `implementation-engineer`;
  **started-at:** `2026-09-06T17:08:00Z`; **completed-at:**
  `2026-09-06T17:14:00Z`; **evidence:** added the normative nine-gate table,
  authority classes, and gate checks to `.agents/workflow.md`; aligned
  `plan-create`, `plan-execute`, `phase-execute`, `task-execute`, and
  `work-verify` instructions; structural checks and `git diff --check` passed.
- ✅ Define the canonical task state model, transition preconditions, blocked
  and deferred handling, responsible actor, timestamps, evidence, and
  completion reason. **Owner:** `quality-engineer`; **assigned:**
  `implementation-engineer`; **collaborators:** `project-manager`,
  `implementation-engineer`; **started-at:** `2026-09-06T17:14:30Z`;
  **completed-at:** `2026-09-06T17:16:00Z`; **evidence:** documented the
  four-marker state machine, valid/rejected transitions, blocked reasons,
  actor/timestamp/evidence requirements, completion fields, and PM
  reconciliation in `.agents/workflow.md` and task/phase skill guidance;
  structural checks and `git diff --check` passed.
- ✅ Define durable human approval records for vision, design intent, plan
  acceptance, activation, and closeout, including exact approval language and
  scope conditions. **Owner:** `project-manager`; **assigned:**
  `implementation-engineer`; **collaborators:** `product-owner`,
  `requirements-engineer`; **started-at:** `2026-09-06T17:16:30Z`;
  **completed-at:** `2026-09-06T17:18:00Z`; **evidence:** added the durable
  inline approval schema, required Boss approval language, stable approval ID,
  actor ID, UTC timestamp, decision, conditions, and evidence requirements to
  `.agents/workflow.md` and planning/execution skill guidance; structural
  checks and `git diff --check` passed.
- ✅ Add agent-controlled gate checks that can advance without pausing while
  escalating scope changes, safety waivers, material residual risk, external
  publication, or closeout decisions. **Owner:** `project-manager`;
  **assigned:** `implementation-engineer`; **collaborators:**
  `security-engineer`, `quality-engineer`; **started-at:**
  `2026-09-06T17:18:30Z`; **completed-at:** `2026-09-06T17:20:00Z`;
  **evidence:** documented agent-controlled evidence checks, fail-closed
  escalation triggers, stale/concurrent reconciliation escalation, and
  explicit Phase 3/Phase 4 exclusions in `.agents/workflow.md` plus lifecycle
  skills; structural checks and `git diff --check` passed.
- ✅ Add transition and gate validation tests for valid, invalid, blocked,
  concurrent, and stale-plan updates. **Owner:** `quality-engineer`;
  **assigned:** `quality-engineer`; **completed-at:** `2026-09-06T17:21:00Z`;
  **collaborators:** `implementation-engineer`; **evidence:** added
  `tests/phase2-transition-gates.test.mjs` covering valid and malformed
  transitions, blocked/reopened tasks, concurrent/stale revisions,
  authenticated approvals, durable evidence, escalation, and Phase 3 boundary
  cases; 8 focused tests and the 401-test full suite passed, with build and
  `git diff --check` passing.
- ✅ Review & Refactor — verify the state machine is understandable, strict
  enough to prevent false completion, and lightweight enough for normal tasks.
  **Owner:** `quality-engineer`; **reviewer:** `technical-architect`;
  **assigned:** `quality-engineer`; **completed-at:** `2026-09-06T17:22:33Z`;
  **validation:** passed; **evidence:** quality review and technical-architect
  review found no correctness, ownership-boundary, maintainability,
  readability, or security-hardening defect requiring refactor; the focused
  Phase 2 transition/security matrix (12 tests), role/skill regression suite
  (79 tests), full suite (401 tests), and `git diff --check` passed. Phase 3
  routing and Phase 4 migration remain out of scope.

**Technical-architect reviewer conclusion (2026-09-06T17:22:33Z):** The Phase 2
Review & Refactor gate found no correctness, ownership-boundary,
maintainability, readability, or security-hardening defect requiring a
behavior-preserving refactor. The canonical contract remains cohesive across
`.agents/workflow.md`, `plan-create`, `plan-execute`, `phase-execute`,
`task-execute`, and `work-verify`; Phase 2 transition and security tests pass
(12 tests), focused role/skill regressions pass (79 tests), the full suite
passes (401 tests), and `git diff --check` passes. The file-size scan and
responsibility audit found no obvious mixed-responsibility production artifact
in the reviewed Phase 2 surface. No refactor was needed and no unrelated files
were changed by this review. The reviewer task and transition/gate validation task are reconciled as
complete. The remaining documented risk is that the tests validate the Markdown
contract rather than enforce a runtime transition engine or atomic Markdown
mutation. Phase 3 and Phase 4 were completed separately after this review.

**Success goals:** agents can determine whether work may proceed, must pause for
Boss approval, or must escalate, and every task transition leaves durable
status and evidence.

**Verification:** transition matrix tests, malformed-plan tests, approval-record
checks, concurrent-edit handling, and a complete sample task lifecycle.

**Phase 2 evidence (2026-09-06T17:22:33Z; reconciled 2026-09-06):** Quality-
engineer and technical-architect review validation passed: 12 focused Phase 2
tests, 79 focused role/skill regression tests, 401 earlier full-suite tests,
and `git diff --check` passed. The state machine and gate contract are bounded
and internally consistent; no refactor or authority-boundary blocker was found.
The transition/gate validation task has executable coverage. Phase 3 and Phase 4
were subsequently completed under their own phase gates.

### Phase 3: Add Trigger-Based Routing and Delegation Contracts (status: accepted)

**Objective:** make natural-language and canonical triggers route reliably to
the correct skill, role, plan, phase, or task without bypassing authority gates.

**Tasks:**

- ✅ Define canonical trigger phrases, aliases, precedence, ambiguity handling,
  and context preservation for brainstorming, design, planning, review,
  activation, execution, verification, documentation, and closeout. **Owner:**
  `project-manager`; **collaborators:** `product-owner`, `requirements-engineer`;
  **completed-at:** `2026-09-06T18:00:00Z`; **evidence:** documented
  canonical object-verb intents, conversational/slash aliases, deterministic
  precedence, fail-closed ambiguity handling, and preserved plan/phase/task
  context in `.agents/workflow.md` and workflow source; focused workflow tests
  passed.
- ✅ Add the trigger-to-procedure and trigger-to-role mapping to the workflow
  contract and `team.md` machine-readable metadata. **Owner:**
  `technical-architect`; **collaborators:** `project-manager`; **completed-at:**
  `2026-09-06T18:00:00Z`; **evidence:** added and parsed `triggerRouting`
  metadata for 11 intents plus procedure/role mappings; workflow-team tests
  passed.
- ✅ Define delegation packets containing current plan, section owner, selected
  task, accepted decisions, constraints, expected output, and evidence
  requirements. **Owner:** `project-manager`; **collaborators:**
  `implementation-engineer`, `quality-engineer`; **completed-at:**
  `2026-09-06T18:00:00Z`; **evidence:** added machine-readable required packet
  fields, evidence requirements, worker boundary, and fail-closed invalid-packet
  rule; workflow-team tests passed.
- ✅ Ensure triggers select work but cannot activate a backlog plan, approve a
  human gate, waive a finding, publish, or archive without the required
  authority. **Owner:** `security-engineer`; **collaborators:**
  `project-manager`, `requirements-engineer`; **completed-at:**
  `2026-09-06T18:00:00Z`; **evidence:** workflow contract explicitly makes
  routing non-authoritative and rejects stale, inactive, incomplete, or invalid
  authority requests while preserving activation, approval, safety, release,
  and closeout gates; focused workflow tests passed.
- ✅ Add routing tests for canonical phrases, natural-language variants,
  ambiguous requests, invalid authority claims, preserved phase/task context,
  and delegation packets. **Owner:** `quality-engineer`; **collaborators:**
  `implementation-engineer`; **assigned:** `quality-engineer`; **completed-at:**
  `2026-09-06T18:30:00Z`; **evidence:** added focused workflow-team coverage
  asserting all 11 canonical intent/procedure/role mappings, aliases and
  precedence, fail-closed ambiguity, authority-boundary mutations, preserved
  routing context, packet fields, and required evidence; focused tests, build,
  and `git diff --check` passed.
- ✅ Review & Refactor — confirm routing remains narrow, predictable, and
  maintainable as roles and skills evolve. **Owner:** `project-manager`;
  **reviewer:** `technical-architect`; **assigned:** `quality-engineer`;
  **completed-at:** `2026-09-06T18:30:00Z`; **evidence:** reviewed the
  routing contract, parser, metadata, and focused tests; no bounded refactor
  was warranted because routing remains metadata-driven, fail-closed, and
  limited to procedure/role selection. The required technical-architect review
  gate is recorded in the dated evidence below.

**Phase 3 execution evidence (2026-09-06):** Tasks 5 and 6 are both `✅`
with assigned actor `quality-engineer`; task 5 added the complete routing matrix
coverage and task 6 recorded the required technical-architect review. The
final quality gate passed: `node --test tests/workflow-team.test.mjs` (10
routing/delegation tests), `npm test` (405 tests), `npm run build`, `npm run
typecheck`, `git diff --check`, and the staged-file check all passed. The Phase
3 verification repair also updated the Phase 2 security-contract assertion to
recognize the completed transition/gate validation task without changing Phase 2
or Phase 3 behavior. No Phase 4 files, migration, or rehearsal work started.

**Technical-architect reviewer evidence (2026-09-06):** Reviewed trigger
normalization, precedence, alias-to-intent/procedure/role mappings, preserved
plan/phase/task and revision context, delegation packet required fields and
evidence requirements, fail-closed authority protections, stale/conflicting
context handling, and the changed source/tests/docs surface. The metadata
parser is cohesive with workflow manifest/team loading, keeps routing
non-authoritative, and reserves plan reconciliation and human approval,
safety-waiver, publishing, and archival authority to existing gates. Focused
routing/security/transition tests (22), build, and `git diff --check` passed.
No correctness, ownership-boundary, security-hardening, maintainability, or
readability defect requires a behavior-preserving refactor. The review is
bounded to Phase 3; Phase 4 migration and rehearsal were not started. Phase 3
is ready for project-manager reconciliation; this evidence does not itself
close the phase or authorize Phase 4.

**Success goals:** an agent can identify the narrowest correct procedure and
role from a request while preserving the plan context and enforcing human
approval boundaries.

**Verification:** routing decision matrix, ambiguity tests, delegation-packet
validation, authority-boundary tests, and representative end-to-end handoffs.

### Phase 4: Migrate, Rehearse, and Adopt the Formalized Workflow (status: accepted)

**Objective:** apply the contract to representative plans, prove the lifecycle
end to end, and document adoption without silently changing existing project
work.

**Tasks:**

- ✅ Define migration guidance for existing plans, including missing owners,
  stale markers, inconsistent task states, and incomplete evidence. **Owner:**
  `documentation-specialist`; **assigned:** `documentation-specialist`;
  **collaborators:** `project-manager`, `quality-engineer`; **started-at:**
  `2026-09-06T17:30:00Z`; **completed-at:** `2026-09-06T17:40:00Z`;
  **evidence:** migration guidance and preservation rules in the Phase 4
  migration record; `git diff --check` passed.
- ✅ Migrate a representative backlog plan and a small active-plan rehearsal
  using the new ownership, gate, trigger, and task-transition records. **Owner:**
  `project-manager`; **assigned:** `project-manager`; **collaborators:**
  selected specialist roles; **started-at:** `2026-09-06T17:41:00Z`;
  **completed-at:** `2026-09-06T17:45:00Z`; **evidence:** migrated
  `_docs/plans/backlog/role-capability-model.md` and active-plan rehearsal
  records in this plan; historical completed plans unchanged.
- ✅ Run an end-to-end rehearsal from vision through design intent, phase/task
  planning, explicit activation, task execution, verification, and closeout.
  **Owner:** `quality-engineer`; **assigned:** `quality-engineer`;
  **collaborators:** all roles as needed; **started-at:**
  `2026-09-06T17:46:00Z`; **completed-at:** `2026-09-06T17:50:00Z`;
  **evidence:** ordered gate rehearsal record in this plan, task-transition
  inspection, migrated-plan review, and passing targeted/full checks.
- ✅ Update workflow documentation, role guidance, examples, and troubleshooting
  instructions with the final agent-operational contract. **Owner:**
  `documentation-specialist`; **assigned:** `documentation-specialist`;
  **collaborators:** `ux-writer`, `project-manager`; **started-at:**
  `2026-09-06T18:35:00Z`; **completed-at:** `2026-09-06T18:45:00Z`;
  **evidence:** synchronized the normative contract into the workflow source
  and active workflow docs; added agent-operational quick references and
  valid task/approval examples to `README.md` and `plan-example.md`; added
  shared role guidance and linked troubleshooting recovery instructions;
  verified links, YAML/Markdown examples, and `git diff --check`. No
  `_docs/kb` files or completion checklist content changed.
- ✅ Record rollout boundaries, compatibility expectations, unresolved platform
  or host limitations, and follow-on adoption work. **Owner:**
  `project-manager`; **collaborators:** `security-engineer`, `quality-engineer`;
  **assigned:** `requirements-engineer`; **started-at:** `2026-09-06T19:00:00Z`;
  **completed-at:** `2026-09-06T19:10:00Z`; **evidence:** recorded the
  bounded rollout, compatibility contract, platform/host limitations,
  adoption risks, and follow-on work below; targeted trailing-whitespace scan
  passed. No later Phase 4 task or completion checklist content was changed.
- ✅ Review & Refactor — review the complete workflow for unnecessary ceremony,
  ambiguous ownership, stale instructions, and gaps between human and agent
  authority. **Owner:** `project-manager`; **reviewer:** `quality-engineer`;
  **assigned:** `quality-engineer`; **started-at:** `2026-09-06T19:20:00Z`;
  **completed-at:** `2026-09-06T19:35:00Z`; **validation:** passed; **evidence:**
  reconciled the workflow source, team metadata, templates, role guidance,
  examples, troubleshooting guidance, and active-plan contract; corrected
  human-principal and Design Intent ownership drift in the workflow source and
  `team.md`; recorded the maintainability scan and responsibility audit below;
  targeted workflow-team tests, full suite, build, typecheck, and
  `git diff --check` passed.

**Success goals:** representative plans can be created, approved, activated,
executed, verified, and closed using the formalized workflow without ambiguous
ownership or unrecorded gate transitions.

**Verification:** end-to-end rehearsal evidence, migrated-plan review, link and
example checks, role-routing checks, task-transition checks, and explicit human
acceptance of the final workflow contract.

### Phase 4 migration guidance and rehearsal records

**Existing-plan migration guidance (task 1):**

1. Classify the plan by location and state before editing: completed plans are
   immutable historical records; backlog plans may be refined but are not
   implementation authorization; active plans receive only necessary current
   execution, safety, or evidence updates.
2. Preserve accepted intent and historical evidence. Do not rewrite completed
   plans for owner fields, marker style, timestamps, or cosmetic conformity.
3. For a backlog plan, add or reconcile accountable owners for major sections,
   record the Routing/Vision/Design-Intent gate state, and leave Plan and
   Activation pending until the plan is accepted and explicitly activated.
4. For an active plan, repair only actionable omissions: assign the current
   task owner, mark the task `🟨` before work, and record `✅` or `⚠️` with
   assigned actor, timestamps, evidence, validation, and residual risk. Never
   infer completion from an old marker; record stale or inconsistent state as a
   migration finding and reconcile it before advancing.
5. Missing owners become an explicit reconciliation item owned by the
   project-manager; incomplete evidence remains incomplete until the assigned
   owner supplies it. Conflicts or scope changes fail closed and escalate to
   Boss when they cross an approval or safety boundary.

**Task 1 record:** `documentation-specialist` defined the guidance above;
`project-manager` owns reconciliation and `quality-engineer` validates evidence.
Completed `2026-09-06T17:40:00Z`; evidence is this section plus the migrated
backlog record in `_docs/plans/backlog/role-capability-model.md`. Completed
historical plans were not modified.

**Task 2 migration record:** Representative backlog plan
`_docs/plans/backlog/role-capability-model.md` retains its draft status and
records ownership, gate state, and evidence gaps without activation. This
active plan served as the small active-plan rehearsal: Phase 4 tasks were
started with explicit `🟨` transitions and this record is the PM reconciliation
surface. Assigned `project-manager`; completed `2026-09-06T17:45:00Z`;
evidence: the backlog migration record, this plan's task markers, and the
ownership/gate records above.

**Task 3 end-to-end rehearsal record:** The accepted path was exercised in
order: (1) Routing classified the request as active-plan work; (2) Vision
accepted Context and High-Level Goal; (3) Design Intent accepted boundaries,
invariants, tradeoffs, and verification direction; (4) Plan accepted ordered
phases, task owners, dependencies, and evidence expectations; (5) Activation
was explicit human authorization; (6) the assigned owner changed a task from
`⬜️` to `🟨` before work; (7) implementation evidence and verification were
recorded before `✅` (or `⚠️` for blocked work); (8) quality validation and PM
reconciliation supported phase close; and (9) closeout retained risks,
documentation impact, validation, and the final human approval record. No
later Phase 4 task was started by this rehearsal. Assigned
`quality-engineer`; completed `2026-09-06T17:50:00Z`; evidence: this plan's
accepted gate model, task transition records, migrated-plan review, and the
focused structural checks recorded below. The rehearsal is documentation-only
and does not claim runtime atomic Markdown mutation or authenticated approval
beyond the recorded contract.

**Phase 4 tasks 1-3 verification:** `git diff --check` passed; targeted
ownership/gate/marker inspection passed with no completed historical plan
changed; `npm test` passed (405 tests); `npm run build` and `npm run typecheck`
passed. Residual risk: migration and rehearsal remain convention-based and
need the later documentation/adoption tasks for broader operator examples.

### Phase 4 rollout, compatibility, and adoption record (task 5)

**Rollout boundaries:**

- Rollout applies to the `design-plan-execute` workflow contract, its installed
  guidance/examples, and project-owned active or backlog plans that are
  intentionally migrated. It does not silently rewrite completed historical
  plans, activate backlog work, or change unrelated project-owned documents.
- Adoption is documentation- and convention-based in this phase. The plan,
  task markers, ownership fields, gate records, and delegation packets are the
  authoritative evidence; this phase does not introduce a runtime transition
  engine, scheduler, automatic plan migration, or atomic Markdown mutation.
- The representative backlog migration and active rehearsal demonstrate the
  contract but do not constitute a requirement that every existing repository
  migrate immediately. New plans should use the formalized model; existing
  active plans should receive only actionable execution, safety, or evidence
  repairs when they are next worked.
- Host-native worker directories, provider-specific launchers, and automatic
  cross-host integration remain outside this rollout. The installed
  `.agents/roles/` paths are workflow-managed role storage, not a claim that
  every host exposes them as native agents.

**Compatibility expectations:**

- The four task markers remain `⬜️` (not started), `🟨` (in progress), `✅`
  (completed), and `⚠️` (blocked or follow-up). Existing task intent and
  evidence must be preserved while owners, timestamps, or missing evidence are
  reconciled; an old marker must not be treated as proof of completion.
- Completed plans remain immutable historical records. Backlog plans remain
  non-authorizing until explicitly accepted and activated. Conversational and
  slash-command triggers normalize to the same gated intent and neither form
  bypasses human approval.
- The workflow remains host-neutral: native worker names, presentation, and
  concurrency are provider inputs. A host with limited or unknown capacity
  reduces parallelism, and missing workspace or managed-integration capability
  fails closed for change-producing work rather than weakening scope or safety
  rules.
- Compatibility is limited to supported workflow/package assumptions: Node.js
  `>=20.17` and the repository's Git-backed/local source model. Registry,
  plugin-package, global-install, or marketplace behavior is not added by this
  rollout.

**Unresolved platform and host limitations:**

- Native delegation capability and correlated-result support may be unavailable
  or unknown on a host; PM-routed work must not use a prompt-overlay fallback
  in that case. Live provider authentication, provider restart recovery, and
  native harness UI behavior remain manual validation areas.
- CI coverage is GitHub-hosted Ubuntu with Node.js 24. Windows, macOS, other
  Linux distributions, alternate shells, filesystem semantics, and host
  presentation/concurrency have not been exhaustively validated for this
  workflow contract.
- Markdown checks and focused tests validate the documented contract, not
  atomic concurrent plan writes or enforcement by a runtime state machine.
  Human approval provenance cannot be authenticated by plan text alone.
- Host-native exposure and a future integration command/configuration are
  intentionally unresolved; adopting such output requires a separately
  accepted design that names ownership, overwrite/refusal behavior, and
  rollback expectations.

**Adoption risks and mitigations:**

- Added ownership, timestamps, and evidence can create ceremony for small
  tasks. Keep default task records concise, require richer fields only when
  relevant, and use the smallest evidence that proves acceptance.
- Legacy plans may contain stale markers, missing owners, or incomplete
  evidence. Migrate only at a bounded touchpoint, preserve historical text,
  mark uncertainty explicitly, and reconcile before advancing a gate.
- Documentation can create false confidence because it does not enforce
  mutation atomicity or approval identity. Treat conflicts, missing host
  capabilities, and material residual risk as fail-closed conditions and
  retain manual Boss review for human gates.
- Provider differences can make a successful local rehearsal look portable.
  Record the host and capability assumptions in execution evidence and require
  host-specific manual validation before claiming broader adoption.

**Phase 4 task 6 review and refactor evidence (2026-09-06T19:35:00Z):**

- **Ceremony:** The concise task schema remains the default; richer fields are
  conditional on delegation, blocking, validation, or material risk. No new
  gate or required ceremony was added.
- **Ownership:** The normative gate table, team metadata, role contracts, and
  plan task records now consistently identify `product-owner` as Design Intent
  owner, `project-manager` as lifecycle reconciler, and Boss as the human
  approval principal. Delegated roles remain bounded collaborators.
- **Stale instructions:** The plan template's vision-gate instruction now says
  Boss approval rather than developer agreement. Workflow examples and
  troubleshooting references were checked; no stale Phase 4 sequencing or
  closeout instruction was found. The completion checklist was intentionally
  not changed per task scope.
- **Gate/trigger/task-state gaps:** The nine-gate model, canonical four-marker
  state machine, trigger routing, delegation packet, and fail-closed escalation
  rules are mutually consistent. No missing transition or authority bypass was
  found in the reviewed surface.
- **Maintainability gate:** File-size scan found `src/workflows/team.ts` at 319
  lines; responsibility audit found cohesive manifest/team parsing and roster
  validation, with no mixed-responsibility production file requiring a bounded
  refactor. Workflow documentation remains intentionally distributed by source,
  installed package, and active plan; no speculative consolidation was made.
- **Residual risks:** Markdown conventions still do not enforce atomic writes or
  authenticate human approval provenance; host-specific native delegation and
  cross-platform behavior remain manual follow-up work already recorded above.

**Follow-on adoption work:**

- Add a separately scoped host-compatibility matrix and manual dogfooding for
  supported providers, including native delegation, restart/recovery,
  concurrency limits, workspace integration, path/shell behavior, and UI
  presentation. Do not infer coverage from the Ubuntu CI run.
- If enforcement is needed, plan a runtime transition/atomic-write mechanism
  and authenticated approval integration rather than extending Markdown
  conventions implicitly. Preserve the current plan contract as the readable
  fallback and define migration/rollback before implementation.
- Revisit host-native role exposure only through an explicit integration
  command or configuration, with project-owned boundaries and refusal behavior.
  Promote durable accepted behavior to `_docs/kb` during plan completion, not
  during this active-plan task.

## Open Questions / Decisions

- ✅ **Accepted task state model:** retain the four primary markers—`⬜️` not
  started, `🟨` in progress, `✅` completed, and `⚠️` blocked or requiring
  follow-up. Annotate `⚠️` tasks with explicit reasons such as deferred,
  skipped, superseded, awaiting Boss approval, or blocked by a dependency.
- ✅ **Accepted completion evidence:** the assigned agent or sub-agent decides
  whether its task meets the acceptance conditions and reports what changed,
  relevant files/artifacts or decisions, verification/review evidence, and
  remaining risks or an explicit statement that none remain. Evidence is
  lightweight by default and role-specific when the task type requires it.
  The project-manager reconciles the report before treating the plan state as
  authoritative.
- ✅ **Accepted transition attribution:** meaningful lifecycle transitions
  record the accountable owner and the role that performed or validated the
  transition. The usual validation role is `quality-engineer`, with the
  applicable specialist named when another role performs validation. Task
  metadata uses `owner` for the accountable role, `assigned` for the concrete
  worker or subagent run ID, and `completed-at` for completion timing. Record a
  timestamp for task start/completion, validation or sign-off, blocked/reopened
  transitions, human approvals, phase acceptance, and plan closeout; do not
  require timestamps for every ordinary plan edit.
- ✅ **Accepted ownership representation:** `team.md` is the canonical
  machine-readable ownership and responsibility table used by the top-level
  project-manager. Plans should also show concise owner and collaborator fields
  locally on sections and tasks so delegated agents have immediate context.
- ✅ **Accepted layered ownership schema:** `team.md` stores stable role
  responsibilities, write domains, approval authority, and required evidence;
  `.agents/workflow.md` defines the meaning and transition rules for ownership
  fields; and the plan template records current section/task owner,
  collaborators, assignment, validation, completion, and evidence metadata.
  Each layer remains authoritative for its own concern without duplicating
  mutable state.
- ✅ **Accepted collaboration record:** use structured decision-request records
  in Open Questions / Decisions, with an ID, asking role, affected section/task,
  context, why it matters, logical options, recommendation, unresolved impact,
  Boss response, resulting plan update, and evidence reference. Add concise
  local references from affected sections or tasks.
- ✅ **Accepted nine-gate lifecycle:** retain Routing, Vision, Design Intent,
  Plan, Activation, Task Start, Task Completion, Phase Close, and Plan Close as
  the primary gates. Collaboration, security, quality, and release checks are
  sub-gates or evidence within those gates rather than additional primary
  gates.
- ✅ **Accepted gate authority:** Boss approval is required for Vision, Design
  Intent, plan sequencing, Activation, and final Closeout. Routing, task
  transitions, evidence collection, dependency checks, in-scope security and
  quality checks, and unchanged-scope phase completion remain agent-controlled.
- ✅ **Accepted approval record:** use inline approval metadata with a stable
  approval ID, human-facing approver name (`Boss`), optional machine actor ID
  when available, timestamp, decision, and scope conditions. Record
  `rcravens` as the current environment's actor ID when this identity is
  available. Create a separate decision record only for complex or
  high-significance approvals.
- ✅ **Accepted trigger interface:** support both conversational phrases and
  slash commands for the same workflow actions. Normalize both to canonical
  object-verb intents such as `plan.create`, `plan.approve-design`,
  `phase.start`, `task.complete`, and `plan.close`. Both interfaces use the
  same routing, context, and authority gates; neither bypasses human approval.
- ✅ **Accepted transition ownership:** the assigned task owner marks the task
  `🟨` before starting and reports `✅` or `⚠️` with evidence after execution;
  the validation role reviews where required; and the project-manager reconciles
  authoritative phase and plan state, conflicts, dependencies, and gate
  progression.
- ✅ **Accepted delegated-update model:** sub-agents may update only the
  localized status and evidence for tasks assigned to them, using task-scoped
  ownership or optimistic conflict checks. Phase, section, gate, and overall
  plan reconciliation remains with the project-manager. Reconciliation issues
  stay within the team and are resolved by the project-manager; escalate to
  Boss only when they change accepted scope/design, cross a safety boundary,
  accept material residual risk, or require a human approval gate.
- ✅ **Decision `DEC-P1-T4` — accepted delegation handoff and conflict
  resolution:** **asking role:** `project-manager`; **affected
  section/task:** Phase 1 task 4 and delegated phase/task records;
  **context:** delegated drafting, task reporting, validation, and PM
  reconciliation need separate bounded authority; **options:** allow
  contributors to edit broad plan sections, use report-only handoffs, or use
  task/phase-scoped handoffs with PM reconciliation; **recommendation and
  response:** use task/phase-scoped handoffs, report-only recommendations,
  validation by `quality-engineer`, and PM-owned reconciliation; **unresolved
  impact:** runtime enforcement and transition conflict handling remain Phase 2+
  work; **Boss response:** accepted with Phase 1 scope; **resulting plan
  update:** the accepted contract is recorded above and in `team.md` under
  `handoffConflictContract`; **evidence reference:** Phase 1 task 4 record.
- ✅ **Accepted task schema and presentation:** keep task lists concise and
  human-readable, showing the owner by default. Store richer conditional
  metadata when relevant, including assigned worker/run ID, completed-at,
  dependencies, verification, documentation impact, and residual risk. Render
  those details locally or in a compact execution block rather than requiring
  full fields on every task.
- ✅ **Accepted migration policy:** completed plans remain immutable historical
  records. Existing active or in-progress plans are not retroactively rewritten
  for cosmetic conformance; they may receive only necessary current execution,
  safety, or evidence updates. Backlog plans must meet the new ownership, gate,
  task, and collaboration standards during refinement before acceptance or
  activation. New plans use the full formalized model from creation.

## Documentation Impact

- Product: document the plan lifecycle as a project-management capability.
- Requirements: define lifecycle states, transition rules, evidence, and
  acceptance signals.
- Architecture: document plan ownership, section gates, and task-state flow.
- Security: review plan mutation authority, concurrent updates, and managed
  workflow-file boundaries.
- Quality: define transition tests, evidence checks, and incomplete-plan gates.
- Operations: document how developers and delegated roles update task state.
- Decisions: record accepted lifecycle and authority tradeoffs.
- Glossary: clarify plan, phase, task, design intent, execution evidence, and
  closeout.

## Product Readiness

- Readiness: internal-use-ready when the workflow contract is implemented and
  validated against representative active and backlog plans.
- Evidence needed: accepted design intent, automated transition checks,
  migrated example plans where needed, documentation review, and a complete
  plan-execution rehearsal.

## Risks

- Extra status ceremony could slow small tasks without improving evidence.
- Ambiguous ownership could produce conflicting plan edits during delegation.
- Existing plans may not conform to the new transition contract.
- A Markdown-only convention may be difficult to validate automatically unless
  the task structure is regular enough to parse safely.

## Security Review

- Status: Phase 2 gate/state/approval review complete; transition validation
  task and its executable coverage are complete.
- Scope reviewed: plan mutation authority, managed workflow assets, concurrent
  and stale edits, delegated role boundaries, approval spoofing, safety-waiver
  escalation, and preservation of user-owned plan data.
- Findings addressed in `.agents/workflow.md`: approvals require authenticated
  direct Boss provenance and cannot be created or inferred by agents; mutations
  use `base-revision` plus monotonic revision and fail closed on conflicts;
  active plans and `_docs/` remain user-owned and receive only targeted edits;
  safety waivers require a separate finding/mitigation/expiry record and
  explicit authenticated Boss approval.
- Evidence: `tests/phase2-security-contract.test.mjs` covers approval
  spoofing, stale/concurrent protection, user-content preservation, waiver
  escalation, and Phase 3/4 scope boundaries.
- Residual risk: the transition/gate tests validate the Markdown contract but
  do not provide a runtime transition engine or atomic Markdown writes;
  documentation alone cannot authenticate a human approval.

## Lessons To Carry Forward

- A plan is not only a proposal; during execution it is the authoritative
  record of scope, state, evidence, and decisions.
- Phase boundaries should produce increasingly specific plan content rather
  than speculative detail at the beginning.
- Explicit task transitions reduce ambiguity between planned, active, blocked,
  and verified work.

## Completion Checklist

- ⬜️ High-Level Goal accepted and scope direction confirmed.
- ⬜️ Design Intent accepted by the developer.
- ⬜️ Requirements, architecture, security, quality, and documentation impacts
  reviewed as appropriate.
- ⬜️ Implementation phases and tasks drafted only after Design Intent approval.
- ⬜️ Verification, risks, migration, and closeout criteria recorded.
- ⬜️ Plan reviewed and explicitly activated before implementation.
