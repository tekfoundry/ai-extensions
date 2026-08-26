import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

const skillPath = join(process.cwd(), "aix/workflows/design-plan-execute/skills/code-review-refactor/SKILL.md");
const delegateToRolePath = join(process.cwd(), "aix/workflows/design-plan-execute/skills/delegate-to-role/SKILL.md");
const designCreatePath = join(process.cwd(), "aix/workflows/design-plan-execute/skills/design-create/SKILL.md");
const designPromotePath = join(process.cwd(), "aix/workflows/design-plan-execute/skills/design-promote/SKILL.md");
const reviewAndRefreshDocsPath = join(process.cwd(), "aix/workflows/design-plan-execute/skills/review-and-refresh-docs/SKILL.md");
const discoverSkillPath = join(process.cwd(), "aix/skills/discover-skill/SKILL.md");
const brainstormingSkillPath = join(process.cwd(), "aix/workflows/design-plan-execute/skills/brainstorming-skill/SKILL.md");
const planCreatePath = join(process.cwd(), "aix/workflows/design-plan-execute/skills/plan-create/SKILL.md");
const planReviewPath = join(process.cwd(), "aix/workflows/design-plan-execute/skills/plan-review/SKILL.md");
const planUpdatePath = join(process.cwd(), "aix/workflows/design-plan-execute/skills/plan-update/SKILL.md");
const planExecutePath = join(process.cwd(), "aix/workflows/design-plan-execute/skills/plan-execute/SKILL.md");
const planCompletePath = join(process.cwd(), "aix/workflows/design-plan-execute/skills/plan-complete/SKILL.md");
const workVerifyPath = join(process.cwd(), "aix/workflows/design-plan-execute/skills/work-verify/SKILL.md");
const planTemplatePath = join(process.cwd(), "aix/workflows/design-plan-execute/templates/plan.md");
const completionChecklistTemplatePath = join(process.cwd(), "aix/workflows/design-plan-execute/templates/sections/completion-checklist.md");
const securityReviewTemplatePath = join(process.cwd(), "aix/workflows/design-plan-execute/templates/sections/security-review.md");

