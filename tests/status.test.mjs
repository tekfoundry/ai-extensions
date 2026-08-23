import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { test } from "node:test";
import { run } from "../dist/cli.js";
import { renderStatus } from "../dist/cli/cmds/workspace/status.js";

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

function hashFile(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function fileHashes(root) {
  const files = [];

  function walk(directory) {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);

      if (entry.isDirectory()) {
        walk(path);
      } else if (entry.isFile()) {
        files.push({
          path: relative(root, path),
          sha256: hashFile(path)
        });
      }
    }
  }

  walk(root);

  return files.sort((left, right) => left.path.localeCompare(right.path));
}

function snapshotProject(root) {
  const snapshot = {};

  function walk(directory) {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      const key = relative(root, path);

      if (entry.isDirectory()) {
        snapshot[key] = "dir";
        walk(path);
      } else if (entry.isFile()) {
        snapshot[key] = readFileSync(path, "utf8");
      } else if (entry.isSymbolicLink()) {
        snapshot[key] = `symlink:${statSync(path).size}`;
      }
    }
  }

  walk(root);

  return snapshot;
}

async function createGitSource() {
  const directory = await mkdtemp(join(tmpdir(), "aix-status-source-"));

  mkdirSync(join(directory, "skills/demo"), { recursive: true });
  mkdirSync(join(directory, "skills/helper"), { recursive: true });
  writeFileSync(join(directory, "skills/demo/SKILL.md"), "---\nname: demo\n---\n\n# Demo\n", "utf8");
  writeFileSync(join(directory, "skills/demo/notes.md"), "notes\n", "utf8");
  writeFileSync(join(directory, "skills/helper/SKILL.md"), "---\nname: helper\n---\n\n# Helper\n", "utf8");
  mkdirSync(join(directory, "workflows/basic/skills/workflow-owned"), { recursive: true });
  writeFileSync(join(directory, "workflows/basic/workflow.json"), '{"name":"basic"}\n', "utf8");
  writeFileSync(
    join(directory, "workflows/basic/skills/workflow-owned/SKILL.md"),
    "---\nname: workflow-owned\n---\n\n# Workflow Owned\n",
    "utf8"
  );
  mkdirSync(join(directory, "workflows/basic/templates"), { recursive: true });
  writeFileSync(join(directory, "workflows/basic/templates/plan.md"), "{{ section:status }}\n", "utf8");
  git(["init", "-b", "main"], directory);
  git(["add", "."], directory);
  git(["commit", "-m", "initial"], directory);

  return {
    directory,
    commit: git(["rev-parse", "HEAD"], directory)
  };
}

async function withProject(callback) {
  const source = await createGitSource();
  const projectRoot = await mkdtemp(join(tmpdir(), "aix-status-project-"));
  const cacheRoot = await mkdtemp(join(tmpdir(), "aix-status-cache-"));
  const previousCwd = process.cwd();
  const previousCache = process.env.AIX_CACHE_DIR;

  process.chdir(projectRoot);
  process.env.AIX_CACHE_DIR = cacheRoot;

  try {
    await callback({ projectRoot, source });
  } finally {
    if (previousCache === undefined) {
      delete process.env.AIX_CACHE_DIR;
    } else {
      process.env.AIX_CACHE_DIR = previousCache;
    }

    process.chdir(previousCwd);
  }
}

