import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import { createDelegation, updateDelegationState } from "../dist/pm/index.js";
import { test } from "node:test";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { run } from "../dist/cli.js";
import {
  createPersistedCapabilitySnapshot,
  inspectHostAuthorization,
  readHostAuthorizationReport,
  renderHostAuthorizationReport,
  pmRuntimePaths,
  readPmSession,
  startPmSession,
  updatePmSession
} from "../dist/pm/index.js";

function snapshot(overrides = {}) {
  return createPersistedCapabilitySnapshot({
    provider: "fixture-provider",
    harness: "fixture-harness",
    model: "fixture-model",
    runtime: "fixture-runtime",
    discoveredAt: "2026-09-02T00:00:00.000Z",
    capabilities: {
      "native-worker-creation": true,
      "correlated-results": true,
      "managed-local-integration": true,
      ...overrides
    }
  });
}

async function writeSession(projectRoot, capabilities) {
  const session = startPmSession({ projectRoot, now: () => "2026-09-02T00:00:00.000Z" });
  updatePmSession(projectRoot, session.record.sessionId, { capabilitySnapshot: capabilities });
  session.close?.();
}

test("pm doctor reports a ready host without changing configuration", async () => {
  const projectRoot = await mkdtemp(join(tmpdir(), "aix-pm-doctor-ready-"));
  await writeSession(projectRoot, snapshot());
  const report = readHostAuthorizationReport(projectRoot);
  assert.equal(report.ok, true);
  assert.match(renderHostAuthorizationReport(report), /Result: ready/);
  assert.equal(report.snapshot.model, "fixture-model");
});

test("pm doctor reports missing managed local integration and remediation", async () => {
  const projectRoot = await mkdtemp(join(tmpdir(), "aix-pm-doctor-missing-"));
  await writeSession(projectRoot, snapshot({ "managed-local-integration": false }));
  const report = readHostAuthorizationReport(projectRoot);
  assert.equal(report.ok, false);
  assert.equal(report.checks.find((check) => check.capability === "managed-local-integration").status, "missing");
  assert.match(renderHostAuthorizationReport(report), /report-only/);
});

test("pm status stays concise and does not print capability snapshots", async () => {
  const projectRoot = await mkdtemp(join(tmpdir(), "aix-pm-status-concise-"));
  const oldRoot = process.cwd();
  process.chdir(projectRoot);
  try {
    const result = run(["pm", "status"]);
    assert.equal(result.exitCode, 0);
    assert.match(result.stdout, /^PM status/);
    assert.equal(result.stdout.includes("Capabilities:"), false);
    assert.equal(result.stdout.includes("fixture-secret"), false);
  } finally {
    process.chdir(oldRoot);
  }
});

test("pm status summarizes scheduler states and verbose group reasons", async () => {
  const projectRoot = await mkdtemp(join(tmpdir(), "aix-pm-status-scheduler-"));
  const record = createDelegation({ projectRoot, workflow: "design-plan-execute", workflowVersion: "1", pmRoleVersion: "1", role: "quality-engineer", taskMode: "verification", deliveryMode: "report-only", goal: "Queue me", constraints: [], acceptanceSignals: [], returnRequirements: [], allowedPaths: [], deniedPaths: ["src/"], requiredAccess: ["read"], stopConditions: ["scope unclear"], scheduling: { groupId: "verification-group", dependencies: [], writeDomains: [], sharedArtifacts: [] } });
  updateDelegationState(projectRoot, record.contract.identity.delegationId, "queued", "Waiting for host capacity.");
  const oldRoot = process.cwd();
  process.chdir(projectRoot);
  try {
    const concise = run(["pm", "status"]);
    assert.match(concise.stdout, /Scheduler: .*queued=1/);
    assert.match(concise.stdout, /\[group verification-group\]/);
    const verbose = run(["pm", "status", "--verbose"]);
    assert.match(verbose.stdout, /Waiting for host capacity/);
    assert.match(verbose.stdout, /Scheduler details:/);
  } finally {
    process.chdir(oldRoot);
  }
});

test("pm doctor CLI returns a failing exit code and never emits unsafe snapshot values", async () => {
  const projectRoot = await mkdtemp(join(tmpdir(), "aix-pm-doctor-cli-"));
  const oldRoot = process.cwd();
  process.chdir(projectRoot);
  try {
    const missing = run(["pm", "doctor"]);
    assert.equal(missing.exitCode, 1);
    assert.match(missing.stdout, /No PM capability snapshot/);

    const unsafe = {
      provider: "fixture-provider",
      harness: "fixture-harness",
      model: "fixture-secret",
      runtime: "fixture-runtime",
      discoveredAt: "2026-09-02T00:00:00.000Z",
      capabilities: { "api-token": true }
    };
    await writeSession(projectRoot, snapshot());
    const sessionPath = pmRuntimePaths(projectRoot).session;
    const currentSession = readPmSession(projectRoot).session;
    await writeFile(sessionPath, JSON.stringify({ ...currentSession, capabilitySnapshot: unsafe }));
    const result = run(["pm", "doctor"]);
    assert.equal(result.exitCode, 1);
    assert.equal(result.stdout.includes("fixture-secret"), false);
    assert.match(result.stdout, /invalid or unsafe/);
  } finally {
    process.chdir(oldRoot);
  }
});

test("host authorization diagnostics classify unknown capabilities without mutation", () => {
  const report = inspectHostAuthorization({ ...snapshot(), capabilities: { "native-worker-creation": true, "correlated-results": "unknown", "managed-local-integration": true } });
  assert.equal(report.ok, false);
  assert.equal(report.checks.find((check) => check.capability === "correlated-results").status, "unknown");
});
