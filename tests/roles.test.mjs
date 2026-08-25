import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import {
  activateRoleFromDefinitions,
  assertNoActiveRoleNameCollision,
  assertRoleContract,
  deactivateRole,
  discoverRoles,
  parseRoleFile,
  parseRoleFileFromPath,
  roleContractIssues,
  verifyRoles
} from "../dist/roles.js";
import { activeRolePath, bundledAixRolePackPath, packageRolePath, workflowRoleSourcePath } from "../dist/paths/agents.js";
import { collectWorkspaceStatus } from "../dist/status/index.js";

function git(args, cwd) {
  return execFileSync("git", args, {
    cwd,
    encoding: "utf8",
    env: {
      ...process.env,
      GIT_AUTHOR_NAME: "AIX Tests",
      GIT_AUTHOR_EMAIL: "aix@example.test",
      GIT_COMMITTER_NAME: "AIX Tests",
      GIT_COMMITTER_EMAIL: "aix@example.test"
    }
  }).trim();
}

function validRoleMarkdown(overrides = "") {
  return `---
name: quality-engineer
description: Designs targeted verification and regression coverage for planned work.
tools: Read, Glob, Grep, Bash
model: inherit
maxTurns: 4
skills:
  - work-verify
color: green
${overrides}---

# Purpose

Design targeted verification.

# When To Use

Use for test and acceptance planning.

# Context To Inspect

Read plans, design docs, changed files, and tests.

# Skills To Consider

Consider work-verify.

# Stop Conditions

Stop on unclear scope or unsafe verification.

# Expected Output

Return commands, evidence, gaps, and risk.
`;
}

async function createRoleGitSource() {
  const directory = await mkdtemp(join(tmpdir(), "aix-role-source-"));

  mkdirSync(join(directory, "roles/aix-dev"), { recursive: true });
  writeFileSync(join(directory, "roles/aix-dev/quality-engineer.md"), validRoleMarkdown(), "utf8");
  git(["init", "-b", "main"], directory);
  git(["add", "."], directory);
  git(["commit", "-m", "roles"], directory);

  return {
    directory,
    commit: git(["rev-parse", "HEAD"], directory)
  };
}

async function withProject(callback) {
  const projectRoot = await mkdtemp(join(tmpdir(), "aix-role-project-"));
  const previousCwd = process.cwd();

  process.chdir(projectRoot);

  try {
    await callback(projectRoot);
  } finally {
    process.chdir(previousCwd);
  }
}

test("role path helpers return canonical package and active paths", () => {
  assert.equal(packageRolePath("fixture", "roles/quality-engineer.md"), ".agents/packages/roles/fixture/roles/quality-engineer.md");
  assert.equal(activeRolePath("quality-engineer"), ".agents/roles/quality-engineer.md");
  assert.equal(workflowRoleSourcePath("project-dev", "quality-engineer.md"), "roles/project-dev/quality-engineer.md");
  assert.equal(bundledAixRolePackPath("aix-dev"), "aix/roles/aix-dev");
});

