import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { test } from "node:test";
import {
  FakeNativeHost,
  assertPmArtifactWriteForbidden,
  createDelegation,
  createPmOrchestrator,
  readPmSession
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
  assert.equal(second.reused, true);
  assert.equal(host.workers.length, 1);
  assert.equal(host.followUps.length, 1);
  assert.equal(pm.status().delegations.length, 2);
  pm.close();
  assert.equal(readPmSession(projectRoot).lease?.expiresAt, "1970-01-01T00:00:00.000Z");
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
