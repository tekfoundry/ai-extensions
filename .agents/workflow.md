# Agent Workflow

This document defines a reusable workflow for an AI coding agent operating in a product repository.

It is designed to support two distinct needs:

1. Bootstrapping a new project from zero.
2. Executing ongoing implementation work in an existing project.

The goal is to make the workflow easy to apply in order, while still preserving the planning, verification, and documentation discipline needed for reliable delivery.

## How to Use This Document

Use this document as the default process contract for the repo.

- If the repository also has an `AGENTS.md` file, treat that file as the repo-specific entrypoint.
- Use this document for the durable workflow rules that should remain reusable across projects.
- Use `.agents/README.md` as the reusable process router when it exists.
- Use `_docs/README.md` as the project documentation router when it exists.
- Use `_docs/kb` for current implemented project knowledge.
- Use active plans in `_docs/plans` for implementation work and execution records.
- Use `_docs/plans/backlog` for planned work that has not been activated.
- Use completed plans only for relevant historical context.
- Use canonical object-verb skill names for agent workflow prompts.
  `project-init` initializes documentation scaffolding, `plan-create` writes
  backlog plans for review, and active implementation requires a later explicit
  `plan-activate` request.

## Workflow Artifact Templates

Shared workflow artifacts can be shaped by workflow-owned templates. Resolve a
template by name before creating or substantially restructuring one of these
artifacts:

- `plan.md`
- `docs-readme.md`
- `design-readme.md`
- `product-summary.md`
- `competitive-analysis.md`
- `design-doc.md`

Resolution is published-first:

1. Use `.agents/templates/<template-name>.md` when it exists.
2. Otherwise use the active workflow origin at
   `.agents/packages/workflows/<source>/<workflow>/templates/<template-name>.md`.

Section templates follow the same rule under `sections/`, for example
`.agents/templates/sections/verification.md` before the matching workflow
origin.

If a template is missing from both locations, do not block routine work solely
because of the missing file. Follow the skill's local instructions and the
repository's existing document style, then record the missing template in the
plan, review notes, or final report so the workflow installation can be
repaired. A missing template is a workflow health issue, not permission to
skip lifecycle gates.

## Work Classification

Classify the work before editing. The repository supports three work modes.
For every active-plan task, backlog review, or micro-fix, the agent must state
the selected work mode before changing files. If the work mode is unclear, or
if a backlog item appears to require implementation, stop and clarify instead
of editing.

### Backlog Work

Plans in `_docs/plans/backlog/` are planned but intentionally not started.
Agents may collaborate with the user to create and refine backlog plans,
including design intent, phases, tasks, risks, and verification. Backlog
planning is not implementation authorization.

An agent must not promote a backlog plan autonomously. Promotion requires
explicit human direction, either when the user manually moves the plan or
when the user asks the agent to promote it. The plan must be moved into
`_docs/plans/` before implementation begins.

### Active-Plan Work

Plans in `_docs/plans/` are authorized implementation work. The active plan
is the execution record: keep its task status current, implement in small
verifiable slices, run the relevant checks, update affected documentation,
and archive the plan only after completion requirements are met.

### Micro-Fix Work

A micro-fix may proceed without a broader plan when existing `_docs` already
capture the intended behavior and the change is a localized bug fix or UX/UI
improvement. The change must not introduce new design intent, architecture,
schema, security or data-safety behavior, or broad cross-module changes.

Every micro-fix still needs a knowledge-base impact check. Most small fixes
will need little or no documentation change, but the agent must decide that by
checking the changed behavior against `_docs/kb` rather than assuming docs are
unaffected.

Active-plan work has a stricter promotion gate: do not edit or promote
`_docs/kb` while the plan is still in progress. Record documentation impact,
candidate updates, and implementation evidence in the active plan instead.
Promote accepted durable behavior once, during plan completion, after
implementation, verification, integration, and human validation are resolved.

An explicitly classified and approved micro-fix is the narrow exception. After
the micro-fix is implemented and verified, it may update the affected
`_docs/kb` entry during the same micro-fix closeout when the behavior changes
current-state knowledge. A patch is not automatically a micro-fix; work that
changes design intent, architecture, persistence, security, or multiple
workflow subsystems remains plan work and must use the active-plan gate.

Escalate a micro-fix to a new plan or an existing active plan when its scope
expands, it changes accepted design intent, crosses subsystem boundaries,
requires a meaningful new workflow or contract, carries material production
or data-safety risk, or needs phased implementation. When the classification
is uncertain, clarify the scope before editing.

Completed plans in `_docs/plans/completed/` are historical execution records,
not default reading material. Read them when history, prior decisions,
migrations, or regressions make them relevant.

## Agent Task Lifecycle

Use this sequence for each concrete agent task, whether it is active-plan work
or a qualified micro-fix. The same sequence also governs backlog review, but
backlog work stops before implementation unless a human activates it.

1. **Orient:** Identify the user request, repository entrypoint instructions,
   relevant workflow guidance, applicable knowledge-base docs, active or backlog plan
   context, and current worktree state. At minimum, read `AGENTS.md`,
   `.agents/workflow.md`, `_docs/README.md`, the relevant `_docs/kb`
   files routed from the documentation index, the related active or backlog
   plans, and the current worktree status. Load completed plans only when they
   are needed for historical decisions, migrations, or regressions.
2. **Classify:** Decide and state whether the task is active-plan work, backlog
   work, or a micro-fix before editing. Stop for explicit authorization when
   the work is backlog-only or the classification is unclear.
3. **Plan:** Select the smallest coherent next task. For active-plan work,
   update task status in the plan before implementation. For a micro-fix,
   confirm the change remains within micro-fix criteria and know what completion
   record will be reported.
4. **Implement:** Make only the scoped change, following existing patterns and
   preserving safety-sensitive boundaries such as local files, external
   systems, credentials, persistence, publishing, and runtime contracts.
5. **Verify:** Identify and run targeted verification for the changed behavior
   first, then broader repository checks when the changed surface or plan
   requires them. Run broad checks only after targeted verification passes, or
   after a targeted-check failure or blocker has been recorded with its
   residual risk. Record exact commands, outcomes, skipped checks, and residual
   risk.