test("parseRoleFile preserves front matter hints and body", () => {
  const role = parseRoleFile(validRoleMarkdown("routing: explicit\n"), "quality-engineer.md");

  assert.equal(role.name, "quality-engineer");
  assert.equal(role.description, "Designs targeted verification and regression coverage for planned work.");
  assert.equal(role.hints.tools, "Read, Glob, Grep, Bash");
  assert.equal(role.hints.model, "inherit");
  assert.equal(role.hints.maxTurns, 4);
  assert.deepEqual(role.hints.skills, ["work-verify"]);
  assert.equal(role.hints.color, "green");
  assert.equal(role.frontMatter.routing, "explicit");
  assert.match(role.body, /# Purpose/);
});

test("parseRoleFile rejects missing front matter", () => {
  assert.throws(
    () => parseRoleFile("# Purpose\n\nNo front matter.", "missing.md"),
    /must start with YAML front matter/
  );
});

test("parseRoleFile validates required name and description", () => {
  assert.throws(
    () => parseRoleFile("---\nname: quality-engineer\n---\n\n# Purpose\n", "missing-description.md"),
    /must declare a non-empty description/
  );
});

test("parseRoleFile validates lowercase hyphenated names and rejects colons", () => {
  assert.throws(
    () => parseRoleFile(validRoleMarkdown().replace("quality-engineer", "QualityEngineer"), "bad-name.md"),
    /must use lowercase letters, numbers, and hyphens/
  );

  assert.throws(
    () => parseRoleFile(validRoleMarkdown().replace("quality-engineer", "team:quality-engineer"), "scoped-name.md"),
    /must not contain ":"/
  );
});

test("parseRoleFile treats skills metadata as safe hints, not dependency lookups", () => {
  const role = parseRoleFile(validRoleMarkdown().replace("work-verify", "missing-but-well-formed"), "quality-engineer.md");

  assert.deepEqual(role.hints.skills, ["missing-but-well-formed"]);
});

test("parseRoleFile rejects invalid skill reference shape", () => {
  assert.throws(
    () => parseRoleFile(validRoleMarkdown().replace("work-verify", "bad:skill"), "quality-engineer.md"),
    /role skill reference: bad:skill must not contain ":"/
  );
});

test("roleContractIssues catches missing sections without matching prose", () => {
  const role = parseRoleFile(`---
name: quality-engineer
description: Designs targeted verification.
---

# Purpose

Design verification.
`, "quality-engineer.md");

  assert.deepEqual(roleContractIssues(role), [
    "Role quality-engineer is missing required section: when to use.",
    "Role quality-engineer is missing required section: context to inspect.",
    "Role quality-engineer is missing required section: skills to consider.",
    "Role quality-engineer is missing required section: stop conditions.",
    "Role quality-engineer is missing required section: expected output."
  ]);
  assert.throws(() => assertRoleContract(role), /missing required section: when to use/);
});

test("discoverRoles scans Markdown role files and requires filename/name agreement", async () => {
  const directory = await mkdtemp(join(tmpdir(), "aix-roles-"));

  mkdirSync(join(directory, "project-dev"), { recursive: true });
  writeFileSync(join(directory, "project-dev/quality-engineer.md"), validRoleMarkdown(), "utf8");
  writeFileSync(join(directory, "notes.txt"), "ignored\n", "utf8");

  assert.deepEqual(discoverRoles(directory), [
    {
      path: "project-dev/quality-engineer.md",
      name: "quality-engineer",
      description: "Designs targeted verification and regression coverage for planned work."
    }
  ]);

  writeFileSync(join(directory, "project-dev/wrong.md"), validRoleMarkdown(), "utf8");

  assert.throws(
    () => parseRoleFileFromPath(join(directory, "project-dev/wrong.md")),
    /name quality-engineer must match filename wrong/
  );
});

test("assertNoActiveRoleNameCollision permits same role and rejects different source", () => {
  const lockfile = {
    roles: [
      {
        kind: "role",
        source: "fixture",
        sourceType: "git",
        sourcePath: "roles/quality-engineer.md",
        packagePath: ".agents/packages/roles/fixture/roles/quality-engineer.md",
        activationPath: ".agents/roles/quality-engineer.md",
        originalName: "quality-engineer",
        activeName: "quality-engineer",
        requested: true,
        packageFiles: [],
        activeFiles: []
      }
    ]
  };

  assert.doesNotThrow(() => assertNoActiveRoleNameCollision(lockfile, "quality-engineer", "fixture", "roles/quality-engineer.md"));
  assert.throws(
    () => assertNoActiveRoleNameCollision(lockfile, "quality-engineer", "other", "roles/quality-engineer.md"),
    /Active role name collision: quality-engineer/
  );
});

test("discoverRoles reports the bundled AIX development role pack", () => {
  const roles = discoverRoles("aix/roles");

  assert.deepEqual(
    roles.map((role) => role.name),
    [
      "aix-agent-instructions-auditor",
      "aix-package-safety-reviewer",
      "aix-release-readiness-specialist",
      "aix-skill-author",
      "aix-workflow-architect"
    ]
  );

  for (const role of roles) {
    assertRoleContract(parseRoleFileFromPath(join("aix/roles", role.path)));
  }
});

test("activateRoleFromDefinitions materializes active role files and lockfile hashes", async () => {
  const gitSource = await createRoleGitSource();
  const cacheRoot = await mkdtemp(join(tmpdir(), "aix-role-cache-"));

  await withProject(async (projectRoot) => {
    const result = activateRoleFromDefinitions(
      "fixture/aix-dev/quality-engineer",
      undefined,
      {
        fixture: {
          type: "git",
          url: gitSource.directory,
          path: "roles",
          ref: "main"
        }
      },
      cacheRoot
    );
    const lockfile = JSON.parse(readFileSync(join(projectRoot, "aix.lock.json"), "utf8"));

    assert.equal(result.activeName, "quality-engineer");
    assert.equal(result.originalName, "quality-engineer");
    assert.equal(lockfile.roles.length, 1);
    assert.equal(lockfile.roles[0].kind, "role");
    assert.equal(lockfile.roles[0].source, "fixture");
    assert.equal(lockfile.roles[0].sourceUrl, gitSource.directory);
    assert.equal(lockfile.roles[0].resolvedCommit, gitSource.commit);
    assert.equal(lockfile.roles[0].sourcePath, "aix-dev/quality-engineer.md");
    assert.equal(lockfile.roles[0].packagePath, ".agents/packages/roles/fixture/aix-dev/quality-engineer.md");
    assert.equal(lockfile.roles[0].activationPath, ".agents/roles/quality-engineer.md");
    assert.equal(lockfile.roles[0].originalName, "quality-engineer");
    assert.equal(lockfile.roles[0].activeName, "quality-engineer");
    assert.equal(lockfile.roles[0].requested, true);
    assert.ok(lockfile.roles[0].packageFiles.some((file) => file.path === "quality-engineer.md"));
    assert.ok(lockfile.roles[0].activeFiles.some((file) => file.path === "quality-engineer.md"));
    assert.equal(existsSync(join(projectRoot, ".agents/packages/roles/fixture/aix-dev/quality-engineer.md")), true);
    assert.equal(existsSync(join(projectRoot, ".agents/roles/quality-engineer.md")), true);
  });
});

test("activateRoleFromDefinitions supports aliases without changing package role name", async () => {
  const gitSource = await createRoleGitSource();
  const cacheRoot = await mkdtemp(join(tmpdir(), "aix-role-cache-"));

  await withProject(async (projectRoot) => {
    activateRoleFromDefinitions(
      "fixture/aix-dev/quality-engineer.md",
      "test-quality-engineer",
      {
        fixture: {
          type: "git",
          url: gitSource.directory,
          path: "roles",
          ref: "main"
        }
      },
      cacheRoot
    );

    const packageRole = readFileSync(join(projectRoot, ".agents/packages/roles/fixture/aix-dev/quality-engineer.md"), "utf8");
    const activeRole = readFileSync(join(projectRoot, ".agents/roles/test-quality-engineer.md"), "utf8");
    const lockfile = JSON.parse(readFileSync(join(projectRoot, "aix.lock.json"), "utf8"));

    assert.match(packageRole, /^name: quality-engineer$/m);
    assert.match(activeRole, /^name: test-quality-engineer$/m);
    assert.equal(lockfile.roles[0].alias, "test-quality-engineer");
  });
});

test("activateRoleFromDefinitions refuses active-name collisions before package writes", async () => {
  const gitSource = await createRoleGitSource();
  const cacheRoot = await mkdtemp(join(tmpdir(), "aix-role-cache-"));

  await withProject(async (projectRoot) => {
    mkdirSync(join(projectRoot, ".agents/roles"), { recursive: true });
    writeFileSync(join(projectRoot, ".agents/roles/quality-engineer.md"), "local role\n", "utf8");

    assert.throws(
      () =>
        activateRoleFromDefinitions(
          "fixture/aix-dev/quality-engineer",
          undefined,
          {
            fixture: {
              type: "git",
              url: gitSource.directory,
              path: "roles",
              ref: "main"
            }
          },
          cacheRoot
        ),
      /Active role name collision: \.agents\/roles\/quality-engineer\.md/
    );

    assert.equal(existsSync(join(projectRoot, ".agents/packages/roles/fixture/aix-dev/quality-engineer.md")), false);
  });
});

test("deactivateRole removes user-owned role files and refuses workflow-owned roles", async () => {
  const gitSource = await createRoleGitSource();
  const cacheRoot = await mkdtemp(join(tmpdir(), "aix-role-cache-"));

  await withProject(async (projectRoot) => {
    activateRoleFromDefinitions(
      "fixture/aix-dev/quality-engineer",
      undefined,
      {
        fixture: {
          type: "git",
          url: gitSource.directory,
          path: "roles",
          ref: "main"
        }
      },
      cacheRoot
    );

    const result = deactivateRole("quality-engineer");
    const lockfile = JSON.parse(readFileSync(join(projectRoot, "aix.lock.json"), "utf8"));

    assert.equal(result.activeName, "quality-engineer");
    assert.deepEqual(lockfile.roles, []);
    assert.equal(existsSync(join(projectRoot, ".agents/roles/quality-engineer.md")), false);
    assert.equal(existsSync(join(projectRoot, ".agents/packages/roles/fixture/aix-dev/quality-engineer.md")), false);

    writeFileSync(
      join(projectRoot, "aix.lock.json"),
      JSON.stringify(
        {
          lockfileVersion: 1,
          skills: [],
          roles: [
            {
              kind: "role",
              source: "aix",
              sourceType: "git",
              sourcePath: "roles/project-dev/documentation-specialist.md",
              packagePath: ".agents/packages/workflows/aix/design-plan-execute/roles/project-dev/documentation-specialist.md",
              activationPath: ".agents/roles/documentation-specialist.md",
              originalName: "documentation-specialist",
              activeName: "documentation-specialist",
              requested: false,
              owner: {
                kind: "workflow",
                name: "design-plan-execute"
              },
              packageFiles: [],
              activeFiles: []
            }
          ],
          workflows: []
        },
        null,
        2
      ) + "\n",
      "utf8"
    );

    assert.throws(
      () => deactivateRole("documentation-specialist"),
      /Cannot deactivate documentation-specialist directly because it is owned by workflow design-plan-execute/
    );
  });
});

test("verifyRoles and status report active role state and drift", async () => {
  const gitSource = await createRoleGitSource();
  const cacheRoot = await mkdtemp(join(tmpdir(), "aix-role-cache-"));

  await withProject(async (projectRoot) => {
    activateRoleFromDefinitions(
      "fixture/aix-dev/quality-engineer",
      undefined,
      {
        fixture: {
          type: "git",
          url: gitSource.directory,
          path: "roles",
          ref: "main"
        }
      },
      cacheRoot
    );

    const status = collectWorkspaceStatus();

    assert.equal(verifyRoles().issues.length, 0);
    assert.equal(status.activeRoles.length, 1);
    assert.equal(status.activeRoles[0].activeName, "quality-engineer");

    writeFileSync(join(projectRoot, ".agents/roles/quality-engineer.md"), "edited\n", "utf8");

    assert.match(verifyRoles().issues.join("\n"), /Refusing to remove modified active role/);
  });
});
