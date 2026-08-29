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
- Unknown AIX-looking append blocks that are not represented in the lockfile
  are user-owned content. AIX must not adopt, validate, reorder, repair, or
  remove them. Known lockfile-owned blocks are the only blocks lifecycle
  commands may manage.
- AIX-owned append blocks should be maintained as one known managed cluster at
  the end of `AGENTS.md`, below user-owned content. If a known block is found
  outside that cluster and its installed hash still matches the lockfile, AIX
  may move it into the cluster. If the known block was edited, AIX must fail
  closed and report the drift.
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

- ✅ Inspect current workflow append behavior in `src/workflows/agents-md.ts`,
      workflow install/update/remove paths, lockfile schema, and existing
      workflow append tests.
- ✅ Define a shared append block model for skills, roles, and workflows,
      including owner kind, owner name, source, source path, marker, target
      path, source hash, rendered block hash, and installed block hash.
- ✅ Define deterministic composition order for managed blocks. Workflow blocks
      should frame role blocks, and role blocks should frame skill blocks,
      with stable ordering inside each extension type.
- ✅ Define marker collision behavior. Duplicate managed markers, orphan
      markers, nested managed blocks, malformed managed blocks, and unknown
      owner blocks should fail closed instead of being rewritten silently.
- ✅ Extract or replace workflow-specific append helpers with shared helpers
      that can render, find, insert, replace, remove, and verify owned blocks
      without changing unrelated `AGENTS.md` content.
- ✅ Add focused tests for shared append rendering, deterministic ordering,
      marker collision refusal, malformed marker refusal, drift refusal,
      missing optional append files, and byte-preserving removal.
- ✅ Run targeted append/workflow tests and record verification evidence.

Success criteria:

- AIX has one shared append contract that can represent skill, role, and
  workflow append blocks.
- Existing workflow append behavior still passes through the shared contract.
- Unsafe marker states and local edits fail closed.

- 2026-08-28: Phase 1 added a shared `src/agents-md.ts` append-block
  contract, moved workflow append helpers onto it, extended lockfile append
  metadata with compatibility parsing for old workflow hashes, and added
  focused append safety tests.
  Verification: `npm run build` passed; `node --test tests/agents-md.test.mjs`
  passed; `node --test tests/lockfile.test.mjs` passed;
  `AIX_CACHE_DIR=/tmp/aix-workflow-test-cache node --test
  tests/workflow.test.mjs` passed; `AIX_CACHE_DIR=/tmp/aix-full-test-cache npm
  test` passed with 215 tests; `git diff --check` passed. A first workflow
  test run without `AIX_CACHE_DIR` failed because the sandbox blocked writes to
  `/Users/rcravens/Library/Caches/aix`, so verification was rerun with the
  cache under `/tmp`.

### Phase 2: Wire Append Lifecycle Into Extensions (status: accepted)

Goal: make activation, update, deactivation, uninstall, verification, and
status behavior manage optional `AGENTS.append.md` files for all supported
extension types.

Tasks:

- ✅ Extend package discovery, parsing, and lockfile handling so skills, roles,
      and workflows may carry optional `AGENTS.append.md` content. Skills and
      roles use only the package-root `AGENTS.append.md` convention; missing
      append files are a silent no-op. Skill and role lockfile entries must
      support optional `agentsMd` metadata with backward-compatible parsing
      when the metadata is absent.
- ✅ Add a shared append lifecycle layer that composes `AGENTS.md` from all
      known lockfile-owned append blocks plus the pending lifecycle change.
      The lifecycle must keep the known managed block cluster at the end of
      `AGENTS.md`, below user-owned content, and must leave unknown
      AIX-looking blocks untouched as user-owned text.
- ✅ Generate role and skill append ownership and markers from active names,
      including aliases, using markers such as `aix:role <activeName>` and
      `aix:skill <activeName>`.
- ✅ Wire role activation and update to install or replace only the owned role
      append block when no drift exists.
- ✅ Wire role deactivation and removal to remove only the owned role append
      block and preserve surrounding user content byte-for-byte. Removal must
      preflight all affected append blocks before deleting active or package
      files.
- ✅ Wire skill activation and update to install or replace only the owned
      skill append block when no drift exists.