test("code-review-refactor skill declares workflow review contract", () => {
  const skill = readFileSync(skillPath, "utf8");

  assert.match(skill, /^name: code-review-refactor$/m);
  assert.match(skill, /Confirm `.agents\/engineering-best-practices\.md` exists\./);
  assert.match(skill, /If `.agents\/engineering-best-practices\.md` is missing, stop before reviewing/);
  assert.match(skill, /Review project code files by default\./);
  assert.match(skill, /Each finding should include:/);
  assert.match(skill, /Use one visible marker per finding\./);
  assert.match(skill, /Do not combine numbered list markers with visible priority badges/);
  assert.match(skill, /which finding numbers they want\s+to refactor/);
  assert.match(skill, /They may choose one, several, or all\./);
  assert.match(skill, /repeat the selected set back\s+to the developer and ask for confirmation/);
  assert.match(skill, /## Process modes/);
  assert.match(skill, /### Inline mode/);
  assert.match(skill, /### Plan mode/);
  assert.match(skill, /use the `plan-create` skill to create a backlog\s+review-and-refactor plan/);
  assert.match(skill, /When the review runs inside an active plan/);
  assert.match(skill, /When the review runs outside an active plan/);
  assert.match(skill, /When `.agents\/roles\/technical-architect\.md` exists/);
  assert.match(skill, /architectural coupling, module ownership, runtime contracts/);
  assert.match(skill, /Fold returned evidence into the normal review findings/);
  assert.match(skill, /Do not require\s+`technical-architect` for direct use/);
  assert.match(skill, /The role must not choose findings, approve refactors,\s+edit files, or bypass the developer confirmation gate/);
});

test("discover-skill declares conservative discovery and install routing", () => {
  const skill = readFileSync(discoverSkillPath, "utf8");

  assert.match(skill, /^name: discover-skill$/m);
  assert.match(skill, /software-development-relevant skills/);
  assert.match(skill, /The companion `known-sources\.json` source index/);
  assert.match(skill, /Treat every source as untrusted until inspected/);
  assert.match(skill, /the user explicitly agrees to\s+broaden the search/);
  assert.match(skill, /label any\s+outside-source candidate as `unreviewed source`/);
  assert.match(skill, /unsafe flags/);
  assert.match(skill, /reply with `install #` to start\s+the install review/);
  assert.match(skill, /The install review packet must include:/);
  assert.match(skill, /the files the user should review before approving install/);
  assert.match(skill, /reply with `confirm install #` before commands run/);
  assert.match(skill, /aix skills add <source-url> \[source-alias\]/);
  assert.match(skill, /aix skill activate <source>\/<skill-path>/);
  assert.match(skill, /Do not write `aix\.json`, `aix\.lock\.json`, `.agents\/`, `.agents\/packages`, or\s+`.agents\/skills` directly/);
});

test("delegate-to-role declares bounded role delegation contract", () => {
  const skill = readFileSync(delegateToRolePath, "utf8");

  assert.match(skill, /^name: delegate-to-role$/m);
  assert.match(skill, /use quality-engineer/);
  assert.match(skill, /delegate to documentation-specialist/);
  assert.match(skill, /Resolve the role only from explicit developer intent/);
  assert.match(skill, /If more than one role is named, stop/);
  assert.match(skill, /If the named role does not exist under `.agents\/roles\/`, stop/);
  assert.match(skill, /If role intent is only implied, do not guess/);
  assert.match(skill, /Prefer native subagent handoff only when the current host has a clear,\s+available mechanism/);
  assert.match(skill, /Do not write host-native agent files as part of routine\s+delegation/);
  assert.match(skill, /Use prompt-overlay fallback when native handoff is unavailable/);
  assert.match(skill, /The parent context owns plan state,\s+worktree safety, verification review, final decisions/);
  assert.match(skill, /Do Not Delegate When/);
  assert.match(skill, /Prompt-Overlay Shape/);
  assert.match(skill, /Required Return Evidence/);
  assert.match(skill, /without an explicit\s+integration command or configuration/);
});

test("brainstorming-skill declares durable idea discovery workflow", () => {
  const skill = readFileSync(brainstormingSkillPath, "utf8");

  assert.match(skill, /^name: brainstorming-skill$/m);
  assert.match(skill, /before creating an implementation plan/);
  assert.match(skill, /does not authorize implementation/);
  assert.match(skill, /route that\s+idea through `plan-create`/);
  assert.match(skill, /Marketing-related artifacts are valid brainstorming inputs and outputs/);
  assert.match(skill, /Read `_docs\/ideas\.md` when it exists/);
  assert.match(skill, /Research comparable products, projects, tools, or workflows/);
  assert.match(skill, /Product strategy judgment belongs in a role when the project has\s+one installed/);
  assert.match(skill, /delegate a bounded\s+product-strategy pass/);
  assert.match(skill, /Do not block a usable brainstorming session solely because the role is\s+missing/);
  assert.match(skill, /Checkpoint the session before review/);
  assert.match(skill, /Create or update `_docs\/ideas\.md` as soon as the first useful in-flight\s+list exists/);
  assert.match(skill, /Update `_docs\/ideas\.md` after meaningful list changes so the session can\s+be resumed from another conversation/);
  assert.match(skill, /Do not promote an idea into `Approved prioritized ideas` without explicit\s+developer acceptance/);
  assert.match(skill, /## Approved prioritized ideas/);
  assert.match(skill, /## In-flight ideas/);
  assert.match(skill, /Source links:/);
  assert.match(skill, /Prioritize approved ideas by practical value-to-effort/);
  assert.match(skill, /Reference dependencies by exact idea name/);
});

test("design-create declares role collaboration", () => {
  const skill = readFileSync(designCreatePath, "utf8");

  assert.match(skill, /^name: design-create$/m);
  assert.match(skill, /`design-create` owns the knowledge-base document/);
  assert.match(skill, /When `.agents\/roles\/technical-architect\.md` exists/);
  assert.match(skill, /system shape, component boundaries, module ownership, runtime\s+contracts/);
  assert.match(skill, /Fold returned evidence into the knowledge-base document's current-state behavior/);
  assert.match(skill, /Do not require `technical-architect` for\s+direct use/);
  assert.match(skill, /continue\s+the knowledge-base document creation yourself by checking the same architecture\s+concerns/);
  assert.match(skill, /When `.agents\/roles\/product-designer\.md` exists/);
  assert.match(skill, /product-facing behavior, user flows, interaction states/);
  assert.match(skill, /Fold returned evidence into the knowledge-base document's current-state behavior,\s+user-flow expectations/);
  assert.match(skill, /Do not require `product-designer` for direct\s+use/);
  assert.match(skill, /When `.agents\/roles\/ux-writer\.md` exists/);
  assert.match(skill, /durable product or developer-facing language/);
  assert.match(skill, /terminology, labels, prompts, command help, terminal output, errors/);
  assert.match(skill, /Fold returned evidence into the knowledge-base document's current-state behavior,\s+terminology, message-state expectations/);
  assert.match(skill, /Do not require\s+`ux-writer` for direct use/);
  assert.match(skill, /When `.agents\/roles\/documentation-specialist\.md` exists/);
  assert.match(skill, /knowledge-base\s+document placement, ownership, index coverage/);
  assert.match(skill, /Fold returned evidence into the knowledge-base document's placement decision/);
  assert.match(skill, /Do not\s+require `documentation-specialist` for direct use/);
});

test("design-promote declares technical architecture and UX writing collaboration", () => {
  const skill = readFileSync(designPromotePath, "utf8");

  assert.match(skill, /^name: design-promote$/m);
  assert.match(skill, /Promote accepted current-state behavior into `_docs\/kb`/);
  assert.match(skill, /`design-promote` owns the promotion decision/);
  assert.match(skill, /When `.agents\/roles\/technical-architect\.md` exists/);
  assert.match(skill, /changed architecture-sensitive behavior/);
  assert.match(skill, /system shape, component boundaries, module ownership/);
  assert.match(skill, /Fold returned evidence into the knowledge-base update/);
  assert.match(skill, /Do not require `technical-architect` for direct use/);
  assert.match(skill, /Do not use the\s+role to introduce speculative future behavior into `_docs\/kb`/);
  assert.match(skill, /When `.agents\/roles\/ux-writer\.md` exists/);
  assert.match(skill, /durable product or developer-facing language/);
  assert.match(skill, /terminology, labels, prompts, command help, terminal output,\s+errors, empty states/);
  assert.match(skill, /Fold returned evidence into the knowledge-base update, terminology or message\s+state contracts/);
  assert.match(skill, /Do not require `ux-writer` for direct use/);
  assert.match(skill, /Do not use the role to promote unimplemented wording/);
  assert.match(skill, /When `.agents\/roles\/documentation-specialist\.md` exists/);
  assert.match(skill, /promotion depends\s+on `_docs` placement, knowledge-base ownership/);
  assert.match(skill, /review-and-refresh-docs handoff/);
  assert.match(skill, /Do not require `documentation-specialist` for direct use/);
  assert.match(skill, /Do not use the role to promote unimplemented behavior or bypass\s+`review-and-refresh-docs`/);
  assert.match(skill, /Treat completed plans as inspection guides, not proof/);
  assert.match(skill, /Record unresolved implementation-vs-intent conflicts/);
});

test("plan-create declares gated planning and role collaboration", () => {
  const skill = readFileSync(planCreatePath, "utf8");

  assert.match(skill, /^name: plan-create$/m);
  assert.match(skill, /`plan-create` owns the planning procedure and the backlog plan artifact/);
  assert.match(skill, /When `.agents\/roles\/product-strategist\.md` exists/);
  assert.match(skill, /use `delegate-to-role` or a prompt-overlay delegation/);
  assert.match(skill, /When `.agents\/roles\/product-designer\.md` exists/);
  assert.match(skill, /user\s+flows, interaction design, accessibility, layout hierarchy, prototypes/);
  assert.match(skill, /terminal UX, prompts, or design-system fit/);
  assert.match(skill, /Do not use\s+the role to finalize product surfaces without developer review/);
  assert.match(skill, /When `.agents\/roles\/requirements-engineer\.md` exists/);
  assert.match(skill, /requirements, actors, workflows, inputs, outputs, constraints/);
  assert.match(skill, /plan-readiness judgment/);
  assert.match(skill, /Do not use the role to\s+invent requirements from thin context/);
  assert.match(skill, /When `.agents\/roles\/technical-architect\.md` exists/);
  assert.match(skill, /system boundaries, component contracts, module ownership, runtime contracts/);
  assert.match(skill, /Use architecture review to shape phases only after Design Intent\s+is accepted/);
  assert.match(skill, /When `.agents\/roles\/security-engineer\.md` exists/);
  assert.match(skill, /trust\s+boundaries, secrets, authentication, authorization, permissions/);
  assert.match(skill, /Security Review\s+expectations/);
  assert.match(skill, /Do not use the role to approve unsafe behavior or\s+waive security findings/);
  assert.match(skill, /When `.agents\/roles\/ux-writer\.md` exists/);
  assert.match(skill, /labels, prompts,\s+command help, terminal output, errors, empty states, onboarding copy, README\s+language/);
  assert.match(skill, /Do not use\s+the role to finalize product claims, support promises, security language/);
  assert.match(skill, /When `.agents\/roles\/quality-engineer\.md` exists/);
  assert.match(skill, /acceptance checks, verification strategy, regression\s+risk, evidence expectations/);
  assert.match(skill, /Do not use the\s+role to run commands, mark phases ready, waive checks, or take over\s+`work-verify`/);
  assert.match(skill, /When `.agents\/roles\/documentation-specialist\.md` exists/);
  assert.match(skill, /documentation-impact pass/);
  assert.match(skill, /`_docs` placement,\s+design-promotion notes, current-state documentation/);
  assert.match(skill, /Do not use the\s+role to invent design truth, promote speculative behavior/);
  assert.match(skill, /When `.agents\/roles\/implementation-engineer\.md` exists/);
  assert.match(skill, /bounded implementation-readiness input before phases and tasks are finalized/);
  assert.match(skill, /scoped task boundaries, phase sequencing, likely changed\s+areas/);
  assert.match(skill, /Do not\s+use the role to authorize execution, edit files/);
  assert.match(skill, /Do not require `product-strategist` for direct use/);
  assert.match(skill, /Do not require `product-designer` for direct use either/);
  assert.match(skill, /asking concise flow, interaction, accessibility, and design-system questions/);
  assert.match(skill, /Do not require `requirements-engineer` for direct use either/);
  assert.match(skill, /asking concise requirements, actor, workflow, constraint, non-goal,\s+boundary, acceptance-signal, and open-decision questions/);
  assert.match(skill, /Do not require `technical-architect` for direct use either/);
  assert.match(skill, /asking concise boundary, contract, integration, maintainability, and\s+verification questions/);
  assert.match(skill, /Do not require `security-engineer` for direct use either/);
  assert.match(skill, /asking concise trust-boundary, credential, authorization, file-operation,\s+dependency, failure-path, and safety-verification questions/);
  assert.match(skill, /Do not require `ux-writer` for direct use either/);
  assert.match(skill, /asking\s+concise reader, task, terminology, prompt, error, empty-state, onboarding,\s+README, and verification questions/);
  assert.match(skill, /Do not require `quality-engineer` for direct use either/);
  assert.match(skill, /asking concise acceptance-check, targeted-test, regression-risk/);
  assert.match(skill, /Do not require `documentation-specialist` for direct use either/);
  assert.match(skill, /asking concise documentation-impact, `_docs` placement, design-promotion/);
  assert.match(skill, /Do not require `implementation-engineer` for direct use either/);
  assert.match(skill, /asking concise task-boundary, phase-order, likely-file/);
  assert.match(skill, /Run the vision gate first/);
  assert.match(skill, /Record acceptance on the `High-Level Goal` heading only after the user\s+agrees/);
  assert.match(skill, /Treat template comments marked\s+`DO NOT INCLUDE IN OUTPUT` as agent-only instructions/);
  assert.match(skill, /never copy those\s+comments into the project-owned plan/);
  assert.match(skill, /Do not generate implementation phases or task lists\s+before Design Intent is accepted/);
  assert.match(skill, /Use `requirements-engineer` for a bounded requirements pass/);
  assert.match(skill, /Use `technical-architect` for phase-shaping guidance/);
  assert.match(skill, /Use `security-engineer`\s+for a bounded security pass/);
  assert.match(skill, /Use `ux-writer` for a bounded copy pass/);
  assert.match(skill, /Use `quality-engineer` for a bounded quality pass/);
  assert.match(skill, /Use `documentation-specialist` for a bounded documentation pass/);
  assert.match(skill, /Use `quality-engineer` for phase verification guidance/);
  assert.match(skill, /Use `documentation-specialist` for phase documentation guidance/);
  assert.match(skill, /Use `implementation-engineer` for phase and task decomposition/);
  assert.match(skill, /Only after Design Intent is accepted, break it into ordered implementation\s+phases/);
  assert.match(skill, /Not drafted until Design Intent is accepted/);
  assert.match(skill, /strip every\s+`DO NOT INCLUDE IN OUTPUT` comment block from the created or updated plan/);
  assert.match(skill, /Do not leave agent-only template comments/);
  assert.match(skill, /Do not generate implementation phases or task lists against unaccepted Design\s+Intent/);
});

test("plan-review declares role collaboration", () => {
  const skill = readFileSync(planReviewPath, "utf8");

  assert.match(skill, /^name: plan-review$/m);
  assert.match(skill, /`plan-review` owns the review result/);
  assert.match(skill, /When `.agents\/roles\/technical-architect\.md` exists/);
  assert.match(skill, /architecture-sensitive scope/);
  assert.match(skill, /system boundaries, component contracts, module ownership, runtime\s+contracts/);
  assert.match(skill, /implementation-phase sequencing, or\s+maintainability tradeoffs/);
  assert.match(skill, /Fold returned evidence into review findings, activation blockers, risks/);
  assert.match(skill, /Do not require `technical-architect` for direct use/);
  assert.match(skill, /continue the review yourself by checking the same\s+architecture-readiness concerns/);
  assert.match(skill, /When `.agents\/roles\/product-strategist\.md` exists/);
  assert.match(skill, /product-scope, audience, value, sequencing, prioritization/);
  assert.match(skill, /bounded product-strategy readiness pass/);
  assert.match(skill, /Do not require `product-strategist` for direct use/);
  assert.match(skill, /When `.agents\/roles\/product-designer\.md` exists/);
  assert.match(skill, /product-facing UX scope/);
  assert.match(skill, /user flows,\s+interaction design, accessibility, layout hierarchy/);
  assert.match(skill, /Fold returned evidence into review findings, activation blockers, risks,\s+verification gaps, requested plan revisions, human-review notes/);
  assert.match(skill, /Do not require `product-designer` for direct use/);
  assert.match(skill, /When `.agents\/roles\/requirements-engineer\.md` exists/);
  assert.match(skill, /requirements-readiness review/);
  assert.match(skill, /requirements, actors, workflows, inputs, outputs, constraints/);
  assert.match(skill, /whether implementation phases were drafted too early/);
  assert.match(skill, /Do not require\s+`requirements-engineer` for direct use/);
  assert.match(skill, /When `.agents\/roles\/security-engineer\.md` exists/);
  assert.match(skill, /security-sensitive scope/);
  assert.match(skill, /trust\s+boundaries, secrets, authentication, authorization, permissions/);
  assert.match(skill, /Fold returned evidence into review findings, activation blockers, risks,\s+verification gaps, requested plan revisions, Security Review notes/);
  assert.match(skill, /Do not require\s+`security-engineer` for direct use/);
  assert.match(skill, /When `.agents\/roles\/ux-writer\.md` exists/);
  assert.match(skill, /user-facing or\s+developer-facing copy scope/);
  assert.match(skill, /labels, prompts, command help, terminal output, errors, empty states/);
  assert.match(skill, /Fold returned evidence into review findings, activation blockers, risks,\s+verification gaps, requested plan revisions, human-review notes/);
  assert.match(skill, /Do not require `ux-writer` for direct use/);
  assert.match(skill, /When `.agents\/roles\/quality-engineer\.md` exists/);
  assert.match(skill, /verification-readiness review/);
  assert.match(skill, /acceptance\s+checks, targeted verification, regression risk, failure paths/);
  assert.match(skill, /Do not require `quality-engineer` for direct use/);
  assert.match(skill, /lacks required actors, workflows, inputs,\s+outputs, constraints, non-goals, boundaries, acceptance signals/);
  assert.match(skill, /lacks\s+trust-boundary, credential, authorization, destructive-operation, dependency,\s+failure-path, or safety-verification decisions/);
  assert.match(skill, /verification expectations, regression-risk\s+coverage, manual validation needs/);
});

test("plan-update declares project-development role collaboration", () => {
  const skill = readFileSync(planUpdatePath, "utf8");

  assert.match(skill, /^name: plan-update$/m);
  assert.match(skill, /`plan-update` owns the plan edit/);
  assert.match(skill, /When `.agents\/roles\/product-strategist\.md` exists/);
  assert.match(skill, /product scope, audience, user value, prioritization/);
  assert.match(skill, /When `.agents\/roles\/product-designer\.md` exists/);
  assert.match(skill, /user flows, interaction states, accessibility expectations/);
  assert.match(skill, /When `.agents\/roles\/requirements-engineer\.md` exists/);
  assert.match(skill, /requirements, actors, workflows, inputs, outputs, constraints/);
  assert.match(skill, /When `.agents\/roles\/technical-architect\.md` exists/);
  assert.match(skill, /system boundaries, component contracts, module ownership/);
  assert.match(skill, /When `.agents\/roles\/security-engineer\.md` exists/);
  assert.match(skill, /trust boundaries, secrets, authentication, authorization/);
  assert.match(skill, /When `.agents\/roles\/ux-writer\.md` exists/);
  assert.match(skill, /user-facing or developer-facing text requirements/);
  assert.match(skill, /When `.agents\/roles\/quality-engineer\.md` exists/);
  assert.match(skill, /verification expectations, acceptance checks, regression-risk notes/);
  assert.match(skill, /When `.agents\/roles\/documentation-specialist\.md` exists/);
  assert.match(skill, /documentation impact, `_docs` placement, design-promotion\s+notes/);
  assert.match(skill, /When `.agents\/roles\/implementation-engineer\.md` exists/);
  assert.match(skill, /task boundaries, phase sequencing, likely changed areas/);
  assert.match(skill, /Fold returned evidence into the smallest appropriate plan update/);
  assert.match(skill, /Do not require any role for direct use/);
});

test("task-execute declares implementation and quality role collaboration", () => {
  const skill = readFileSync(join(process.cwd(), "aix/workflows/design-plan-execute/skills/task-execute/SKILL.md"), "utf8");

  assert.match(skill, /^name: task-execute$/m);
  assert.match(skill, /`task-execute` owns the selected task, implementation slice, targeted\s+verification/);
  assert.match(skill, /When `.agents\/roles\/quality-engineer\.md` exists/);
  assert.match(skill, /non-trivial changed behavior, failure paths, regression risk/);
  assert.match(skill, /Do not require `quality-engineer` for direct use/);
  assert.match(skill, /When `.agents\/roles\/implementation-engineer\.md` exists/);
  assert.match(skill, /likely changed files, test\s+or fixture ownership/);
  assert.match(skill, /Do not\s+require `implementation-engineer` for direct use/);
  assert.match(skill, /scope, ownership, sequencing, verification-handoff/);
});

test("phase-execute declares implementation and quality role collaboration", () => {
  const skill = readFileSync(join(process.cwd(), "aix/workflows/design-plan-execute/skills/phase-execute/SKILL.md"), "utf8");

  assert.match(skill, /^name: phase-execute$/m);
  assert.match(skill, /`phase-execute` owns phase sequencing, integration review, verification\s+evidence review/);
  assert.match(skill, /When `.agents\/roles\/quality-engineer\.md` exists/);
  assert.match(skill, /cross-task regression risk, integration checks/);
  assert.match(skill, /Do not\s+require `quality-engineer` for direct use/);
  assert.match(skill, /When `.agents\/roles\/implementation-engineer\.md` exists/);
  assert.match(skill, /task slicing, changed-area ownership, dependency order/);
  assert.match(skill, /whether the next task is ready for\s+`task-execute`/);
  assert.match(skill, /Do not require `implementation-engineer` for direct use/);
});

test("plan-execute declares implementation role collaboration", () => {
  const skill = readFileSync(planExecutePath, "utf8");

  assert.match(skill, /^name: plan-execute$/m);
  assert.match(skill, /`plan-execute` owns plan-level phase sequencing/);
  assert.match(skill, /When `.agents\/roles\/implementation-engineer\.md` exists/);
  assert.match(skill, /whole-plan\s+execution depends on phase order, cross-phase dependencies/);
  assert.match(skill, /whether the next phase\s+is ready for `phase-execute`/);
  assert.match(skill, /Do not require `implementation-engineer` for direct use/);
});

test("work-verify declares security and quality review collaboration", () => {
  const skill = readFileSync(workVerifyPath, "utf8");

  assert.match(skill, /^name: work-verify$/m);
  assert.match(skill, /`work-verify` owns check selection, command execution, verification evidence/);
  assert.match(skill, /When `.agents\/roles\/security-engineer\.md` exists/);
  assert.match(skill, /security-sensitive/);
  assert.match(skill, /trust\s+boundaries, secrets, authentication, authorization, permissions/);
  assert.match(skill, /Fold returned evidence into selected checks, skipped-check rationale, manual\s+verification notes, residual risk, or follow-up work/);
  assert.match(skill, /Do not\s+require `security-engineer` for direct use/);
  assert.match(skill, /When `.agents\/roles\/quality-engineer\.md` exists/);
  assert.match(skill, /verification choice or\s+evidence has meaningful quality risk/);
  assert.match(skill, /targeted-test selection, manual validation, skipped-check rationale/);
  assert.match(skill, /Do not require `quality-engineer` for direct use/);
  assert.match(skill, /When `.agents\/roles\/implementation-engineer\.md` exists/);
  assert.match(skill, /changed implementation boundaries, likely touched files/);
  assert.match(skill, /build or package artifacts/);
  assert.match(skill, /Do not require `implementation-engineer` for\s+direct use/);
  assert.match(skill, /Dependency and package-management changes require trust, source-resolution,\s+lockfile-integrity, drift, and no-write failure-path review/);
});

test("review-and-refresh-docs declares knowledge-base role collaboration", () => {
  const skill = readFileSync(reviewAndRefreshDocsPath, "utf8");

  assert.match(skill, /^name: review-and-refresh-docs$/m);
  assert.match(skill, /refreshes `_docs\/kb\/` so the\s+knowledge base describes the current implemented system/);
  assert.match(skill, /When `.agents\/roles\/documentation-specialist\.md` exists/);
  assert.match(skill, /When domain-specific knowledge is material/);
  assert.match(skill, /`product-designer` for product behavior, user flows, interaction states/);
  assert.match(skill, /When domain-specific knowledge is material/);
  assert.match(skill, /`security-engineer` for threat models, trust boundaries/);
  assert.match(skill, /Delegated role evidence should include implementation facts inspected/);
  assert.match(skill, /`ux-writer` for developer-facing or user-facing copy/);
  assert.match(skill, /cross-links, freshness, duplication, stale references/);
  assert.match(skill, /Do not edit, move, delete, or rewrite existing `_docs\/design` files/);
});

test("plan-complete requires human validation before closeout", () => {
  const skill = readFileSync(planCompletePath, "utf8");

  assert.match(skill, /^name: plan-complete$/m);
  assert.match(skill, /`plan-complete` owns closeout, checklist updates, final risk recording/);
  assert.match(skill, /When `.agents\/roles\/security-engineer\.md` exists/);
  assert.match(skill, /required post-phase security review before\s+completion/);
  assert.match(skill, /Fold returned evidence into the plan's `Security Review` section/);
  assert.match(skill, /Do not require `security-engineer` for direct use/);
  assert.match(skill, /When `.agents\/roles\/ux-writer\.md` exists/);
  assert.match(skill, /bounded final copy-readiness input before\s+archive/);
  assert.match(skill, /labels, prompts, command help, terminal output,\s+errors, empty states/);
  assert.match(skill, /Fold returned evidence into the completion checklist, final risks, follow-on\s+work, documentation impact/);
  assert.match(skill, /Do not require `ux-writer` for direct use/);
  assert.match(skill, /Do not use the role to override developer acceptance/);
  assert.match(skill, /When `.agents\/roles\/quality-engineer\.md` exists/);
  assert.match(skill, /verification evidence, validation gaps, regression risk/);
  assert.match(skill, /Do not require\s+`quality-engineer` for direct use/);
  assert.match(skill, /Do not use the role to override developer acceptance,\s+waive checks, or replace `work-verify`/);
  assert.match(skill, /When `.agents\/roles\/documentation-specialist\.md` exists/);
  assert.match(skill, /documentation impact, design promotion, current-state accuracy/);
  assert.match(skill, /bounded final documentation input before archive/);
  assert.match(skill, /Do not require `documentation-specialist` for direct use/);
  assert.match(skill, /replace `design-promote` or `review-and-refresh-docs`/);
  assert.match(skill, /Confirm the human validation gate before completing the checklist/);
  assert.match(skill, /developer has evaluated the completed phased work and accepted it/);
  assert.match(skill, /explicitly waived manual validation and the plan records the\s+reason/);
  assert.match(skill, /Do not infer acceptance from passing automated tests/);
  assert.match(skill, /Complete the Security Review gate/);
  assert.match(skill, /Review validation gaps, skipped checks, manual validation evidence/);
  assert.match(skill, /Convert blocking security findings into\s+normal plan tasks before closeout/);
  assert.match(skill, /Refuse closeout when the human validation gate is missing, incomplete, or\s+only implied by automated checks/);
  assert.match(skill, /Refuse closeout when a required Security Review is missing/);
  assert.match(skill, /Refuse closeout when verification gaps, skipped checks, manual validation\s+gaps/);
});

test("plan template includes security review before completion checklist", () => {
  const template = readFileSync(planTemplatePath, "utf8");
  const securityReview = readFileSync(securityReviewTemplatePath, "utf8");
  const completionChecklist = readFileSync(completionChecklistTemplatePath, "utf8");

  assert.match(template, /\{\{ section:security-review \}\}/);
  assert.ok(template.indexOf("{{ section:security-review }}") < template.indexOf("{{ section:completion-checklist }}"));
  assert.match(securityReview, /^## Security Review$/m);
  assert.match(securityReview, /record post-phase findings, blocking\s+findings converted to normal plan tasks, residual risk/);
  assert.match(securityReview, /Blocking findings converted to plan tasks/);
  assert.match(completionChecklist, /Complete Security Review after all implementation phases/);
  assert.match(completionChecklist, /convert blocking findings into normal plan tasks/);
});