function writeInstalledState(source) {
  const packageSkill = ".agents/packages/skills/fixture/skills/demo";
  const activeSkill = ".agents/skills/demo";
  const helperPackageSkill = ".agents/packages/skills/fixture/skills/helper";
  const helperActiveSkill = ".agents/skills/helper";
  const packageWorkflow = ".agents/packages/workflows/fixture/basic";
  const workflowTemplatePath = join(packageWorkflow, "templates/plan.md");
  const workflowOwnedPackageSkill = ".agents/packages/workflows/fixture/basic/skills/workflow-owned";
  const workflowOwnedActiveSkill = ".agents/skills/workflow-owned";

  mkdirSync(packageSkill, { recursive: true });
  mkdirSync(activeSkill, { recursive: true });
  mkdirSync(helperPackageSkill, { recursive: true });
  mkdirSync(helperActiveSkill, { recursive: true });
  mkdirSync(packageWorkflow, { recursive: true });
  mkdirSync(join(packageWorkflow, "templates"), { recursive: true });
  mkdirSync(workflowOwnedPackageSkill, { recursive: true });
  mkdirSync(workflowOwnedActiveSkill, { recursive: true });
  writeFileSync(join(packageSkill, "SKILL.md"), "---\nname: demo\n---\n\n# Demo\n", "utf8");
  writeFileSync(join(packageSkill, "notes.md"), "notes\n", "utf8");
  writeFileSync(join(activeSkill, "SKILL.md"), "---\nname: demo\n---\n\n# Demo\n", "utf8");
  writeFileSync(join(activeSkill, "notes.md"), "notes\n", "utf8");
  writeFileSync(join(packageWorkflow, "workflow.json"), '{"name":"basic"}\n', "utf8");
  writeFileSync(workflowTemplatePath, "{{ section:status }}\n", "utf8");
  writeFileSync(join(helperPackageSkill, "SKILL.md"), "---\nname: helper\n---\n\n# Helper\n", "utf8");
  writeFileSync(join(helperActiveSkill, "SKILL.md"), "---\nname: helper\n---\n\n# Helper\n", "utf8");
  writeFileSync(join(workflowOwnedPackageSkill, "SKILL.md"), "---\nname: workflow-owned\n---\n\n# Workflow Owned\n", "utf8");
  writeFileSync(join(workflowOwnedActiveSkill, "SKILL.md"), "---\nname: workflow-owned\n---\n\n# Workflow Owned\n", "utf8");
  writeFileSync(
    "aix.json",
    JSON.stringify(
      {
        sources: {
          skills: {
            fixture: {
              type: "git",
              url: source.directory,
              path: "skills",
              ref: "main"
            }
          },
          workflows: {
            fixture: {
              type: "git",
              url: source.directory,
              path: "workflows/basic",
              ref: "main"
            }
          }
        },
        workflow: "fixture:workflows/basic",
        skills: ["fixture:skills/demo"]
      },
      null,
      2
    ) + "\n",
    "utf8"
  );
  writeFileSync(
    "aix.lock.json",
    JSON.stringify(
      {
        lockfileVersion: 1,
        workflows: [
          {
            kind: "workflow",
            source: "fixture",
            sourceType: "git",
            sourceUrl: source.directory,
            requestedRef: "main",
            resolvedCommit: source.commit,
            sourcePath: "workflows/basic",
            packagePath: packageWorkflow,
            name: "basic",
            title: "Basic workflow",
            docs: [],
            templates: [
              {
                path: "templates/plan.md",
                sha256: hashFile(workflowTemplatePath)
              }
            ],
            skills: [],
            packageFiles: fileHashes(packageWorkflow)
          }
        ],
        skills: [
          {
            kind: "skill",
            source: "fixture",
            sourceType: "git",
            sourceUrl: source.directory,
            requestedRef: "main",
            resolvedCommit: source.commit,
            sourcePath: "skills/demo",
            packagePath: packageSkill,
            activationPath: activeSkill,
            originalName: "demo",
            activeName: "demo",
            requested: true,
            packageFiles: fileHashes(packageSkill),
            activeFiles: fileHashes(activeSkill)
          },
          {
            kind: "skill",
            source: "fixture",
            sourceType: "git",
            sourceUrl: source.directory,
            sourcePath: "skills/helper",
            packagePath: helperPackageSkill,
            activationPath: helperActiveSkill,
            originalName: "helper",
            activeName: "helper",
            requested: false,
            packageFiles: fileHashes(helperPackageSkill),
            activeFiles: fileHashes(helperActiveSkill)
          },
          {
            kind: "skill",
            source: "fixture",
            sourceType: "git",
            sourceUrl: source.directory,
            sourcePath: "skills/workflow-owned",
            packagePath: workflowOwnedPackageSkill,
            activationPath: workflowOwnedActiveSkill,
            originalName: "workflow-owned",
            activeName: "workflow-owned",
            requested: false,
            owner: {
              kind: "workflow",
              name: "basic"
            },
            packageFiles: fileHashes(workflowOwnedPackageSkill),
            activeFiles: fileHashes(workflowOwnedActiveSkill)
          }
        ]
      },
      null,
      2
    ) + "\n",
    "utf8"
  );
}