6. **Review:** Before closing a task named `Review & Refactor`, run the
   maintainability gate from focused role and activity guidance. Record the
   file-size scan, responsibility audit for large changed production files, any
   refactors made, and any deferred risks. Do not mark the task complete while
   a correctness risk or obvious mixed-responsibility production file remains
   unplanned.
7. **Close:** Update plan status or the micro-fix completion record, report
   files changed, verification evidence, documentation impact, escalation
   status, and unresolved follow-up work. Promote durable current-state behavior
   into `_docs/kb` when the implementation changes accepted project knowledge.

### Context Lifetime for Long-Running Skills

Long-running lifecycle skills should keep one parent orchestrator context in
charge of plan continuity. That parent context owns plan state, phase and task
sequencing, integration review, verification evidence review, documentation
impact, risk tracking, and closeout.

Bounded phase or task work may be delegated to a fresh sub-agent or fresh
context when context size, risk, or parallelism makes that safer or clearer.
Delegation is only appropriate when the parent context can preserve the
authoritative plan state and review the result before continuing. Delegated
work should return exact files changed, verification performed, remaining
risks, documentation impact, and whether scope expanded. The parent context
must reconcile that evidence with the active plan before selecting the next
task or phase.

Do not delegate work that depends on an unresolved product or design decision,
changes safety-sensitive behavior, has unclear authorization, or would require
the delegated context to overwrite unrelated worktree changes. Dependent tasks
should stay sequenced through the parent context; parallel delegation is only
appropriate for independent bounded checks or implementation slices.

If context size, worktree changes, or verification evidence become too large to
reason about confidently, stop and summarize the blocker instead of continuing
with partial state.

Do not add shell-script, CLI relaunch, or automatic session-resume
orchestration as part of the lifecycle by default. Deterministic process tooling
should be proposed only after the skill lifecycle has stabilized and repeated
execution shows a concrete need that skills alone cannot address clearly.

### Composed Execution Stop Conditions

Composed lifecycle execution must stop and return to diagnosis when continuing
would hide an unresolved decision, validation gap, or safety risk. Stop instead
of selecting the next task or phase when any of these conditions appear:

- unclear product or design decisions
- missing backlog activation authorization
- failed or blocked verification
- task, phase, or plan scope expansion
- underspecified safety-sensitive behavior involving local files, external
  systems, transfers, overwrites, deletes, renames, credentials, trust data,
  publishing, persistence, or runtime contracts
- relevant worktree conflicts or unrelated user changes that could be
  overwritten
- context that is too large to reason about confidently
- unexpected failures that need diagnosis before more implementation

## Bootstrap Command

If the user explicitly says `Initialize project`, treat that as a bootstrap command for a new or minimally scaffolded repository.

The bootstrap command should start the project using the lifecycle order defined in this document:

1. repository bootstrap
2. product framing
3. competitive analysis
4. MVP planning

The command should not jump directly into implementation unless the user explicitly requests it.

## Operating Principles

- Correctness over cleverness. Prefer boring, readable solutions that are easy to maintain.
- Smallest change that works. Minimize blast radius and avoid opportunistic refactors.
- Read before write. Find the existing implementation, pattern, and design context before editing.
- Prove it works. Do not mark work complete without verification or a clear statement of what could not be verified.
- Treat review as a gate, not a mood. A green test suite is not enough to close
  `Review & Refactor`; the maintainability scan and responsibility audit must
  also pass or create an explicit follow-up plan.
- Be explicit about uncertainty. If something is inferred or unverified, say so.
- Keep docs and code aligned. If implementation changes intended behavior, update the relevant docs as part of the work.
- Do not leave substantial design decisions only in chat or only in code.

## Standard Repository Layout

At minimum, a repo using this workflow should have the following documentation structure:

- `AGENTS.md`: repo-specific instructions, commands, priorities, and safety rules
- `.agents/README.md`: reusable agent process router
- `.agents/workflow.md`: the reusable workflow and planning contract
- `.agents/packages/workflows/<source>/<workflow>/guidance/`: workflow-owned
  shared and activity guidance origins
- `.agents/guidance/`: project-owned workflow guidance overrides after
  publishing
- `.agents/roles/<role>/GUIDANCE.md`: active role guidance when provided
- `.agents/skills/`: canonical repository-local agent workflow skills
- `_docs/kb/`: current implemented project knowledge
- `_docs/plans/`: active in-progress implementation plans
- `_docs/plans/backlog/`: planned but intentionally not started work
- `_docs/plans/completed/`: archived plans after design promotion and completion

Projects may also include these optional supporting files or directories:

- `.codex/skills/`, `.claude/skills/`, or similar tool-specific skill directories:
  directory-level compatibility symlinks to `.agents/skills/` when an agent tool
  needs its own discovery path
- object-verb workflow skills such as `project-init`, `plan-create`,
  `plan-activate`, `plan-execute`, `task-execute`, and `work-verify`
- `_docs/competitive-analysis.md`: market and landscape analysis used before or during product shaping
- `_docs/kb/01-product/`: product intent, user workflows, interaction
  behavior, UX principles, and user-facing acceptance signals
- `_docs/kb/02-requirements/`: requirements, use cases, user stories,
  non-goals, acceptance criteria, actors, workflows, and open decisions
- `_docs/kb/03-architecture/`: architecture, subsystem boundaries, runtime
  contracts, data flow, state machines, module maps, extension points, and
  maintainability tradeoffs
- `_docs/kb/04-security/`: threat models, trust boundaries, secrets posture,
  authorization concerns, destructive operations, supply-chain risk, local
  file safety, and auditability
- `_docs/kb/05-quality/`: testing strategy, verification matrices, regression
  risk, manual validation, release checks, coverage philosophy, and known
  validation gaps
- `_docs/kb/06-operations/`: build, deployment, release, runtime, rollback,
  smoke-check, monitoring, and incident validation knowledge
- `_docs/kb/07-decisions/`: accepted decisions, tradeoffs, and decision
  indexes
- `_docs/kb/glossary.md`: shared project terminology

For long-term maintainability, the recommended design-doc structure is:

- `overview`: system shape and cross-feature invariants
- `features`: behavior of user-facing and domain features
- `product`: why the product exists and what it is trying to achieve
- `quality`: how correctness and acceptance are evaluated
- `operations`: how the system is built, verified, packaged, deployed, and supported

