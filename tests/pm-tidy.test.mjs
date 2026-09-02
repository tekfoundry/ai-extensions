import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { Readable, Writable } from "node:stream";
import { test } from "node:test";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { run, runInteractive } from "../dist/cli.js";
import {
  applyPmTidy,
  createDelegation,
  delegationPaths,
  previewPmTidy,
  pmRuntimePaths,
  archivePmTidy,
  publishWorkerResult,
  recordPmCleanupWaiver,
  recordPmPromotionSuccess,
  authorizePmCleanupAtCompletion
} from "../dist/pm/index.js";

function delegation(projectRoot, id, state = "created") {
  const record = createDelegation({
    projectRoot,
    workflow: "design-plan-execute",
    workflowVersion: "1",
    pmRoleVersion: "1",
    role: "implementation-engineer",
    displayName: id,
    taskMode: "implementation",
    deliveryMode: "isolated-change",
    goal: "tidy test",
    constraints: [],
    acceptanceSignals: [],
    allowedPaths: ["src/"],
    deniedPaths: [".aix/"],
    requiredAccess: ["workspace-write"],
    stopConditions: [],
    returnRequirements: []
  });
  const recordPath = join(delegationPaths(projectRoot, record.contract.identity.delegationId).root, "record.json");
  return { ...record, recordPath, state };
}

test("tidy uses explicit completed cleanup, stale retention, and conservative holds", async () => {
  const projectRoot = await mkdtemp(join(tmpdir(), "aix-pm-tidy-"));
  recordPmCleanupWaiver(projectRoot, { workflow: "design-plan-execute" }, "focused tidy test waiver");
  const completed = delegation(projectRoot, "completed");
  publishWorkerResult(projectRoot, completed.contract.identity.delegationId, { summary: "done", evidence: [], gaps: [], residualRisk: [], status: "completed" });
  const stale = delegation(projectRoot, "stale");
  const staleRecord = JSON.parse(await readFile(stale.recordPath, "utf8"));
  staleRecord.updatedAt = "2026-01-01T00:00:00.000Z";
  await writeFile(stale.recordPath, JSON.stringify(staleRecord));
  const held = delegation(projectRoot, "held");
  await writeFile(join(delegationPaths(projectRoot, held.contract.identity.delegationId).root, "result.md"), "destructive-risk hold\n");

  const now = new Date("2026-09-02T00:00:00.000Z");
  let report = previewPmTidy({ projectRoot, now });
  assert.equal(report.candidates.find((item) => item.delegationId === completed.contract.identity.delegationId).action, "hold");
  assert.equal(report.candidates.find((item) => item.delegationId === stale.contract.identity.delegationId).action, "purge");
  assert.match(report.candidates.find((item) => item.delegationId === held.contract.identity.delegationId).reason, /destructive-risk/);
  report = previewPmTidy({ projectRoot, now, includeCompleted: true });
  assert.equal(report.candidates.find((item) => item.delegationId === completed.contract.identity.delegationId).action, "purge");
});

test("tidy requires promotion or an explicit waiver before purge", async () => {
  const projectRoot = await mkdtemp(join(tmpdir(), "aix-pm-tidy-gate-"));
  const record = delegation(projectRoot, "ordered");
  const json = JSON.parse(await readFile(record.recordPath, "utf8"));
  json.updatedAt = "2026-01-01T00:00:00.000Z";
  await writeFile(record.recordPath, JSON.stringify(json));
  const now = new Date("2026-09-02T00:00:00.000Z");
  assert.equal(previewPmTidy({ projectRoot, now }).candidates[0].action, "hold");
  recordPmPromotionSuccess(projectRoot, { workflow: "design-plan-execute" }, "promotion completed before cleanup");
  assert.equal(previewPmTidy({ projectRoot, now }).candidates[0].action, "purge");
});

test("tidy accepts an explicit cleanup waiver with a recorded reason", async () => {
  const projectRoot = await mkdtemp(join(tmpdir(), "aix-pm-tidy-waiver-"));
  const record = delegation(projectRoot, "waived");
  const json = JSON.parse(await readFile(record.recordPath, "utf8"));
  json.updatedAt = "2026-01-01T00:00:00.000Z";
  await writeFile(record.recordPath, JSON.stringify(json));
  recordPmCleanupWaiver(projectRoot, { delegationIds: [record.contract.identity.delegationId] }, "Plan promotion is intentionally waived for this local cleanup.");
  const report = previewPmTidy({ projectRoot, now: new Date("2026-09-02T00:00:00.000Z") });
  assert.equal(report.candidates[0].action, "purge");
});

test("completion lifecycle hook records scoped promotion or waiver authorization", async () => {
  const projectRoot = await mkdtemp(join(tmpdir(), "aix-pm-tidy-completion-hook-"));
  const authorization = authorizePmCleanupAtCompletion(projectRoot, { scope: { plan: "phase-8" }, promotionSucceeded: true });
  assert.equal(authorization.kind, "promotion-success");
  assert.throws(() => authorizePmCleanupAtCompletion(projectRoot, { scope: { workflow: "design-plan-execute" } }), /promotion success or an explicit waiver reason/);
});