- ✅ Wire skill deactivation and removal to remove only the owned skill append
      block and preserve surrounding user content byte-for-byte. Removal must
      preflight all affected append blocks, including append blocks for
      orphaned dependency skills, before deleting active or package files.
- ✅ On update, remove an extension's old owned append block when the updated
      package no longer ships `AGENTS.append.md`, after confirming the
      installed block is unmodified.
- ✅ Keep workflow install, update, and uninstall behavior compatible while
      moving it onto the shared append lifecycle.
- ✅ Update `aix verify` and `aix status` behavior so missing, changed,
      malformed, duplicate, or conflicting known managed append blocks are
      reported as normal verification issues. Unknown AIX-looking blocks are
      user-owned content and should not be reported unless they interfere with
      a known lockfile-owned block.
- ✅ Add integration tests that activate a workflow, role, and skill with
      append content into one `AGENTS.md`, then update and remove each owner
      independently. Coverage must include aliases, dependency-only skills,
      cross-owner composition, known block relocation into the end cluster,
      duplicate known blocks with identical content collapsing to one block,
      duplicate known blocks with different content stopping for manual repair,
      missing append files, append-file removal during update, local drift,
      malformed known blocks, and byte-preserving removal around user-owned
      content.
- ✅ Run targeted lifecycle tests for skills, roles, workflows, status, and
      verify; record verification evidence.

Success criteria:

- Skills, roles, and workflows all support optional activation-owned
  `AGENTS.append.md` content.
- Each lifecycle command manages only its own extension's managed block.
- Unknown or malformed AIX-looking blocks that are not lockfile-owned remain
  untouched as user-owned content.
- `aix verify` and `aix status` report append drift and known-block integrity
  problems as normal verification issues.
- Existing workflow append tests continue to pass.

- 2026-08-28: Phase 2 implemented shared append lifecycle support for
  workflow, role, and skill append blocks. Skill and role lockfile entries now
  track optional `agentsMd` metadata; role and skill lifecycle commands use
  active-name markers; update removes owned append blocks when packages stop
  shipping `AGENTS.append.md`; deactivation and workflow uninstall preflight
  and rewrite append state before deleting active/package files; verify and
  status surface known append drift as normal verification issues. Unknown
  AIX-looking blocks remain user-owned content and are preserved below normal
  user text, with known managed blocks maintained as an end cluster.
  Verification: `npm run build` passed;
  `AIX_CACHE_DIR=/tmp/aix-phase2-targeted-cache node --test
  tests/agents-md.test.mjs tests/lockfile.test.mjs tests/activation.test.mjs
  tests/update.test.mjs tests/roles.test.mjs tests/workflow.test.mjs
  tests/verify.test.mjs tests/status.test.mjs` passed with 119 tests;
  `AIX_CACHE_DIR=/tmp/aix-phase2-full-cache npm test` passed with 220 tests;
  `git diff --check` passed. `_docs/kb` promotion was intentionally skipped
  for this phase at developer request.

### Phase 3: Add Bundled Project-Manager Role And Guidance Layering (status: accepted)

Goal: ship a top-level default `project-manager` role with activation-owned
entry instructions, focused routing guidance, and support for separate
companion guidance documents.

Tasks:

- ✅ Add bundled role assets under the top-level AIX role source, including
      `ROLE.md`, `GUIDANCE.md`, and `AGENTS.append.md`.
- ✅ Write `ROLE.md` so `project-manager` owns request triage, ordered minimal
      role selection, sequencing, scope control, delegation choice, result
      aggregation, and handback when work does not belong to its managed team.
- ✅ Write `GUIDANCE.md` so startup classification produces `roles`,
      `activities`, `task_context`, and `sequencing_notes`.
- ✅ Define the companion guidance naming contract for additional guidance
      files ending in `.GUIDANCE.md`, such as `workflow.GUIDANCE.md`.
      Companion guidance supplements the activated `project-manager` role's
      standard `GUIDANCE.md`, lives next to that activated role document, and
      must define package discovery, activation behavior, ownership metadata,
      and conflict behavior.
- ✅ Update project-manager guidance loading instructions so the role knows how
      to read its own standard `GUIDANCE.md` plus any adjacent companion files
      whose names end in `.GUIDANCE.md` before it routes or delegates work. Do
      not flatten or append companion files into the base guidance document.
