import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { createHash } from "node:crypto";
import { assertFileHashesMatchLockfile, compareFileHashesToLockfile } from "../dist/lockfile.js";

function sha256(contents) {
  return createHash("sha256").update(contents).digest("hex");
}

async function withFixtureFiles(files) {
  const root = await mkdtemp(join(tmpdir(), "aix-lockfile-drift-"));

  for (const [path, contents] of Object.entries(files)) {
    const filePath = join(root, path);
    mkdirSync(filePath.slice(0, filePath.lastIndexOf("/")), { recursive: true });
    writeFileSync(filePath, contents, "utf8");
  }

  return root;
}

test("compareFileHashesToLockfile matches unchanged files", async () => {
  const root = await withFixtureFiles({
    "SKILL.md": "skill\n",
    "nested/notes.md": "notes\n"
  });

  assert.deepEqual(compareFileHashesToLockfile(root, [
    { path: "SKILL.md", sha256: sha256("skill\n") },
    { path: "nested/notes.md", sha256: sha256("notes\n") }
  ]), {
    matches: true,
    missingRoot: false,
    missingFiles: [],
    changedFiles: [],
    unexpectedFiles: [],
    actualFiles: [
      { path: "nested/notes.md", sha256: sha256("notes\n") },
      { path: "SKILL.md", sha256: sha256("skill\n") }
    ]
  });
});

test("compareFileHashesToLockfile reports missing, changed, and unexpected files", async () => {
  const root = await withFixtureFiles({
    "SKILL.md": "edited\n",
    "extra.md": "extra\n"
  });

  assert.deepEqual(compareFileHashesToLockfile(root, [
    { path: "SKILL.md", sha256: sha256("original\n") },
    { path: "nested/notes.md", sha256: sha256("notes\n") }
  ]), {
    matches: false,
    missingRoot: false,
    missingFiles: ["nested/notes.md"],
    changedFiles: ["SKILL.md"],
    unexpectedFiles: ["extra.md"],
    actualFiles: [
      { path: "extra.md", sha256: sha256("extra\n") },
      { path: "SKILL.md", sha256: sha256("edited\n") }
    ]
  });
});

test("compareFileHashesToLockfile reports a missing root as drift", async () => {
  const root = await mkdtemp(join(tmpdir(), "aix-lockfile-drift-"));
  const missingRoot = join(root, "missing");

  assert.deepEqual(compareFileHashesToLockfile(missingRoot, [
    { path: "SKILL.md", sha256: sha256("skill\n") }
  ]), {
    matches: false,
    missingRoot: true,
    missingFiles: ["SKILL.md"],
    changedFiles: [],
    unexpectedFiles: [],
    actualFiles: []
  });
});

test("assertFileHashesMatchLockfile throws the caller's safety message on drift", async () => {
  const root = await withFixtureFiles({ "SKILL.md": "edited\n" });

  assert.throws(
    () => assertFileHashesMatchLockfile(root, [{ path: "SKILL.md", sha256: sha256("original\n") }], "Refusing drift"),
    /Refusing drift/
  );
});
