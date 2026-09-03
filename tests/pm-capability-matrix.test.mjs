import assert from "node:assert/strict";
import { test } from "node:test";
import {
  createHarnessCapabilityMatrix,
  renderHarnessCapabilityMatrix
} from "../dist/pm/index.js";

test("capability matrix reports discovered metadata and explicit missing or unknown support", () => {
  const matrix = createHarnessCapabilityMatrix({
    vendor: "fixture-vendor",
    provider: "fixture-provider",
    harness: "fixture-harness",
    model: "fixture-model",
    runtime: "fixture-runtime",
    protocol: "pm-v1",
    capabilities: { "native-worker-creation": true, "workspace-write": false, "worker-stop": "unknown" }
  }, ["native-worker-creation", "correlated-results"]);

  assert.deepEqual(matrix.discovered, {
    harness: "fixture-harness",
    vendor: "fixture-vendor",
    provider: "fixture-provider",
    model: "fixture-model",
    runtime: "fixture-runtime",
    protocol: "pm-v1"
  });
  assert.deepEqual(matrix.missingCapabilities, ["correlated-results", "workspace-write"]);
  assert.deepEqual(matrix.unsupportedCapabilities, ["worker-stop"]);
  assert.match(renderHarnessCapabilityMatrix(matrix), /Protocol: pm-v1/);
  assert.match(renderHarnessCapabilityMatrix(matrix), /worker-stop: unknown/);
});

test("capability matrix tolerates absent metadata and remains bounded and secret-safe", () => {
  const matrix = createHarnessCapabilityMatrix({ capabilities: { "managed-local-integration": false } }, ["correlated-results"]);
  assert.equal(matrix.discovered.harness, "unknown");
  assert.equal(matrix.discovered.provider, "unknown");
  assert.deepEqual(matrix.missingCapabilities, ["correlated-results", "managed-local-integration"]);
  assert.match(matrix.diagnostics.join("\n"), /metadata was not provided/);
  assert.throws(() => createHarnessCapabilityMatrix({ model: "Bearer abcdefghijklmnop", capabilities: {} }), /raw secret/);
});

