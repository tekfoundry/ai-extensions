# PM improvements

## Status

🚧 In Progress

This plan is approved for implementation. Work should proceed through the
ordered phases and tasks below, with the documented PM dogfooding gate applied
as soon as the required runtime capabilities are available.

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

## Design Intent (status: accepted)

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
   activate `design-plan-execute`. The workflow installs its team roster,
   supporting guidance, skills, specialist roles, and its required
   `project-manager` dependency. The workflow does not duplicate the reusable
   PM package, but activation also activates its dependency and adds the
   minimal managed routing block to `AGENTS.md` without replacing project-owned
   content.
4. The user opens the project in a supported AI harness and starts a normal
   project conversation. Once the PM workflow is active, the harness loads
   `AGENTS.md` and the conversation behaves as a conversation between the
   user and the project-manager. The PM becomes the normal entry point for
   meaningful project work.
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

Rerunning `aix init` is package-management maintenance. It should leave any
installed or active workflow, standalone PM role, team roster, managed PM
routing, and delegation records unchanged. It should not migrate, deactivate,
update, or remove those assets. Users manage workflow and PM state through
explicit workflow or role commands.

Installing a workflow is the explicit opt-in lifecycle operation. It installs
and activates the workflow, its required dependencies, and its managed PM
routing hooks. The package manager records dependency provenance so the
project can tell that `project-manager` was activated by
`design-plan-execute`, and can safely handle future shared dependencies.

The workflow manifest should declare `project-manager` as a required reusable
role dependency, alongside its team roster and specialist roles. The PM
package remains standalone and reusable by other workflows, but the active
workflow owns activation of that dependency. AIX must record dependency
provenance in manifest and lockfile state and must not remove a shared
dependency while another active workflow still requires it.

Activating `design-plan-execute` installs or verifies its team roster, guidance,
skills, specialist roles, and PM dependency, then activates the dependency and
adds the minimal managed PM-routing block to `AGENTS.md`. The activation must
fail clearly if required assets or native delegation capabilities are not
available; it must not silently produce a partially PM-routed project.

Deactivating a workflow cascades to its workflow-owned dependencies, including
the PM dependency when no other active workflow requires it. AIX removes the
workflow's managed routing hooks and returns the project to normal, non-PM
prompt behavior while preserving project-owned `AGENTS.md` content. The
workflow's team roster, guidance, skills, and specialist roles are deactivated
with it according to their ownership and dependency provenance. Before
deactivation, AIX must warn when the workflow has active or unlanded
delegations and identify the affected delegation dataset. If the user confirms
continuation, AIX may delete that workflow-owned delegation dataset, including
its operational records and isolated workspaces, while preserving project-owned
files and unrelated work. Without confirmation, deactivation must stop.

The experience should remain harness-neutral. AIX should explain the same PM
workflow whether the user works in Codex, Claude Code, Gemini CLI, Cursor,
OpenCode, or another supported harness. The exact launch command, any
host-specific worker UI, and the detailed `aix pm` maintenance command set
remain implementation decisions, but they must not change the PM's
single-contact interaction model. `aix pm` is not the PM launcher.

If the active harness lacks native delegation, AIX should say so plainly. The
user can still use the package-manager features, inspect the installed
workflow, and repair or verify project assets. If the PM workflow is installed
and active, the full team workflow should report that native delegation is
unavailable rather than pretending that inline role prompts are independent
agents.

### Product ownership and the human principal

The workflow's product-strategy responsibility should become a complete
`product-owner` role rather than remain a narrower `product-strategist` role.
The product-owner must retain everything the product-strategist did, including
idea generation and evaluation, audience fit, user value, scope, tradeoffs,
prioritization, and sequencing. It must also bring the normal product-owner
perspective from a software development team: maintain and order the product
backlog, turn product intent into actionable work and acceptance criteria,
support refinement and planning, answer product questions during delivery,
and evaluate completed work against product acceptance. The role collaborates
with the project-manager and delivery specialists, but does not replace the
human's authority or own technical execution.

This is a role migration, not merely a display-name change. The stable role
name, role directory, team roster, manifests, lockfiles, guidance, prompts,
tests, and documentation should use `product-owner`. Existing installed
`product-strategist` state must be handled by an explicit, safe migration path
or a clearly reported reinstallation requirement; AIX must not silently leave
stale role metadata or active files behind.

The human who directs the project is a formal human principal named `boss` in
the interaction model, displayed conversationally as “Boss.” Boss is not a
delegated role, worker, or runtime process, and no delegation record is created
for Boss. Boss retains product decisions, priorities, risky or irreversible
approvals, exception decisions, and final acceptance or release authority.
The PM coordinates work for Boss and should consult Boss only when that
authority is genuinely required.

The PM may address the human as “Boss” selectively in conversational
acknowledgments, milestone or completion updates, decision requests, and
exceptions. It should not repeat the address mechanically in every response,
and the address must not add unnecessary prompt or output length.

The workflow team should also add a `release-engineer` role. This role owns
release and platform concerns such as CI, build and package validation, npm
artifact contents, supported-host environment integration, cross-platform
compatibility, and operational release diagnostics. It complements the
implementation, architecture, quality, and security roles without owning
product decisions or PM orchestration.

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

The initial capability policy should distinguish required, conditional, and
informational capabilities:

| Capability | Initial policy |
| --- | --- |
| Independent context | Required for every PM delegation |
| Role-specific instructions | Required for every PM delegation |
| Task assignment and result return | Required for every PM delegation |
| Stable worker and delegation identity | Required for every PM delegation |
| Correlated status or completion state | Required, or the provider must supply an equivalent durable state |
| Workspace isolation | Required for parallel change-producing work |
| Interruption and stop | Required before dispatching work that may need cancellation |
| Resume | Optional, but the provider must report whether it supports it |
| Exact harness, vendor, and model metadata | Informational and optional |

The PM should evaluate capabilities against the task mode, not only against a
single global host verdict. A read-only scout may need less workspace control
than parallel implementation work, but neither may bypass the required
identity, context, assignment, and result contract.

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

The PM is always the user-facing primary agent session. AIX is not a hidden
second agent and does not become a long-running parent process. Once the PM
workflow is active, normal project conversations in a harness that loads the
project instructions enter through the PM rather than directly through a
specialist role. Existing narrow bypasses, such as PM Review, tiny
informational requests, and explicit developer overrides, still apply.

In this plan, "parent context" means the PM's primary session plus the host
controls around it. The parent owns the authoritative plan, user decisions,
and final review; the PM owns routing and worker coordination within that
authority. The PM may make routine sequencing decisions, prepare and revise
bounded briefs, answer low-risk worker questions, and continue work within
accepted scope, but neither the PM nor the parent session may directly edit
project source, tests, documentation, plans, configuration, or other project
artifacts. Those changes must pass through a bounded delegated role. The PM
must return product choices, scope expansion,
permission changes, destructive actions, data-impacting decisions, merge,
release, and other irreversible decisions to the user. This plan does not
define a separate AIX-hosted PM session.

The provider contract should expose operations equivalent to create worker,
deliver the initial brief, receive a correlated result, and discover
capabilities. AIX should not require the CLI process to remain alive while a
native worker runs. The provider or host must return enough identity and state
for the PM to correlate work with durable records. Status, inspection,
follow-up direction, stop, resume, worktrees, and concurrency are additional
capabilities that the provider should report explicitly.

The PM should use a tiered capability contract. Every supported host must
provide independent worker creation, identity, initial brief delivery,
correlated result return, and capability discovery. The PM should dispatch a
task only when the host satisfies that task mode's additional requirements. A
short read-only investigation may not need stop or worktree support, while a
long-running or risky task may require both. Missing capabilities must be
reported honestly and must not be silently replaced with inline prompting.

### Secret handling

AIX must never place raw secrets in delegation briefs, status events, result
files, plans, `AGENTS.md`, PM prompts, or other durable project files. A task
that needs a credential should carry only an ephemeral secret reference and
the capability required to resolve it.

The provider owns secret resolution and runtime injection. It may use the
active host's secret mechanism or a future approved secret-store integration,
but the value must remain outside AIX records and the normal PM exchange. The
provider should redact known secret values from worker output, status, results,
and logs where the host supports redaction.

If the provider cannot securely resolve, inject, and protect the requested
secret, the PM must refuse or escalate the task rather than pass the raw value
through a prompt or write it to a file. A future integration with a password
manager such as 1Password may be evaluated separately; it is not a dependency
of this plan.

AIX should define a host-execution interface and pass that abstraction through
the PM and delegation services. PM logic must not depend directly on Codex,
Claude, Gemini, Cursor, OpenCode, or another host's SDK, command syntax,
session object, or event format. The provider implementation should translate
the host's native operations and events into the AIX delegation contract.

Permission requirements should be task-specific. The delegation brief should
declare the access the task needs, such as read-only inspection, source or
document writes, test execution, network access, or an ephemeral secret
reference. The provider should grant the narrowest host-supported permissions
that satisfy the brief, report inherited or unavailable controls, and never
silently broaden access. A risky permission expansion must return to the user.

The PM must not dispatch a task when the provider cannot provide the required
permission, approval, sandbox, or secret boundary safely. A role's authority
and write domain remain limits even when the host grants broader technical
access.

The abstraction should expose the required core operations and task-scoped
optional capabilities, including worker creation, initial brief delivery,
correlated result return, capability discovery, status inspection, follow-up
direction, stop, resume, workspace handling, and concurrency reporting. It
should also translate host worker IDs into AIX identity records and normalize
unsupported operations instead of leaking host-specific behavior into the PM.

This interface is an adapter boundary, not an AIX-owned agent manager. The
initial implementation may provide one native-host adapter at a time, while
the PM remains unaware of how the host creates or runs the worker.

### Pi as the first host integration

Pi is the first preferred host integration because it can provide a uniform
native-worker interface while supporting multiple model providers behind the
same harness. AIX should integrate with Pi through an optional host adapter,
not make Pi a hard dependency of the AIX package. Package-management commands
and projects that do not use PM orchestration must not install or load Pi.

The intended path is:

```text
AIX PM -> AIX host interface -> Pi adapter -> Pi harness -> model provider
```

The Pi adapter owns Pi-specific worker creation, session handles, permissions,
and event translation. AIX continues to own role personas, briefs, protocol
versions, durable records, and acceptance rules. Model choice does not create a
new adapter task. Direct Codex or Claude adapters are conditional follow-up
work only if their native host behavior provides value that Pi cannot provide.

The active workflow and PM role define the protocol version used for a
delegation. Capability discovery decides whether the current host can perform
the task; AIX does not need runtime version-range negotiation in the initial
implementation. The provider adapter must support the active AIX protocol or
report incompatibility before dispatch. Workflow, PM role, provider, and
protocol versions should be recorded with the delegation for recovery and
future migration work.

The shared protocol document explains the rules but does not enforce them by
itself. Enforcement should be layered:

- guidance gives the PM and worker the common behavioral contract
- the provider adapter validates host exchanges, identity, capability, and
  transport data
- AIX validates durable record and result schemas
- the PM enforces assignment scope, role ownership, authority, and evidence
  sufficiency

The parent session must not bypass this chain by editing project artifacts,
running delegated lifecycle work directly, or dispatching a worker outside the
PM. A host that cannot support the required enforcement and correlation for a
task mode must report that limitation instead of silently weakening the
protocol.

A Firstmate-style launcher and supervisor that owns process creation, terminal
sessions, worktrees, kill, resume, liveness, recovery, and teardown is not part
of this plan. If native hosts later prove insufficient, AIX may add its own
agent manager as another execution provider. That manager must consume the same
delegation brief, status vocabulary, result format, discovery contract, and
authority rules rather than creating a second workflow model.

### Workflow team roster

The standalone PM should discover the available delegation team from the
active workflow. Each workflow may provide a `team.md` file as its team
contract. The file should be workflow-owned, versioned with the workflow, and
available to the PM after workflow activation.

`team.md` should combine readable team guidance with structured metadata that
identifies, at minimum:

- workflow name and version
- available role names and short responsibilities
- supported task and delivery modes for each role
- default write domains and denied artifact areas
- role dependencies, preferred sequencing, and handoff relationships
- required capabilities or permission boundaries
- guidance for choosing between overlapping roles

The PM should load `team.md` during startup or team discovery, then load the
full `ROLE.md` and `GUIDANCE.md` files only for roles it may delegate to. The
roster is the authoritative list of workflow-provided roles; the PM should not
infer team membership from arbitrary files or require every role document to
be loaded into its initial context.

