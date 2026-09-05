# Host-Neutral Role Capability Model

## Status

📝 Planning Draft

This is a design draft for review. It does not authorize implementation.

## Context

AIX role definitions currently expose host-specific tool names such as `bash`,
`edit`, and `write` through a `tools:` metadata field. The recent update made
workflow roles mutation-capable, but the contract is coupled to one host's tool
vocabulary. Pi, Codex, Claude, and future hosts may expose different names or
different ways to provide equivalent workspace access.

The current role model also treats the project manager as read-only even though
its responsibilities include plan updates, lifecycle coordination, delegation
records, worktree integration, and verification coordination. The PM should not
perform delegated feature work, but it needs bounded control-plane write and
integration capabilities.

Reviewed context:

- `AGENTS.md`
- `.agents/workflow.md`
- `_docs/README.md`
- `_docs/kb/03-architecture/system-architecture.md`
- `_docs/kb/03-architecture/roles-and-templates.md`
- `_docs/kb/07-decisions/product-ownership-and-boss-authority.md`
- `.agents/roles/project-manager/ROLE.md`
- `.agents/roles/implementation-engineer/ROLE.md`
- `aix/workflows/design-plan-execute/roles/project-dev/`
- `src/roles/`
- `src/pm/`
- `tests/roles.test.mjs`
- `tests/workflow-team.test.mjs`
- `tests/pm-orchestrator.test.mjs`
- `tests/pm-workspace.test.mjs`

## High-Level Goal (status: accepted)

Give every workflow role a portable capability contract that describes what the
role may do, while leaving host-specific tool names and execution mechanisms to
the host adapter. Roles should be able to perform their assigned work safely:
implementation roles can change code and tests, documentation and product roles
can update owned documents, quality and security roles can add verification or
hardening artifacts, and the project manager can update plans and integrate
approved work without becoming the feature implementer.

The result should let AIX use the same role definitions across Pi, Codex,
Claude, and other supported hosts without falsely claiming that their tool
names or execution protocols are interchangeable.

## Design Intent

The intended design separates three concerns:

- **Role capabilities:** portable behavioral permissions such as workspace read,
  workspace write, command execution, plan edit, verification, and worktree
  integration.
- **Role boundaries:** allowed paths, denied paths, lifecycle authority,
  approval requirements, and whether the role may modify source, tests, docs,
  plans, or integration state.
- **Host execution:** a host adapter maps requested capabilities to its own
  tools, sandbox, worktree, and command interface, or refuses dispatch when a
  required capability is unavailable.

The role metadata should no longer require portable consumers to interpret
Pi-specific tool names. Existing `tools:` values should be treated as optional
host-specific hints or a compatibility field during migration, not as the
cross-host role contract.

The project manager should receive control-plane capabilities including plan
editing, lifecycle coordination, delegation, worktree integration, and
verification coordination. It should retain final approval authority and should
not receive unrestricted feature-writing authority merely because it can merge
approved work.

Implementation roles and specialist roles should receive mutation capability
appropriate to their assigned paths. A role may write only within the paths and
artifacts granted by the delegation; capabilities do not override safety rules,
plan authorization, ownership boundaries, security refusals, or Boss approval
requirements.

## Non-Goals

- No requirement that Pi, Codex, Claude, or another host expose identical tool
  names or internal APIs.
- No automatic global-install, registry, plugin, marketplace, or publishing
  behavior.
- No removal of host-specific tool configuration where a host still needs it;
  the change separates it from the portable role contract.
- No unrestricted write access for every role or automatic permission expansion
  beyond an assigned task and allowed paths.
- No change to Boss authority, project-manager lifecycle ownership, or the
  requirement for explicit activation and release approval.
- No requirement to redesign every host adapter in the first implementation
  slice beyond the mappings and capability checks needed by current hosts.

## Boundaries And Invariants

- Capability names are behavioral and documented; tool names are host-specific
  implementation details.
- A host must fail closed when a delegated role requires a capability it cannot
  provide or cannot safely map.
- Path restrictions and denied paths remain separate from capability grants.
- The project manager may edit plans, lifecycle records, and integration state,
  but does not directly implement delegated feature work by default.
