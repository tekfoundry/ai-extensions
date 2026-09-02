import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import { readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { test } from "node:test";
import {
  FakeNativeHost,
  assertPmArtifactWriteForbidden,
  createDelegation,
  createDelegationReport,
  createPmOrchestrator,
  readPmSession,
  readDelegation
} from "../dist/pm/index.js";

const workflowRoot = resolve("aix/workflows/design-plan-execute");

test("PM starts with a lease, reconciles, dispatches, and reuses compatible workers", async () => {
  const projectRoot = await mkdtemp(join(tmpdir(), "aix-pm-orchestrator-"));
  const host = new FakeNativeHost();
  const pm = await createPmOrchestrator({ projectRoot, workflowPackageRoot: workflowRoot, host });

  assert.equal(pm.status().workflow, "design-plan-execute");
  assert.equal(pm.status().delegations.length, 0);
  assert.equal(readPmSession(projectRoot).lease?.sessionId, pm.session.record.sessionId);
  await assert.rejects(() => pm.dispatch({
    role: "implementation-engineer", taskMode: "implementation", deliveryMode: "isolated-change",
    goal: "Widen scope.", constraints: [], acceptanceSignals: [], returnRequirements: [], allowedPaths: [".git/config"]
  }), /exceeds the declared domain/);

  const first = await pm.dispatch({
    role: "quality-engineer", taskMode: "verification", deliveryMode: "report-only",
    reuseKey: "quality", goal: "Check the focused tests.", constraints: ["Do not edit source."],
    acceptanceSignals: ["Return commands and results."], returnRequirements: ["Summary", "Evidence"]
  });
  const second = await pm.dispatch({
    role: "quality-engineer", taskMode: "verification", deliveryMode: "report-only", reuseKey: "quality",
    goal: "Check the next focused tests.", constraints: ["Do not edit source."],
    acceptanceSignals: ["Return commands and results."], returnRequirements: ["Summary", "Evidence"]
  });

  assert.equal(first.record.state, "completed");
  assert.deepEqual(first.record.capabilitySnapshot, {
    provider: "fake", harness: "fake-native", model: "fake-model", runtime: "test",
    discoveredAt: first.record.capabilitySnapshot.discoveredAt,
    capabilities: {
      "correlated-results": true, "native-worker-creation": true, "worker-follow-up": true,
      "worker-stop": true, "worker-streaming": true, "workspace-binding": true, "workspace-write": true
    }
  });
  assert.deepEqual(JSON.parse(readFileSync(`${projectRoot}/.aix/pm/delegations/${first.record.contract.identity.delegationId}/record.json`, "utf8")).capabilitySnapshot, first.record.capabilitySnapshot);
  assert.deepEqual(first.report, {
    role: "quality-engineer",
    delegationId: first.record.contract.identity.delegationId,
    subagentId: first.record.contract.identity.subagentId,
    hostWorkerId: first.worker.hostWorkerId,
    displayName: "Quality Engineer",
    status: "completed",
    summary: "Fake worker completed with correlated evidence."
  });
  assert.equal(second.reused, true);
  assert.equal(host.workers.length, 1);
  assert.equal(host.followUps.length, 1);
  assert.equal(pm.status().delegations.length, 2);
  pm.close();
  assert.equal(readPmSession(projectRoot).lease?.expiresAt, "1970-01-01T00:00:00.000Z");
});

test("delegation report preserves host-provided display names when available", () => {
  const record = {
    contract: {
      identity: { delegationId: "delegation-report", subagentId: "subagent-report", displayName: "Security Engineer" },
      authority: { role: "security-engineer" }
    }
  };
  const report = createDelegationReport(record, {
    hostWorkerId: "host-worker-report",
    subagentId: "subagent-report",
    displayName: "Security Engineer",
    hostDisplayName: "Carson"
  }, {
    hostWorkerId: "host-worker-report",
    subagentId: "subagent-report",
    delegationId: "delegation-report",
    status: "blocked",
    result: "Needs clarification."
  });
  assert.equal(report.hostDisplayName, "Carson");
  assert.equal(report.status, "blocked");
});

test("PM startup reconciles incomplete records and refuses parent artifact writes", async () => {
  const projectRoot = await mkdtemp(join(tmpdir(), "aix-pm-recovery-"));
  const record = createDelegation({
    projectRoot, workflow: "design-plan-execute", workflowVersion: "1", pmRoleVersion: "1",
    role: "quality-engineer", taskMode: "verification", deliveryMode: "report-only",
    goal: "Inspect tests.", constraints: [], acceptanceSignals: [], allowedPaths: [], deniedPaths: ["src/"],
    requiredAccess: ["read"], stopConditions: ["scope unclear"], returnRequirements: ["summary"]
  });
  const pm = await createPmOrchestrator({ projectRoot, workflowPackageRoot: workflowRoot, host: new FakeNativeHost() });
  const recovered = pm.status().delegations.find((item) => item.delegationId === record.contract.identity.delegationId);
  assert.equal(recovered?.state, "unknown");
  assert.throws(() => assertPmArtifactWriteForbidden("src/index.ts"), /cannot directly modify project artifacts/);
  await pm.recover(record.contract.identity.delegationId, "retry");
  assert.equal(pm.status().delegations.find((item) => item.delegationId === record.contract.identity.delegationId)?.state, "superseded");
  pm.close();
});

test("delegation capability snapshot remains available after recovery", async () => {
  const projectRoot = await mkdtemp(join(tmpdir(), "aix-pm-snapshot-recovery-"));
  const pm = await createPmOrchestrator({ projectRoot, workflowPackageRoot: workflowRoot, host: new FakeNativeHost() });
  const dispatched = await pm.dispatch({
    role: "quality-engineer", taskMode: "verification", deliveryMode: "report-only",
    goal: "Audit the delegation.", constraints: [], acceptanceSignals: [], returnRequirements: []
  });
  const snapshot = dispatched.record.capabilitySnapshot;
  const recovered = await pm.recover(dispatched.record.contract.identity.delegationId, "stop");
  assert.deepEqual(recovered.capabilitySnapshot, snapshot);
  assert.deepEqual(readDelegation(projectRoot, dispatched.record.contract.identity.delegationId).capabilitySnapshot, snapshot);
  assert.deepEqual(pm.status().delegations[0].capabilitySnapshot, snapshot);
  pm.close();
});

test("tampered capability snapshots are rejected by recovery and audit access", async () => {
  const projectRoot = await mkdtemp(join(tmpdir(), "aix-pm-snapshot-tamper-"));
  const pm = await createPmOrchestrator({ projectRoot, workflowPackageRoot: workflowRoot, host: new FakeNativeHost() });
  const dispatched = await pm.dispatch({
    role: "quality-engineer", taskMode: "verification", deliveryMode: "report-only",
    goal: "Audit the delegation.", constraints: [], acceptanceSignals: [], returnRequirements: []
  });
  const recordPath = `${projectRoot}/.aix/pm/delegations/${dispatched.record.contract.identity.delegationId}/record.json`;
  const persisted = JSON.parse(readFileSync(recordPath, "utf8"));
  persisted.capabilitySnapshot.capabilities["api-token"] = true;
  writeFileSync(recordPath, `${JSON.stringify(persisted)}\n`);
  assert.throws(() => pm.status(), /raw secret fields/);
  await assert.rejects(() => pm.recover(dispatched.record.contract.identity.delegationId, "verify"), /raw secret fields/);
  pm.close();
});
