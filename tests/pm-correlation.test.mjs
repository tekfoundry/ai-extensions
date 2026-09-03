import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import { readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { test } from "node:test";
import {
  attachHostWorker,
  createDelegation,
  delegationCorrelation,
  findDelegationByIdentifier,
  inspectDelegation,
  publishWorkerResult,
  publishWorkerStatus,
  readDelegation,
  createPmOrchestrator
} from "../dist/pm/index.js";

const workflowRoot = resolve("aix/workflows/design-plan-execute");

function recordInput(projectRoot, suffix) {
  return {
    projectRoot, workflow: "design-plan-execute", workflowVersion: "1", pmRoleVersion: "1",
    role: "quality-engineer", taskMode: "verification", deliveryMode: "report-only",
    goal: `Correlation ${suffix}`, constraints: [], acceptanceSignals: [], allowedPaths: [],
    deniedPaths: ["src/"], requiredAccess: ["read"], stopConditions: ["scope unclear"], returnRequirements: ["summary"]
  };
}

test("correlation mapping persists and recovers across every identifier", async () => {
  const projectRoot = await mkdtemp(join(tmpdir(), "aix-pm-correlation-persist-"));
  const record = createDelegation(recordInput(projectRoot, "persist"));
  const attached = attachHostWorker(projectRoot, record.contract.identity.delegationId, {
    hostWorkerId: "worker-42", hostMissionId: "mission-42", hostRunId: "run-42"
  });
  const expected = {
    delegationId: record.contract.identity.delegationId,
    subagentId: record.contract.identity.subagentId,
    hostWorkerId: "worker-42", hostMissionId: "mission-42", hostRunId: "run-42"
  };
  assert.deepEqual(delegationCorrelation(attached), expected);
  const persisted = JSON.parse(readFileSync(join(projectRoot, ".aix/pm/delegations", expected.delegationId, "record.json"), "utf8"));
  assert.deepEqual(delegationCorrelation(readDelegation(projectRoot, expected.delegationId)), expected);
  assert.equal(persisted.contract.identity.hostMissionId, "mission-42");
  assert.equal(findDelegationByIdentifier(projectRoot, "run-42", "hostRunId").record.contract.identity.delegationId, expected.delegationId);
});

test("active lookup uses the resolved host worker handle and completed lookup remains auditable", async () => {
  const projectRoot = await mkdtemp(join(tmpdir(), "aix-pm-correlation-status-"));
  const record = createDelegation(recordInput(projectRoot, "status"));
  attachHostWorker(projectRoot, record.contract.identity.delegationId, { hostWorkerId: "worker-status", hostMissionId: "mission-status", hostRunId: "run-status" });
  publishWorkerStatus(projectRoot, record.contract.identity.delegationId, "working", "running");
  let lookedUp;
  const host = {
    async inspectWorker(worker) { lookedUp = worker; return { state: "working" }; }
  };
  const active = await inspectDelegation(projectRoot, "mission-status", host, "hostMissionId");
  assert.equal(active.hostState, "working");
  assert.equal(lookedUp.hostWorkerId, "worker-status");
  assert.equal(lookedUp.hostMissionId, "mission-status");
  assert.equal(lookedUp.hostRunId, "run-status");

  publishWorkerResult(projectRoot, record.contract.identity.delegationId, { status: "completed", summary: "done", evidence: [], gaps: [], residualRisk: [] });
  const audit = await inspectDelegation(projectRoot, record.contract.identity.subagentId, host, "subagentId");
  assert.equal(audit.record.state, "completed");
  assert.equal(audit.matchedBy, "subagentId");
  assert.equal(audit.hostState, undefined);
});

test("identifier mismatch and ambiguity fail closed", async () => {
  const projectRoot = await mkdtemp(join(tmpdir(), "aix-pm-correlation-mismatch-"));
  const first = createDelegation(recordInput(projectRoot, "first"));
  const second = createDelegation(recordInput(projectRoot, "second"));
  attachHostWorker(projectRoot, first.contract.identity.delegationId, { hostWorkerId: "worker-one", hostMissionId: "mission-one" });
  attachHostWorker(projectRoot, second.contract.identity.delegationId, { hostWorkerId: "worker-two", hostMissionId: "mission-one" });
  assert.throws(() => findDelegationByIdentifier(projectRoot, "mission-one", "hostRunId"), /No delegation is correlated/);
  assert.throws(() => findDelegationByIdentifier(projectRoot, first.contract.identity.delegationId, "subagentId"), /No delegation is correlated/);
  assert.throws(() => findDelegationByIdentifier(projectRoot, "mission-one", "hostMissionId"), /ambiguous/);
});

test("a result with a mismatched host identifier is refused", async () => {
  const projectRoot = await mkdtemp(join(tmpdir(), "aix-pm-correlation-result-"));
  const host = {
    async discoverCapabilities() { return { provider: "test", harness: "test", model: "test", runtime: "test", discoveredAt: "2026-09-02T00:00:00.000Z", capabilities: { "native-worker-creation": true, "correlated-results": true } }; },
    async createWorker(request) { return { subagentId: request.contract.identity.subagentId, hostWorkerId: "worker-good", displayName: request.contract.identity.displayName }; },
    async sendBrief() {},
    async waitForResult(worker) { return { hostWorkerId: "worker-wrong", subagentId: worker.subagentId, delegationId: "delegation-wrong", status: "completed", result: "bad correlation" }; }
  };
  const pm = await createPmOrchestrator({ projectRoot, workflowPackageRoot: workflowRoot, host });
  await assert.rejects(() => pm.dispatch({ role: "quality-engineer", taskMode: "verification", deliveryMode: "report-only", goal: "Check correlation", constraints: [], acceptanceSignals: [], returnRequirements: [] }), /mismatched delegation identity/);
  pm.close();
});