- Implementation roles may edit code/tests and run verification only within
  assigned paths; documentation, product, security, quality, and release roles
  may edit their owned artifacts within bounded assignments.
- `.aix/pm` runtime data, active delegations, locks, and workspaces remain
  protected by existing PM authority and integration rules.
- Existing role packages and active copies must remain internally consistent;
  source roles, active roles, lockfile hashes, tests, and documentation must
  describe the same capability contract.
- Legacy `tools:` metadata must have a defined migration and validation policy;
  it must not silently grant capabilities that the host or delegation does not
  authorize.

## Implementation Phases

Not drafted until Design Intent is accepted.

## Open Questions / Decisions

- What is the minimal portable capability vocabulary for the first version?
  Candidate capabilities include `workspace-read`, `workspace-write`,
  `command-execution`, `plan-edit`, `lifecycle-control`, `verification`, and
  `worktree-integration`.
- Should capabilities be declared directly on roles, in a separate workflow
  team contract, or in both with one authoritative source?
- Which host adapter owns capability mapping and refusal: PM dispatch, the
  native host integration, or both with a shared contract validator?
- How should existing `tools:` metadata migrate: retain as an optional hint,
  derive capabilities temporarily, or remove it from portable role files after
  a compatibility period?
- What exact path and artifact boundaries should the PM have for plan edits,
  delegation records, worktree integration, and verification outputs?
- Should host capability discovery distinguish workspace writes from arbitrary
  command execution and worktree integration as separate requirements?
- Which current hosts must be supported and manually validated in the first
  release of this capability model?

## Documentation Impact

- Architecture: document role capabilities, host mapping, path boundaries,
  PM control-plane authority, and dispatch refusal behavior.
- Requirements: define role actors, capabilities, allowed artifacts,
  acceptance signals, and cross-host compatibility expectations.
- Security: document least privilege, fail-closed host mapping, path scopes,
  worktree integration, and PM/runtime protection.
- Quality: add capability-matrix, host-mapping, refusal, and role-behavior tests.
- Operations: document supported host requirements and capability diagnostics.
- Decisions: record the portable capability contract and PM authority model.
- User/developer docs: update role-authoring guidance and examples to separate
  behavioral capabilities from host-specific tool hints.

## Product Readiness

- Readiness: internal-use-ready when current workflow roles and supported host
  mappings pass automated compatibility tests and manual role-dispatch checks.
- Evidence needed: capability validation tests, host mapping/refusal tests,
  role-authoring documentation, PM integration tests, and developer-approved
  manual validation across the supported hosts.

## Risks

- An overly broad capability vocabulary could recreate host coupling under new
  names or make permissions difficult to audit.
- Incorrect host mapping could grant a role more access than intended or fail
  to provide required access while reporting success.
- Giving the PM integration write access could blur the boundary between
  orchestration and implementation if path and action scopes are not explicit.
- Keeping legacy `tools:` hints too long could create conflicting sources of
  truth.
- A capability migration could invalidate active role lockfile hashes or cause
  older hosts to interpret updated role metadata incorrectly.

## Security Review

- Status: planned
- Scope: least privilege, host capability mapping, path restrictions, PM
  integration authority, worktree safety, capability refusal, legacy metadata,
  and runtime-state protection.
- Blocking findings: pending design-intent review.
- Residual risk: pending capability vocabulary, migration, and host-support
  decisions.

## Lessons To Carry Forward

- Portable role contracts should describe behavioral authority rather than
  assuming a shared tool vocabulary across agent hosts.
- The project manager needs bounded control-plane capabilities even when it
  should not perform feature implementation.

## Promotion To Design

- `_docs/kb/03-architecture/roles-and-templates.md`
- `_docs/kb/03-architecture/system-architecture.md`
- `_docs/kb/04-security/trust-boundaries.md`
- `_docs/kb/05-quality/verification-strategy.md`
- `_docs/kb/07-decisions/` capability and PM authority decision record
- Role-authoring and workflow documentation as applicable

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
- ⬜️ Archive under `_docs/plans/completed/YYYY-MM-DD-role-capability-model.md`.
