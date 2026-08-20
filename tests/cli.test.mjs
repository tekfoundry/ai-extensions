import assert from "node:assert/strict";
import { test } from "node:test";
import { run } from "../dist/cli.js";

test("run renders a splash screen with a zero exit code", () => {
  const result = run([]);

  assert.equal(result.exitCode, 0);
  assert.match(result.stdout, /AI Extensions/);
  assert.match(result.stdout, /aix v0\.0\.0/);
  assert.match(result.stdout, /init\s+Initialize AI Extensions/);
});

test("run renders help with a zero exit code", () => {
  const result = run(["--help"]);

  assert.equal(result.exitCode, 0);
  assert.match(result.stdout, /AI Extensions/);
  assert.match(result.stdout, /Commands:/);
});

test("run returns a usage failure for unknown commands", () => {
  const result = run(["wat"]);

  assert.equal(result.exitCode, 1);
  assert.match(result.stderr, /Unknown command: wat/);
});

test("run returns a non-zero failure for commands that are not implemented yet", () => {
  const result = run(["install"]);

  assert.equal(result.exitCode, 2);
  assert.equal(result.stderr, "Command not implemented yet: install");
});