The workflow may also expose compatible standalone roles when the package
manager records them as active. The PM should preserve each role's ownership
and provenance and should reject ambiguous or conflicting team metadata rather
than silently choosing a role.

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
subagent_id: aix-agent-42
delegation_id: aix-del-7f31
host_worker_id: <opaque id assigned by the active harness>
display_name: Technical architect - architecture review
role: technical-architect
```

`subagent_id` identifies the logical role-agent instance and may be reused for
compatible sequential assignments. `delegation_id` is the AIX-owned
correlation key for one bounded assignment. A retry may create a new worker
and delegation for the same parent task. `host_worker_id` is an opaque
identifier supplied by Codex, Claude, or another execution provider and is
used for host-specific routing and state inspection. If a host returns its
worker ID only after creation, the PM or execution provider should deliver an
identity message before the worker begins meaningful work.

The PM may reuse a subagent only when the role, workspace, authority, and task
family remain compatible and the provider supports follow-up work. Each new
assignment gets a new brief and `delegation_id`; accumulated conversation
context is not authoritative. The PM should require a context reset or fresh
subagent after failure, blocked work, a security or permission boundary, scope
change, workspace change, or any other condition that could carry unsafe
assumptions forward.

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

### Role ownership, workspace, and concurrency policy

Role boundaries should reduce unnecessary write concurrency before AIX relies
on worktree isolation. The initial role policy should assign source-code and
test implementation to `implementation-engineer`. Other roles may change
documents within their declared domain, but they should not edit source code
or silently expand into another role's artifact ownership.

The PM should assign both a task mode and an artifact write scope before
dispatch. The scope should identify the files or document area the role may
change, along with any generated or managed files it must not touch. Each
artifact has one active writer at a time, even when several roles may read it.

- Read-only investigation and review work may run in parallel when the host
  permits it.
- Multiple roles may write in parallel only when their artifact scopes are
  disjoint and neither scope includes shared generated, managed, plan, or
  index files.
- Work on the same document, plan, knowledge-base entry, manifest, lockfile,
  `AGENTS.md`, or generated index must be serialized through the PM.
- Every write-producing delegation receives an isolated workspace with an
  explicit integration handoff. A reused subagent may continue only when the
  provider can safely reset or rebind its workspace for the new delegation.
  Otherwise the provider must create a fresh subagent.
- If a role discovers that its work requires an artifact outside its scope, it
  must stop and return the question to the PM instead of editing it.
- If the host cannot provide the isolation required by the selected task
  mode, the PM must serialize the work, change the task to read-only, or
  return a capability gap.

The role package should declare or otherwise expose its default write domain.
The PM may narrow that domain for a specific assignment, but must not widen it
without an explicit authority decision. Workspace isolation binds to the
write-producing delegation, not to the logical subagent's entire lifetime. A
read-only delegation may use no worktree. The host owns workspace creation and
permissions. AIX records the selected workspace, role scope, and delivery
mode, while the PM retains authority over sequencing, handoff, and whether
unlanded work may be cleaned up.

Shared artifacts should have one clear owner. AIX package-management commands
own machine-managed `aix.json`, `aix.lock.json`, package state, workflow
metadata, and the AIX-managed block in `AGENTS.md`. Delegated documentation or
lifecycle roles own project plans, knowledge-base documents, indexes, and
other project-owned documentation only within their assigned scope. The PM
coordinates changes to shared artifacts but does not edit them directly.

Roles may support more than one task mode, but each role package should declare
the task modes and delivery modes it is allowed to receive, along with its
default evidence requirements and write-domain limits. The PM selects a valid
role and mode combination for each assignment. A role's ability to perform a
review or verification task does not grant it permission to implement source
changes, and a delivery mode must not widen the role's declared authority.

These declarations should be inspectable as role metadata or an equivalent
validated role contract. At minimum they should describe supported task modes,
allowed delivery modes, default write domains, required evidence, and any
capabilities that the role must not receive. AIX should validate the contract
when the role is installed or activated and the PM should validate each brief
against it before dispatch.

### Delegation brief

Every delegation should have a compact, inspectable brief. The brief should be
usable as the input to a native sub-agent creation request without changing
its meaning. Inline role overlays are not an independent execution mode for
`aix pm` team orchestration.

The initial protocol should carry fields equivalent to:

```yaml
subagent_id: <logical role-agent id>
delegation_id: <stable unique id>
parent_session_id: <PM session id>
parent_plan: <plan path or none>
parent_phase: <phase or none>
parent_task: <task or none>
original_prompt: <user intent for traceability>
role: <selected role name>
display_name: <human-readable role and assignment label>
execution_mode: native
delegation_protocol_version: <workflow protocol version>
task_mode: scout | implementation | review | verification
delivery_mode: report-only | local-change | isolated-change
required_access:
  - <minimum permission or host capability>
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

Every delegation must create its durable brief, status, and result records
before worker execution begins. Native in-flight status events are preferred,
but they are not required for every task. A provider may use safe file-based
status updates or polling when it can guarantee shared access, atomic writes,
identity validation, and a way for the PM to observe changes. The protocol
does not require token-level streaming or a worker heartbeat to prove progress.

The PM should gate tasks against the status and control capabilities available
for the delegation. A host with only initial-brief and final-result delivery
may run a short bounded task, while a long-running or risky task requires the
stronger monitoring and intervention capabilities it needs.

The interactive channel is for short, active coordination:

- dispatching a brief
- answering a bounded question
- sending a decision
- requesting clarification
- asking the worker to continue or stop

Every task requires a dispatch, identity or acceptance confirmation, and a
correlated final result. Status updates, questions, decisions, follow-up
direction, and stop messages become required when the selected task mode or
its safety policy needs them. A provider may omit a non-required message type
only when its capability snapshot records that limitation and the PM confirms
that the task does not depend on it.

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

Every PM session must perform recovery discovery before accepting new
meaningful project work. It scans `.aix/pm/` for non-terminal delegations even
when the prior PM, host, or machine ended without writing a final status, such
as after a crash or power loss. It reconciles each candidate with available
provider state, worker identity, workspace state, and plan/task references, then
records the result as healthy, completed, failed, `host-lost`, or `unknown`.
The PM must surface unresolved recovery state and decide whether to continue,
stop, or create a fresh delegation before dispatching overlapping work.

Record ownership follows the direction of information flow. The PM authors the
outbound brief and any follow-up or coordination decisions. The worker is the
primary author of substantive progress events, findings, proposed results, and
evidence. The provider or AIX owns the record envelope and integrity controls,
including delegation identity, host identity, timestamps, sequencing, atomic
persistence, and schema validation. The PM owns final acceptance, rejection,
integration outcome, and recovery decisions. Workers must not be able to
rewrite authoritative identity, scope, or lifecycle metadata.

Delegation records should carry lifecycle timestamps, including
`created_at`, `updated_at`, `last_status_at`, `last_observed_at`, and
`completed_at` when applicable. Completed delegation data may be purged before
the normal retention threshold once it is no longer relevant. An incomplete
delegation that is stale and no longer being worked must not live beyond the
default 30-day inactivity limit. Explicit safety holds, such as an unresolved
integration or destructive-risk condition, must be represented separately and
must be cleared or explicitly overridden before purge.

Delegation findings should not be promoted into the knowledge base after every
task. The PM should maintain concise promotion candidates during plan
execution, then perform one bounded, non-chatty promotion pass during plan
completion after implementation, verification, and integration are resolved.
Delegation data is not purgeable merely because a worker finished; promotion
and integration must complete first, or an explicit waiver must be recorded.
Once the plan's durable implementation and design knowledge has been promoted
or waived, delegation-specific briefs, status events, results, and workspaces
may be purged when their safety holds are clear.

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

The user may observe native worker names, status, and other host-provided
activity. If the user thinks a worker needs steering, the managed path is to
tell the PM what needs to change. The PM should decide whether to send bounded
follow-up direction, pause the worker, revise the assignment, or stop and
restart it. This keeps the user's intent, the worker's authority, and the
durable record aligned.

Some hosts may allow the user to message or steer a worker directly. AIX
cannot assume it can prevent that interaction, but direct steering is outside
the managed protocol. If it occurs, the PM must treat it as an external
intervention, record or summarize its effect, re-check scope and authority,
and reconcile the delegation before accepting the result. Direct host control
must not silently change the assignment or authorize work outside the PM.

### Internal exception recovery and escalation

The PM should treat most worker problems as team-operating work, not as an
immediate user interruption. When a worker reports a conflict, failed
verification, scope drift, incomplete result, stale worktree, or unsafe cleanup
condition, the PM should diagnose the problem and retry, redirect, pause,
restart, or delegate a repair or integration task as appropriate.

The PM should bring the user in only when the team reaches a product or scope
decision, needs permission for a risky or irreversible action, encounters a
material security or data-safety concern, or cannot recover after reasonable
bounded attempts. The user should receive the outcome and the decision needed,
not an invitation to manage branches, worktrees, status files, or routine
worker correction.

Messages should remain short. Long instructions, reports, and evidence should
live in durable files with pointers sent through the interactive channel. This
keeps active prompts small and lets the PM summarize instead of copying raw
worker transcripts into the user conversation.

### Durable delegation records

AIX should use a small project-local delegation record rather than attempting
to persist every agent message. The recommended location is a project-local
`.aix/pm/` directory, separate from package-managed `.agents/` content and
project-owned `_docs/` knowledge. The initial design should treat these files
as local operational state, with an explicit later decision about whether a
project wants to commit them for team history. The intended shape is:

```text
<delegation-root>/<delegation-id>/
  brief.md
  status.jsonl
  result.md
```

The record root should also contain a small index or metadata file that maps
`subagent_id`, `delegation_id`, `parent_session_id`, host identity, task mode,
workspace, and current terminal state. Records must not contain full raw
transcripts by default. Prompts, reports, and evidence should be stored only
when needed for recovery or audit, and the plan must define how sensitive
content is handled before implementation.

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

Each event should include a unique event ID, delegation and subagent IDs,
timestamp, source, sequence information, and any host correlation data. The
protocol should define whether an event is accepted, duplicated, stale, or
out of order. Exact duplicates should be ignored by event ID. Stale or late
events remain evidence but must not regress the derived current state. Genuine
conflicts should be retained and surfaced for PM reconciliation rather than
resolved by arrival order or timestamp alone. Terminal states should include
completed, failed, cancelled,
and abandoned. `needs-decision`, `blocked`, and `paused` are resumable or
reviewable states until the PM records a terminal outcome.

Status events are evidence of transitions, not the complete current state. A
future reconciler may derive current state from the event stream, host state,
worktree state, plan state, and result artifacts. The PM should not treat the
last status line or a stopped conversation as proof of completion.

The project should use a PM session lease to prevent multiple sessions from
dispatching overlapping work or issuing conflicting coordination decisions.
Per-delegation and per-artifact locks should provide narrower protection for
record updates and write scopes. Other PM sessions may inspect state read-only,
but only the lease holder may dispatch, steer, accept, integrate, or perform
coordination writes. Lease expiry and takeover must go through recovery
discovery so a new PM does not assume the previous session stopped cleanly.

`result.md` is the durable handoff. It should contain, as applicable:

- delegation ID and role
- subagent ID and host worker ID when available
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
summarize eligible records, and run as a preview. An explicit apply option may
perform reversible housekeeping, while an explicit purge or confirmation may
delete completed delegation data that is no longer relevant. Stale incomplete
delegations are purgeable at the 30-day inactivity limit unless a safety hold
or unresolved external reference protects them.

The command should be able to identify and report:

- orphaned delegation records
- stale status events and temporary PM files
- completed delegation archives
- unreferenced reports and runtime metadata
- records that remain protected by an active task, decision, or worktree

Detailed deletion should require an explicit purge option or confirmation, for
example `aix pm tidy --purge`. Cleanup filters, retention age, state selection,
and protected-record overrides remain implementation decisions, but every
mutating mode must be conservative and explain what it will change before it
runs.

Cleanup should not preserve delegation details indefinitely. Assignment
outcomes, decisions, changed files, verification, risks, and artifact links
that matter to the project should be promoted once during plan completion into
the plan or `_docs/kb`. After successful promotion or an explicit waiver, the
delegation brief, result, raw status events, summaries, tombstones, archives,
and workspace may be deleted together when no safety hold remains.

`aix pm tidy` must not casually delete project source, unmerged changes,
worktrees, or other user-authored files. Any future worktree cleanup needs a
separate explicit scope and safety contract.

Cleanup safety also treats `created` delegations as active/unresolved work;
retention alone must never purge them. The current diagnostic log is protected
from cleanup; only eligible rotated or explicitly stale diagnostic files may
be removed.

### Observability and troubleshooting

Normal user-facing PM output should remain concise. It should explain the
current decision, progress, exception, or required user action without making
the user parse provider or orchestration internals. AIX should provide an
explicit verbose diagnostics mode for development, debugging, recovery, and
support.

Verbose diagnostics may be rendered by the CLI, written to structured local
runtime logs, or both. They should make it possible to reconstruct capability
discovery, PM session startup, brief dispatch, worker creation, status
transitions, provider responses, lease and lock behavior, workspace
integration, cleanup decisions, and refusal or recovery paths. Diagnostics
must be correlated by PM session ID, delegation ID, subagent ID, host worker
ID, event ID, and workspace ID where available.

Diagnostics are troubleshooting evidence, not a second communication protocol
and not a replacement for the durable brief, status, or result records. Logs
are local runtime state under `.aix/pm/`, ignored by Git, subject to the raw
secret prohibition and redaction rules, and bounded by rotation or cleanup.
Development and test fixtures may enable verbose output by default, but normal
installed behavior requires explicit opt-in.

### Host authorization and PM-managed integration