- ✅ Update `get-guidance` usage instructions for delegated roles. The
      `project-manager` role uses `get-guidance` after startup, once per
      selected delegated role, to resolve that role's tailored guidance from
      the shared activity list.
- ✅ Add tests proving bundled project-manager companion guidance is packaged,
      activated beside the role's `GUIDANCE.md`, and kept separate from the
      base guidance document while unrelated companion guidance stays out of
      the project-manager startup set.
- ✅ Document that each delegated role receives the original prompt for intent
      and traceability, while `bounded_task`, supplied guidance, lifecycle
      rules, and repository instructions govern scope.
- ✅ Document the controlled delegation payload:
      `original_prompt`, `role_assignment`, `bounded_task`, `activities`,
      `guidance`, `sequencing_notes`, and `return_requirements`.
- ✅ Document per-role `get-guidance` use. After loading its own base and
      companion guidance, `project-manager` calls the existing root AIX
      `get-guidance` skill with each selected delegated role and the shared
      activity list, then passes only that role's tailored guidance into the
      delegation payload.
- ✅ Document direct-answer limits and the handback rule for work that cannot
      be delegated to a suitable managed role.
- ✅ Add tests that confirm bundled project-manager role assets are discoverable
      and activation injects/removes only the project-manager append block.
- ✅ Run targeted role activation and package tests; record verification
      evidence.

Success criteria:

- The default top-level `project-manager` role can be activated like other AIX
  roles.
- `AGENTS.md` points to `project-manager` only when the role is active.
- The project-manager role remains a manager and does not become a broad
  executor.
- Additional guidance can augment the generic project-manager from adjacent
  companion guidance files without duplicating the full role or mutating its
  base `GUIDANCE.md`.

- 2026-08-28: Phase 3 added the bundled top-level `project-manager` role under
  `aix/roles/project-manager` with `ROLE.md`, `GUIDANCE.md`,
  `workflow.GUIDANCE.md`, and activation-owned `AGENTS.append.md`. Role
  activation now copies package-root companion files whose names end in
  `.GUIDANCE.md` beside active role `GUIDANCE.md`; role update refreshes
  missing or unedited companion guidance and preserves local active edits.
  `get-guidance` remains read-only and now documents activity-list caller
  context for delegated roles while keeping project-manager startup guidance
  separate. Current-state docs were promoted for role architecture,
  get-guidance requirements, trust boundaries, test coverage, and glossary
  terms.
  Verification: `npm run build` passed; `node --test tests/roles.test.mjs`
  passed with 42 tests; `node --test tests/skill-instructions.test.mjs`
  passed with 18 tests; `node --test tests/package-smoke.test.mjs` passed;
  `node --test tests/agents-md.test.mjs tests/guidance.test.mjs` passed with
  15 tests; `node --test tests/status.test.mjs tests/verify.test.mjs
  tests/init.test.mjs` passed with 19 tests;
  `AIX_CACHE_DIR=/tmp/aix-phase3-full-cache npm test` passed with 222 tests.

### Phase 4: Add PM Review Probe And Routing Examples (status: accepted)

Goal: make the generic top-level project-manager role probeable before work
starts. The role should support a `pm review` request prefix that runs startup
classification only, emits the context it would use for routing, and stops
before delegation, file edits, command execution, lifecycle changes, or
verification.

Phase 4 should start with the default `project-manager/GUIDANCE.md`. Use the
Phase 3 companion guidance model only if the default guidance cannot express
workflow-shaped routing clearly. In that case, `workflow.GUIDANCE.md` may add
the needed workflow-specific guidance without replacing the top-level
project-manager role or adding unconditional root `AGENTS.md` routing.

Tasks:

- ✅ Define PM Review mode in the default project-manager guidance. The trigger
      should be a case-insensitive `pm review` prefix with optional `:`, ` -`,
      `-`, or whitespace before the reviewed prompt. If no prompt follows the
      prefix, the role should return a missing-prompt response.
- ✅ Define the PM Review output shape so it emits the stripped original
      prompt, ordered `roles`, `activities`, `task_context`,
      `sequencing_notes`, and a per-role `guidance_plan`.