## Workflow by Lifecycle Stage

The workflow is easiest to follow when organized by the stage of work being performed.

### Stage 1: Repository Bootstrap

Use this stage when a project is new and the documentation structure does not yet exist.

Required outputs:

- the `_docs` directory structure exists
- the `.agents` process directory exists
- this workflow document exists under `.agents/workflow.md`
- optional `AGENTS.md` exists if repo-specific instructions are needed

Bootstrap checklist:

1. Create the documentation directories listed in `Standard Repository Layout`.
2. Decide whether the repository needs a repo-specific `AGENTS.md`.
3. Keep the workflow document generic enough to reuse across projects.
4. Reserve repo-specific commands, priorities, and safety rules for `AGENTS.md` or repo-specific design docs.

If the user invoked `Initialize project`, this stage should also:

5. confirm whether the repo already contains any bootstrap files or directories before creating them
6. create missing documentation structure needed for the remaining stages
7. prepare to run the structured discovery interview described in `Stage 2: Product Framing`

### Stage 2: Product Framing

Before implementation begins, create a concise product summary that captures the reason the product should exist.

Expected output:

- `_docs/kb/01-product/product-summary.md`
- a short product summary, typically 1-2 pages

Use the `product-summary.md` workflow template when it is available.

The product summary should cover:

- the problem being solved
- target users
- the value proposition
- core jobs to be done
- major constraints or non-goals
- early success criteria
- MVP scope boundaries

When this stage is part of `Initialize project`, the agent should lead the user through a structured discovery process instead of assuming the answers.

The discovery process should cover at least these categories:

- business and product:
  - product goals
  - business value
  - differentiation hypothesis
  - success criteria
- end users and experience:
  - primary user types
  - main user workflows
  - platform expectations
  - accessibility or usability expectations
- technology and delivery:
  - preferred stack
  - hosting, deployment, or distribution expectations
  - data, storage, auth, or integration constraints
  - testing, CI, release, and operational expectations

Unless the repository explicitly uses a different product-doc location, the default output path for this stage is `_docs/kb/01-product/product-summary.md`.

The product summary document should be treated as the primary output of the initial product elicitation step.

Recommended document structure:

- product summary
- problem and opportunity
- target users
- value proposition
- primary user workflows
- success criteria
- MVP scope
- constraints and non-goals
- technology preferences and delivery constraints

### Stage 3: Competitive Analysis

Before investing deeply in implementation, understand the product landscape and determine whether the product is worth pursuing.

Expected output:

- `_docs/competitive-analysis.md` or an equivalent market-analysis document

Use the `competitive-analysis.md` workflow template when it is available.

The analysis should help answer:

- what alternatives already exist
- how the product can differentiate
- whether the market is attractive enough to justify development
- what risks, opportunities, and positioning considerations matter early

This document should inform product choices, not replace them.

When `Initialize project` is being used, this stage should happen after product framing so the analysis is grounded in an explicit product hypothesis.

### Stage 4: MVP Planning

Once the product goals and landscape are understood, define the first meaningful version of the product.

Expected output:

- an MVP plan document in `_docs/plans/backlog/` unless the user explicitly
  asks to activate an already reviewed plan

The MVP plan should:

- define the intended end state for the initial shippable product
- organize implementation into phases
- identify major risks, tradeoffs, and unknowns
- create a practical structure for execution

When the project has just been initialized, this plan should be derived from:

- the product summary
- the competitive analysis
- the current level of implementation readiness

Place new MVP plans in `_docs/plans/backlog/`. Move them into `_docs/plans/`
only after an explicit `plan-activate` request.

### Stage 5: Active Implementation

This is the main execution loop for day-to-day work.

Every non-trivial effort should run through the following sequence:

1. Review existing code, tests, knowledge-base docs, and active plans.
2. Create a new plan or update an existing active plan.
3. Implement in small, verifiable slices.
4. Run the relevant verification.
5. Update docs to match the resulting accepted behavior.
6. Record lessons worth preserving.

If code, knowledge-base docs, and plans disagree, identify the drift explicitly and resolve it deliberately.

### Stage 6: Completion and Design Promotion

Completing a plan means more than merging code.

Expected outputs:

- working code
- relevant verification completed, or verification gaps explicitly documented
- active plan updated to reflect the finished state
- durable current-state knowledge promoted into `_docs/kb`
- completed plan archived under `_docs/plans/completed/`

The goal is that completed plans do not remain the only place where final design truth lives.

For a newly initialized project, the desired long-term outputs of this workflow are:

- working code
- strong verification coverage appropriate to the product
- current implemented knowledge documents under `_docs/kb`
- completed execution plans archived under `_docs/plans/completed/`

## Documentation Model

The documentation model separates reusable agent process, stable project truth,
and active execution.

### `.agents`

- This directory holds reusable AI-agent process structure.
- `.agents/workflow.md` captures workflow rules that can travel across projects.
- `.agents/packages/workflows/<source>/<workflow>/guidance/` holds
  workflow-owned shared and activity guidance origins.
- `.agents/guidance/` holds project-owned workflow guidance overrides after
  publishing.
- `.agents/roles/<role>/GUIDANCE.md` holds active role guidance when the role
  provides it.
- `.agents/skills/` holds reusable workflow skills.
- Do not place project product knowledge, design truth, or execution records in
  `.agents/`.

### `_docs/kb`

- This directory holds current implemented project knowledge.
- Documents in this directory should describe behavior that exists now, not
  future intent or superseded history.
- Knowledge-base docs should reflect the latest accepted iteration of the
  codebase.
- Treat this directory as the durable reference for how the system behaves.
- Every implementation change, including a micro-fix, should include a
  regression analysis for knowledge-base impact. Most micro-fixes may require
  little or no docs update, but the decision should follow from the behavior
  touched.

### `_docs/plans`

- This directory is the working space for planning and execution records.
- `_docs/plans/*.md` holds active in-progress work only.
- `_docs/plans/backlog/*.md` holds future work that is intentionally not started yet.
- `_docs/plans/completed/` holds archived plans after implementation and design promotion are finished.
- Every non-trivial effort starts with a plan document unless an existing active plan already covers the work.