Routine PM-managed integration is an authorized project-local operation, not a
request for the user to approve every generated shell command. The host remains
the final authorization boundary: AIX cannot grant itself permission or modify
Codex, Pi, Claude, or another host's settings.

The host adapter must expose an explicit `managed-local-integration`
capability. A change-producing delegation (`local-change` or `isolated-change`)
fails closed unless that capability is explicitly `true`. Read-only and
report-only delegations do not require it.

The preferred integration path is a host-adapter operation over a validated
workspace. AIX owns scope, changed-file, conflict, and safety validation; the
adapter hides host-specific workspace and approval mechanics. Routine local
integration should proceed without user intervention when the user has
configured the host to allow the narrow project-local operation. User approval
remains appropriate for conflicts, scope violations, destructive actions,
external writes, unsafe cleanup, and other material exceptions.

AIX must provide setup and diagnostic guidance without changing host
configuration. `aix pm doctor` is a local, read-only diagnostic available before
PM startup or native delegation; `aix pm status` may show a concise summary.
Diagnostics should identify the provider, harness, model/runtime when available,
missing capabilities, and the remediation boundary without exposing secrets.

Codex CLI and Codex Mac app are separate host profiles. They may share an
adapter contract, but each requires independent validation of native
delegation, authorization, workspace integration, cleanup, and visible status.
The host UI need not create one tab per worker; correlated durable identity and
status are the requirement. Claude support may be contract-tested and
implemented before authenticated live validation is available; that gap must
remain explicit.

### Selective parallelism and conflict-aware scheduling

Completing a phase does not imply that every task should run concurrently. The
PM should schedule work from task dependencies, role write domains, artifact
ownership, and host capabilities. Parallelism is allowed selectively where it
reduces latency without creating avoidable merge risk.

The scheduling unit is a cohesive task group, not necessarily an individual
task. Related tasks that share context, files, contracts, acceptance criteria,
or an implementation sequence should be assigned together to one worker and
run sequentially within that assignment. Independent task groups may run in
parallel when their scopes and dependencies are disjoint.

Read-only investigation, independent architecture/security/quality reviews,
and test-design work may run in parallel. Change-producing work may run in
parallel only when its declared write domains and dependencies are disjoint.
Tasks that modify a shared contract, orchestrator, CLI entrypoint, workflow
metadata, or common test fixture should be serialized.

Worker execution may be parallel, but integration into the parent workspace is
serialized. The PM must integrate one completed worker at a time, verify the
result, and update ownership/state before releasing the next dependent task.
Isolated workspaces contain worker changes; they do not remove the need for
changed-file overlap checks, integration locks, conflict handling, or cleanup
safety.

The PM should preserve group context across the full group and should not split
closely related tasks merely to increase fan-out. A group may be split only
when doing so is safe, useful, and supported by explicit ownership and
dependency evidence.

The PM role and workflow guidance describe the scheduling policy, while the PM
orchestrator and workspace manager enforce it. Role and team metadata declare
write domains and likely ownership; runtime checks must reject or queue work
when ownership is missing, overlapping, or ambiguous. Native host concurrency
is an input to scheduling, not permission to bypass AIX conflict policy.

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
  otherwise. The accepted PM-managed integration policy below authorizes
  routine project-local integration without per-operation user approval; the
  user remains the authority for exceptions and irreversible decisions.

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

## Non-goals

- Building an AIX-owned process manager, daemon, terminal multiplexer, or
  remote worker fleet in the initial implementation.
- Supporting inline prompt overlays as an equivalent to independent native
  sub-agents.
- Making AIX depend on one model vendor, model family, or AI harness.
- Persisting full worker transcripts or turning delegation logs into the
  project's permanent knowledge base.
- Letting PM delegation bypass user approval for product, destructive, release,
  or other irreversible decisions. Routine project-local integration is
  governed by the accepted host-authorization policy and is not a per-operation
  user approval event.
- Adding registry, plugin-package, global-install, or publishing behavior to
  the package-manager layer.

## Boundaries and invariants

- `aix init` initializes package management only. Workflow installation and
  activation are explicit opt-in operations.
- Rerunning `aix init` is non-interfering with installed or active workflows,
  standalone PM state, PM routing, team rosters, and delegation records.
- Workflows declare `project-manager` as a reusable role dependency. The PM
  package remains standalone and reusable, while the active workflow owns
  activation of that dependency. Workflow, role, and dependency provenance
  remain in manifest and lockfile state.
- The PM is the single user-facing project coordinator. AIX CLI commands
  manage project assets and local PM records; they do not become a hidden
  long-running agent.
- When the PM workflow is active, the PM is the primary agent session for
  normal project conversations. Specialist roles are entered through PM
  delegation, subject to the documented narrow bypasses.
- Native hosts own worker execution. AIX owns the role, brief, protocol,
  identity, evidence, authority, and record contracts.
- PM logic depends on an AIX host-execution interface, not on a specific
  vendor SDK, model, command syntax, session object, or event format.
- AIX uses `subagent_id` for a logical worker, `delegation_id` for one bounded
  assignment, and `host_worker_id` for the provider's runtime handle.
- A native worker is not considered complete without a correlated result and
  the evidence required by its task mode.
- Role write domains narrow concurrency before workspace isolation is needed.
  `implementation-engineer` owns source-code and test implementation; other
  roles may write only within their declared document domains.
- Same-artifact writes are serialized. Parallel change-producing workers
  require isolated workspaces per delegation, and AIX must not silently allow
  concurrent writes to a shared checkout.
- `AGENTS.md` receives only a small marker-delimited routing block when the PM
  workflow is activated. Project-owned content remains untouched.
- PM records live outside package-managed `.agents/` content and project-owned
  `_docs/` knowledge. Cleanup never removes protected work or source files by
  default.
- Raw secrets never enter PM prompts or durable delegation records. Secret
  references and provider-controlled ephemeral injection are the only allowed
  delegation path.
- Unknown required host capabilities fail closed for PM team orchestration,
  while package-management commands remain available.

## Implementation Phases (status: accepted)

The phases below are intentionally incremental. Each phase introduces a
testable contract or integrated capability before later phases depend on it.
The first host/provider implementation may be a test double, but it must use
the same interface that a real supported harness adapter will use. No phase
activates PM behavior by accident; package-only initialization remains the
default until an eligible workflow is explicitly installed and activated.

### Incremental dogfooding rule

The plan should be developed as a sequence of vertical slices, not as a fully
top-down build that is only tested at the end. Early contract, storage, and
package-lifecycle work may be implemented directly because the new PM runtime
does not exist yet. As soon as the first real native-provider path, durable
exchange, and workspace safety boundary are usable, the AIX project itself
should activate the PM workflow and use it to implement subsequent bounded
code changes.

The first PM-dogfooded change should be deliberately small and reversible, such
as a focused test or runtime module change. The PM must dispatch it to the
implementation-engineer through the real provider interface, receive durable
status and result evidence, verify it, and integrate or recover the isolated
workspace. From that gate onward, every normal implementation, documentation,
verification, and cleanup task in this plan should be routed through the PM.
Direct implementation is reserved for bootstrap gaps, provider/runtime
failures, or explicit recovery work, and any exception must be recorded in the
plan. This makes the plan itself an acceptance test of the delegation model.

### Observability and troubleshooting direction

Normal user-facing output should remain concise and explain decisions,
progress, exceptions, and required action without exposing internal noise.
During development, debugging, and recovery, AIX should support an opt-in
verbose mode that exposes the underlying orchestration evidence. This may be
shown in the CLI, written to structured local runtime logs, or both, depending
on the host and command.

Verbose diagnostics should be correlated by PM session ID, delegation ID,
subagent ID, host worker ID, event ID, and workspace ID where available. They
should make it possible to reconstruct capability discovery, brief dispatch,
worker creation, status transitions, provider responses, lease/lock behavior,
workspace integration, cleanup decisions, and refusal or recovery paths.
Diagnostics are troubleshooting evidence, not a second communication protocol
and not a replacement for the durable brief, status, or result records.

Verbose logs are local runtime state under `.aix/pm/`, are ignored by Git, and
follow the same raw-secret prohibition and redaction rules as delegation
records. The implementation should support bounded rotation or cleanup so
debugging cannot create unbounded project data. Development and test fixtures
may enable verbose output by default; normal installed behavior should require
an explicit opt-in.

### Phase 1: Establish PM domain contracts and local state (status: completed)

Goal: create the stable vocabulary and safe project-local storage boundaries
without dispatching workers yet.

Tasks:

- ✅ Add PM domain types and validators for workflow/team identity,
  `subagent_id`, `delegation_id`, `host_worker_id`, display name, task mode,
  delivery mode, protocol version, authority, write scope, required access,
  lifecycle state, safety holds, and evidence references.
- ✅ Add safe `.aix/pm/` path helpers and a project-local runtime layout for
  session metadata, leases, delegation directories, indexes, briefs, status
  events, results, and temporary workspaces. Reject paths that escape the
  project or delegation root.
- ✅ Define timestamp handling and UTC serialization for `created_at`,
  `updated_at`, `last_status_at`, `last_observed_at`, and `completed_at`.
- ✅ Define event identity and ordering validation: event IDs, delegation and
  subagent IDs, sequence numbers, timestamps, event source, and host
  correlation data. Implement duplicate, stale, out-of-order, and conflict
  classifications as pure domain logic.
- ✅ Define the initial protocol and record schema versions, including the
  fail-closed behavior for unsupported or unknown required versions.
- ✅ Add focused unit tests for IDs, timestamps, path safety, state
  transitions, event classification, schema rejection, and atomic record
  writes. Add fixtures for crash-left and partially written state.
- ✅ Define the structured diagnostic event shape, log levels, correlation
  fields, redaction boundary, rotation/size policy, and concise-versus-verbose
  rendering contract. Add a local logger that is safe to use during recovery
  and cannot persist raw secret values.

Exit criteria:

- PM records can be created and validated without a host or active PM session.
- A malformed, path-escaping, secret-bearing, or identity-inconsistent record
  is rejected by the domain layer.
- The package-management CLI and existing lockfile formats remain unchanged.

Verification:

- `npm run build` passed.
- `node --test tests/pm-domain.test.mjs` passed: 12 tests.
- `npm test` passed: 245 tests.
- Knowledge-base updates and design promotion were intentionally skipped; they
  remain part of final plan completion after all phases are complete.

### Phase 2: Model workflow teams and dependency activation (status: completed)

Goal: make workflow ownership and activation state express the PM team without
changing the normal package-only `aix init` experience.

Tasks:

- ✅ Extend workflow manifest and lockfile types to declare required reusable
  role dependencies, especially `project-manager`, workflow-owned team roster
  metadata, dependency provenance, and required PM capabilities.
- ✅ Define and validate the workflow-owned `team.md` contract: workflow and
  version, role responsibilities, supported task/delivery modes, write domains,
  denied areas, sequencing or handoff rules, required capabilities, and
  permission expectations.
- ✅ Add the `team.md` asset and required dependency metadata to
  `design-plan-execute`; keep the generic PM role package reusable and avoid
  duplicating it in the workflow.
- ✅ Refactor workflow installation and activation to resolve, install or
  verify, and activate declared dependencies atomically. Record whether PM and
  specialist roles were requested directly or activated through a workflow.
- ✅ Refactor workflow deactivation/removal to cascade through dependencies
  that no other active workflow requires, preserve ownership/provenance, and
  remove only AIX-owned managed routing hooks.
- ✅ Preserve existing project-owned `AGENTS.md` content, update only stable
  AIX marker blocks, and add the minimal PM-routing block only when an active
  workflow requires PM. Ensure failed activation rolls back package, lockfile,
  role, and `AGENTS.md` changes.
- ✅ Ensure default and repeated `aix init` remain package-only and do not
  install, activate, migrate, or remove PM/workflow state.
- ✅ Add workflow, dependency, lockfile, append-block, rollback, shared
  dependency, deactivation, and rerun tests.

Exit criteria:

- Installing a workflow activates its declared PM/team dependencies and hooks
  as one managed lifecycle operation.
- Deactivation removes the active workflow's AIX-owned hooks and restores
  normal prompt behavior without overwriting project-owned instructions.
- The active workflow exposes a validated `team.md` roster and dependency
  provenance through status/verification output.

Verification evidence:

- `npm run build` passed.
- `npm test` passed with the full repository suite.
- Workflow manifest and lockfile tests cover dependency provenance, team
  metadata, required capabilities, and malformed input rejection.
- Workflow lifecycle tests cover dependency activation from a source,
  idempotent reinitialization, workflow-owned dependency cleanup, managed
  append preservation, and transactional rollback.
- Initialization tests confirm that `aix init` creates package-management state
  only; workflow and PM activation remain explicit.
- `_docs/kb` was intentionally not changed; design promotion remains deferred
  to final plan completion.

### Phase 3: Define the host-execution boundary and capability discovery (status: completed; follow-on host tasks pending)

Goal: hide vendor, model, harness, worker-session, and event-transport details
behind one host-neutral interface.

Tasks:

- ✅ Define the host-execution interface for session identity, capability
  discovery, independent worker creation, role instructions, initial brief
  delivery, correlated results, optional status/inspection/follow-up/stop/
  resume operations, permissions, workspace binding, and concurrency.