- ✅ Define the PM Review stop rule. PM Review must stop before delegation,
      file edits, command execution, lifecycle changes, verification, or plan
      state changes.
- ✅ Add PM Review probe examples for a small informational request,
      implementation request, documentation request, security-sensitive
      request, mixed architecture plus implementation request, and out-of-team
      request.
- ✅ Add tests or fixtures proving the probe examples assert exact expected
      roles and activities, preserve the ordered minimal role-list model, and
      do not install unconditional root `AGENTS.md` routing.
- ✅ Verify examples show per-role guidance tailoring, no broad role fan-out,
      dependency-preserving role order, controlled delegation payloads,
      handback behavior, and abort-before-work behavior.
- ✅ Review existing `get-guidance` terminology for `requesting_role` and
      `requesting_skill`; update examples or add compatibility notes so PM
      Review's `guidance_plan` is clear about delegated-role guidance.
- ✅ Decide whether workflow companion guidance augmentation is necessary after
      the default PM Review probes are written and tested. If it is not
      necessary, record that decision in the Phase 4 evidence instead of
      changing `workflow.GUIDANCE.md`.
- ✅ Run targeted role, guidance, package, and workflow tests; record
      verification evidence.

Success criteria:

- PM Review gives developers a simple way to probe project-manager startup
  routing for test prompts, ad-hoc prompts, and before-execution prompts.
- PM Review output is structured enough to inspect exact roles, activities,
  task context, sequencing, and guidance planning without doing work.
- The default project-manager guidance handles the canonical routing probes
  unless workflow companion guidance is proven necessary.
- Any workflow guidance augmentation is explicit, tested, and does not weaken
  the default role's safety or lifecycle rules.
- Example prompts make the routing contract testable by human review and by
  instruction-level fixtures.

- 2026-08-29: Phase 4 added PM Review mode to the default bundled
  `aix/roles/project-manager/GUIDANCE.md`. PM Review accepts a
  case-insensitive `pm review` prefix with optional `:`, ` -`, `-`, or
  whitespace, emits startup routing context and a per-role guidance plan, and
  stops before delegation, file edits, command execution, lifecycle changes,
  verification, or plan state changes. The default guidance now includes six
  canonical probe examples with exact expected `roles` and `activities`.
  `tests/roles.test.mjs` checks the PM Review trigger examples, exact routing
  probes, no broad role fan-out, guidance planning, handback, and
  abort-before-work behavior. Workflow companion guidance augmentation was not
  needed because the default guidance expressed the probe contract cleanly and
  workflow tests still passed without changing `workflow.GUIDANCE.md`.
  Current-state docs were promoted for role architecture, trust-boundary
  behavior, quality coverage, and glossary terms.
  Verification: `npm run build` passed; `node --test tests/roles.test.mjs`
  passed with 45 tests after fixing the routing-probe parser helper;
  `node --test tests/package-smoke.test.mjs` passed after replacing an
  external-service example word that matched the package smoke test's TODO
  guard; `node --test tests/skill-instructions.test.mjs` passed with 18 tests;
  `node --test tests/guidance.test.mjs` passed with 7 tests;
  `AIX_CACHE_DIR=/tmp/aix-phase4-workflow-cache node --test
  tests/workflow.test.mjs` passed with 22 tests; `node --test
  tests/status.test.mjs tests/verify.test.mjs` passed with 12 tests;
  `AIX_CACHE_DIR=/tmp/aix-phase4-full-cache npm test` passed with 225 tests.

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
- 2026-08-29: Phase 4 should first optimize the generic
  `project-manager/GUIDANCE.md` and use `pm review` as the dry-run routing
  probe. The trigger is a case-insensitive `pm review` prefix with optional
  `:`, ` -`, `-`, or whitespace before the reviewed prompt. PM Review should
  emit startup classification and guidance planning only, then stop before
  delegation, file edits, command execution, lifecycle changes, verification,
  or plan state changes. Workflow companion guidance should be changed only if
  the default guidance cannot express workflow-shaped routing clearly.
