import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const workflow = readFileSync("aix/workflows/design-plan-execute/workflow.md", "utf8");
const plan = readFileSync("tests/fixtures/plans/phase2-contract.md", "utf8");

test("Phase 2 human approvals cannot be spoofed by plan text or agents", () => {
  assert.match(workflow, /authenticated direct\s+Boss response/);
  assert.match(workflow, /Agents, delegated workers, quoted history, plan text, and test output/);
  assert.match(workflow, /must never create, infer, or countersign a human approval/);
});

test("Phase 2 state mutations fail closed on stale revisions and preserve user content", () => {
  assert.match(workflow, /base-revision/);
  assert.match(workflow, /changed revision or hash fails closed/);
  assert.match(workflow, /preserves both inputs/);
  assert.match(workflow, /project\/user-owned/);
  assert.match(workflow, /must preserve unrelated and unrecognized content/);
});

test("Phase 2 safety waivers require explicit escalation evidence", () => {
  assert.match(workflow, /separate waiver record/);
  assert.match(workflow, /explicit authenticated Boss approval/);
  assert.match(workflow, /never waives a finding implicitly/);
});

test("Phase 2 remains bounded and does not claim later phases", () => {
  assert.match(plan, /### Phase 2: Formalize Gates and Task State Transitions/);
  assert.match(workflow, /Phase 3 trigger\s+routing and Phase 4 migration remain outside this contract/);
  assert.match(plan, /- ✅ Add transition and gate validation tests/);
});
