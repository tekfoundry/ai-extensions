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
    skills: [],
    roles: [],
    workflows: []
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
          kind: "skill",
          source: "example",
          sourceType: "git",
          sourceUrl: "https://example.com/skills.git",
          requestedRef: "main",
          resolvedCommit: "abc123",
          sourcePath: "skills/tdd",
          packagePath: ".agents/packages/skills/example/skills/tdd",
          activationPath: ".agents/skills/tdd",
          originalName: "tdd",
          activeName: "tdd",
          packageFiles: [
            {
              path: "SKILL.md",
              sha256: "abc"
            }
          ],
          activeFiles: [
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

  assert.deepEqual(parseLockfile(JSON.parse(await readFile(filePath, "utf8"))).skills[0]?.activeName, "tdd");
});

test("parseLockfile supports standalone and workflow-owned roles", () => {
  const lockfile = parseLockfile({
    lockfileVersion: 1,
    skills: [],
    roles: [
      {
        kind: "role",
        source: "fixture",
        sourceType: "git",
        sourceUrl: "https://example.com/roles.git",
        requestedRef: "main",
        resolvedCommit: "abc123",
        sourcePath: "roles/quality-engineer",
        packagePath: ".agents/packages/roles/fixture/roles/quality-engineer",
        activationPath: ".agents/roles/quality-engineer",
        originalName: "quality-engineer",
        activeName: "quality-engineer",
        requested: true,
        packageFiles: [{ path: "ROLE.md", sha256: "abc" }],
        activeFiles: [{ path: "ROLE.md", sha256: "abc" }]
      },
      {
        kind: "role",
        source: "aix",
        sourceType: "git",
        sourcePath: "roles/project-dev/documentation-specialist",
        packagePath: ".agents/packages/workflows/aix/design-plan-execute/roles/project-dev/documentation-specialist",
        activationPath: ".agents/roles/documentation-specialist",
        originalName: "documentation-specialist",
        activeName: "documentation-specialist",
        requested: false,
        owner: {
          kind: "workflow",
          name: "design-plan-execute"
        },
        packageFiles: [{ path: "ROLE.md", sha256: "def" }],
        activeFiles: [{ path: "ROLE.md", sha256: "def" }]
      }
    ],
    workflows: [
      {
        kind: "workflow",
        source: "aix",
        sourceType: "git",
        sourcePath: "aix/workflows/design-plan-execute",
        packagePath: ".agents/packages/workflows/aix/design-plan-execute",
        name: "design-plan-execute",
        docs: [],
        skills: [],
        roles: [
          {
            sourcePath: "roles/project-dev/documentation-specialist",
            activeName: "documentation-specialist"
          }
        ],
        packageFiles: []
      }
    ]
  });

  assert.equal(lockfile.roles.length, 2);
  assert.equal(lockfile.roles[0].kind, "role");
  assert.equal(lockfile.roles[0].requested, true);
  assert.equal(lockfile.roles[1].owner.name, "design-plan-execute");
  assert.equal(lockfile.workflows[0].roles[0].activeName, "documentation-specialist");
});

test("parseLockfile rejects malformed role entries", () => {
  assert.throws(
    () =>
      parseLockfile({
        lockfileVersion: 1,
        skills: [],
        roles: [
          {
            kind: "skill",
            source: "fixture",
            sourceType: "git",
            sourcePath: "roles/quality-engineer",
            packagePath: ".agents/packages/roles/fixture/roles/quality-engineer",
            activationPath: ".agents/roles/quality-engineer",
            originalName: "quality-engineer",
            activeName: "quality-engineer",
            packageFiles: [],
            activeFiles: []
          }
        ]
      }),
    /roles\[0\]\.kind must be "role"/
  );
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