### Knowledge-Base Routing Examples

- A new user-facing command or changed command output usually updates
  `_docs/kb/01-product/`, `_docs/kb/02-requirements/`, and possibly glossary
  terminology. Route product behavior to `product-designer`, requirements to
  `requirements-engineer`, and wording to `ux-writer`.
- A changed manifest, lockfile, package-store, activation, template, role, or
  workflow lifecycle usually updates `_docs/kb/03-architecture/` and
  `_docs/kb/07-decisions/`. Route architecture and decisions to
  `technical-architect`.
- A changed overwrite, remove, update, trust, source, credential, dependency,
  or destructive-operation path usually updates `_docs/kb/04-security/`.
  Route this to `security-engineer`.
- A changed test strategy, release check, manual validation path, regression
  gate, or known verification gap usually updates `_docs/kb/05-quality/` and
  sometimes `_docs/kb/06-operations/`. Route quality to `quality-engineer`.
- A changed build, package, release, rollback, smoke-check, or recovery
  workflow usually updates `_docs/kb/06-operations/`. Route operating
  topology to `technical-architect` and release verification to
  `quality-engineer`.
- Cross-links, placement, stale references, duplicate current-state claims,
  and migration consistency are coordinated by `documentation-specialist`, but
  that role does not replace domain owners for product, requirements,
  architecture, security, quality, operations, or decisions truth.

### Relationship Between Code, Design, Plans, and Workflow

- Code is the implemented behavior.
- `_docs/kb` is the current implemented knowledge for the system.
- `_docs/plans` is the temporary and evolving design space for active work.
- `_docs/plans/backlog` captures planned-but-not-started work.
- This document captures reusable workflow guidance learned across efforts.

When plan work is completed, durable current-state knowledge must be moved into `_docs/kb`, and useful lessons should be harvested to improve this workflow.

Do not interpret a documentation-impact review as permission to update
`_docs/kb` during active-plan execution. Until plan completion, `_docs/kb` is
read-only for plan work; the active plan is the place for incomplete findings,
proposed wording, and promotion candidates.

## Lifecycle Gates, State, and Authority Contract

This section is the normative lifecycle contract. Plans remain the durable
record; conversation, passing tests, and delegated recommendations never
substitute for a recorded gate or task transition. The project-manager owns
reconciliation of plan state, while the role named in the table is accountable
for the gate result.

### Nine lifecycle gates

| Gate | Accountable owner | Required collaborators | Acceptance signal and durable location |
| --- | --- | --- | --- |
| Routing | `project-manager` | assigned specialist | Work mode, plan, phase, and procedure are identified in the execution record. |
| Vision | `product-owner` | `requirements-engineer`, developer/Boss | Context and High-Level Goal are accepted by Boss; record inline on those headings and in an approval record. |
| Design Intent | `technical-architect` | `requirements-engineer`, `security-engineer`, `quality-engineer`, product owner | Design Intent, boundaries, invariants, and verification direction are accepted by Boss; record inline and in an approval record. |
| Plan | `project-manager` | `technical-architect`, `requirements-engineer`, `quality-engineer` | Ordered phases/tasks, dependencies, scope, and evidence expectations are accepted by Boss; record in the plan and approval record. |
| Activation | `project-manager` | `product-owner`, `quality-engineer` | Boss explicitly authorizes activation; record on plan Status and in an approval record before implementation. |
| Task Start | assigned task owner | `project-manager` | Task changes `⬜️` to `🟨` before work; record owner, assigned actor, and `started-at` on the task. |
| Task Completion | assigned task owner | `quality-engineer`, `project-manager` | Evidence supports `✅`, or a reason and next action support `⚠️`; record transition metadata on the task. |
| Phase Close | `project-manager` | `quality-engineer`, phase owners | All tasks and success goals pass, with evidence and risks reconciled; record on the phase heading/evidence. |
| Plan Close | `project-manager` | `quality-engineer`, `security-engineer`, `documentation-specialist`, developer/Boss | Human validation, design promotion, documentation, risks, and checklist pass; Boss approves closeout in the plan and approval record. |

Boss approval is required at Vision, Design Intent, Plan acceptance, Activation,
and Plan Close. Agent-controlled gates may advance from evidence, but may not
infer a Boss decision. Gate records identify `gate`, `status`, `owner`,
`actor`, `timestamp`, `evidence`, and (for human gates) `approval-id`.

### Canonical task state machine

Tasks use exactly four primary markers: `⬜️` not started, `🟨` in progress,
`✅` completed, and `⚠️` blocked or requiring follow-up. Valid transitions are
`⬜️ → 🟨` at Task Start, `🟨 → ✅` after implementation and verification
evidence, and `🟨 → ⚠️` when work cannot safely or completely proceed. A
`⚠️ → 🟨` reopen requires a recorded reason, next action, actor, and timestamp;
`⚠️ → ✅` is allowed only when the missing work is completed and verified.
`✅` is terminal for the current scope; reopening it requires a new scoped
plan/task decision and must not erase historical evidence. Direct
`⬜️ → ✅`, `⬜️ → ⚠️`, or silent marker edits are invalid.

Every transition records the accountable `owner`, concrete `assigned` actor or
run ID, transition actor, UTC timestamp, and evidence reference. Start records
`started-at`; completion records `completed-at`, completion reason, changed
files/artifacts or decision references, verification commands/results,
validation/sign-off when required, documentation impact, and residual risks.
Blocked records additionally state a reason (`deferred`, `skipped`,
`superseded`, `awaiting Boss approval`, or dependency/verification blocker) and
an actionable next step. A lightweight task may use a compact inline record,
but omitted fields are permitted only when not applicable; completion evidence
and actor/timestamp are never optional. The project-manager reconciles
localized delegated updates and rejects stale or conflicting edits without
removing either report.

### Durable Boss approval records

Human gates use an inline record in the affected plan section (and a local
reference from the related phase/task when applicable):

```yaml
approval-id: AP-YYYYMMDD-NNN
approver: Boss
actor-id: rcravens
approved-at: 2026-01-01T00:00:00Z
approval-language: "Boss, I approve <gate> for <plan> [subject to <conditions>]."
decision: approved
scope-conditions: []
evidence: ["plan-section-or-review-reference"]
```