test("run status reports an uninitialized workspace", async () => {
  const projectRoot = await mkdtemp(join(tmpdir(), "aix-status-empty-"));
  const previousCwd = process.cwd();

  process.chdir(projectRoot);

  try {
    const result = run(["status"]);

    assert.equal(result.exitCode, 0);
    assert.match(result.stdout, /AI Extensions status/);
    assert.match(result.stdout, /Initialized\s+no/);
    assert.match(result.stdout, /Manifest\s+missing/);
    assert.match(result.stdout, /Lockfile\s+missing/);
    assert.match(result.stdout, /Workflow\n  none/);
    assert.match(result.stdout, /Updates\n  unavailable: Missing aix\.json\./);
  } finally {
    process.chdir(previousCwd);
  }
});

test("run status reports workflow, sources, and active skill groups", async () => {
  await withProject(async ({ source }) => {
    writeInstalledState(source);

    const result = run(["status"]);

    assert.equal(result.exitCode, 0);
    assert.match(result.stdout, /Initialized\s+yes/);
    assert.match(result.stdout, /Workflow[\s\S]*Name\s+Source[\s\S]*basic\s+fixture\/workflows\/basic[\s\S]*current/);
    assert.match(result.stdout, /Workflow[\s\S]*Templates[\s\S]*1/);
    assert.match(result.stdout, /Workflow sources/);
    assert.match(result.stdout, /Skill sources/);
    assert.match(result.stdout, /Active skills[\s\S]*demo[\s\S]*fixture\/skills\/demo/);
    assert.match(result.stdout, /Dependency-only skills[\s\S]*helper[\s\S]*fixture\/skills\/helper/);
    assert.match(result.stdout, /Workflow-owned skills[\s\S]*workflow-owned[\s\S]*fixture\/skills\/workflow-owned/);
    assert.match(result.stdout, /Workflow-owned skills[\s\S]*workflow-owned[\s\S]*main[\s\S]*current/);
    assert.match(result.stdout, /Health\n  ok/);
    assert.match(result.stdout, /Updates\n  up to date/);
  });
});

test("run status reports local drift without mutating project files", async () => {
  await withProject(async ({ projectRoot, source }) => {
    writeInstalledState(source);
    writeFileSync(".agents/packages/skills/fixture/skills/demo/notes.md", "edited\n", "utf8");
    const before = snapshotProject(projectRoot);

    const result = run(["status"]);
    const after = snapshotProject(projectRoot);

    assert.equal(result.exitCode, 0);
    assert.match(result.stdout, /Health[\s\S]*Package file hash changed: \.agents\/packages\/skills\/fixture\/skills\/demo\/notes\.md/);
    assert.deepEqual(after, before);
  });
});

test("run status reports unavailable update checks without failing", async () => {
  await withProject(async ({ source }) => {
    writeInstalledState(source);
    const manifest = JSON.parse(readFileSync("aix.json", "utf8"));
    manifest.sources.skills.fixture.url = join(source.directory, "missing-repo");
    writeFileSync("aix.json", JSON.stringify(manifest, null, 2) + "\n", "utf8");

    const result = run(["status"]);

    assert.equal(result.exitCode, 0);
    assert.match(result.stdout, /Updates\n  unavailable:/);
  });
});

