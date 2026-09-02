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
          agentsMd: {
            owner: {
              kind: "skill",
              name: "tdd"
            },
            source: "example",
            sourcePath: "skills/tdd",
            path: "AGENTS.md",
            marker: "aix:skill tdd",
            sourceSha256: "source",
            renderedSha256: "rendered",
            installedSha256: "installed"
          },
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

  const parsed = parseLockfile(JSON.parse(await readFile(filePath, "utf8")));

  assert.equal(parsed.skills[0]?.activeName, "tdd");
  assert.equal(parsed.skills[0]?.agentsMd?.marker, "aix:skill tdd");
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
        agentsMd: {
          owner: {
            kind: "role",
            name: "quality-engineer"
          },
          source: "fixture",
          sourcePath: "roles/quality-engineer",
          path: "AGENTS.md",
          marker: "aix:role quality-engineer",
          sourceSha256: "source",
          renderedSha256: "rendered",
          installedSha256: "installed"
        },
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
        guidance: [{ path: "guidance/shared.md", sha256: "ghi" }],
        packageFiles: []
      }
    ]
  });

  assert.equal(lockfile.roles.length, 2);
  assert.equal(lockfile.roles[0].kind, "role");
  assert.equal(lockfile.roles[0].requested, true);
  assert.equal(lockfile.roles[0].agentsMd.marker, "aix:role quality-engineer");
  assert.equal(lockfile.roles[1].owner.name, "design-plan-execute");
  assert.equal(lockfile.workflows[0].roles[0].activeName, "documentation-specialist");
  assert.equal(lockfile.workflows[0].guidance[0].path, "guidance/shared.md");
});

test("parseLockfile accepts workflow dependencies, team metadata, and required capabilities", () => {
  const lockfile = parseLockfile({
    lockfileVersion: 1,
    skills: [],
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
        dependencies: {
          roles: [{ source: "aix", sourcePath: "roles/project-manager", activeName: "project-manager" }],
          requiredCapabilities: ["native-worker-creation"]
        },
        team: { path: "team.md", version: "1", sha256: "abc123" },
        packageFiles: []
      }
    ]
  });

  assert.deepEqual(lockfile.workflows[0].dependencies, {
    roles: [{ source: "aix", sourcePath: "roles/project-manager", activeName: "project-manager" }],
    requiredCapabilities: ["native-worker-creation"]
  });
  assert.deepEqual(lockfile.workflows[0].team, { path: "team.md", version: "1", sha256: "abc123" });
});

test("parseLockfile repairs generated legacy workflow append metadata", () => {
  const lockfile = parseLockfile({
    lockfileVersion: 1,
    skills: [],
    roles: [],
    workflows: [
      {
        kind: "workflow",
        source: "aix",
        sourceType: "git",
        sourcePath: "aix/workflows/design-plan-execute",
        packagePath: ".agents/packages/workflows/aix/design-plan-execute",
        name: "design-plan-execute",
        docs: [],
        agentsMd: {
          owner: {
            kind: "workflow",
            name: ""
          },
          source: "",
          sourcePath: "",
          path: "AGENTS.md",
          marker: "aix:workflow design-plan-execute",
          sourceSha256: "source",
          renderedSha256: "rendered",
          installedSha256: "installed"
        },
        skills: [],
        packageFiles: []
      }
    ]
  });

  assert.deepEqual(lockfile.workflows[0].agentsMd.owner, {
    kind: "workflow",
    name: "design-plan-execute"
  });
  assert.equal(lockfile.workflows[0].agentsMd.source, "aix");
  assert.equal(lockfile.workflows[0].agentsMd.sourcePath, "aix/workflows/design-plan-execute");
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