- ✅ Define the provider capability snapshot and refresh policy: discover at
  every PM session/fresh invocation, reuse during that session, and refresh on
  harness/model/runtime changes or explicit request. Record provider/vendor,
  harness, model, runtime, protocol support, and unknown fields without
  guessing missing metadata.
- ✅ Implement a fake/native-shaped provider for contract tests. It must
  create independent workers, return logical and host IDs, accept role
  instructions and briefs, and emit correlated final results.
- ✅ Implement the minimum viable adapter boundary for a native host
  early enough to support project dogfooding. It must use the same interface as
  the fake provider and support independent worker creation, role/persona and
  brief delivery, correlated results, and the required capability snapshot.
- ✅ Build and verify the first real supported-host adapter for the Pi harness.
  Keep Pi worker/session objects and command details inside an optional Pi
  adapter package; do not make Pi a hard dependency of AIX.
- ✅ Verify that the Pi adapter can select Codex, Claude, and other supported
  model providers without changing PM behavior, delegation records, or the
  shared protocol.
- ✅ Keep direct Codex or Claude adapters conditional on a later support
  decision identifying native-host behavior that Pi cannot provide. Do not
  create one adapter per model.
- ✅ Implement and test the Codex host adapter as a supported native host,
  including native subagent creation, independent execution, status and result
  correlation, follow-up or stop control where supported, permission behavior,
  workspace handoff, and capability discovery. Add Codex CLI/app dogfooding
  prompts for read-only, implementation, verification, failure-recovery, and
  completed-result flows.
- ✅ Record the successful Codex Mac app dogfooding evidence, including native
  subagent creation, parallel execution, role selection from `team.md`,
  read-only safety, and final PM reconciliation. Include the prior
  fail-closed regression that prevents PM-routed work from using prompt-overlay
  lenses when native delegation is unavailable. Evidence: a live Codex Mac app
  read-only review created multiple native subagents in parallel, selected
  specialist roles from the workflow team, returned role-scoped findings, and
  reconciled the results without edits. The earlier prompt-overlay behavior was
  corrected and covered by the fail-closed regression test.
- ✅ Improve PM final-result reporting so each delegated specialist includes
  its AIX role, delegation ID, logical subagent ID, host-generated display
  name when available, terminal status, and concise result summary. Preserve
  the host-neutral format so the same report works for Codex, Claude, Pi, and
  future native hosts.
- ✅ Implement and test the Claude host adapter as a supported native host,
  including native subagent creation, independent execution, status and result
  correlation, follow-up or stop control where supported, permission behavior,
  workspace handoff, and capability discovery. Add Claude CLI/app dogfooding
  prompts for read-only, implementation, verification, failure-recovery, and
  completed-result flows.
- ✅ Implement the PM preflight decision: required native delegation
  capabilities must be explicitly supported; unsupported or unknown required
  capabilities fail closed for PM orchestration while package-management
  commands remain available.
- ✅ Add cross-adapter contract tests proving independent context, identity
  propagation, role/persona loading, brief delivery, result correlation, and
  capability refusal. Test capability refresh after a harness/model change.

Exit criteria:

- PM orchestration depends only on the AIX host interface, never on a vendor
  SDK or harness-specific session details.
- A provider can be substituted in tests without changing PM behavior.
- The user receives a clear native-delegation readiness error instead of an
  inline or silently shared-context fallback.
- One real supported host can execute the minimum native delegation path needed
  for the later PM dogfooding gate.

Verification evidence: `NativeHostAdapter` keeps host implementation details
behind the AIX interface, `PiHostAdapter` and `CodexHostAdapter` translate
native worker calls without leaking host types into PM logic, `FakeNativeHost`
proves independent workers and correlated results, and capability refusal plus
per-session refresh are covered by contract tests. `CodexCliBridge` runs
independent `codex exec` workers with stdin prompts, workspace/sandbox binding,
JSONL session correlation, result capture, stop control, and optional persisted
follow-up sessions. Codex dogfooding prompts live in the workflow package.
`ClaudeHostAdapter` and `ClaudeCliBridge` provide the corresponding Claude
CLI path: independent worker processes, role/brief delivery, read-only versus
writable permission modes, stream/session correlation, result capture, stop
control, and optional persisted follow-up sessions. Claude dogfooding prompts
live in the workflow package. The Claude CLI executable was detected during
implementation, but no authenticated live Claude prompt has been run yet;
account/authentication and live-provider behavior remain an explicit manual
validation step.

### Phase 4: Package the PM persona and shared delegation protocol (status: completed)

Goal: make every role worker arrive with the right identity, boundaries, and
communication rules before it receives work.

Tasks:

- ✅ Update the reusable PM `ROLE.md` and `GUIDANCE.md` to describe session
  startup recovery, workflow-team discovery, capability preflight, bounded
  briefs, orchestration authority, user escalation, and the no-direct-edit
  rule for PM and parent contexts.
- ✅ Add workflow-owned shared delegation protocol guidance, initially under
  `design-plan-execute`, covering dispatch, acceptance, status, questions,
  decisions, follow-up, stop, result, evidence, identity, scope, and terminal
  state semantics. Do not add a root `SUBAGENTS.md`.
- ✅ Define role metadata for supported task modes, delivery modes, write
  domains, denied capabilities, required evidence, and permission expectations.
  Validate that `team.md` references roles and modes that actually exist.
- ✅ Define the worker context loading order: project instructions, selected
  role `ROLE.md`, selected `GUIDANCE.md` files, shared protocol guidance,
  `team.md` excerpt, and the current delegation brief. Avoid loading the full
  PM transcript or every role document.
- ✅ Add role/persona fixtures and instruction tests that verify role
  identity, authority, stop conditions, protocol version, delegation identity,
  and bounded task scope are present in the worker context.

Exit criteria:

- A fake worker can be initialized as a named role instance with the exact
  role and guidance context needed for its assignment.
- Role documents define behavior while the brief defines the current task;
  neither requires full transcript forwarding.

Verification evidence: worker context loading and the workflow-owned
`delegation-protocol.md` establish bounded context; team validation checks role
directories and supported modes; PM role guidance documents recovery,
capability checks, identity, and no-direct-edit authority.

### Phase 5: Implement durable delegation exchange (status: completed)

Goal: establish recoverable PM-to-worker and worker-to-PM communication for
short inline tasks and larger planned work.

Tasks:

- ✅ Implement delegation creation that writes an authoritative, PM-authored
  `brief.md` before dispatch. Include IDs, role, workflow/team version,
  protocol versions, task and delivery modes, bounded goal, constraints,
  acceptance signals, write scope, required access, stop conditions, and
  return requirements.
- ✅ Implement worker-owned progress and result publication through a
  controlled interface. Store meaningful status events and `result.md`, while
  AIX/provider owns identity, sequencing, timestamps, atomic persistence, and
  schema validation.
- ✅ Implement the required exchange: dispatch, identity/acceptance
  confirmation, and correlated final result. Add optional status, question,
  decision, follow-up, and stop paths according to task mode and provider
  capability.
- ✅ Enforce bounded durable content: summaries, decisions, evidence pointers,
  and limited excerpts only. Reject raw secrets and avoid full prompts,
  transcripts, source copies, or unrestricted worker output. Support ephemeral
  secret references without persisting secret values.
- ✅ Add record indexes and read APIs that allow a compacted or new PM session
  to recover a delegation without replaying chat history.
- ✅ Emit correlated diagnostics for brief publication, worker status/result
  publication, validation failures, provider responses, and interrupted writes.
  Keep the durable delegation records concise while retaining detailed
  troubleshooting evidence in the opt-in local diagnostic stream.
- ✅ Add end-to-end fake-provider tests for brief creation, worker status and
  result publication, correlation, partial/blocked results, malformed output,
  secret rejection, and interrupted writes.

Exit criteria:

- A delegation can be dispatched and recovered entirely from `.aix/pm/` plus
  provider state.
- Worker-authored content cannot rewrite authoritative identity, scope, or
  lifecycle fields.
- The PM can accept or reject a result using evidence without relying on the
  original conversation transcript.

Verification evidence: durable delegation tests cover brief creation,
acceptance, status, questions, result publication, correlation, secret
rejection, and atomic record writes. Records remain under `.aix/pm/`; no
knowledge-base promotion was performed.

### Phase 6: Add PM orchestration, recovery, and coordination (status: completed)

Goal: make the PM a usable orchestrator for independent native workers while
keeping user interaction centered on the PM.

Tasks:

- ✅ Implement PM session startup: acquire the project PM lease, discover the
  active workflow/team, refresh capabilities, and reconcile every non-terminal
  delegation before accepting new meaningful work.
- ✅ Implement lease expiry/takeover and per-delegation/per-artifact locks.
  Permit read-only inspection from other sessions, but restrict dispatch,
  steering, acceptance, integration, and coordination writes to the lease
  holder.
- ✅ Implement conservative role selection from `team.md`, loading full role
  and guidance documents only for selected workers. Enforce task mode, delivery
  mode, write scope, authority, required access, and role ownership.
- ✅ Implement logical subagent reuse only for compatible sequential work. Each
  assignment gets a fresh brief and delegation ID; every retry gets a new
  worker and delegation without inherited mutable context.
- ✅ Implement recovery reconciliation across durable records, provider state,
  worker identity, workspaces, plan/task references, and event history. Record
  `host-lost` or `unknown` when evidence conflicts or is insufficient.
- ✅ Implement PM recovery actions: follow-up, pause, stop, fresh retry,
  redirect, delegated repair, verification, and escalation. Preserve the rule
  that PM and parent contexts do not edit project artifacts directly.
- ✅ Add PM-facing `status`/inspection behavior and refusal-path UX for missing
  capabilities, expired leases, conflicting sessions, unavailable workers,
  unsafe permissions, and unresolved recovery state.
- ✅ Add verbose PM diagnostics for session startup, capability discovery,
  recovery reconciliation, lease acquisition/takeover, lock contention,
  provider actions, and state decisions. Ensure normal output remains concise
  and verbose output is explicitly enabled.
- ✅ Add fake-provider integration tests for sequential delegation, independent
  contexts, recovery after abrupt termination, event conflicts, lease takeover,
  fresh retry, user decision routing, and parent/PM direct-edit refusal.

Exit criteria:

- A normal conversation in an activated PM workflow enters through the PM and
  can complete a bounded delegated task using a native-shaped provider.
- A new PM session discovers incomplete work before dispatching overlapping
  work.
- Routine failures are handled by PM recovery; only product, scope, risky
  permission, security/data safety, or unrecoverable decisions reach the user.

Phase 6 execution notes:

- Added a host-neutral PM orchestrator with project session leases, capability
  preflight, startup reconciliation, role/task/delivery validation, durable
  dispatch, compatible sequential worker reuse, and correlated result handling.
- Added lease-backed PM locks for dispatch and delegation recovery operations.
  Fresh retries supersede the old delegation and create a new delegation and
  worker without inheriting mutable worker context.
- Added PM recovery actions for follow-up, pause, stop, fresh retry, redirect,
  delegated repair, verification continuation, and escalation. Parent and PM
  artifact-write refusal remains explicit.
- Added `aix pm status` for concise session, lease, workflow, and delegation
  inspection, with verbose structured diagnostics retained under `.aix/pm/`.
- `_docs/kb` was intentionally unchanged; durable design promotion remains part
  of final plan completion.

Phase 6 verification:

- `npm run build`
- `node --test tests/pm-orchestrator.test.mjs tests/pm-runtime.test.mjs tests/workflow-team.test.mjs`
- `AIX_CACHE_DIR=/tmp/aix-phase6-cache-$$ npm test` (255 passed)
- `git diff --check`

### Phase 7: Add workspace isolation and integration (status: completed)

Goal: hide workspace mechanics from the user while making write-producing
delegations safe to execute and integrate.

Tasks:

- ✅ Define the workspace interface for read-only execution, isolated
  write-producing execution, base revision, scope, ownership, cleanliness,
  integration target, and cleanup state.
- ✅ Bind isolation to each write-producing delegation rather than the
  logical subagent lifetime. Allow read-only work without a worktree when safe.
- ✅ Implement isolated worktree creation, validation, status inspection,
  integration handoff, conflict detection, and safe cleanup. Preserve
  unmerged changes and refuse unsafe deletion.
- ✅ Enforce role write domains and single-writer artifact locks. Serialize
  same-artifact changes while allowing disjoint read or write scopes to run in
  parallel when the provider supports it.
- ✅ Implement PM/delegated repair paths for conflicts, verification failures,
  scope drift, unmerged changes, and incomplete cleanup. Surface exceptions to
  the user only after bounded recovery attempts.
- ✅ Add isolated temporary-project integration tests for clean integration,
  conflicts, scope violations, abandoned worktrees, cleanup refusal, document
  concurrency, and implementation-engineer-only source-code writes.
- ✅ Run the first PM dogfooding change in the AIX repository through the real
  provider path. Use a small bounded implementation-engineer task, an isolated
  workspace, durable brief/status/result records, verification, and PM-owned
  integration. Record the delegation and any recovery or exception path. A
  live Pi-backed Codex session completed the capability-snapshot change through
  an isolated worker worktree, delegated security and quality review, targeted
  verification, PM integration, and cleanup. The worker-reported native IDs
  were recorded by the host, while AIX ID exposure remains a Phase 9
  correlation follow-up.