`approval-id`, human-facing `approver`, UTC `approved-at`, exact
`approval-language`, `decision` (`approved` or `rejected`), and
`scope-conditions` are required. An approval record is evidence, not an
identity assertion: it is valid only when copied from an authenticated direct
Boss response in the current session or other repository-approved human
channel. Agents, delegated workers, quoted history, plan text, and test output
must never create, infer, or countersign a human approval. `actor-id` is
optional only when the approved channel cannot expose one and must be
`rcravens` when that environment identity is known; otherwise the record is
invalid pending human confirmation. Approval language must explicitly name the
gate and scope; phrases such as “looks ready,” test results, or workflow
momentum are not approval. Rejection records the reason and next action.
Complex approvals may additionally use one structured record under Open
Questions / Decisions, but the inline reference remains mandatory.

### Agent-controlled checks and escalation

Agents may perform routing, ownership, dependency, sequencing, task-marker,
evidence, in-scope quality/security, documentation, and unchanged-scope phase
checks without pausing. Before advancing one, check the accepted plan version,
required fields, dependencies, evidence references, and absence of conflicting
edits. Every mutation carries the plan revision/hash it read (`base-revision`)
and receives a new monotonic revision; a changed revision or hash fails closed
and preserves both inputs for PM reconciliation. Record the check actor, UTC
timestamp, result, and evidence in the plan execution record. The active plan
and `_docs/` content are project/user-owned: agents may make only targeted,
scoped edits, must preserve unrelated and unrecognized content, and must not
rewrite, regenerate, or delete user-authored sections or managed workflow
assets as a side effect of a state transition. A failed check uses `⚠️` where it affects a task and names the
next action.

Immediately stop the affected work and escalate to Boss when the proposed
advance would change accepted product/design intent or scope, waive a safety or
quality finding, accept material residual risk, publish externally, activate a
backlog plan, or close/archive a plan. A safety waiver additionally requires a
separate waiver record naming the finding, impact, mitigation, expiry/review
date, and explicit authenticated Boss approval; a task or phase transition
never waives a finding implicitly. Also escalate stale-plan or concurrent
edits when reconciliation cannot establish which accepted state is current.
The escalation record names the gate/task, asking role, issue, impact, options
or recommendation, blocking effect, required Boss response, and evidence
reference. Agents must not self-approve these conditions; Phase 3 trigger
routing and Phase 4 migration remain outside this contract.

## Trigger Routing and Delegation Contract (Phase 3)

Triggers are routing hints, not authority. Normalize conversational phrases and
slash commands to one canonical object-verb intent before selecting a
procedure or role. The following canonical intents are stable; listed phrases
are aliases and may be extended only in the workflow team metadata:

| Canonical intent | Conversational aliases | Slash alias | Procedure | Primary role |
| --- | --- | --- | --- | --- |
| `brainstorm.explore` | brainstorm; explore ideas; what should we build? | `/brainstorm` | `brainstorming-skill` | `product-owner` |
| `vision.clarify` | define the goal; capture the why; set scope | `/vision` | `requirements-clarify` | `product-owner` |
| `design.shape` | design intent; define boundaries; design this | `/design` | `design-intent` | `requirements-engineer` |
| `plan.create` | plan phases; break into tasks; sequence the work | `/plan` | `plan-create` | `project-manager` |
| `plan.review` | review this plan; plan readiness | `/plan-review` | `plan-review` | `quality-engineer` |
| `plan.activate` | activate this plan; start implementation | `/activate` | `plan-activate` | `project-manager` |
| `phase.start` | execute Phase <n>; start Phase <n> | `/phase start <n>` | `phase-execute` | `project-manager` |
| `task.start` | start this task; work on task <id> | `/task start <id>` | `task-execute` | assigned task owner |
| `work.verify` | verify the work; run the quality gate | `/verify` | `work-verify` | `quality-engineer` |
| `docs.promote` | promote the design; refresh the KB | `/docs refresh` | `design-promote` | `documentation-specialist` |
| `plan.close` | complete the plan; close out; archive | `/close` | `plan-complete` | `project-manager` |

Routing precedence is: explicit slash/object-verb command, exact canonical
phrase, exact alias, then unambiguous natural-language intent. Prefer the
narrowest procedure and the most specific phase/task identifier. Approval
intents (`plan.approve-design`, `plan.activate`, `plan.approve-closeout`) are
separate from descriptive phrases such as “looks ready”; descriptive language
never counts as approval. If two intents remain plausible, do not guess:
return a clarification listing the matched intents and preserve the input.

Every routing result preserves `plan`, `plan-revision`/`base-revision`, phase,
task, section owner, accepted decisions, constraints, and current work mode.
Missing or conflicting context is a routing failure, not permission to select a
different plan. A routing result records the normalized intent, matched alias,
procedure, role, context identifiers, and evidence required by the selected
procedure.

### Delegation packet

A delegated handoff is valid only with a packet containing: `packet-id`, plan
path and revision, phase/task/section identifiers, accountable section owner,
assigned role and actor/run ID, work mode, accepted decisions, constraints and
non-goals, expected bounded output/files, dependencies, gate authority, and
required evidence. Required evidence always includes status transition,
changed files or artifacts, commands and results, validation/sign-off when
applicable, documentation impact, residual risks, and a conflict/base-revision
reference. The worker may report or make only the scoped update granted by the
packet; the project-manager reconciles the result into authoritative plan
state.

Routing and delegation must fail closed when the plan is backlog or inactive,
context is stale/conflicting, the task is unassigned, or required packet fields
are absent. No trigger or packet can activate a plan, approve Vision/Design
Intent/Plan/Activation/Close gates, waive a security or quality finding,
publish externally, or archive a plan. Those actions require their existing
human approval, safety, release, and closeout records; a trigger only selects
the procedure that checks those gates. An invalid authority claim is recorded
as rejected evidence and escalated rather than downgraded to a normal task.

## Plan Mode Default

Plan mode is the default starting point for non-trivial work.

- The first output of plan mode is a new or updated backlog plan document.
- The backlog plan is the source of truth for review until a later explicit
  activation moves it into active work.
- If new information changes the intended approach, update the plan document before continuing implementation.
- If a bug fix or validation issue is discovered while working an active plan, capture that work in the existing plan instead of creating a separate standalone plan.