test("tidy rechecks current state before applying a previously previewed purge", async () => {
  const projectRoot = await mkdtemp(join(tmpdir(), "aix-pm-tidy-forged-"));
  const record = delegation(projectRoot, "forged");
  recordPmCleanupWaiver(projectRoot, { delegationIds: [record.contract.identity.delegationId] }, "forged report regression test");
  const json = JSON.parse(await readFile(record.recordPath, "utf8"));
  json.updatedAt = "2026-01-01T00:00:00.000Z";
  await writeFile(record.recordPath, JSON.stringify(json));
  const report = previewPmTidy({ projectRoot, now: new Date("2026-09-02T00:00:00.000Z") });
  await writeFile(record.recordPath, JSON.stringify({ ...json, state: "working", updatedAt: "2026-01-01T00:00:00.000Z" }));
  const result = applyPmTidy({ ...report, candidates: report.candidates.map((item) => ({ ...item, action: "purge" })) });
  assert.deepEqual(result.purged, []);
  assert.equal((await readFile(record.recordPath)).length > 0, true);
});

test("archive is explicit and leaves live eligible data reversible", async () => {
  const projectRoot = await mkdtemp(join(tmpdir(), "aix-pm-tidy-archive-"));
  const record = delegation(projectRoot, "archive");
  recordPmCleanupWaiver(projectRoot, { delegationIds: [record.contract.identity.delegationId] }, "archive test waiver");
  const json = JSON.parse(await readFile(record.recordPath, "utf8"));
  await writeFile(record.recordPath, JSON.stringify({ ...json, updatedAt: "2026-01-01T00:00:00.000Z" }));
  const report = previewPmTidy({ projectRoot, now: new Date("2026-09-02T00:00:00.000Z") });
  const result = archivePmTidy(report);
  assert.deepEqual(result.archived, [record.contract.identity.delegationId]);
  assert.equal((await readFile(record.recordPath)).length > 0, true);
});

test("tidy purge removes the delegation dataset and its index entry", async () => {
  const projectRoot = await mkdtemp(join(tmpdir(), "aix-pm-tidy-purge-"));
  recordPmCleanupWaiver(projectRoot, { workflow: "design-plan-execute" }, "focused purge test waiver");
  const record = delegation(projectRoot, "purge");
  const recordJson = JSON.parse(await readFile(record.recordPath, "utf8"));
  recordJson.updatedAt = "2026-01-01T00:00:00.000Z";
  await writeFile(record.recordPath, JSON.stringify(recordJson));
  const report = previewPmTidy({ projectRoot, now: new Date("2026-09-02T00:00:00.000Z") });
  const result = applyPmTidy(report);
  assert.deepEqual(result.purged, [record.contract.identity.delegationId]);
  await assert.rejects(readFile(record.recordPath));
  const index = JSON.parse(await readFile(join(pmRuntimePaths(projectRoot).delegations, "index.json"), "utf8"));
  assert.equal(index.delegations.includes(record.contract.identity.delegationId), false);
});

test("pm tidy previews by default and refuses mutation without an explicit flag", async () => {
  const projectRoot = await mkdtemp(join(tmpdir(), "aix-pm-tidy-cli-"));
  const oldRoot = process.cwd();
  process.chdir(projectRoot);
  try {
    const record = delegation(projectRoot, "cli");
    recordPmCleanupWaiver(projectRoot, { workflow: "design-plan-execute" }, "focused CLI test waiver");
    const json = JSON.parse(await readFile(record.recordPath, "utf8"));
    json.updatedAt = "2026-01-01T00:00:00.000Z";
    await writeFile(record.recordPath, JSON.stringify(json));
    const preview = run(["pm", "tidy", "--older-than", "30"]);
    assert.equal(preview.exitCode, 0);
    assert.match(preview.stdout, /Preview only/);
    const explicit = run(["pm", "tidy", "--purge", "--older-than", "30"]);
    assert.equal(explicit.exitCode, 0);
    assert.match(explicit.stdout, /Purged 1/);
  } finally {
    process.chdir(oldRoot);
  }
});

test("interactive explicit purge requires confirmation", async () => {
  const projectRoot = await mkdtemp(join(tmpdir(), "aix-pm-tidy-confirm-"));
  const oldRoot = process.cwd();
  process.chdir(projectRoot);
  try {
    const record = delegation(projectRoot, "confirm");
    const json = JSON.parse(await readFile(record.recordPath, "utf8"));
    json.updatedAt = "2026-01-01T00:00:00.000Z";
    await writeFile(record.recordPath, JSON.stringify(json));
    const input = Readable.from(["n\n"]);
    input.isTTY = true;
    const output = new Writable({ write(_chunk, _encoding, callback) { callback(); } });
    output.isTTY = true;
    const result = await runInteractive(["pm", "tidy", "--purge"], input, output);
    assert.equal(result.exitCode, 0);
    assert.match(result.stdout, /No changes made/);
    assert.equal((await readFile(record.recordPath)).length > 0, true);
  } finally {
    process.chdir(oldRoot);
  }
});