Exit criteria:

- Users do not manage branches, worktrees, or merge mechanics for normal
  delegations.
- Integration exceptions are visible and recoverable without silently losing
  work or allowing out-of-scope changes.
- The PM has successfully orchestrated and integrated at least one real code
  change in AIX through a supported native host.

Phase 7 execution notes:

- Added the host-neutral `WorkspaceManager` contract and Git worktree
  implementation. Read-only/report-only delegations do not create worktrees;
  isolated write-producing delegations are bound to a fresh worktree per
  assignment.
- Added base-revision capture, worker workspace binding, changed-file and
  denied-scope validation, clean-target checks, three-way integration,
  conflict preservation, and safe cleanup. Integrated worktrees may be removed
  forcefully only after successful PM integration; unmerged work is preserved.
- Added role-domain enforcement before dispatch and artifact lock helpers so a
  caller cannot widen a role's declared write scope. Normal users do not manage
  branches, worktrees, or merges.
- Added isolated temporary-project coverage for tracked and new files, clean
  integration, scope drift, conflict preservation, unsafe cleanup, and a PM
  dogfood slice using the native-shaped fake provider.
- The complete automated native-shaped provider path is verified. The first
  live Pi-backed implementation dogfood completed the Phase 7 gate. The PM
  preserved the shared workspace and removed the temporary worker worktree
  only after the worker reported unrelated leftover changes and cleanup was
  explicitly approved. Live Claude validation remains pending and belongs to
  Phase 9 provider hardening; no live provider SDK is embedded here.

Phase 7 verification:

- `npm run build`
- `node --test tests/pm-workspace.test.mjs tests/pm-orchestrator.test.mjs tests/pm-runtime.test.mjs`
- `AIX_CACHE_DIR=/tmp/aix-phase7-cache-$$ npm test` (258 passed)
- `git diff --check`
- Live Pi-backed PM dogfood: capability-snapshot implementation, delegated
  review, verification, PM integration, and temporary-worktree cleanup

### Phase 8: Implement tidy, retention, and completion cleanup (status: accepted)

Goal: make PM runtime state maintainable for both planned and inline work.

Tasks:

- ✅ Migrate historical project-scoped Pi delegation artifacts into the
  project-local `.aix/pm/legacy/pi-subagents/` area without moving Pi-owned
  credentials, settings, general sessions, model data, or package data.
- ✅ Enforce the documentation promotion gate: active-plan execution records
  `_docs/kb` impact and promotion candidates in the plan, while an explicitly
  classified and approved micro-fix may update `_docs/kb` only after its own
  implementation and verification closeout.
- ✅ Complete the Phase 8 implementation/process gate. The initial tidy slice
  was implemented in the parent session rather than through a native PM
  delegation; that earlier validation gap is retained as historical context.
- ✅ Implement `aix pm tidy` as a local command that works without an active PM
  session or native delegation. Preview eligible records, workspaces, safety
  holds, references, timestamps, and proposed actions by default.
- ✅ Add interactive confirmation and explicit mutation modes for archive,
  apply, and purge. Non-interactive use remains preview-only unless an explicit
  mutation flag is supplied.
- ✅ Implement relevance and retention rules: completed data may be purged
  early after it is no longer relevant; stale incomplete delegations reach the
  default 30-day inactivity limit; active work, unlanded changes, unresolved
  integration, destructive-risk holds, and external references block purge.
  Workspace and plan-reference holds are covered by the focused verification.
- ⚠️ Complete plan-completion promotion integration so durable
  implementation/design knowledge is promoted once, concisely, into the plan
  or `_docs/kb`. The executable completion authorization/waiver hook exists,
  but final design promotion and KB refresh remain deferred until all phases
  and closeout gates finish. Do not run chatty per-delegation promotion.
- ✅ Permit full deletion of delegation briefs, results, status events,
  indexes, temporary files, and workspaces after promotion or explicit waiver
  and cleared safety holds. Do not retain tombstones by default.
- ✅ Add workflow-deactivation warning and confirmation for active/unlanded
  delegation datasets; on confirmation delete only the affected workflow-owned
  runtime dataset, preserving project-owned files and unrelated work.
- ✅ Add CLI and integration tests for preview, confirmation, non-interactive
  refusal, early completed cleanup, 30-day stale cleanup, safety holds,
  deactivation deletion, and plan-completion promotion ordering.
- ✅ Add diagnostic-log rotation and cleanup tests, including redaction,
  correlation, bounded size, preview reporting, and purge behavior.

Exit criteria:

- PM runtime data has a clear, user-visible cleanup path and does not become
  permanent project history.
- Deactivation cannot silently delete active delegation data or project-owned
  files.

Phase 8 execution notes:

- The integrated executable work now provides local `aix pm tidy` preview and
  explicit archive/apply/purge mutation paths, conservative retention rules,
  safety holds, workflow-scoped deactivation cleanup, completion
  authorization/waiver records, and diagnostic-log rotation, redaction,
  correlation, and cleanup behavior. The implementation preserves project
  files and unrelated workflow runtime data in the covered paths.
- Final focused verification recorded `npm run build` plus 36 focused
  PM/tidy/diagnostic/domain tests passing. A prior quality report recorded the
  full suite as 279 passing with an isolated `AIX_CACHE_DIR`; `git diff
  --check` also passed.
- Phase 8 remains accepted with lifecycle and safety follow-up. Final
  promotion ordering, transactional cleanup guarantees, and any remaining
  security findings must be resolved or explicitly recorded before closeout.
  Final native security sign-off was unavailable, so safety follow-up remains
  deferred. Final `$design-promote`/knowledge-base refresh, plan archival, and
  final closeout remain deferred until every Phase 9 task and all full-plan
  completion gates are complete. `_docs/kb` is intentionally unchanged in this
  phase update.

### Phase 9: Connect supported native providers and harden the workflow (status: accepted)

Goal: prove the host-neutral design against real supported harnesses and finish
the user-facing package lifecycle.

Tasks:

- ✅ Continue using the PM to orchestrate normal implementation, documentation,
  verification, and provider-hardening work. Use direct parent-context changes
  only for documented bootstrap or recovery exceptions.
- ✅ Define and implement the explicit `managed-local-integration` host
  capability. Require it for every `local-change` and `isolated-change`
  delegation, while keeping read-only/report-only work available without it.
  Execution note: The capability was implemented; mutating delegation modes
  require it, while report-only remains available without it. Verification
  passed: `npm run build`; `node --test tests/pm-orchestrator.test.mjs
  tests/pm-runtime.test.mjs`; `git diff --check`.
- ✅ Add a host-adapter workspace integration operation that replaces routine
  raw shell integration where the host supports it. Preserve AIX validation of
  scope, changed files, conflicts, unlanded changes, and cleanup safety.
  Execution note: The explicit adapter operation was implemented; supported
  hosts route through it while AIX validation and cleanup safeguards remain.
  Unsupported integration refuses clearly. Verification passed: `npm run build`;
  `node --test tests/pm-workspace.test.mjs tests/pm-orchestrator.test.mjs
  tests/pm-runtime.test.mjs`; `git diff --check`.
- ✅ Add host-authorization diagnostics and `aix pm doctor`; keep `aix pm status`
  concise. Report missing capability and remediation guidance without changing
  host configuration or emitting secrets.
  Execution note: Implemented through the PM; `aix pm doctor` reports missing
  capabilities and remediation without changing host configuration or exposing
  secrets. Build and focused doctor/runtime/orchestrator tests passed.
- ✅ Fix the Phase 8 tidy retention follow-up so `created` delegations remain
  protected as active/unresolved work and add a regression test.
- ✅ Fix diagnostic cleanup so the current log is preserved and only eligible
  rotated or explicitly stale logs are purged; add regression coverage.
- ⚠️ Validate Codex CLI and Codex Mac app as separate host profiles, including
  routine integration without approval prompts and exception handling for
  conflicts, scope violations, destructive actions, and unsafe cleanup. Do not
  require a particular worker-tab UI. Contract tests and the adapter build
  passed, but authenticated CLI execution and Codex Mac validation were not
  run; those remain manual gates.
- ⚠️ Record Claude live-provider validation as a separate manual gate. Complete
  it when authenticated Claude access is available, while preserving the
  contract-tested adapter behavior in the meantime. Authenticated Claude
  execution and provider-side restart recovery were not run, so live
  validation remains deferred.
- ✅ Normalize and test correlation across AIX delegation IDs, logical
  subagent IDs, host mission or run IDs, and active or completed status
  queries. Persist the mapping, use the correct host status lookup for each
  identifier, and keep completed runs inspectable without treating an
  identifier mismatch as a delegation failure.
- ✅ Persist an immutable capability snapshot or snapshot reference with each
  delegation at dispatch so later recovery and audit can explain why the host
  was accepted for that assignment. Keep the snapshot bounded and free of
  secrets. Implemented through the PM in an isolated worker worktree, with
  persistence, recovery/status access, tamper rejection, and bounded
  normalization tests. Live Claude validation remains separate and pending.
- ✅ Implement one supported native provider adapter against the Phase 3
  interface's complete capability set, extending the Phase 3 minimum adapter
  with the provider's supported status/control, permission, workspace, and
  concurrency operations. The Codex CLI contract adapter covers these
  operations; authenticated live execution remains a manual gate.
- ✅ Add additional provider or harness adapters only where their native
  delegation contract satisfies the required PM capabilities. No additional
  adapter is required for this phase; unsupported and unknown capabilities
  refuse clearly without inline fallback behavior.
- ✅ Add a supported-harness capability matrix and diagnostics showing the
  discovered harness, vendor/provider, model, runtime, protocol support, and
  missing capabilities without requiring those metadata fields to be present.
  Matrix and doctor diagnostics are bounded and secret-safe.
- ✅ Complete command UX and help for workflow activation/deactivation,
  `aix pm` inspection/status/tidy operations, verbose diagnostics, confirmation
  prompts, refusal paths, and normal-prompt restoration. Build and focused CLI,
  workflow, PM, and safety tests passed.
- ✅ Run package, activation, workflow, role, lockfile, security, provider,
  lifecycle, workspace, cleanup, and end-to-end regression suites. Verify
  packed npm artifacts include all PM/workflow assets and exclude local runtime
  state. Full verification passed with 300 tests, the explicit risk-surface
  suite passed with 178 tests, packed-artifact and local-smoke checks passed,
  and `git diff --check` passed.
- ⚠️ Review and update product, requirements, architecture, security,
  quality, operations, workflow, and PM role documentation. The final
  documentation review and `_docs/kb` promotion are deferred until plan
  completion; `_docs/kb` must remain unchanged in this phase.

Phase 9 execution notes:

- PM-routed implementation workers completed managed-local integration and
  host-adapter workspace integration (worker identity: implementation-engineer;
  delegation IDs `01a06461-73df-76a3-9275-84ce6389a105` and
  `01a06466-8531-7691-8658-1a1bb47a2cda`). Documentation-specialist workers
  reconciled plan status in isolated forks (worker identity:
  documentation-specialist; delegation IDs `01a06461-7383-7ed0-a9e5-bf23bb53e456`,
  `01a06466-84e2-71c0-ad35-d97fbb05c0e0`, `01a0646b-620a-7392-ae0a-1e5847e998c4`,
  `01a0646f-7bc6-7e72-8bdc-b5aaf8b2fb98`, `01a06476-2eaa-73a2-a132-78e25d576ad6`,
  `01a0647f-2ec1-7cc1-9f53-76d19c49e4a4`, `01a06485-333e-7881-be0c-e88b89c8a633`,
  `01a0648f-c295-7f30-aa3c-d856a0561951`, `01a06496-41fd-7ce3-adb9-315b8ad5f4cf`,
  and `01a0649d-7fb0-7350-9836-7b0ec10717e5`).
- Host diagnostics, tidy retention, diagnostic cleanup, correlation, the
  bounded capability snapshot, the Codex adapter, capability matrix, and
  command UX were implemented by implementation-engineer workers and checked
  by quality-engineer workers. Implementation delegation IDs include
  `01a0646d-d276-77b2-a61f-8c077a16ca39`, `01a0646f-7b76-7a91-b2e9-14b8c61f6cc1`,
  `01a06477-bec3-7ea3-91b6-f740d5844414`,
  `01a06480-61ee-7d93-9a6c-7d61cd690c65`, `01a06487-660b-7d31-84e5-8975a7931064`,
  `01a06492-4e1b-7470-bc65-caa0dace6384`, `01a06493-c5f2-7f40-b7c7-bf28fce3e599`,
  and `01a06497-d6fe-7a50-803b-7fa39f589740`.
- Automated evidence: `npm run verify` passed with 300 tests; the explicit
  risk-surface suite passed with 178 tests; package preview, packed-artifact
  inspection, and local-smoke checks passed; focused provider/correlation,
  doctor, tidy, diagnostics, workspace, CLI, and PM regression tests passed.
  Provider executables were present, but authenticated Codex/Claude runs,
  provider-side restart recovery, and Codex Mac UI validation were not run.