### When Plan Mode Applies

- Multi-file changes
- Architectural or schema changes
- New features or major behavior changes
- Production-impacting fixes
- Work that will take multiple implementation phases

### When Plan Mode Can Be Skipped

- Localized bug fixes or UX/UI improvements when existing `_docs` already
  capture the intended behavior and there is no meaningful design impact
- Mechanical edits with obvious scope and negligible risk

Use the micro-fix escalation criteria in `Work Classification` when deciding
whether a change remains small enough to proceed without a plan.

## Micro-Fix Completion Record

A micro-fix does not need a one-off plan merely to satisfy process. Use the
normal conversation handoff as the execution record when the change is trivial,
localized, and still within the micro-fix criteria.

The final handoff for a micro-fix should include:

- Scope: what narrow behavior or document issue was changed
- Files changed: the concrete files touched
- Knowledge-base impact: the `_docs/kb` area checked or updated, or why no
  current-state doc change was needed
- Verification: the targeted check, command, or manual review performed
- Documentation impact: whether `_docs/kb`, lessons, focused guidance, or no
  further docs changed
- Escalation: whether the work stayed a micro-fix or why it needed a plan

Use this compact format when it helps make the record clear:

```text
Micro-fix record:
- Scope:
- Files changed:
- Knowledge-base impact:
- Verification:
- Documentation impact:
- Escalation:
```

Update `_docs/kb` when an explicitly approved micro-fix changes accepted
current-state behavior or clarifies behavior that future agents should treat
as stable truth. Active-plan work must defer that update until plan completion.
Update
`_docs/lessons-learned.md` when the fix reveals a reusable product or
architecture lesson. Update focused role or activity guidance, or this
workflow, when the fix changes how agents or engineers should work.

Escalate out of micro-fix handling as soon as the change grows beyond the
criteria in `Work Classification`. At that point, create or update a backlog
plan and wait for explicit activation before continuing implementation.

## Plan Document Requirements

Each plan document in `_docs/plans` should include, at minimum, the following sections.

### 1. Context

- What problem is being solved
- What repo, product, or market context was reviewed
- Any assumptions or constraints that materially shape the work

Plans must also include a `Completion Checklist` section. If the plan was
created manually, compare it with the active `plan.md` template and repair
missing required sections before treating the plan as ready or complete.

Classify documentation impact by knowledge-base area when work changes durable
current-state behavior:

- Product: user flows, interaction behavior, UX principles, and user-facing
  acceptance signals
- Requirements: actors, workflows, use cases, constraints, non-goals, and
  acceptance criteria
- Architecture: subsystem boundaries, contracts, data flow, lifecycle state,
  module maps, invariants, and failure modes
- Security: trust boundaries, secrets, authorization, destructive operations,
  supply-chain risk, and auditability
- Quality: verification strategy, regression risk, test matrices, manual
  validation, release checks, and known gaps
- Operations: build, deployment, runtime, release, rollback, smoke checks, and
  incident validation
- Decisions: accepted tradeoffs and current decisions
- Glossary: shared terminology

Use diagrams, images, tables, sequence traces, lifecycle diagrams, state
machines, request traces, data-flow traces, or command-flow traces when they
explain architecture, lifecycle, interaction, security, data flow, or
operations more clearly than prose. If a relevant visual is omitted, record why
prose is clearer or sufficient.

For product-facing release work, record the readiness category and evidence:
prototype-ready, internal-use-ready, beta-ready, or production-ready.

### 2. Design Intent

- The intended end state for the change
- The key behaviors, interfaces, boundaries, and invariants that should exist when the work is complete
- Any design decisions that should later become part of the knowledge base
- For backlog plans, track review acceptance inline on the relevant section
  heading once accepted, for example `### Design Intent (status: accepted)`.

### 3. Implementation Phases

- Organize the work into ordered phases
- Each phase should have a clear objective
- Each phase should contain concrete tasks
- Each phase should define success goals so completion can be judged explicitly
- Include verification expectations where relevant
- Every future or incomplete implementation phase must include a final
  `Review & Refactor` task
- The `Review & Refactor` task should be the last task in the phase, after
  implementation and targeted verification tasks
- Do not mark a phase complete until its `Review & Refactor` task is complete
  or an explicit follow-on risk has been recorded
- If a completed phase is reopened, mark its `Review & Refactor` task as
  in progress so the changed phase receives a fresh maintainability review
  before it is closed again
- When updating an active or backlog plan, add `Review & Refactor` to any
  future or incomplete phase that does not already include it
- For backlog plans, track phase acceptance inline on each phase heading once
  accepted, for example `#### Phase 1: Name (status: accepted)`.
- Do not add a detached review-gates section after acceptance. Status should
  stay with the section or phase it describes.

### Task Status Tracking

- Use `⬜️` for not started tasks
- Use `🟨` for tasks that are currently in progress
- Use `✅` for completed tasks
- Use `⚠️` for items that are implemented or substantially complete but still have a known validation gap, follow-up risk, or manual verification outstanding
- Apply these markers directly in phased task lists so plan progress is visible at a glance
- Keep task status current as work progresses so the plan document remains an accurate execution record

### 4. Open Questions, Risks, or Follow-On Work

- Capture unresolved decisions, rollout concerns, dependencies, and known tradeoffs

### 5. Lessons

- Capture implementation feedback, mistakes, surprises, and process improvements discovered during the work
- Record only lessons that are reusable or likely to matter again
- Bug-fix lessons discovered while executing an active plan should stay in that plan unless they are general enough to change this workflow

### 6. Promotion to Design

- Identify which `_docs/kb` documents need to be created or updated when the work is complete

## Implementation Workflow

### 1. Review Existing Context

- Read the relevant code, tests, and documentation before editing
- Check `_docs/kb` for current implemented behavior
- Check `_docs/plans` for active related implementation work
- Check `_docs/plans/backlog` for future work that may overlap or should be promoted to active
- Read `_docs/plans/completed` only when relevant historical context is needed
- If the work is early-stage product definition, also review the product summary and competitive analysis if they exist

### Active Plan Resolution

When an execution skill needs an active plan, resolve it this way:

