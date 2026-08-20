import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { loadLockfile, LockfileError, parseLockfile, writeLockfile } from "../dist/lockfile.js";

test("loadLockfile returns an empty v1 lockfile when the file is missing", async () => {
  const directory = await mkdtemp(join(tmpdir(), "aix-lockfile-"));

  assert.deepEqual(await loadLockfile(join(directory, "aix.lock.json")), {
    lockfileVersion: 1,
    skills: []
  });
});

test("writeLockfile writes parseable JSON atomically", async () => {
  const directory = await mkdtemp(join(tmpdir(), "aix-lockfile-"));
  const filePath = join(directory, "aix.lock.json");

  await writeLockfile(
    {
      lockfileVersion: 1,
      skills: [
        {
          source: "example",
          sourceType: "git",
          sourceUrl: "https://example.com/skills.git",
          requestedRef: "main",
          resolvedCommit: "abc123",
          sourcePath: "skills/tdd",
          installPath: ".agents/skills/tdd",
          originalName: "tdd",
          installedName: "tdd",
          files: [
            {
              path: "SKILL.md",
              sha256: "abc"
            }
          ]
        }
      ]
    },
    filePath
  );

  assert.deepEqual(parseLockfile(JSON.parse(await readFile(filePath, "utf8"))).skills[0]?.installedName, "tdd");
});

test("loadLockfile reports malformed JSON", async () => {
  const directory = await mkdtemp(join(tmpdir(), "aix-lockfile-"));
  const filePath = join(directory, "aix.lock.json");

  await writeFile(filePath, "{ nope", "utf8");

  await assert.rejects(
    () => loadLockfile(filePath),
    (error) => error instanceof LockfileError && error.message.includes("Malformed JSON")
  );
});