Exit criteria:

- At least one real supported harness can run the complete PM delegation path.
- Package-only users remain unaffected, and unsupported hosts fail clearly.
- The plan's verification and security gates pass with no unowned runtime or
  cleanup behavior.

### Phase 10: Add selective parallelism and conflict-aware scheduling (status: completed)

Goal: allow safe parallel worker execution without allowing conflicting changes
to race through the parent workspace or silently collide during integration.

Tasks:

- ✅ Define the scheduling model for task dependencies, role write domains,
  artifact ownership, shared-resource claims, and host concurrency limits.
- ✅ Define task-group formation rules so related tasks are bundled into one
  worker assignment and run sequentially, while independent groups remain
  eligible for parallel execution.
- ✅ Extend workflow/team/role metadata where needed to declare write domains,
  read-only behavior, shared artifacts, and serialization requirements.
- ✅ Implement PM scheduling that parallelizes independent read-only work and
  disjoint change-producing work, while queuing dependent or overlapping tasks
  and preserving sequential execution within each cohesive task group. Related
  tasks in one canonical group reuse one native worker assignment through host
  follow-up when supported; grouped work fails clearly when that capability is
  unavailable.
- ✅ Add runtime ownership and conflict checks for shared contracts,
  orchestrator code, CLI entrypoints, workflow metadata, common fixtures, and
  other declared shared artifacts.
- ✅ Add integration serialization and locking so parent-workspace integration
  occurs one worker at a time, with verification and state updates between
  integrations.
- ✅ Incorporate host concurrency and managed-integration capabilities into
  scheduling decisions. Unknown or insufficient capabilities must reduce
  parallelism or fail closed rather than trigger unsafe fallback behavior.
- ✅ Preserve isolated workspace guarantees, changed-file overlap detection,
  conflict recovery, unlanded-change protection, and cleanup safety when
  multiple workers are active.
- ✅ Add scheduler and integration tests for independent parallel work,
  overlapping write domains, dependency queues, shared-resource serialization,
  host capacity limits, failed workers, restart recovery, and integration
  conflicts.
- ✅ Add concise PM status and verbose diagnostic coverage for queued, grouped,
  active, blocked, serialized, integrated, and conflict-recovery work.
- ✅ Document that phase-level execution uses dependency-aware selective
  parallelism across task groups rather than unconditional task fan-out;
  document the grouping rationale and any host-specific limitations.

Execution status: Phase 10 implementation and closeout evidence are complete
across the scheduler, orchestrator, locks, team metadata, documentation, and
tests. Canonical task grouping derives cohesive groups from dependency,
overlapping-scope, shared-artifact, and serialization relationships; caller
group IDs remain non-authoritative. Cross-session artifact claims are acquired
before worker creation, while parent-workspace integration is serialized and
retains conflict recovery state. Scheduler decisions persist concise state and
verbose event diagnostics with the claims and rationale used. Host capacity is
refreshed from dynamic reports and change-producing work fails closed when
required capabilities are unknown or insufficient.

The grouped-worker follow-up was completed as a Phase 10 closeout correction:
the canonical group now drives the default worker-reuse boundary, related
delegations retain one worker and context through native follow-up, and a
regression test covers the behavior.

Phase 10 verification:

- `npm run build`
- `node --test tests/pm-scheduler.test.mjs tests/pm-orchestrator.test.mjs tests/pm-doctor.test.mjs tests/workflow-team.test.mjs` (42 passed)
- `npm test` (327 passed)
- `git diff --check`

Exit criteria:

- Independent work can execute concurrently without conflicting parent
  workspace writes.
- Conflicting or dependent work is queued or serialized with durable evidence.
- Parent-workspace integration is serialized, verified, and recoverable.
- The PM can explain why work was parallelized, queued, or held.
- The PM can explain why tasks were grouped together, kept sequential, or split
  into separate parallel workstreams.

### Phase 11: Migrate product strategy to product ownership and formalize Boss (status: completed)

Goal: clarify product decision ownership by replacing the narrow
`product-strategist` role with a complete `product-owner` role that subsumes
the strategist's responsibilities and adds the behaviors and knowledge of a
software-team product owner. The phase also formalizes the human principal in
the PM interaction model.

Design Intent:

- `product-owner` is a superset of the current `product-strategist` role. It
  continues the strategist's work on idea generation and evaluation, audience
  fit, user value, scope, tradeoffs, prioritization, and sequencing. It adds
  the standard software-team PO responsibilities of maintaining and ordering
  the product backlog, shaping actionable backlog items and acceptance
  criteria, supporting refinement and planning, clarifying product intent
  during implementation, and evaluating delivered work against product-level
  acceptance. It owns product intent, user value, prioritization, scope,
  product-level acceptance, and product tradeoffs, while returning
  implementation, architecture, security, and release decisions to the
  appropriate specialists or Boss.
- `release-engineer` is an experienced or senior DevOps engineer, not a
  generic release assistant. The role owns delivery-system reliability,
  CI/CD, build and package validation, artifact integrity, supported-host
  integration, cross-platform release concerns, operational diagnostics, and
  safe automation tradeoffs. Its default authority excludes publishing,
  unrestricted external changes, and raw credential handling.
- The workflow's `team.md` is the authoritative, versioned roster contract.
  The final roster contains exactly one product-decision role named
  `product-owner`, one release/platform role named `release-engineer`, and no
  ambiguous `product-strategist` ownership. Roster metadata must declare each
  role's responsibilities, task and delivery modes, write domains, denied
  areas, required capabilities, evidence, and serialization policy.
- Existing `product-strategist` state must migrate transactionally or fail
  clearly. The migration must preserve user edits, provenance, lockfile and
  manifest integrity, managed instruction ownership, and a recoverable path
  for standalone-role collisions; it must never leave dual ownership or an
  orphaned active role.
- Boss is the human decision principal, outside the delegated-role roster and
  worker lifecycle. Boss retains authority for product decisions, priorities,
  risky approvals, exceptions, final acceptance, and release decisions.
  Conversational Boss language is concise and intentional; Boss is not a
  durable worker, delegation, or persisted record identity.

Tasks:

- ✅ Align PM capability-discovery and fail-closed delegation guidance across
  the canonical `aix` sources, active `.agents` guidance, workflow skills, and
  relevant workflow README and architecture docs. State that the complete
  host/tool registry must be inspected, deferred tools count, PM-routed work
  requires native delegation, and unknown or unavailable capabilities block
  parent fallback. Keep prompt-overlay only for its explicitly allowed cases.
- ✅ Add regression coverage for deferred-tool discovery,
  missing/unknown `native-worker-creation` or `correlated-results`, capability
  discovery before dispatch, and rejection of parent-session or prompt-overlay
  fallback for PM-routed work.
- ✅ Define the `product-owner` role contract as a superset of the current
  `product-strategist` contract. Preserve idea generation and evaluation,
  audience fit, user value, scope, tradeoffs, prioritization, and sequencing.
  Add software-team PO behaviors and knowledge for backlog ordering, backlog
  item shaping, acceptance criteria, refinement and planning, delivery-time
  product clarification, and evaluation of completed work.
- ✅ Create the `product-owner` role bundle with `ROLE.md` and `GUIDANCE.md`,
  preserving all product-strategy responsibilities while making the added
  software-team PO behaviors, product-decision authority, and escalation
  boundaries explicit.
- ✅ Define the `release-engineer` role contract and persona as an experienced
  or senior DevOps engineer. The contract includes CI, build and package
  validation, npm artifact contents, supported-host environment integration,
  cross-platform compatibility, release diagnostics, operational reliability,
  deployment safety, and release automation tradeoffs.
- ✅ Create the `release-engineer` role bundle with `ROLE.md` and
  `GUIDANCE.md`; describe the senior DevOps perspective, responsibilities,
  authority boundaries, evidence expectations, and refusal/escalation rules in
  both documents. Keep publishing, credential access, and unrestricted
  external-release actions outside the default role authority.
- ✅ Rename the product-strategy role bundle, activation name, display name,
  manifests, lockfiles, guidance, prompts, and related references from
  `product-strategist` to `product-owner`, including package and active-role
  discovery expectations. The canonical workflow package, active `.agents`
  state, generated README, and lockfile now use the reconciled product-owner
  name.
- ✅ Update `aix/workflows/design-plan-execute/team.md` as the authoritative
  workflow roster contract: replace `product-strategist`, add
  `product-owner` and `release-engineer`, declare their bounded metadata,
  bump the team contract version when required, and keep workflow manifest and
  lockfile team hashes/provenance consistent. The team contract is version 2
  and the active lockfile and generated state are synchronized.
- ✅ Define and implement a safe migration for projects with installed or
  active `product-strategist` state, including stale active-file, manifest,
  lockfile, dependency, managed-append, package, active-file, collision, and
  provenance handling. Cover workflow-owned and standalone installations,
  edited-file refusal, transactional rollback, update, reinstall,
  deactivation, and reactivation. Never leave ambiguous dual ownership or
  silently orphaned files. The migration is transactional, refuses edited or
  colliding state, and preserves a recoverable rollback path.
- ✅ Update PM delegation routing and workflow-team discovery so the PM can
  select `product-owner` for product decisions and `release-engineer` for
  release/platform work without treating either as a project-management or
  implementation role. Update project-manager role guidance and reject stale
  or ambiguous role names.
- ✅ Define and enforce `release-engineer` write domains, denied areas,
  required capabilities, evidence requirements, and serialization with
  implementation, architecture, quality, security, and PM work. Keep registry,
  publishing, global-install, and unrestricted external-release behavior out
  of scope unless separately authorized.
- ✅ Formalize `boss` as the human principal in the PM interaction contract.
  Keep Boss outside the delegated-role roster and delegation lifecycle while
  preserving authority for product decisions, priorities, risky approvals,
  exceptions, final acceptance, and release decisions.
- ✅ Define concise conversational use of “Boss” for acknowledgments,
  milestones, completion updates, decision requests, and exceptions without
  repeating it in every response or durable record.
- ✅ Add role-migration, routing, authority, UX-copy, and regression tests for
  clean installs, existing installations, deactivation, reactivation,
  delegation selection, roster validation, lockfile/provenance integrity,
  package smoke, product-owner inheritance of product-strategy behavior,
  product-owner backlog and acceptance behavior, release-engineer boundaries,
  and Boss interaction behavior.
- ✅ Perform manual acceptance for clean installation, existing-state
  migration, edited-file and collision refusal, PM routing, installed role
  guidance, concise Boss-facing language, and release-engineer DevOps scope.
  Temporary-project acceptance passed 20/20 checks. Native conversational
  PM/Boss interaction was not available in this environment and remains a
  stated validation limitation.
- ✅ Update final workflow, role, product, requirements, architecture,
  security, quality, operations, decisions, and PM documentation, including
  indexes and package-facing README/help text, during plan completion; do not
  promote current-state knowledge into `_docs/kb` before the full plan
  closeout. Delegated documentation updates were verified, and final closeout
  documentation is aligned with the reconciled managed state and lockfile.

Task evidence:

- ✅ PM capability-discovery and fail-closed delegation guidance was aligned in
  the canonical role and workflow sources and the active `.agents` copies.
  The guidance now requires inspection of the complete host/tool registry,
  counts deferred tools, requires native delegation for PM-routed work, and
  blocks parent fallback for unknown or unavailable capabilities. Verification:
  `git diff --check -- '*.md'` passed. `_docs/kb`, source code, and tests were
  intentionally left unchanged. The regression-coverage task is recorded
  below.
  Follow-up correction: direct non-PM use remains eligible for prompt-overlay
  or self-review fallback; PM-routed work is native-delegation-only.
- ✅ Regression coverage was added for deferred-tool discovery,
  missing/unknown `native-worker-creation` or `correlated-results`, capability
  discovery before dispatch, and rejection of parent-session or prompt-overlay
  fallback for PM-routed work. Verification: `npm run build` passed; targeted
  PM/instruction tests passed with 60 passed and 0 failed; `git diff --check`
  passed.
- ✅ The `product-owner` contract and bundle were added as a strategist
  superset, including backlog ordering and shaping, acceptance criteria,
  refinement/planning, delivery-time clarification, product-level acceptance,
  and Boss escalation boundaries. Verification: `npm run build` passed;
  role-contract tests passed 56/56; `git diff --check` passed.
- ✅ The `release-engineer` contract and bundle were added with senior DevOps
  scope, delivery modes, bounded write domains, denied areas, refusal rules,
  and grouped evidence expectations. Verification: role and workflow-team
  focused checks passed; `npm run build` passed; `git diff --check` passed.
- ✅ The workflow roster and `workflow.json` package metadata were updated to
  version 2 with exactly one `product-owner` and one `release-engineer`, while
  excluding `product-strategist`, `boss`, and `project-manager` as delegatable
  roster roles. Package smoke passed 1/1 and focused workflow/team/PM checks
  passed. Protected reconciliation regenerated `aix.lock.json`, synchronized
  `.agents`, and `aix verify` reports no drift.