- Skills, roles, and workflows should all support optional
  `AGENTS.append.md` content. AIX should compose those blocks as managed,
  marker-delimited content in the project `AGENTS.md` file. Each block must
  remain owned by its source extension, and activation, update, deactivation,
  or uninstall operations must only manage that extension's block. Composition
  order, marker ownership, drift checks, local-edit refusal, and instruction
  precedence must be defined before implementation.
- Phase 2 should use one shared append lifecycle that composes all known
  lockfile-owned workflow, role, and skill append blocks whenever any one
  extension changes. Known managed blocks should be maintained as a cluster at
  the end of `AGENTS.md`, below user-owned content.
- Role and skill append files use the package-root `AGENTS.append.md`
  convention only. Missing append files are a silent no-op.
- Role and skill append ownership and markers use active names, including
  aliases, so marker identity matches the names users manage with lifecycle
  commands.
- Unknown AIX-looking blocks, including malformed unknown blocks, are treated
  as user-owned content. AIX must not touch, adopt, reorder, validate, repair,
  or remove them.
- Known lockfile-owned append blocks with local edits must fail closed during
  update, deactivation, removal, status, or verify. Deactivation and removal
  must preflight every affected append block before deleting any active or
  package files.
- Duplicate known append blocks with identical rendered content may be
  collapsed to one block. Duplicate known blocks with different content must
  stop with a clear manual-repair message.
- If a known append block exists outside the end cluster and is unmodified,
  AIX may move it into the known managed cluster. If the known block is
  modified, AIX must stop and report drift.
- If an updated role or skill no longer ships `AGENTS.append.md`, AIX should
  remove that extension's old owned append block after confirming it is
  unmodified.
- `aix verify` and `aix status` should report append issues as normal
  verification issues.
- `get-guidance` should remain a separate root AIX skill. The
  `_docs/plans/workflow-guidance-library.md` plan already built it as a
  read-only guidance resolver. The project-manager role should use that skill
  for delegated roles rather than duplicating delegated-role guidance
  resolution inside `project-manager/GUIDANCE.md`.
- The project-manager role must already have its own guidance loaded before it
  routes or delegates. Its own guidance set includes the standard
  `GUIDANCE.md` plus any adjacent companion files whose names end in
  `.GUIDANCE.md`.
- Project-manager companion guidance files should live next to the activated
  role's standard guidance document, for example
  `.agents/roles/project-manager/workflow.GUIDANCE.md`. They supplement, but do
  not replace, flatten into, or append into `GUIDANCE.md`.
- After startup, `project-manager` should resolve guidance separately for each
  selected delegated role. For each role in the ordered role list, it should
  call `get-guidance` with that delegated role and the shared activity list,
  then pass only that role's tailored guidance set into the delegation payload.
- AIX should support additional project-manager companion guidance documents
  whose file names end in `.GUIDANCE.md` alongside the activated
  project-manager `GUIDANCE.md`. Discovery should return matching companion
  guidance separately from the base document and keep unrelated companion
  guidance out of the startup set.
- `project-manager` may answer directly only when the request is small,
  informational or conversational, needs no file inspection or edits, touches
  no workflow lifecycle state, and requires no specialist judgment. If the
  request cannot be delegated to a suitable managed role, `project-manager`
  should return status and hand the work back to the calling context rather
  than completing out-of-team work itself.

## Open Questions / Decisions

Resolved.

- 2026-08-28: Phase 2 readiness review confirmed the append lifecycle should
  be implemented as a shared compose/preflight layer before command-specific
  wiring. The developer selected seamless lifecycle behavior: known
  lockfile-owned blocks are managed together, unknown AIX-looking blocks stay
  user-owned, role and skill markers use active names, package-root
  `AGENTS.append.md` is the only role/skill convention, missing append files
  are normal no-ops, drifted known blocks fail closed, removals preflight all
  affected blocks before deleting files, and status/verify report append
  problems as normal verification issues.
- 2026-08-28: Phase 3 readiness review resolved project-manager guidance
  layering. Companion files whose names end in `.GUIDANCE.md` supplement the
  project-manager role's own `GUIDANCE.md` and should live next to the
  activated role guidance document. The project-manager role must know how to
  load its own base and companion guidance before routing. It should then use
  `get-guidance` for delegated roles, passing each selected role and the shared
  activity list so delegated-role guidance remains tailored to that role.

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
