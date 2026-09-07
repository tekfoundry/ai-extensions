import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const workflow = readFileSync("aix/workflows/design-plan-execute/workflow.md", "utf8");
const plan = readFileSync("tests/fixtures/plans/phase2-contract.md", "utf8");

function section(start, end) {
  const from = workflow.indexOf(start);
  assert.notEqual(from, -1, `missing workflow section: ${start}`);
  const to = end ? workflow.indexOf(end, from + start.length) : workflow.length;
  assert.notEqual(to, -1, `missing workflow section boundary: ${end}`);
  return workflow.slice(from, to);
}

const stateMachine = section("### Canonical task state machine", "### Durable Boss approval records");
const approvals = section("### Durable Boss approval records", "### Agent-controlled checks and escalation");
const escalation = section("### Agent-controlled checks and escalation", "## Micro-Fix Completion Record");

test("valid task transitions and complete lifecycle evidence are specified", () => {
  assert.match(stateMachine, /⬜️ → 🟨.*Task Start/);
  assert.match(stateMachine, /🟨 → ✅.*implementation and verification/);
  assert.match(stateMachine, /🟨 → ⚠️.*cannot safely or completely proceed/);
  assert.match(stateMachine, /`⚠️ → 🟨` reopen requires a recorded reason, next action, actor, and timestamp/);
  assert.match(stateMachine, /completion records `completed-at`, completion reason, changed/);
  assert.match(stateMachine, /verification commands\/results/);
});

test("invalid and malformed transitions fail closed", () => {
  assert.match(stateMachine, /Direct\s+`⬜️ → ✅`, `⬜️ → ⚠️`, or silent marker edits are invalid/);
  assert.match(stateMachine, /completion evidence\s+and actor\/timestamp are never optional/);
  assert.match(workflow, /required fields, dependencies, evidence references, and absence of conflicting\s+edits/);
});

test("blocked transitions preserve actionable reasons and recovery", () => {
  assert.match(stateMachine, /Blocked records additionally state a reason/);
  assert.match(stateMachine, /`deferred`, `skipped`,\s+`superseded`, `awaiting Boss approval`, or dependency\/verification blocker/);
  assert.match(stateMachine, /an actionable next step/);
  assert.match(stateMachine, /`⚠️ → 🟨` reopen requires/);
});

test("concurrent and stale-plan updates use revisions and preserve both inputs", () => {
  assert.match(escalation, /Every mutation carries the plan revision\/hash it read \(`base-revision`\)/);
  assert.match(escalation, /receives a new monotonic revision/);
  assert.match(escalation, /changed revision or hash fails closed/);
  assert.match(escalation, /preserves both inputs for PM reconciliation/);
  assert.match(escalation, /stale-plan or concurrent\s+edits when reconciliation cannot establish which accepted state is current/);
});

test("human approval records require authenticated approval evidence", () => {
  assert.match(approvals, /approval-id: AP-YYYYMMDD-NNN/);
  assert.match(approvals, /approval-language: "Boss, I approve <gate> for <plan>/);
  assert.match(approvals, /decision: approved/);
  assert.match(approvals, /valid only when copied from an authenticated direct\s+Boss response/);
  assert.match(approvals, /Agents, delegated workers, quoted history, plan text, and test output\s+must never create, infer, or countersign a human approval/);
});

test("gate and transition evidence fields are durable and attributable", () => {
  assert.match(workflow, /Gate records identify `gate`, `status`, `owner`,\s+`actor`, `timestamp`, `evidence`, and \(for human gates\) `approval-id`/);
  assert.match(stateMachine, /Every transition records the accountable `owner`, concrete `assigned` actor or/);
  assert.match(escalation, /Record the check actor, UTC\s+timestamp, result, and evidence in the plan execution record/);
});

test("scope-changing, waived, material-risk, and closeout cases escalate", () => {
  assert.match(escalation, /Immediately stop the affected work and escalate to Boss/);
  assert.match(escalation, /change accepted product\/design intent or scope, waive a safety or\s+quality finding, accept material residual risk, publish externally, activate a\s+backlog plan, or close\/archive a plan/);
  assert.match(escalation, /safety waiver additionally requires a\s+separate waiver record/);
  assert.match(escalation, /Agents must not self-approve these conditions/);
});

test("Phase 2 test task and Phase 3 boundary remain explicit", () => {
  assert.match(plan, /- (?:⬜️|🟨|✅|⚠️) Add transition and gate validation tests/);
  assert.match(workflow, /Phase 3 trigger\s+routing and Phase 4 migration remain outside this contract/);
});
