# PM improvements

## Status

📝 Planning Draft

This backlog plan captures the initial direction for improving the
project-manager operating contract. It does not authorize implementation.

## Context

The current `project-manager` role gives AIX a single routing point for
meaningful project requests and defines bounded delegation through PM Context
Packets. A review of Firstmate's operating contract surfaced additional ideas
for making that model behave more like a real project team: the PM should be a
clear user-facing coordinator, worker authority should be explicit, task
briefs and results should be durable, and the root agent instructions should
stay concise while conditional procedures live elsewhere.

Reviewed context:

- `AGENTS.md`
- `.agents/README.md`
- `.agents/workflow.md`
- `.agents/roles/project-manager/ROLE.md`
- `.agents/roles/project-manager/GUIDANCE.md`
- `.agents/roles/project-manager/workflow.GUIDANCE.md`
- `.agents/skills/plan-create/SKILL.md`
- `.agents/skills/delegate-to-role/SKILL.md`
- `_docs/README.md`
- `_docs/kb/README.md`
- `_docs/kb/03-architecture/roles-and-templates.md`
- `_docs/kb/03-architecture/system-architecture.md`
- [Firstmate `AGENTS.md`](https://github.com/kunchenguid/firstmate/blob/main/AGENTS.md)
- [Firstmate `docs/architecture.md`](https://github.com/kunchenguid/firstmate/blob/main/docs/architecture.md)
- [Firstmate `docs/scripts.md`](https://github.com/kunchenguid/firstmate/blob/main/docs/scripts.md)
- Discussion on keeping always-loaded `AGENTS.md` content minimal while
  preserving project-owned instructions.

## High-Level Goal (status: accepted)

Improve AIX's project-manager operating model so the user has one clear
project coordinator, while specialist roles can work through bounded,
independent delegations with explicit authority, durable evidence, and
host-neutral execution semantics.

## Design Intent (status: draft)

### UX

The user should experience AIX as a project team with one visible point of
contact: the project-manager. AIX setup prepares the project; the user's
chosen AI harness provides the conversation; the PM coordinates the work
inside that conversation.

The intended journey is:

1. The user installs AIX using the normal package-manager flow.
2. The user runs `aix init` in a project. By default, AIX initializes only the
   package-management layer, including project metadata, extension
   configuration, lock and integrity tracking, status, verification, install,
   update, and removal support. It does not install the PM role, the
   `design-plan-execute` workflow, or modify `AGENTS.md` for PM routing.
3. If the user wants the project team workflow, they explicitly install and
   activate `design-plan-execute`. That workflow declares `project-manager` as
   a required dependency, so AIX resolves and installs the PM role and its
   supporting guidance, skills, and roles. Activation makes the PM the active
   project orchestrator and adds the minimal managed routing block to
   `AGENTS.md` without replacing project-owned content.
4. The user opens the project in a supported AI harness and starts a normal
   project conversation. The harness loads `AGENTS.md`, which directs
   meaningful work to the project-manager role.
5. The user describes the outcome they want in ordinary project language.
   The PM clarifies only when needed, turns the request into a plan or task
   sequence, and delegates bounded work to independent native sub-agents.
6. The PM gives the user concise progress, decisions, blockers, and final
   outcomes. Specialist transcripts should not become the user's primary
   interface.
7. The user remains the decision-maker for product choices, risky or
   irreversible actions, and final merge or release decisions. The PM should
   pause and bring those decisions back to the user.
8. The user can inspect project status and durable delegation evidence through
   AIX diagnostics without needing to reconstruct the work from chat history.

The first-run experience should make the boundary clear. `aix init` does not
silently adopt a project workflow, create a hidden long-running PM process, or
require AIX to own a separate agent manager. It prepares only the package
manager. Installing and activating a workflow is the explicit point where the
project opts into additional AI-agent conventions.

Installing a workflow should not imply activation. A workflow may be installed
for inspection or later use, but activation is what changes the active project
workflow and enables PM routing. The package manager should record dependency
provenance so the project can tell that `project-manager` was installed by
`design-plan-execute`, and can safely handle future shared dependencies.

The experience should remain harness-neutral. AIX should explain the same PM
workflow whether the user works in Codex, Claude Code, Gemini CLI, Cursor,
OpenCode, or another supported harness. The exact launch command, any
`aix pm` convenience command, and the UI used to display native workers remain
implementation decisions, but they must not change the PM's single-contact
interaction model.

If the active harness lacks native delegation, AIX should say so plainly. The
user can still use the package-manager features, inspect the installed
workflow, and repair or verify project assets. If the PM workflow is installed
and active, the full team workflow should report that native delegation is
unavailable rather than pretending that inline role prompts are independent
agents.

### `AGENTS.md`

Revise the AIX-managed `AGENTS.md` project entrypoint so it establishes the
project-manager as the primary user-facing orchestrator for meaningful project
work. The contract should clearly distinguish the responsibilities of the
project-manager, delegated specialist roles, and the user.

The direction is to capture a small set of always-loaded rules in `AGENTS.md`:

- The project-manager is the single user-facing coordination point.
- The project-manager routes and supervises work but does not perform
  specialist implementation, review, verification, documentation, or
  lifecycle work itself.
- Delegated roles receive bounded assignments and own the work assigned to
  them.
- The parent context retains final decisions, lifecycle authority, worktree
  safety, and user-facing reporting.
- Delegation must preserve explicit scope, authority, stop conditions, and
  return evidence.
- The project-manager should report failures, blockers, incomplete evidence,
  and unresolved decisions plainly.
- Plans and project knowledge remain separate from transient delegation and
  runtime state.
- The contract should remain host-neutral. It must describe the delegation
  model without assuming Codex, Claude, a terminal multiplexer, or any other
  specific harness.

The AIX-managed block should remain a short routing pointer and hard-rule
summary, not a copy of the project-manager role, workflow procedures, or
delegation schemas. Detailed behavior should be progressively loaded from the
active role, guidance, skills, plans, and future runtime documentation only
when the current request needs it.

AIX should preserve any existing project-owned `AGENTS.md` content. It should
never replace the whole file, reorganize user-authored instructions, or
silently compress the file to reduce input size. When the file does not exist,
AIX may create it with the minimal managed block. When it exists, AIX should
append the managed block if absent and update only the content between stable
AIX markers on later workflow changes.

The managed block should be idempotent and ownership-specific. It should tell
the harness that the project uses the AIX workflow, direct meaningful work to
the active project-manager role, and point to the role files and relevant
guidance. It should not embed the full role contract or list every specialist
role.

If project-owned instructions conflict with the AIX routing block, AIX should
surface the conflict rather than overwrite or silently reinterpret the
project's instructions. AIX should also provide a size diagnostic for an
unusually large `AGENTS.md`, such as a warning from `aix status` or `aix
verify`, while preserving the user's file and allowing intentional large
files.

Detailed procedures, runtime-specific behavior, recovery mechanics, and
conditional guidance should remain in the project-manager role, workflow
guidance, skills, or a future delegation runtime rather than expanding the
root `AGENTS.md` contract unnecessarily.

### Delegation protocol

AIX should define the delegation protocol separately from the mechanism that
runs a worker. The project-manager remains the single user-facing coordinator.
It chooses the smallest adequate role sequence, creates a bounded assignment,
delegates it, receives evidence, and decides whether to continue, escalate, or
hand back to the user.

The protocol should remain independent of model vendors, model names, and
specific harnesses. It should define role identity, assignment scope, required
reads, authority, stop conditions, status vocabulary, return requirements, and
the relationship to the parent plan or task.

### Harness and capability discovery

The `aix pm` capability should be discoverable before team orchestration starts.
AIX should inspect the active harness and obtain a capability snapshot that
answers whether native sub-agent delegation is available and what relevant
controls the host exposes. Discovery should use local or harness metadata and
must not require a model invocation to ask the model what it can do.

Discovery should happen at the start of every PM session or fresh PM
invocation. The result is session-scoped, not a permanent project capability.
A PM may reuse the snapshot for multiple delegations during the same session,
but AIX should rediscover when the execution boundary changes, including when
the user switches harnesses, the harness changes its model or relevant runtime
configuration, work moves to another host, the host reports changed
capabilities, or the user requests an explicit refresh through a diagnostic
command.

The discovery operation should be cheap enough to run at session startup. It
should return a compact snapshot for PM runtime context and record the same
snapshot, or a stable reference to it, with each delegation. It should not be
added to `AGENTS.md` or copied into every user prompt.

The discovery result should distinguish at least:

- `supported`: the host explicitly provides the capability.
- `unsupported`: the host explicitly does not provide it.
- `unknown`: the host cannot report it reliably.

The snapshot should cover the capabilities required by PM team orchestration,
including independent context, role-specific instructions, task assignment,
result return, inspectable worker state, concurrency, permissions, sandboxing,
worktree behavior, interruption, and resume where the host exposes them.

Harness name, provider or vendor, and exact model identifier are useful runtime
metadata, but AIX should not require them to make the core decision. Some hosts
may not expose all of those fields. AIX must not guess missing values.

AIX should record the discovery snapshot with the delegation or parent task so
later review can explain why a delegation was accepted, rejected, or limited.
The discovery interface should sit behind the execution-provider boundary so a
future AIX-owned manager can report the same capability contract.

Full PM team orchestration should require a harness with native sub-agent
delegation. AIX should not claim that a prompt overlay or inline role pass is
an independent worker. If native delegation is unavailable, the package
manager remains usable, but `aix pm` should report that the project-manager
workflow is installed and native PM delegation is unavailable in the current
harness.

The package-manager features remain independent of this requirement.
Installing, updating, verifying, and managing workflows, roles, skills,
templates, and guidance should work without a native sub-agent host.

### Execution provider boundary

The initial execution provider is the active harness's native sub-agent
facility. The host owns worker creation, independent context, concurrency,
permissions, sandboxing, worktrees, interruption, and other runtime mechanics
that it supports. AIX supplies the role persona, delegation brief, protocol,
authority rules, and evidence expectations.

A Firstmate-style launcher and supervisor that owns process creation, terminal
sessions, worktrees, kill, resume, liveness, recovery, and teardown is not part
of this plan. If native hosts later prove insufficient, AIX may add its own
agent manager as another execution provider. That manager must consume the same
delegation brief, status vocabulary, result format, discovery contract, and
authority rules rather than creating a second workflow model.

### Shared delegation protocol ownership

The PM and every delegated worker need the same communication rules, but those
rules should not become another always-loaded project entrypoint. AIX should
not introduce a root-level `SUBAGENTS.md` by default. That would add context,
create another instruction hierarchy, and make workflow protocol look like
project-owned instructions.

The canonical protocol should belong to the installed workflow as shared
guidance, for example:

```text
.agents/packages/workflows/aix/design-plan-execute/
  guidance/delegation-protocol.md
```

When the workflow is activated, AIX should publish or expose the usable
project copy through the managed `.agents/guidance/` area. The PM and selected
roles should reference the same protocol rather than maintaining separate
copies of its rules.

The shared protocol should define the concrete exchange contract, including:

- dispatch, status, question, decision, result, and stop message types
- required fields and delegation correlation IDs
- when a worker must pause and return control to the PM
- what counts as a valid completion and evidence package
- how partial, failed, blocked, cancelled, and abandoned work is reported
- the rule that supervised workers communicate through the PM

The delegation brief should include the protocol version and any assignment-
specific rules that apply. Durable delegation records should preserve the
brief, status events, and result so the PM can recover the exchange without
replaying the full conversation or relying on a worker to reload every
workflow document.

The knowledge responsibilities should remain separate:

- `ROLE.md` defines who the agent is and its authority.
- `GUIDANCE.md` defines how that role reasons and operates.
- Shared delegation protocol guidance defines how the PM and worker
  communicate.
- The delegation brief defines what the worker must do now.
- Durable records document what actually happened.

### Delegation identity and display naming

The PM should create an AIX delegation identity before starting a worker. The
worker must receive that identity in its brief and use it in every status
message, question, result, and durable record. A worker should never need to
infer its identity from conversation context or a host UI.

AIX should distinguish its stable protocol identity from the host's runtime
identity:

```yaml
delegation_id: aix-del-7f31
host_worker_id: <opaque id assigned by the active harness>
display_name: Technical architect - architecture review
role: technical-architect
```

`delegation_id` is the AIX-owned correlation key. `host_worker_id` is an
opaque identifier supplied by Codex, Claude, or another execution provider
and is used for host-specific routing and state inspection. If a host returns
its worker ID only after creation, the PM or execution provider should deliver
an identity message before the worker begins meaningful work.

The PM should be able to assign a short, human-readable display name related
to the role and current assignment, such as `Quality engineer - test
strategy`. The display name helps the user understand which worker is active,
but it must not replace the stable delegation ID because names can collide or
change. The host may display a different native label, but AIX should preserve
its own display name in the delegation record.

### Role-agent persona

Each delegated role should come alive as a role instance, not as a generic
agent receiving an isolated question. The role instance must load and apply:

- `ROLE.md` for identity, responsibilities, authority, boundaries, and stop
  conditions.
- `GUIDANCE.md` and any selected companion guidance for domain judgment,
  heuristics, and tradeoffs.
- The delegation brief for the current assignment, plan, task, constraints,
  acceptance signals, and expected result.

Role documents define how the worker should operate. The delegation brief
defines what this worker should do now. The original user prompt may be
included for intent and traceability, but it must not expand the bounded task.
The worker should load only the role, guidance, project instructions, plan,
code, tests, and other context required for its assignment.

The persona should be functional rather than decorative. A role agent should
understand which decisions it can make, which decisions must return to the
PM, what work it owns, what it must not touch, and what evidence it must
produce before reporting completion.

### Delegation brief

Every delegation should have a compact, inspectable brief. The brief should be
usable as the input to a native sub-agent creation request without changing
its meaning. Inline role overlays are not an independent execution mode for
`aix pm` team orchestration.

The initial protocol should carry fields equivalent to:

```yaml
delegation_id: <stable unique id>
parent_plan: <plan path or none>
parent_phase: <phase or none>
parent_task: <task or none>
original_prompt: <user intent for traceability>
role: <selected role name>
execution_mode: native
delegation_protocol_version: <workflow protocol version>
assignment: <bounded work or review>
required_reads:
  - <source-of-truth path>
optional_reads:
  - <context path>
accepted_context:
  - <settled fact the worker may use>
known_constraints:
  - <scope, safety, lifecycle, or non-goal constraint>
stop_conditions:
  - <condition that returns control to the PM>
return_requirements:
  - files_inspected
  - files_changed
  - decisions
  - risks
  - verification
  - handoff_notes
```

The brief should be role-specific and compact. It should not contain a full
conversation transcript, every prior role result, or every potentially
relevant file. Source-of-truth files belong in `required_reads`; orientation
facts belong in `accepted_context`; unresolved matters belong in
`stop_conditions` or `handoff_notes`.

### Communication and exchange protocol

The PM and role agent should use both an interactive channel and a durable
channel.

The interactive channel is for short, active coordination:

- dispatching a brief
- answering a bounded question
- sending a decision
- requesting clarification
- asking the worker to continue or stop

The durable channel is for recoverable task state:

- the exact delegation brief
- meaningful status events
- the final result
- evidence pointers
- unresolved decisions
- the relationship to the parent plan or task

The PM should not rely on chat history alone. The worker should not need the
full PM transcript to understand its assignment. A restarted or compacted PM
should be able to recover the delegation from the durable brief and result
records.

The initial exchange should be one-directional in authority:

```text
PM -> worker: bounded brief and authority
worker -> PM: status, questions, evidence, result
PM -> worker: decisions or additional bounded direction
PM -> user: translated outcome, blocker, or escalation
```

The worker should communicate with the PM, not directly with the user, when a
delegation is being supervised. A user decision should return through the PM
so the PM can preserve correlation, scope, and the decision's effect on the
parent plan.

Messages should remain short. Long instructions, reports, and evidence should
live in durable files with pointers sent through the interactive channel. This
keeps active prompts small and lets the PM summarize instead of copying raw
worker transcripts into the user conversation.

### Durable delegation records

AIX should use a small project-local delegation record rather than attempting
to persist every agent message. The exact location remains to be designed, but
the intended shape is:

```text
<delegation-root>/<delegation-id>/
  brief.md
  status.jsonl
  result.md
```

`brief.md` is the immutable or append-with-revision task assignment that the
worker received. If the assignment changes, the record should make the new
decision explicit rather than silently rewriting the original intent.

`status.jsonl` is an append-only event stream. It should record meaningful
transitions such as:

```text
created
dispatched
working
needs-decision
blocked
paused
completed
failed
cancelled
```

Status events are evidence of transitions, not the complete current state. A
future reconciler may derive current state from the event stream, host state,
worktree state, plan state, and result artifacts. The PM should not treat the
last status line or a stopped conversation as proof of completion.

`result.md` is the durable handoff. It should contain, as applicable:

- delegation ID and role
- execution mode
- assignment summary
- files and documents inspected
- files changed
- decisions made
- risks and uncertainty
- verification commands and outcomes
- skipped checks and reasons
- unresolved questions or blockers
- links to PRs, reports, plans, or other artifacts
- handoff notes for the PM or next role

The result should say plainly whether the assignment completed, failed,
blocked, or returned partial work. A result is evidence for the PM; it does
not by itself authorize a merge, plan transition, destructive action, or new
implementation scope.

### Delegation retention and cleanup

Delegation records are working evidence, not permanent project state. AIX
should provide a first-class project maintenance command, `aix pm tidy`, so
cleanup does not depend on a plan-completion event. This matters for small
inline tasks, failed work, abandoned sessions, and delegations that never had
an implementation plan.

`aix pm tidy` should operate locally and should not require native delegation
or an active PM session. By default it should inspect the PM workspace,
summarize eligible records, and perform only safe housekeeping such as
compacting or archiving completed delegation data. It should leave active,
paused, blocked, unresolved, and unlanded work untouched.

The command should be able to identify and report:

- orphaned delegation records
- stale status events and temporary PM files
- completed delegation archives
- unreferenced reports and runtime metadata
- records that remain protected by an active task, decision, or worktree

Detailed deletion should require an explicit purge option or confirmation, for
example `aix pm tidy --purge`. Cleanup filters, retention age, state selection,
and protected-record overrides remain implementation decisions, but the
default must be conservative and explain what it will change.

Cleanup should preserve a compact summary, stable ID reference, or tombstone
when detailed records are removed. The summary should retain the assignment
outcome, decisions, changed files, verification, risks, and artifact links
needed for later review. Durable facts that belong in a plan or `_docs/kb`
should be promoted there rather than preserved indefinitely in raw delegation
logs.

`aix pm tidy` must not casually delete project source, unmerged changes,
worktrees, or other user-authored files. Any future worktree cleanup needs a
separate explicit scope and safety contract.

### Task lifecycle and authority

The delegation lifecycle should separate task progress from worker liveness:

```text
created -> dispatched -> working -> completed
                         |       -> failed
                         |       -> blocked
                         |       -> needs-decision
                         |       -> paused
                         -> cancelled
```

The host may report that a worker process is alive, but liveness is not proof
that work is progressing. Completion requires the expected result and evidence
for the task type.

The authority boundaries should be explicit:

- The PM owns routing, sequencing, delegation records, escalation, result
  aggregation, and user-facing communication.
- The role agent owns only the bounded assignment and its evidence.
- The parent context retains final lifecycle decisions, worktree safety,
  verification review, and user-authorized actions.
- The user retains product decisions, risky or irreversible approvals, and
  final merge or release authority unless a separate accepted policy says
  otherwise.

The PM should review returned evidence minimally and by exception. It should
re-read or challenge a result when the worker reports uncertainty, scope
drift, failed or incomplete verification, safety-sensitive changes, changed
files outside the assignment, or a dependency requires exact content.

### Firstmate lessons to adopt

Firstmate's operating contract supplies several useful patterns:

- Treat the primary agent as a liaison, not a second implementer.
- Give every worker a bounded brief with acceptance and safety requirements.
- Keep worker communication behind the coordinator.
- Persist work state so restart does not depend on conversation memory.
- Distinguish status events from reconciled current state.
- Preserve unlanded work and refuse unsafe cleanup.
- Make delivery mode explicit rather than inferred.
- Keep scout or investigation work distinct from change-producing work.
- Return plain outcomes to the user instead of raw status logs or transcripts.
- Route durable knowledge to its most specific owner.

These are protocol and ownership lessons, not a requirement to copy
Firstmate's shell scripts, terminal backends, secondmates, remote homes,
watchers, Relay features, or private fleet state layout.

### Deferred runtime direction

This plan does not introduce an AIX-owned agent manager. In particular, it
does not yet define AIX commands or services for spawning, monitoring,
interrupting, resuming, killing, recovering, or tearing down independent
worker processes.

If a future runtime is proposed, it must consume the same delegation brief,
status vocabulary, result format, and authority rules. It should be an
execution adapter behind the protocol, not a second source of role or
workflow truth.

## Implementation Phases

Not drafted until Design Intent is accepted.

## Open Questions / Decisions

The following details remain open for later design-intent refinement:

- Where delegation records should live, and whether they belong under
  `_docs/`, a separate project-local runtime directory, or another owned
  location.
- The exact machine-readable status-event schema and the rules for deriving
  current state from status, host state, worktree state, plan state, and result
  artifacts.
- How a native host reports sub-agent creation, progress, interruption,
  completion, failure, and result delivery to the AIX protocol.
- Which native sub-agent capabilities are required for `aix pm` support, and
  how each supported harness reports them.
- Whether native sub-agent execution can guarantee the required project
  worktree, permissions, sandbox, concurrency, and role-document reads on
  each supported harness.
- The concurrency policy for dependent versus independent role assignments.
- The exact correlation rules for PM decisions, worker questions, revised
  briefs, and follow-up delegations.
- Which result fields are required for each task mode and which are optional.
- Whether an interrupted or abandoned native sub-agent leaves a resumable
  delegation record or a new follow-up delegation.
- What `aix pm status`, `aix status`, and `aix verify` should report when the
  current harness lacks native delegation or when native worker state is
  incomplete.

Implementation phases and task breakdown remain intentionally deferred until
these design questions and the full Design Intent are accepted.

## Documentation Impact

- Product: Pending design-intent refinement.
- Requirements: Pending design-intent refinement.
- Architecture: This plan is expected to affect the project-manager and
  delegation architecture, but the durable direction is not fully defined.
- Security: Pending design-intent refinement.
- Quality: Pending design-intent refinement.
- Operations: Pending host execution, delegation-record, and recovery
  decisions.
- Decisions: This plan will record the accepted PM operating contract.
- Glossary: Pending terminology decisions.

## Risks

- Expanding `AGENTS.md` too far could make the always-loaded project contract
  expensive to read and harder to maintain.
- An existing large or conflicting project-owned `AGENTS.md` cannot be safely
  rewritten automatically; AIX needs diagnostics and clear managed-block
  ownership instead.
- A written coordination rule cannot create independent workers by itself;
  host-native delegation and future runtime adapters remain separate design
  concerns.
- Ambiguous authority between the PM, delegated roles, and the parent context
  could cause duplicate work or unsafe lifecycle changes.
- Native hosts may differ in context isolation, worktree behavior, permission
  inheritance, concurrency, interruption, result delivery, and persistence.
- Persisting too much conversation content could increase context size and
  create noisy or stale project records; persisting too little could make
  recovery and evidence review unreliable.
- Requiring native delegation may narrow `aix pm` support even if the AIX
  package-manager features continue to work on a wider set of hosts.

## Security Review

- Status: Pending design-intent refinement.
- Scope reviewed: Project instruction ownership, delegated authority, local
  file safety, and host-neutral execution boundaries.
- Findings: None finalized at this planning stage.
- Blocking findings converted to plan tasks: None.
- Residual risk: The delegation runtime and worker isolation model are not yet
  defined.

## Completion Checklist

- ⬜️ Confirm every task and success goal is complete or explicitly deferred.
- ⬜️ Human validation: developer evaluated the completed phased work and accepted it, or explicitly waived manual validation with a recorded reason.
- ⬜️ Run or review required targeted and repository verification.
- ⬜️ Complete Security Review after all implementation phases; record findings, convert blocking findings into normal plan tasks, and document residual risk.
- ⬜️ Review the codebase using `$code-review-refactor`; refactor or record follow-up work if needed.
- ⬜️ Promote accepted durable behavior into `_docs/kb` using `$design-promote`.
- ⬜️ Review documentation structure, formatting, and links using `$review-and-refresh-docs`; fix issues or record follow-up work.
- ⬜️ Record final risks, follow-on work, and documentation impact.
- ⬜️ Harvest reusable lessons and update workflow guidance when appropriate.
- ⬜️ Archive under `_docs/plans/completed/YYYY-MM-DD-<name>.md`.
