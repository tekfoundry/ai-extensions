import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

const skillPath = join(process.cwd(), "aix/skills/code-review-refactor/SKILL.md");

test("code-review-refactor skill declares standalone review contract", () => {
  const skill = readFileSync(skillPath, "utf8");

  assert.match(skill, /^name: code-review-refactor$/m);
  assert.match(skill, /Confirm `.agents\/engineering-best-practices\.md` exists\./);
  assert.match(skill, /If `.agents\/engineering-best-practices\.md` is missing, stop before reviewing/);
  assert.match(skill, /Review project code files by default\./);
  assert.match(skill, /Each finding should include:/);
  assert.match(skill, /severity, such as `P1`, `P2`, or `P3`/);
  assert.match(skill, /Ask the developer which recommendation they want to pursue\./);
  assert.match(skill, /When the review runs inside an active plan/);
  assert.match(skill, /When the review runs outside an active plan/);
});