- ✅ Workflow-owned and standalone legacy strategist migration now has
  transactional snapshots/rollback, edited-file and collision refusal, stale
  state cleanup, and reactivation safeguards. Verification: migration-focused
  tests passed 6/6; the later focused workflow/team/PM run passed 76/76;
  `npm run build` and `git diff --check` passed. Temporary-project manual
  acceptance passed the migration, edited-file refusal, collision refusal,
  deactivation, and reactivation checks. The complete lifecycle matrix and
  failure paths are covered by the passing migration, rollback, deactivation,
  reactivation, and package-management tests.
- ✅ PM routing now selects `product-owner` for product decisions and
  `release-engineer` for release/platform work, rejects stale strategist
  requests, and excludes Boss from worker dispatch and delegation records.
  Release-engineer safety metadata rejects unsafe write domains and denied
  areas, including source/tests, PM state, manifests, lockfiles, `AGENTS.md`,
  publishing, registry, global-install, and unrestricted external release
  actions. Verification: PM orchestrator tests passed 30/30, PM runtime tests
  passed 10/10, and focused workflow/team/PM checks passed 76/76.
- ✅ Boss authority and concise conversational-use guidance were added to the
  role and PM contracts, with regression coverage for roster exclusion,
  dispatch rejection, delegation-record exclusion, and authority boundaries.
  Product decisions, priorities, risky approvals, exceptions, final
  acceptance, and release decisions remain reserved for Boss.
- ✅ Regression coverage was expanded across roles, roster validation,
  package smoke, routing, authority, migration, and skill instructions.
  The targeted role/package/PM suites reported 56/56, 1/1, 30/30, and 10/10
  passing respectively. Migration-specific tests and manual acceptance also
  passed. The full suite now passes 350/350, including migration and hardening
  cases; `npm run verify`, `git diff --check`, `aix workflow diff`, and
  `aix verify` all pass.

Security review and approval record:

- The previously identified protected-state inconsistency was reconciled after
  explicit approval. The workflow package, `aix.lock.json`, `.agents/README.md`,
  active roles, and managed package state now agree on the version-2 roster.
- Reconciliation used an explicit `--reconcile-protected` opt-in; ordinary
  updates continue to refuse protected drift rather than overwriting it.
- The review also identified three follow-up hardening items: validate and
  canonicalize lockfile-driven deletion paths inside the expected `.agents`
  roots, narrow rollback to files owned by the current operation or add an
  exclusive workspace lock, and prevent delegation callers from weakening
  mandatory denial and capability metadata. Source hardening for path
  boundaries and mandatory delegation metadata was implemented and built, but
  its recovery fixtures are covered by the passing full verification suite.
- Boss authority is enforced for roster membership and worker dispatch, while
  approval of product decisions, priorities, exceptions, final acceptance, and
  release decisions remains conversational and requires PM review. This is a
  documented trust boundary, not a fully executable authorization check.

Phase 11 closeout status:

Phase 11 is complete. Protected-state reconciliation had explicit approval;
lockfile and active-state consistency are verified; hardening regressions and
the full verification suite pass; and the final documentation is aligned.
Native conversational Boss validation remains unavailable in this environment
and is recorded as a manual validation limitation, not as an unverified claim.

Exit criteria:

- The workflow has one unambiguous `product-owner` role that includes every
  in-scope product-strategy responsibility plus the expected product-owner
  behaviors and knowledge for a software development team.
- Existing `product-strategist` installations migrate safely or fail with a
  clear recovery path and no stale managed state.
- The PM recognizes Boss as the human decision principal without creating a
  worker or delegation for that interaction.
- Boss-facing language is concise, intentional, and excluded from durable
  worker records.

### Phase 12: Refine conversational Boss voice (status: in progress)

Goal: make PM responses feel warmer and more personal by using “Boss” more
often in direct conversation, while keeping the address restrained, respectful,
and absent from worker prompts and durable operational records.

Design Intent:

- The PM may use “Boss” naturally in acknowledgments, progress updates,
  recommendations, completion reports, decision requests, and exception
  handoffs.
- In direct PM conversation, the human may refer to the PM as `pm`, `project
  manager`, `manager`, or `project-manager`, without regard to casing. These
  are conversational aliases for the active PM, not additional roles and not
  delegation targets.
- In direct PM conversation, the PM addresses the human decision principal as
  “Boss”. A concrete first request may receive a brief acknowledgment such as
  “Okay Boss! Let me delegate that work.” A conversational opener may receive
  “Hey Boss! What are we working on?” A substantive request should not receive
  an irrelevant welcome message.
- Use is occasional rather than mechanical: normally at most once in a
  meaningful direct response, and less often in dense technical explanations,
  repeated polling, tool output, errors, and machine-readable content.
- “Boss” identifies the human decision principal; it must not imply
  subservience, override the user's authority, or replace an explicit approval
  request when one is required.
- Worker briefs, prompts, delegation records, IDs, status events, and other
  durable metadata remain neutral and must not contain conversational filler.
  “Always” applies to direct PM-to-Boss conversation, not to machine-readable
  content or specialist-facing text.

Tasks:

- ✅ Update the canonical PM role, guidance, workflow guidance, and managed
  `AGENTS.md` block with the restrained conversational Boss policy and
  representative examples.
- ✅ Synchronize the active PM role files and managed instruction block with
  the canonical guidance without overwriting unrelated user edits.
- ✅ Add regression coverage for allowed conversational use, restrained
  frequency guidance, respectful approval handoffs, and exclusion from worker
  prompts and durable records. The fresh-session greeting is also asserted in
  the canonical and active `AGENTS.md` append content.
- ✅ Run targeted instruction and PM tests plus the full verification suite,
  then record any manual validation limits for fresh-session testing. Targeted
  tests passed 88/88; `npm run verify` passed 352/352; `git diff --check`,
  `aix workflow diff`, and `aix verify` passed. Fresh-session behavior still
  requires manual validation in each supported harness.

Exit criteria:

- Fresh PM sessions have clear guidance to use “Boss” naturally but
  non-repetitively.
- Approval boundaries remain explicit and unchanged.
- Durable worker and delegation artifacts remain free of conversational Boss
  phrasing.

Phase 12 evidence:

- The canonical PM role, guidance, workflow guidance, and managed
  `AGENTS.md` append now define occasional, respectful Boss language and the
  exact fresh-session greeting. The active `AGENTS.md` contains the generated
  managed block.
- Regression coverage verifies the greeting, restrained frequency guidance,
  approval handoffs, and exclusion from worker prompts and durable records.
- Native harness behavior remains a manual validation item; no CLI start/stop
  commands were added.

Phase 12 closeout status:

The original Phase 12 scope is complete and fully verified. Phase 12 is
reopened for the following follow-up work; these tasks are planned only and
have not been started.

Reopened follow-up tasks:

- ✅ Define one PM interaction protocol for direct conversational responses,
  including first-prompt classification, the Boss address rule, concrete-work
  acknowledgments, conversational openers, follow-ups, progress, completion,
  approval requests, and exception handbacks.
