import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

const skillPath = join(process.cwd(), "aix/workflows/design-plan-execute/skills/code-review-refactor/SKILL.md");
const discoverSkillPath = join(process.cwd(), "aix/skills/discover-skill/SKILL.md");

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
  assert.match(skill, /unsafe flags/);
  assert.match(skill, /reply with `install #`/);
  assert.match(skill, /aix skills add <source-url> \[source-alias\]/);
  assert.match(skill, /aix skill activate <source>\/<skill-path>/);
  assert.match(skill, /Do not write `aix\.json`, `aix\.lock\.json`, `.agents\/`, `.agents\/packages`, or\s+`.agents\/skills` directly/);
});