test("run status rejects extra arguments", () => {
  const result = run(["status", "extra"]);

  assert.equal(result.exitCode, 1);
  assert.equal(result.stderr, "Usage: aix status");
});

test("renderStatus shows update state inline and summarizes counts", () => {
  const status = {
    manifestPath: "aix.json",
    lockfilePath: "aix.lock.json",
    manifestExists: true,
    lockfileExists: true,
    activeWorkflow: {
      name: "design-plan-execute",
      source: "aix",
      sourcePath: "aix/workflows/design-plan-execute",
      requestedRef: "master",
      resolvedCommit: "588f75d27465abcdef",
      packagePath: ".agents/packages/workflows/aix/design-plan-execute",
      docCount: 3,
      skillCount: 12
    },
    skillSources: [],
    workflowSources: [],
    activeSkills: [
      {
        activeName: "unslop",
        source: "cursor-pstack",
        sourcePath: "unslop",
        requestedRef: "main",
        resolvedCommit: "fd6dd6f72769abc",
        packagePath: ".agents/packages/skills/cursor-pstack/unslop",
        activationPath: ".agents/skills/unslop"
      }
    ],
    dependencySkills: [],
    workflowSkills: [],
    verificationIssues: [],
    update: {
      checked: true,
      workflowUpdates: [{ name: "design-plan-execute" }],
      skillUpdates: [{ activeName: "unslop", source: "cursor-pstack", sourcePath: "unslop" }]
    }
  };

  const output = renderStatus(status);

  assert.match(output, /Workflow[\s\S]*Status[\s\S]*design-plan-execute[\s\S]*update available/);
  assert.match(output, /Active skills[\s\S]*Status[\s\S]*unslop[\s\S]*update available/);
  assert.match(output, /Updates\n  1 workflow and 1 skill need updates/);
  assert.doesNotMatch(output, /workflow design-plan-execute has pending source changes/);
  assert.doesNotMatch(output, /skill cursor-pstack\/unslop as unslop has pending source changes/);
});

test("renderStatus marks update status unknown when update checks are unavailable", () => {
  const status = {
    manifestPath: "aix.json",
    lockfilePath: "aix.lock.json",
    manifestExists: true,
    lockfileExists: true,
    skillSources: [],
    workflowSources: [],
    activeSkills: [
      {
        activeName: "unslop",
        source: "cursor-pstack",
        sourcePath: "unslop",
        packagePath: ".agents/packages/skills/cursor-pstack/unslop",
        activationPath: ".agents/skills/unslop"
      }
    ],
    dependencySkills: [],
    workflowSkills: [],
    verificationIssues: [],
    update: {
      checked: false,
      unavailableReason: "network unavailable",
      workflowUpdates: [],
      skillUpdates: []
    }
  };

  const output = renderStatus(status);

  assert.match(output, /Active skills[\s\S]*Status[\s\S]*unslop[\s\S]*unknown/);
  assert.match(output, /Updates\n  unavailable: network unavailable/);
});

test("renderStatus can color status sections and health values", () => {
  const status = {
    manifestPath: "aix.json",
    lockfilePath: "aix.lock.json",
    manifestExists: true,
    lockfileExists: true,
    skillSources: [],
    workflowSources: [],
    activeSkills: [],
    dependencySkills: [],
    workflowSkills: [],
    verificationIssues: [],
    update: {
      checked: true,
      skillUpdates: [],
      workflowUpdates: []
    }
  };

  const plain = renderStatus(status);
  const colored = renderStatus(status, { color: true });

  assert.doesNotMatch(plain, /\u001b\[/);
  assert.match(colored, /\u001b\[/);
  assert.match(colored, /\u001b\[1;35mWorkflow sources\u001b\[39;22m/);
  assert.match(colored, /\u001b\[32mok\u001b\[39m/);
  assert.match(colored, /\u001b\[32mup to date\u001b\[39m/);
});
