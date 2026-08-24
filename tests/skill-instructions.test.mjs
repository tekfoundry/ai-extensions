import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

const skillPath = join(process.cwd(), "aix/workflows/design-plan-execute/skills/code-review-refactor/SKILL.md");
const discoverSkillPath = join(process.cwd(), "aix/skills/discover-skill/SKILL.md");
const brainstormingSkillPath = join(process.cwd(), "aix/skills/brainstorming-skill/SKILL.md");

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

test("brainstorming-skill declares durable idea discovery workflow", () => {
  const skill = readFileSync(brainstormingSkillPath, "utf8");

  assert.match(skill, /^name: brainstorming-skill$/m);
  assert.match(skill, /before creating an implementation plan/);
  assert.match(skill, /does not authorize implementation/);
  assert.match(skill, /route that\s+idea through `plan-create`/);
  assert.match(skill, /Marketing-related artifacts are valid brainstorming inputs and outputs/);
  assert.match(skill, /Read `_docs\/ideas\.md` when it exists/);
  assert.match(skill, /Research comparable products, projects, tools, or workflows/);
  assert.match(skill, /Checkpoint the session before review/);
  assert.match(skill, /Create or update `_docs\/ideas\.md` as soon as the first useful in-flight\s+list exists/);
  assert.match(skill, /Update `_docs\/ideas\.md` after meaningful list changes so the session can\s+be resumed from another conversation/);
  assert.match(skill, /Do not promote an idea into `Approved prioritized ideas` without explicit\s+developer acceptance/);
  assert.match(skill, /## Approved prioritized ideas/);
  assert.match(skill, /## In-flight ideas/);
  assert.match(skill, /Source links:/);
  assert.match(skill, /Prioritize approved ideas by value-to-effort/);
  assert.match(skill, /Reference dependencies by exact idea name/);
});