1. If the user names a plan file, use that file.
2. If the user names no plan file, inspect active plan files directly under
   `_docs/plans/`.
3. Treat files under `_docs/plans/backlog/` as backlog plans and files under
   `_docs/plans/completed/` as completed plans, not active candidates.
4. If exactly one active plan file exists, select it and say it was selected
   because it is the only in-progress plan.
5. If no active plan file exists, stop and ask for the plan to execute.
6. If more than one active plan file exists, stop and ask which plan to use.
7. Stop if the selected plan is backlog or completed when active-plan work is
   required.

### 2. Create or Update the Plan

- Create a new backlog plan document for the change, or extend an existing active plan if the work clearly belongs there
- Place new plans in `_docs/plans/backlog/*.md`
- Move backlog work into `_docs/plans/*.md` only when the user explicitly requests `plan-activate`
- Do not implement backlog work until activation is complete
- Define the design intent and implementation phases before coding
- Prefer phased delivery that reduces risk and makes verification straightforward
- Do not create a separate bug-fix plan for issues found while validating or completing an already active implementation plan
- Create a standalone plan only when the work is independent of the current active plans

### 3. Implement in Small Slices

- Follow existing project conventions before introducing new abstractions
- Prefer thin, verifiable increments over broad changes
- Fix the problem at the right layer rather than patching symptoms
- Keep related docs updated when implementation materially changes the intended design

### 4. Verify Before Declaring Completion

- Choose the targeted test, deterministic check, or manual repro that most
  directly covers the changed behavior
- Tests may be written before, during, or after the implementation. The required
  outcome is that important design intent is locked down by automated tests when
  automation is practical.
- Use manual verification only when automated coverage would be impractical or
  low-value, and record that judgment in the plan or final handoff.
- Run broad repository checks only after targeted verification passes, or after
  a targeted-check failure or blocker is recorded with residual risk
- Run the relevant tests, lint, typecheck, build, or deterministic manual repro
- Compare baseline behavior against changed behavior when relevant
- If verification cannot be run, say what was not verified and how it should be checked

### 5. Review And Refactor Before Phase Closeout

Use this step to complete the final `Review & Refactor` task in each phase.

1. Review the phase's changed surface, including code, tests, docs, config,
   workflows, generated artifacts, and other changed project assets.
2. Check that the work is still understandable, cohesive, appropriately
   organized, and aligned with existing ownership boundaries and repository
   patterns.
3. Look for obvious maintainability issues introduced during the phase, such
   as mixed responsibilities, unclear names, duplicated rules, overly broad
   files or artifacts, hidden side effects, or tests that require excessive
   setup.
4. Apply small, behavior-preserving refactors that reduce the risk of carrying
   those issues forward.
5. Re-run the targeted verification affected by the refactor, plus any broader
   checks required by the phase.
6. If a structural issue is too large or risky to fix inside the phase, record
   it as an explicit risk or follow-on task before marking `Review & Refactor`
   complete.

Keep the review scoped to the phase's changed surface. Do not use phase
closeout for unrelated cleanup, speculative abstractions, or broad
reorganization that belongs in a separate plan.

### 6. Complete the Plan

- Confirm that the phase success goals were met
- Update the plan document to reflect what was completed, what changed, and any remaining risks or follow-on work
- Make sure the plan captures durable lessons worth preserving

## Plan Completion and Design Promotion

When work covered by a plan document is complete:

1. Verify that the implementation matches the intended outcome.
2. Move durable current-state knowledge into a new or existing document in `_docs/kb`.
3. Remove ambiguity about what is still future work versus what is now current-state knowledge.
4. Use the completed plan as an inspection guide, then verify and refresh
   `_docs/kb` against implemented behavior, tests, and accepted evidence.
5. Run `$review-and-refresh-docs` to check links, placement, duplication,
   depth, and current-state accuracy against implemented behavior.
6. Record unresolved implementation-vs-intent conflicts as open decisions,
   risks, or follow-up plan candidates instead of treating the docs as
   acceptable.
7. Add an operator-understanding closeout summary for meaningful work. Cover
   what changed, important boundaries, data touched, failure modes, evidence,
   unverified areas, and manual inspection needs.
8. Review the plan's `Lessons` section.
9. Harvest reusable workflow improvements from those lessons into this document.
10. Move the completed plan document into `_docs/plans/completed/`.
11. Rename the completed plan file to prefix it with the completion date using `YYYY-MM-DD-<original-name>.md`.

### Completed Plan Archiving

- Completed plans should not remain mixed with active work in `_docs/plans`
- Archive completed plans under `_docs/plans/completed/`
- Prefix archived plan filenames with the completion date
- Use the format `YYYY-MM-DD-<current-name>.md`
- The date prefix should reflect when the plan was completed, not when it was first created

### Archive Readiness Checklist

Before archiving a plan, confirm all of the following:

- All plan tasks are marked as completed
- Current-state knowledge from the plan has been distributed into the appropriate files under `_docs/kb`
- Related current-state docs outside `_docs/kb` (for example `README.md`, handoff docs, or other repo-level reference docs) have been reviewed and updated if they describe the affected architecture, runtime, setup, QA flow, or release flow
- The `_docs/kb` structure has been reviewed for any refactors or reorganization needed to keep the docs clear and easy to navigate
- Any new knowledge-base docs are referenced from related docs where appropriate and can be discovered through the current documentation entry points used by the repo
- Visuals, diagrams, tables, or traces were added where they convey meaning
  better than prose, or the plan records why prose was enough
- Relevant verification is in a good state, with the goal of keeping the system dependable
- Meaningful work has an operator-understanding closeout summary
- The plan no longer contains active implementation work, unresolved execution tasks, or validation follow-up that should remain in `_docs/plans`

## Communication Expectations

### During Work

- Provide concise progress updates when starting, when scope changes, when risks appear, or when verification fails
- Do not narrate every minor step
- Surface important assumptions and blockers clearly

### Final Delivery

- Lead with outcome and impact
- Reference concrete artifacts such as file paths, commands, or failing checks
- Summarize verification performed
- If something was not verified, state that directly
- Always report documentation impact: documents changed, documents reviewed
  with no change needed, or why documentation was not relevant to the task
- Call out doc updates when code or design intent changed

## Error Handling and Recovery

