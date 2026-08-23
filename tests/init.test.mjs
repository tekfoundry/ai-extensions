import assert from "node:assert/strict";
import { cpSync, existsSync, lstatSync, mkdirSync, readFileSync, readlinkSync, unlinkSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { test } from "node:test";
import { run } from "../dist/cli.js";
import { initProject } from "../dist/init.js";

const repoRoot = process.cwd();

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

async function createGitRepo(prefix, populate) {
  const directory = await mkdtemp(join(tmpdir(), prefix));

  populate(directory);
  git(["init", "-b", "master"], directory);
  git(["add", "."], directory);
  git(["commit", "-m", "skills"], directory);

  return {
    directory,
    commit: git(["rev-parse", "HEAD"], directory)
  };
}

async function createDefaultSources() {
  const aixSource = await createGitRepo("aix-init-aix-source-", (directory) => {
    mkdirSync(join(directory, "aix"), { recursive: true });
    cpSync(resolve(repoRoot, "aix/skills"), join(directory, "aix/skills"), { recursive: true });
    cpSync(
      resolve(repoRoot, "aix/workflows/design-plan-execute"),
      join(directory, "aix/workflows/design-plan-execute"),
      { recursive: true }
    );
  });
  const cursorSource = await createGitRepo("aix-init-cursor-source-", (directory) => {
    mkdirSync(join(directory, "pstack/skills/unslop"), { recursive: true });
    writeFileSync(join(directory, "pstack/skills/unslop/SKILL.md"), "---\nname: unslop\n---\n\n# Unslop\n", "utf8");
  });

  return {
    workflowSources: {
      aix: {
        type: "git",
        url: aixSource.directory,
        path: "aix/workflows/design-plan-execute",
        ref: "master"
      }
    },
    sources: {
      aix: {
        type: "git",
        url: aixSource.directory,
        path: "aix/skills",
        ref: "master"
      },
      mattpocock: {
        type: "git",
        url: aixSource.directory,
        path: "aix/skills",
        ref: "master"
      },
      "cursor-pstack": {
        type: "git",
        url: cursorSource.directory,
        path: "pstack/skills",
        ref: "master"
      }
    },
    aixCommit: aixSource.commit,
    cursorCommit: cursorSource.commit
  };
}

async function withProject(callback) {
  const projectPath = await mkdtemp(join(tmpdir(), "aix-init-"));
  const previousCwd = process.cwd();
  const cacheRoot = await mkdtemp(join(tmpdir(), "aix-init-cache-"));
  const defaults = await createDefaultSources();

  process.chdir(projectPath);

  try {
    await callback(projectPath, defaults, cacheRoot);
  } finally {
    process.chdir(previousCwd);
  }
}

test("initProject initializes an empty project with default sources and skills", async () => {
  await withProject(async (projectPath, defaults, cacheRoot) => {
    const result = initProject({ workflowSources: defaults.workflowSources, sources: defaults.sources, cacheRoot });
    const manifest = JSON.parse(readFileSync(join(projectPath, "aix.json"), "utf8"));
    const lockfile = JSON.parse(readFileSync(join(projectPath, "aix.lock.json"), "utf8"));
    const standaloneSkill = lockfile.skills.find((skill) => skill.activeName === "code-review-refactor");

    assert.equal(result.declaredCount, 1);
    assert.equal(result.materializedCount, 32);
    assert.equal(result.activatedCount, 14);
    assert.equal(result.standaloneActivatedCount, 1);
    assert.deepEqual(Object.keys(manifest.sources.workflows), ["aix"]);
    assert.equal(manifest.sources.workflows.aix.type, "git");
    assert.equal(manifest.sources.workflows.aix.url, defaults.workflowSources.aix.url);
    assert.equal(manifest.sources.workflows.aix.path, "aix/workflows/design-plan-execute");
    assert.equal(manifest.workflow, "aix:aix/workflows/design-plan-execute");
    assert.deepEqual(manifest.skills, ["aix:code-review-refactor"]);
    assert.equal(lockfile.lockfileVersion, 1);
    assert.equal(lockfile.workflows.length, 1);
    assert.equal(lockfile.workflows[0].name, "design-plan-execute");
    assert.equal(lockfile.workflows[0].docs.length, 4);
    assert.equal(lockfile.workflows[0].templates.length, 14);
    assert.equal(lockfile.workflows[0].skills.length, 14);
    assert.equal(lockfile.skills.length, 15);
    assert.ok(lockfile.skills.every((skill) => skill.kind === "skill"));
    assert.equal(lockfile.skills.filter((skill) => skill.owner?.kind === "workflow").length, 14);
    assert.ok(standaloneSkill);
    assert.equal(standaloneSkill.source, "aix");
    assert.equal(standaloneSkill.sourcePath, "code-review-refactor");
    assert.equal(standaloneSkill.requested, true);
    assert.equal(standaloneSkill.owner, undefined);
    assert.equal(standaloneSkill.packagePath, ".agents/packages/skills/aix/code-review-refactor");
    assert.equal(standaloneSkill.activationPath, ".agents/skills/code-review-refactor");
    assert.ok(lockfile.skills.every((skill) => skill.sourceType === "git"));
    assert.ok(lockfile.workflows.some((workflow) => workflow.source === "aix" && workflow.resolvedCommit === defaults.aixCommit));
    assert.ok(lockfile.skills.filter((skill) => skill.owner?.kind === "workflow").every((skill) => skill.packagePath.startsWith(".agents/packages/workflows/aix/design-plan-execute/skills/")));
    assert.ok(lockfile.skills.every((skill) => skill.activationPath.startsWith(".agents/skills/")));
    assert.ok(lockfile.skills.every((skill) => skill.packageFiles.length > 0));
    assert.ok(lockfile.skills.every((skill) => skill.activeFiles.length > 0));
    assert.ok(existsSync(join(projectPath, ".agents/packages/workflows/aix/design-plan-execute/workflow.json")));
    assert.ok(existsSync(join(projectPath, ".agents/packages/workflows/aix/design-plan-execute/plan-example.md")));
    assert.ok(existsSync(join(projectPath, ".agents/packages/workflows/aix/design-plan-execute/templates/plan.md")));
    assert.ok(existsSync(join(projectPath, ".agents/packages/workflows/aix/design-plan-execute/templates/sections/phase.md")));
    assert.ok(existsSync(join(projectPath, ".agents/packages/workflows/aix/design-plan-execute/skills/task-execute/SKILL.md")));
    assert.ok(existsSync(join(projectPath, ".agents/README.md")));
    assert.ok(existsSync(join(projectPath, ".agents/plan-example.md")));
    assert.ok(readFileSync(join(projectPath, "AGENTS.md"), "utf8").includes("<!-- aix:workflow design-plan-execute start -->"));
    assert.ok(existsSync(join(projectPath, ".agents/skills/task-execute/SKILL.md")));
    assert.ok(existsSync(join(projectPath, ".agents/packages/skills/aix/code-review-refactor/SKILL.md")));
    assert.ok(existsSync(join(projectPath, ".agents/skills/code-review-refactor/SKILL.md")));
    assert.equal(lstatSync(join(projectPath, ".agents/skills/task-execute")).isSymbolicLink(), true);
    assert.equal(readlinkSync(join(projectPath, ".agents/skills/task-execute")), "../packages/workflows/aix/design-plan-execute/skills/task-execute");
    assert.equal(lstatSync(join(projectPath, ".agents/skills/code-review-refactor")).isSymbolicLink(), true);
    assert.equal(readlinkSync(join(projectPath, ".agents/skills/code-review-refactor")), "../packages/skills/aix/code-review-refactor");
  });
});

test("run init initializes a project through the CLI command path", async () => {
  await withProject(async (_projectPath, defaults, cacheRoot) => {
    const previousEnv = {
      AIX_CACHE_DIR: process.env.AIX_CACHE_DIR,
      AIX_SOURCE_AIX_URL: process.env.AIX_SOURCE_AIX_URL,
      AIX_SOURCE_AIX_PATH: process.env.AIX_SOURCE_AIX_PATH,
      AIX_SOURCE_AIX_WORKFLOW_PATH: process.env.AIX_SOURCE_AIX_WORKFLOW_PATH,
      AIX_SOURCE_AIX_REF: process.env.AIX_SOURCE_AIX_REF,
      AIX_SOURCE_MATTPOCOCK_URL: process.env.AIX_SOURCE_MATTPOCOCK_URL,
      AIX_SOURCE_MATTPOCOCK_PATH: process.env.AIX_SOURCE_MATTPOCOCK_PATH,
      AIX_SOURCE_MATTPOCOCK_REF: process.env.AIX_SOURCE_MATTPOCOCK_REF,
      AIX_SOURCE_CURSOR_PSTACK_URL: process.env.AIX_SOURCE_CURSOR_PSTACK_URL,
      AIX_SOURCE_CURSOR_PSTACK_PATH: process.env.AIX_SOURCE_CURSOR_PSTACK_PATH,
      AIX_SOURCE_CURSOR_PSTACK_REF: process.env.AIX_SOURCE_CURSOR_PSTACK_REF
    };

    process.env.AIX_CACHE_DIR = cacheRoot;
    process.env.AIX_SOURCE_AIX_URL = defaults.workflowSources.aix.url;
    process.env.AIX_SOURCE_AIX_PATH = defaults.sources.aix.path;
    process.env.AIX_SOURCE_AIX_WORKFLOW_PATH = defaults.workflowSources.aix.path;
    process.env.AIX_SOURCE_AIX_REF = defaults.workflowSources.aix.ref;
    process.env.AIX_SOURCE_MATTPOCOCK_URL = defaults.sources.mattpocock.url;
    process.env.AIX_SOURCE_MATTPOCOCK_PATH = defaults.sources.mattpocock.path;
    process.env.AIX_SOURCE_MATTPOCOCK_REF = defaults.sources.mattpocock.ref;
    process.env.AIX_SOURCE_CURSOR_PSTACK_URL = defaults.sources["cursor-pstack"].url;
    process.env.AIX_SOURCE_CURSOR_PSTACK_PATH = defaults.sources["cursor-pstack"].path;
    process.env.AIX_SOURCE_CURSOR_PSTACK_REF = defaults.sources["cursor-pstack"].ref;

    const result = run(["init"]);

    try {
      assert.equal(result.exitCode, 0);
      assert.match(result.stdout, /Initialized AI Extensions/);
      assert.match(result.stdout, /Declared 1 workflow/);
      assert.match(result.stdout, /Materialized 32 workflow assets/);
      assert.match(result.stdout, /Activated 14 workflow-owned skills/);
      assert.match(result.stdout, /Activated 1 standalone skill/);
    } finally {
      for (const [key, value] of Object.entries(previousEnv)) {
        if (value === undefined) {
          delete process.env[key];
        } else {
          process.env[key] = value;
        }
      }
    }
  });
});

test("initProject is idempotent when files match", async () => {
  await withProject(async (_projectPath, defaults, cacheRoot) => {
    assert.doesNotThrow(() => initProject({ workflowSources: defaults.workflowSources, sources: defaults.sources, cacheRoot }));
    assert.doesNotThrow(() => initProject({ workflowSources: defaults.workflowSources, sources: defaults.sources, cacheRoot }));
  });
});

test("workflow uninstall leaves init-installed standalone skills active", async () => {
  await withProject(async (projectPath, defaults, cacheRoot) => {
    initProject({ workflowSources: defaults.workflowSources, sources: defaults.sources, cacheRoot });

    const result = run(["workflow", "uninstall"]);
    const manifest = JSON.parse(readFileSync(join(projectPath, "aix.json"), "utf8"));
    const lockfile = JSON.parse(readFileSync(join(projectPath, "aix.lock.json"), "utf8"));

    assert.equal(result.exitCode, 0);
    assert.equal(existsSync(join(projectPath, ".agents/skills/task-execute")), false);
    assert.equal(existsSync(join(projectPath, ".agents/skills/code-review-refactor/SKILL.md")), true);
    assert.deepEqual(manifest.skills, ["aix:code-review-refactor"]);
    assert.equal(lockfile.workflows.length, 0);
    assert.equal(lockfile.skills.length, 1);
    assert.equal(lockfile.skills[0].activeName, "code-review-refactor");
    assert.equal(lockfile.skills[0].owner, undefined);
  });
});

test("initProject refuses to overwrite a local package edit", async () => {
  await withProject(async (projectPath, defaults, cacheRoot) => {
    initProject({ workflowSources: defaults.workflowSources, sources: defaults.sources, cacheRoot });
    writeFileSync(join(projectPath, ".agents/packages/workflows/aix/design-plan-execute/skills/task-execute/SKILL.md"), "local edit\n", "utf8");

    assert.throws(
      () => initProject({ workflowSources: defaults.workflowSources, sources: defaults.sources, cacheRoot }),
      (error) => error.message === "Refusing to update modified workflow package: .agents/packages/workflows/aix/design-plan-execute"
    );
  });
});

test("initProject refuses to replace a local active skill edit", async () => {
  await withProject(async (projectPath, defaults, cacheRoot) => {
    initProject({ workflowSources: defaults.workflowSources, sources: defaults.sources, cacheRoot });
    unlinkSync(join(projectPath, ".agents/skills/task-execute"));
    mkdirSync(join(projectPath, ".agents/skills/task-execute"), { recursive: true });
    writeFileSync(join(projectPath, ".agents/skills/task-execute/SKILL.md"), "local edit\n", "utf8");

    assert.throws(
      () => initProject({ workflowSources: defaults.workflowSources, sources: defaults.sources, cacheRoot }),
      (error) => error.message === "Refusing to update modified active skill: .agents/skills/task-execute"
    );
  });
});