- ✅ Add case-insensitive recognition for the Boss's PM aliases: `pm`, `project
  manager`, `manager`, and `project-manager`. Normalize aliases before routing,
  preserve the active PM as the sole orchestration role, and reject ambiguous
  or out-of-scope uses without silently dispatching work.
- ⚠️ Add a PM-facing response boundary that consistently addresses the human
  as “Boss” in direct conversational responses while excluding the address
  from worker prompts, tool output, errors, IDs, status events, and durable
  records.
- ✅ Define durable open-decision and approval records so a restarted PM can
  recover unanswered Boss decisions without relying on conversation memory or
  inferring approval from a casual message.
- ⚠️ Align session-start and recovery behavior across supported harnesses with
  the PM interaction protocol. Keep harness-specific startup mechanics behind
  adapters and do not add `aix pm start` or `aix pm stop` unless a later design
  decision establishes a concrete cross-harness need.
- ✅ Add regression coverage for alias recognition and casing, direct Boss
  address behavior, first-prompt response selection, follow-up suppression,
  durable-record neutrality, and restart recovery of open decisions.
- ✅ Update the relevant product, requirements, architecture, quality, and
  decision documentation after implementation so the knowledge base describes
  the verified PM/Boss interaction contract.

Reopened execution evidence:

- Added `src/pm/conversation.ts` with alias normalization, first-prompt
  classification, restrained direct-response addressing, and durable open
  decision create/list/resolve operations.
- Added project-local decision storage under `.aix/pm/decisions/`, including
  `record.json` and `events.jsonl`, and included it in the PM runtime layout.
- Synchronized the canonical and active PM role/guidance files and the managed
  `AGENTS.md` block.
- Added `tests/pm-conversation.test.mjs`; the full verification run passed
  356/356 tests, the build passed, `git diff --check` passed, and `aix verify`
  passed.

Reopened exit criteria:

- The PM recognizes all four PM aliases case-insensitively without creating a
  second PM role or routing work to an alias.
- Direct PM responses address the human as “Boss” while remaining natural and
  non-repetitive.
- Concrete requests receive action-oriented acknowledgments; conversational
  openers receive the welcome; follow-ups do not receive canned openings.
- Open Boss decisions survive PM restart with explicit resolution state.
- Worker-facing and machine-readable artifacts remain free of conversational
  Boss language.

The implementation is complete for the project-owned protocol and durable
decision model. The response boundary and cross-harness startup behavior retain
a known manual validation gap: AIX does not own the native harness chat
renderer, so each supported harness must still be tested to confirm that it
loads the active guidance and presents the PM response exactly once.

### Phase 13: Document PM orchestration and workflow roles (status: accepted)

Goal: explain PM orchestration at the product level and document how the
Design-Plan-Execute workflow uses its installed roles for specialist
delegation, without changing runtime behavior or the PM contract.

Tasks:

- ⬜️ Update the top-level `README.md` with concise, user-facing PM
  orchestration onboarding: the PM's purpose, the single PM contact model,
  specialist delegation, human authority, workflow opt-in, and native-host
  capability limitations.
- ⬜️ Generate and add a concise PM orchestration summary image for the
  top-level `README.md`. Aim it at new or evaluating users, and show the
  relationship between the user, the PM, the workflow, and bounded specialist
  delegation at a product-overview level. Keep it distinct from the detailed
  workflow role map rather than repeating role responsibilities or execution
  mechanics.
- ⬜️ Update the canonical
  `aix/workflows/design-plan-execute/README.md` with the workflow's available
  roles, role responsibilities, PM delegation flow, authority boundaries,
  durable evidence, and links to deeper role and protocol contracts.
- ⬜️ Generate and add a detailed PM roles and delegation image for the
  canonical workflow README and its installed `.agents/README.md`
  representation. Aim it at users operating the Design-Plan-Execute workflow,
  and show the available role groups, delegation boundaries, work isolation or
  sequencing where relevant, and return of evidence to the PM. Keep it
  complementary to the concise root summary image and avoid duplicating its
  general product introduction.
- ⬜️ Define accessible text for both images, including informative alt text
  and a nearby caption or explanatory link. The text must preserve the key
  orchestration relationships if an image is unavailable and must link to the
  relevant README or canonical role and workflow documentation.
- ⬜️ Resolve the image-generation method, source or prompt artifacts, output
  format, filenames, and canonical asset paths during phase execution. Record
  the chosen paths and any generated-versus-installed asset ownership so the
  images remain maintainable and do not overwrite unrelated or project-owned
  assets.
- ⬜️ Keep the root README and workflow README complementary: the root page
  should provide generic orchestration/product context, while the workflow
  page should explain concrete role ownership and delegation mechanics without
  duplicating the full PM runtime or protocol specification.
- ⬜️ Synchronize or verify the installed `.agents/README.md` copy against the
  canonical workflow README through the normal workflow installation/update
  path, preserving project-owned edits and recording any generated-copy
  limitation.
- ⬜️ Have `ux-writer` and `documentation-specialist` review the copy,
  placement, terminology, links, and source-versus-installed ownership before
  the phase is closed.

Exit criteria:

- A new user can understand what PM orchestration is, why it exists, how to
  opt into it, and where human authority remains from the top-level README.
- A user who installs `design-plan-execute` can identify its roles and
  understand how the PM delegates bounded work to them from the workflow
  README.
- The documentation accurately describes native delegation requirements and
  does not imply that inline prompts create independent workers.
- Canonical and installed workflow documentation are synchronized or the
  verified reason for divergence is recorded.
- README links, expected PM terminology, and documentation-focused checks
  pass, with no runtime or implementation changes included in this phase.
- Both images are present at their documented asset paths, render at useful
  sizes, and have accessible alt text, captions or explanatory links. The root
  image communicates the overview without workflow-specific detail, and the
  workflow image communicates role and delegation detail without repeating the
  root image's summary.

Verification:

- ⬜️ Run link and formatting checks appropriate to the README files, including
  `git diff --check`.
- ⬜️ Compare the canonical workflow README with the installed
  `.agents/README.md` after synchronization or verification, and manually
  review the two-level onboarding path for accuracy and duplication.
- ⬜️ Verify both image references, asset paths, rendering, captions or
  explanatory links, and alt text. Check that the images remain legible and
  useful when viewed independently from the surrounding README sections.
- ⬜️ Record any host-specific or generated-copy behavior that cannot be
  validated in the local environment as a phase validation gap.

Documentation impact:

- Product: add PM orchestration onboarding and explain workflow opt-in,
  specialist delegation, and human decision authority in `README.md`.
- Product visual: add a concise PM orchestration summary image with accessible
  text and a documented asset-generation and ownership decision.
- Workflow documentation: add the concrete Design-Plan-Execute role roster,
  delegation model, source ownership, and installed-copy expectations to the
  canonical workflow README and its verified installed representation.
- Workflow visual: add a detailed PM roles and delegation image to the
  canonical and installed workflow README representations, with accessible
  text, links, and documented asset-generation and ownership decisions.
- Other knowledge-base areas: no `_docs/kb` update is expected because this
  phase documents already accepted behavior and introduces no implementation
  change; durable current-state promotion remains part of plan closeout.

## Open Questions / Decisions

The durable direction is defined above. The product and architecture decisions
that required user input are recorded below as decided. The remaining items
are implementation-design details that can be resolved after Design Intent is
accepted.

### Decisions recorded before Design Intent acceptance

#### Workflow dependency and activation lifecycle

- [Decided] Workflow activation installs and activates its declared
  dependencies, including the reusable PM role and managed routing hooks.
  Deactivation cascades through dependencies that no other active workflow
  requires, removes the workflow's AIX-owned hooks, and returns prompts to
  normal non-PM behavior without changing project-owned `AGENTS.md` content.
- [Decided] Before deactivation, AIX warns about active or unlanded
  delegations. If the user explicitly confirms, AIX deletes the affected
  workflow-owned delegation dataset, including operational records and
  isolated workspaces. Without confirmation, deactivation stops. Project-owned
  files and unrelated work are preserved.

#### Delegation records, privacy, and cleanup

- [Decided] `.aix/pm/` is the project-local location for PM and delegation
  operational records. It is runtime state for the local user and harness,
  not a portable project artifact, and is ignored by Git by default. Workflow
  source packages may still be installed from Git or npm, but the installed
  workflow state, PM state, delegation records, and workspaces are not treated
  as cross-user history or a committed collaboration surface.
- [Decided] Briefs, status, results, and indexes contain bounded summaries,
  structured metadata, decisions, and evidence pointers rather than full user
  prompts, full PM transcripts, source-file copies, or unrestricted worker
  output. A sub-agent receives a PM-authored brief containing the extracted
  goal, constraints, acceptance criteria, and relevant decisions. The PM may
  include a short exact excerpt when wording is materially important, but full
  prompt forwarding is not part of the protocol. Raw secrets remain prohibited
  in all durable records.
- [Decided] Use split record ownership. The PM writes the brief and
  coordination decisions; the worker writes substantive progress and result
  content; the provider or AIX owns identity, timestamps, sequencing, atomic
  persistence, and schema validation; and the PM records acceptance,
  integration, and recovery outcomes. Workers cannot rewrite authoritative
  identity, scope, or lifecycle metadata. Concurrent writes use controlled
  append or single-writer rules and recoverable atomic updates.
- [Decided] `aix pm tidy` uses lifecycle timestamps and conservative reference
  checks. Completed delegation data may be purged early once it is no longer
  relevant. Incomplete delegations that are stale and no longer being worked
  have a default maximum inactivity lifetime of 30 days. Explicit safety holds
  such as unresolved integration or destructive-risk conditions block purge
  until cleared or explicitly overridden. Plan, task, decision, worktree, and
  host references must be considered when identifying relevance.
- [Decided] Plan and implementation knowledge is promoted to the knowledge
  base once, as part of plan completion, rather than after each delegation.
  Promotion should be concise and non-chatty. Completed delegation data is
  eligible for full cleanup only after that batch promotion and integration
  step succeeds or an explicit waiver is recorded.
- [Decided] `aix pm tidy` is preview-only by default. It lists the records,
  workspaces, and other assets eligible for cleanup, then asks for explicit
  user confirmation before deleting or purging them in an interactive session.
  Without approval, it makes no changes. A non-interactive invocation remains
  preview-only unless an explicit mutation flag is supplied.
- [Decided] After plan-completion promotion or an explicit waiver, delegation
  briefs, summaries, tombstones, archives, raw status events, and workspaces
  have no required long-term retention and may be deleted together once safety
  holds and external references are clear. Before then, they remain protected
  as execution state.

#### Lifecycle, recovery, and concurrency

- [Decided] Terminal states include `completed`, `failed`, `cancelled`,
  `expired`, and `superseded`. `host-lost` and `unknown` remain non-terminal
  recovery states until the PM records a terminal outcome. Other resumable or
  reviewable states include `needs-decision`, `blocked`, and `paused`.
- [Decided] A retry always creates a new worker and a new delegation ID. The
  retry starts without inherited conversational or mutable worker state. The
  prior delegation's records remain available temporarily as recovery evidence;
  the new worker reconstructs from the original brief and validated prior
  evidence rather than trusting a potentially corrupted live context. The
  logical role-agent identity may still be reused only when its compatibility
  and workspace rules allow it.
- [Decided] Every PM session performs recovery discovery before accepting new
  meaningful work. It scans for non-terminal delegations, including those left
  by crashes or power loss, and reconciles durable records with provider,
  worker, workspace, and plan/task evidence. It must not treat a live process
  or the last status event as proof of progress or completion. Unresolved work
  is recorded as `host-lost` or `unknown` and must be resolved or isolated
  before overlapping work is dispatched.
- [Decided] Status events use event IDs, delegation and subagent IDs,
  sequence numbers, timestamps, and host correlation data. Exact duplicates
  are ignored. Stale or out-of-order events remain evidence but cannot regress
  current state. Genuine conflicts are retained and surfaced for PM
  reconciliation rather than resolved by arrival order or timestamp alone.
- [Decided] Use a project-level PM session lease plus per-delegation and
  per-artifact locks. Only the lease holder may dispatch, steer, accept,
  integrate, or make coordination writes; other sessions may inspect state
  read-only. Lease expiry or takeover requires recovery discovery before new
  work is dispatched.

### Details that can follow Design Intent acceptance

- The exact native-provider API or tool mapping for each supported harness.
- The machine-readable brief, event, result, capability, and record-index
  schemas, including field-level compatibility rules.
- The exact command shape and flags for PM launch, status, tidy apply, and
  purge.
- The supported-harness matrix and the source of each capability field.
- The detailed PM status view and how `aix status` and `aix verify` summarize
  incomplete native worker state.
- Retention intervals, archive encoding, and migration details for future
  protocol versions.

Implementation phases and task breakdown are now drafted below the accepted
Design Intent. The remaining implementation details can be resolved within
those phases without reopening the product direction unless new evidence
requires a design change.

## Verification

Design acceptance should be supported by checks that prove the following
contracts before implementation phases are closed:

- Default `aix init` leaves PM assets and PM routing out of the project.
- Rerunning `aix init` leaves existing installed and active workflow, PM,
  routing, roster, and delegation state unchanged.
- Activating `design-plan-execute` records its team roster and specialist-role
  ownership, installs or verifies its PM dependency, activates PM routing, and
  reports a clear failure if required assets or native delegation capabilities
  are unavailable.
- An active workflow exposes a validated `team.md` roster, and the PM can
  discover the team without loading every role document at startup.
- A normal conversation in a project with the PM workflow active enters
  through the PM, while documented narrow bypasses continue to work.
- Routine PM orchestration can continue within accepted scope, while product,
  scope, permission, destructive, merge, release, and irreversible decisions
  return to the user.
- Users may observe native workers, but managed steering passes through the
  PM; any direct host intervention is recorded and reconciled before result
  acceptance.
- Worker failures, verification failures, scope drift, integration conflicts,
  and unsafe cleanup are handled by PM recovery or delegated repair before
  user escalation whenever possible.
- Neither the PM nor the parent session can bypass delegation by directly
  editing project artifacts or running delegated lifecycle work.
- Workflow activation installs and activates its declared dependencies,
  including the PM dependency and managed routing hooks. Deactivation warns
  about active or unlanded delegations and requires explicit confirmation
  before deleting their workflow-owned dataset, including operational records
  and isolated workspaces. It then removes only AIX-owned routing hooks,
  returns prompts to normal behavior, and preserves project-owned `AGENTS.md`
  content plus unrelated work.
- Session-start capability discovery uses runtime metadata, records its
  snapshot, and refuses unsupported or unknown required capabilities.
- A delegation carries all required identities, task mode, delivery mode,
  protocol version, constraints, and return requirements.
- Compatible sequential work may reuse the logical role-agent identity with a
  fresh brief and delegation ID. Every retry creates a fresh worker and
  delegation; scope changes, permission changes, and unsafe context boundaries
  also require a fresh worker.
- Provider, AIX, and PM layers enforce their respective protocol, scope,
  identity, record, and evidence responsibilities.
- Delegation records and PM prompts contain secret references at most; raw
  secret values stay in the provider's runtime injection path and known values
  are redacted from worker output where supported.
- Provider permission handling grants only task-required access, reports
  inherited or unavailable controls, and refuses unsafe permission expansion.
- Status and result records correlate correctly across normal completion,
  questions, pauses, failures, cancellation, retry, and host loss.
- Normal PM output remains concise, while explicit verbose diagnostics expose
  correlated session, delegation, worker, event, lease, provider, workspace,
  and cleanup evidence for development and troubleshooting.
- Verbose diagnostics remain local and Git-ignored, redact raw secrets, use
  bounded retention or rotation, and can be cleaned up without deleting
  project-owned files.
- Parallel change-producing work is refused or isolated when the host lacks
  the required workspace boundary, and same-artifact writes are serialized.
- Role write-domain rules prevent non-implementation roles from changing
  source code and prevent document roles from editing each other's artifacts
  without PM coordination.
- The AIX repository completes at least one real implementation-engineer code
  change through the PM, a supported native provider, durable delegation
  records, isolated workspace integration, and verification before the plan's
  later implementation work proceeds.
- Role task-mode and delivery-mode declarations reject assignments that exceed
  a role's supported work or authority.
- Role installation and PM dispatch validate declared write domains, task
  modes, delivery modes, and required evidence.
- Machine-managed state changes route through AIX package operations, while
  project-owned plans and documentation route through delegated roles.
- `aix pm tidy` previews changes by default, protects active and unlanded
  work except for an explicitly confirmed workflow-deactivation purge, and
  requires explicit authorization for compaction or deletion.
- Package-manager commands continue to work when PM assets are absent or the
  current host lacks native delegation.

The implementation should include unit or contract tests for schemas and
state transitions, isolated temporary-project integration tests for file and
lockfile behavior, CLI tests for UX and refusal paths, and manual checks for
the installed role/protocol instructions and supported-harness experience.

## Documentation Impact

- Product: Update PM onboarding, package-only initialization, workflow
  activation, native-host errors, worker visibility, and tidy behavior.
- Requirements: Record PM, worker, provider, dependency, lifecycle, cleanup,
  and unsupported-host requirements.
- Architecture: Update package/workflow ownership, provider boundaries,
  delegation records, capability discovery, and workspace policy.
- Security: Add trust-boundary, permission, persistence, and destructive
  cleanup guidance before implementation.
- Quality: Add protocol, lifecycle, refusal-path, package lifecycle, and
  temporary-project integration coverage.
- Operations: Document native-provider prerequisites, session discovery,
  recovery, retention, and tidy operations.
- Decisions: Record the PM opt-in model, native-only team orchestration, and
  future provider boundary.
- Glossary: Define PM, subagent, delegation, provider, capability snapshot,
  task mode, delivery mode, and parent context.

## Product Readiness

- Readiness: Internal-use-ready before public release.
- Evidence needed: A complete native-provider path, safe refusal behavior,
  documented supported-harness requirements, and manual review of the PM
  conversation and cleanup experience.

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
- A Markdown protocol may be ignored or misapplied unless the provider and
  record writer validate the exchange contract.
- Native hosts may expose workers in their own UI, which could conflict with
  the PM's single-contact model or allow unsupervised user interaction.
- A native worker may inherit broader permissions or secrets than the PM
  intended, especially when it shares the primary checkout.
- Persisted briefs and results may contain proprietary prompts, source code,
  credentials, or prompt-injection content.
- Workflow activation or PM-role changes could remove routing or shared role
  files unexpectedly if ownership and deactivation checks are incomplete.
- Orphan detection may misclassify work if plan, task, host, or worktree
  references are stale or incomplete.
- Concurrent PM sessions may write conflicting delegation records or dispatch
  overlapping work unless session and workspace locking rules are defined.

## Security Review

- Status: Required before Design Intent acceptance.
- Scope reviewed: Project instruction ownership, delegated authority, native
  provider permissions, workspace isolation, persisted prompts and results,
  package dependency provenance, and destructive cleanup.
- Findings: The plan must define how workers inherit host permissions, what
  sensitive content may enter durable records, how untrusted role or worker
  instructions are handled, and how tidy proves that protected work is safe.
- Blocking findings converted to plan tasks: Provider permission inheritance,
  workspace isolation, record privacy, and cleanup authorization must be
  resolved before implementation.
- Residual risk: Native host behavior and future AIX-owned runtime behavior
  remain host-specific until provider contracts are implemented and tested.

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