- If unexpected failures appear, stop adding scope and return to diagnosis
- Preserve evidence such as errors, logs, or repro steps
- Reproduce, localize, reduce, fix root cause, add coverage where appropriate, and verify the original report
- Prefer safe defaults and actionable failures over partial or silent behavior

## Coding and Design Rules

- Prefer explicit names and straightforward control flow
- Avoid adding dependencies unless the existing stack cannot solve the problem cleanly
- Keep error semantics consistent within a code path
- Validate untrusted input at boundaries
- Avoid type suppressions unless there is no reasonable alternative
- For UI work, preserve accessibility, predictable interactions, and clear states

## Git and Worktree Safety

- Treat a dirty worktree as normal and inspect before editing
- Never revert unrelated changes you did not make unless explicitly asked
- Do not overwrite user changes without understanding them
- Avoid destructive git operations unless explicitly requested
- Keep changes atomic and easy to review

## Definition of Done

A task is done when:

- The implementation matches the accepted design intent
- Important design intent has automated test coverage where practical
- Relevant verification has been run, or any gaps are explicitly documented
- The active plan document reflects the final state of the work
- The phase's `Review & Refactor` task has been completed, with any remaining
  structural concerns fixed or recorded as explicit follow-on work
- Durable current-state knowledge has been promoted into `_docs/kb` when the work is complete
- Reusable lessons have been considered for inclusion in this document

## Plan Template

Use this shape for active plan documents in `_docs/plans` and optionally for backlog plans in `_docs/plans/backlog`.

### Title

Brief name for the effort.

### Context

- Problem statement
- Existing context reviewed
- Constraints and assumptions

### Design Intent

- Intended end state
- Key decisions
- Boundaries and invariants

For accepted backlog plans, write this heading as:

```text
### Design Intent (status: accepted)
```

### Implementation Phases

#### Phase 1: Name

- Objective
- Tasks
  - `⬜️` Not started task
  - `🟨` In progress task
  - `✅` Completed task
  - `⬜️` Review & Refactor
- Success goals
- Verification

For accepted backlog phases, write phase headings as:

```text
#### Phase 1: Name (status: accepted)
```

#### Phase 2: Name

- Objective
- Tasks
  - `⬜️` Not started task
  - `🟨` In progress task
  - `✅` Completed task
  - `⬜️` Review & Refactor
- Success goals
- Verification

### Open Questions / Risks

- Outstanding decisions
- Rollout or migration concerns

### Lessons

- Reusable implementation or workflow learnings

### Promotion to Design

- Which `_docs/kb` documents need to be created or updated when the work is complete

## Agent-operational contract quick reference (Phase 4 adoption)

Use this contract as the compact operating reference when a request, handoff, or
plan record is ambiguous. The detailed gate and routing sections above remain
normative.

| Concern | Required record or action | Accountable authority |
| --- | --- | --- |
| Purpose and entry | State the goal, work mode, selected plan/phase/task, accepted decisions, and dependencies before acting. | Project-manager routes; assigned role confirms task scope. |
| Ownership | Identify `owner` (accountable role), `assigned` (worker/run ID), and collaborators; never treat `assigned` as authority to rewrite plan state. | `team.md` owns stable domains; project-manager reconciles plan state. |
| Gates | Check the applicable gate, entry conditions, evidence, and exit criteria; distinguish agent-controlled checks from Boss approval. | Gate owner; Boss for Vision, Design Intent, Plan, Activation, and Close. |
| Task state | Change `⬜️` to `🟨` before work, then `✅` only with evidence or `⚠️` with reason and next action. | Assigned task owner reports; quality-engineer validates; project-manager reconciles. |
| Collaboration | Ask focused clarification, recommendation, decision, approval, or status requests with affected scope, impact, and requested response. | Asking role; project-manager coordinates duplicates and conflicts. |
| Compact metadata | Retain `owner`, `assigned`, `started-at`/`completed-at`, actor, timestamp, evidence, validation, docs impact, and residual risk as applicable. | Task owner supplies; project-manager accepts. |
| Escalation | Stop and escalate scope/design changes, safety waivers, material risk, stale/conflicting revisions, publication, activation, or archival. | Project-manager escalates; Boss decides human gates. |

### Standard handoff and approval examples

A valid task handoff is concise and task-scoped:

```yaml
packet-id: PK-20260906-004
plan: _docs/plans/example.md
plan-revision: rev-12
phase: Phase 2
task: task-3
owner: implementation-engineer
assigned: subagent-123
work-mode: active-plan
accepted-decisions: [DEC-42]
constraints: ["do not change accepted scope", "preserve user edits"]
expected-output: ["source change", "targeted test", "task evidence"]
evidence-required: ["status transition", "commands/results", "validation", "risks"]
```

Remove the accidental leading space before `task` when copying this example
into a YAML parser. An approval is separate from a recommendation:

```yaml
approval-id: AP-20260906-001
approver: Boss
actor-id: rcravens
approved-at: 2026-09-06T18:00:00Z
approval-language: "Boss, I approve Activation for _docs/plans/example.md."
decision: approved
scope-conditions: []
evidence: ["Status#activation"]
```

Agents may prepare these records, but only an authenticated direct Boss response
may create an approval record. Examples are formatting aids, not authorization.

### Troubleshooting lifecycle failures

- **Backlog or inactive plan:** stop before implementation; request explicit
  activation and record it using the Activation approval schema.
- **Missing owner, packet field, or evidence:** keep the task `⬜️` (or `⚠️` if
  already started), report the missing field, and return to the project-manager.
- **Stale or concurrent revision:** do not overwrite either version. Preserve
  both reports, include `base-revision`, and ask the project-manager to
  reconcile; escalate to Boss if accepted scope or a human gate is affected.
- **Boss response needed:** classify the request, identify the affected plan
  section/task and blocking impact, then pause only dependent work. Continue
  independent authorized work when safe.
- **Verification failure:** do not mark `✅`; record command, result, residual
  risk, and actionable next step under `⚠️`.
- **Unclear trigger:** do not guess. Return the matched intents, preserve plan
  context, and request clarification; triggers never grant authority.
- **Unexpected user edits or unsafe file operation:** stop, preserve the edit,
  and escalate rather than regenerating, overwriting, deleting, or publishing.
