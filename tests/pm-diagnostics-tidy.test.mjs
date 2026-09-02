import assert from "node:assert/strict";
import { mkdtemp, readFile, readdir, writeFile } from "node:fs/promises";
import { test } from "node:test";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createDiagnosticLogger, applyPmTidy, pmRuntimePaths, previewPmTidy } from "../dist/pm/index.js";

test("diagnostic logs stay redacted, correlated, bounded, and tidy can preview and purge them", async () => {
  const projectRoot = await mkdtemp(join(tmpdir(), "aix-pm-diagnostic-tidy-"));
  const diagnosticDirectory = pmRuntimePaths(projectRoot).diagnostics;
  const logPath = join(diagnosticDirectory, "events.jsonl");
  const logger = createDiagnosticLogger(logPath, {
    maxBytes: 220,
    maxRotations: 1,
    knownSecrets: ["fixture-secret"],
    now: () => "2026-09-02T00:00:00.000Z"
  });

  const event = logger.info("dispatch fixture-secret", { sessionId: "session-1", delegationId: "delegation-1" }, { token: "fixture-secret", detail: "x".repeat(1000) });
  assert.equal(event.context.delegationId, "delegation-1");
  assert.equal(event.message.includes("fixture-secret"), false);
  const contents = await readFile(logPath, "utf8");
  assert.equal(contents.includes("fixture-secret"), false);
  assert.equal(Buffer.byteLength(contents, "utf8") <= 220, true);

  await writeFile(join(diagnosticDirectory, "events.jsonl.1"), "rotated\n");
  const report = previewPmTidy({ projectRoot });
  assert.deepEqual(report.diagnostics.sort(), [logPath, join(diagnosticDirectory, "events.jsonl.1")].sort());
  const result = applyPmTidy(report);
  assert.equal(result.purgedDiagnostics.length, 2);
  assert.equal((await import("node:fs")).existsSync(logPath), false);
});

test("diagnostic logger does not emit files when the configured bound is too small", async () => {
  const projectRoot = await mkdtemp(join(tmpdir(), "aix-pm-diagnostic-tiny-"));
  const diagnosticDirectory = pmRuntimePaths(projectRoot).diagnostics;
  const logger = createDiagnosticLogger(join(diagnosticDirectory, "tiny.jsonl"), { maxBytes: 1, maxRotations: 2 });
  logger.info("cannot fit");
  assert.deepEqual(await readdir(diagnosticDirectory), []);
});
