import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

const skillPath = join(process.cwd(), "aix/workflows/design-plan-execute/skills/code-review-refactor/SKILL.md");
const delegateToRolePath = join(process.cwd(), "aix/workflows/design-plan-execute/skills/delegate-to-role/SKILL.md");
const discoverSkillPath = join(process.cwd(), "aix/skills/discover-skill/SKILL.md");
const brainstormingSkillPath = join(process.cwd(), "aix/workflows/design-plan-execute/skills/brainstorming-skill/SKILL.md");
const planCreatePath = join(process.cwd(), "aix/workflows/design-plan-execute/skills/plan-create/SKILL.md");
const planCompletePath = join(process.cwd(), "aix/workflows/design-plan-execute/skills/plan-complete/SKILL.md");

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
  assert.match(skill, /Use prompt-overlay fallback when native handoff is unavailable/);
  assert.match(skill, /The parent context owns plan state,\s+worktree safety, verification review, final decisions/);
  assert.match(skill, /Do Not Delegate When/);
  assert.match(skill, /Prompt-Overlay Shape/);
  assert.match(skill, /Required Return Evidence/);
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

test("plan-create declares gated planning and product-strategy collaboration", () => {
  const skill = readFileSync(planCreatePath, "utf8");

  assert.match(skill, /^name: plan-create$/m);
  assert.match(skill, /`plan-create` owns the planning procedure and the backlog plan artifact/);
  assert.match(skill, /When `.agents\/roles\/product-strategist\.md` exists/);
  assert.match(skill, /use `delegate-to-role` or a prompt-overlay delegation/);
  assert.match(skill, /Do not require `product-strategist` for direct use/);
  assert.match(skill, /Run the vision gate first/);
  assert.match(skill, /Record acceptance on the `High-Level Goal` heading only after the user\s+agrees/);
  assert.match(skill, /Do not generate implementation phases or task lists\s+before Design Intent is accepted/);
  assert.match(skill, /Only after Design Intent is accepted, break it into ordered implementation\s+phases/);
  assert.match(skill, /Not drafted until Design Intent is accepted/);
  assert.match(skill, /Do not generate implementation phases or task lists against unaccepted Design\s+Intent/);
});

test("plan-complete requires human validation before closeout", () => {
  const skill = readFileSync(planCompletePath, "utf8");

  assert.match(skill, /^name: plan-complete$/m);
  assert.match(skill, /Confirm the human validation gate before completing the checklist/);
  assert.match(skill, /developer has evaluated the completed phased work and accepted it/);
  assert.match(skill, /explicitly waived manual validation and the plan records the\s+reason/);
  assert.match(skill, /Do not infer acceptance from passing automated tests/);
  assert.match(skill, /Refuse closeout when the human validation gate is missing, incomplete, or\s+only implied by automated checks/);
});
