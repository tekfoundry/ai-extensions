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
    const reviewSkill = lockfile.skills.find((skill) => skill.activeName === "code-review-refactor");
    const delegateSkill = lockfile.skills.find((skill) => skill.activeName === "delegate-to-role");
    const productStrategistRole = lockfile.roles.find((role) => role.activeName === "product-strategist");
    const brainstormingSkill = lockfile.skills.find((skill) => skill.activeName === "brainstorming-skill");
    const discoverSkill = lockfile.skills.find((skill) => skill.activeName === "discover-skill");

    assert.equal(result.declaredCount, 1);
    assert.equal(result.materializedCount, 35);
    assert.equal(result.activatedCount, 17);
    assert.equal(result.standaloneActivatedCount, 1);
    assert.deepEqual(Object.keys(manifest.sources.workflows), ["aix"]);
    assert.equal(manifest.sources.workflows.aix.type, "git");
    assert.equal(manifest.sources.workflows.aix.url, defaults.workflowSources.aix.url);
    assert.equal(manifest.sources.workflows.aix.path, "aix/workflows/design-plan-execute");
    assert.equal(manifest.workflow, "aix:aix/workflows/design-plan-execute");
    assert.deepEqual(manifest.skills, ["aix:discover-skill"]);
    assert.equal(lockfile.lockfileVersion, 1);
    assert.equal(lockfile.workflows.length, 1);
    assert.equal(lockfile.workflows[0].name, "design-plan-execute");
    assert.equal(lockfile.workflows[0].docs.length, 4);
    assert.equal(lockfile.workflows[0].templates.length, 14);
    assert.equal(lockfile.workflows[0].skills.length, 17);
    assert.equal(lockfile.workflows[0].roles.length, 1);
    assert.equal(lockfile.skills.length, 18);
    assert.equal(lockfile.roles.length, 1);
    assert.ok(lockfile.skills.every((skill) => skill.kind === "skill"));
    assert.equal(lockfile.skills.filter((skill) => skill.owner?.kind === "workflow").length, 17);
    assert.ok(discoverSkill);
    assert.equal(discoverSkill.source, "aix");
    assert.equal(discoverSkill.sourcePath, "discover-skill");
    assert.equal(discoverSkill.requested, true);
    assert.equal(discoverSkill.owner, undefined);
    assert.equal(discoverSkill.packagePath, ".agents/packages/skills/aix/discover-skill");
    assert.equal(discoverSkill.activationPath, ".agents/skills/discover-skill");
    assert.ok(discoverSkill.packageFiles.some((file) => file.path === "known-sources.json"));
    assert.ok(reviewSkill);
    assert.equal(reviewSkill.source, "aix");
    assert.equal(reviewSkill.sourcePath, "skills/code-review-refactor");
    assert.equal(reviewSkill.requested, false);
    assert.deepEqual(reviewSkill.owner, { kind: "workflow", name: "design-plan-execute" });
    assert.equal(reviewSkill.packagePath, ".agents/packages/workflows/aix/design-plan-execute/skills/code-review-refactor");
    assert.equal(reviewSkill.activationPath, ".agents/skills/code-review-refactor");
    assert.ok(delegateSkill);
    assert.equal(delegateSkill.source, "aix");
    assert.equal(delegateSkill.sourcePath, "skills/delegate-to-role");
    assert.equal(delegateSkill.requested, false);
    assert.deepEqual(delegateSkill.owner, { kind: "workflow", name: "design-plan-execute" });
    assert.equal(delegateSkill.packagePath, ".agents/packages/workflows/aix/design-plan-execute/skills/delegate-to-role");
    assert.equal(delegateSkill.activationPath, ".agents/skills/delegate-to-role");
    assert.ok(productStrategistRole);
    assert.equal(productStrategistRole.source, "aix");
    assert.equal(productStrategistRole.sourcePath, "roles/project-dev/product-strategist.md");
    assert.equal(productStrategistRole.requested, false);
    assert.deepEqual(productStrategistRole.owner, { kind: "workflow", name: "design-plan-execute" });
    assert.equal(productStrategistRole.packagePath, ".agents/packages/workflows/aix/design-plan-execute/roles/project-dev/product-strategist.md");
    assert.equal(productStrategistRole.activationPath, ".agents/roles/product-strategist.md");
    assert.ok(lockfile.skills.every((skill) => skill.sourceType === "git"));
    assert.ok(lockfile.workflows.some((workflow) => workflow.source === "aix" && workflow.resolvedCommit === defaults.aixCommit));
    assert.ok(lockfile.skills.filter((skill) => skill.owner?.kind === "workflow").every((skill) => skill.packagePath.startsWith(".agents/packages/workflows/aix/design-plan-execute/skills/")));
    assert.ok(lockfile.skills.every((skill) => skill.activationPath.startsWith(".agents/skills/")));
    assert.ok(lockfile.skills.every((skill) => skill.packageFiles.length > 0));
    assert.ok(lockfile.skills.every((skill) => skill.activeFiles.length > 0));
    assert.ok(brainstormingSkill);
    assert.equal(brainstormingSkill.source, "aix");
    assert.equal(brainstormingSkill.sourcePath, "skills/brainstorming-skill");
    assert.equal(brainstormingSkill.requested, false);
    assert.deepEqual(brainstormingSkill.owner, { kind: "workflow", name: "design-plan-execute" });
    assert.equal(brainstormingSkill.packagePath, ".agents/packages/workflows/aix/design-plan-execute/skills/brainstorming-skill");
    assert.equal(brainstormingSkill.activationPath, ".agents/skills/brainstorming-skill");
    assert.ok(brainstormingSkill.packageFiles.some((file) => file.path === "README.md"));
    assert.ok(existsSync(join(projectPath, ".agents/packages/workflows/aix/design-plan-execute/workflow.json")));
    assert.ok(existsSync(join(projectPath, ".agents/packages/workflows/aix/design-plan-execute/plan-example.md")));
    assert.ok(existsSync(join(projectPath, ".agents/packages/workflows/aix/design-plan-execute/templates/plan.md")));
    assert.ok(existsSync(join(projectPath, ".agents/packages/workflows/aix/design-plan-execute/templates/sections/phase.md")));
    assert.ok(existsSync(join(projectPath, ".agents/packages/workflows/aix/design-plan-execute/skills/task-execute/SKILL.md")));
    assert.ok(existsSync(join(projectPath, ".agents/README.md")));
    assert.ok(existsSync(join(projectPath, ".agents/plan-example.md")));
    assert.ok(readFileSync(join(projectPath, "AGENTS.md"), "utf8").includes("<!-- aix:workflow design-plan-execute start -->"));
    assert.ok(existsSync(join(projectPath, ".agents/skills/task-execute/SKILL.md")));
    assert.ok(existsSync(join(projectPath, ".agents/packages/workflows/aix/design-plan-execute/skills/code-review-refactor/SKILL.md")));
    assert.ok(existsSync(join(projectPath, ".agents/skills/code-review-refactor/SKILL.md")));
    assert.ok(existsSync(join(projectPath, ".agents/packages/workflows/aix/design-plan-execute/skills/delegate-to-role/SKILL.md")));
    assert.ok(existsSync(join(projectPath, ".agents/skills/delegate-to-role/SKILL.md")));
    assert.ok(existsSync(join(projectPath, ".agents/packages/workflows/aix/design-plan-execute/roles/project-dev/product-strategist.md")));
    assert.ok(existsSync(join(projectPath, ".agents/roles/product-strategist.md")));
    assert.ok(existsSync(join(projectPath, ".agents/packages/workflows/aix/design-plan-execute/skills/brainstorming-skill/SKILL.md")));
    assert.ok(existsSync(join(projectPath, ".agents/packages/workflows/aix/design-plan-execute/skills/brainstorming-skill/README.md")));
    assert.ok(existsSync(join(projectPath, ".agents/skills/brainstorming-skill/SKILL.md")));
    assert.ok(existsSync(join(projectPath, ".agents/packages/skills/aix/discover-skill/SKILL.md")));
    assert.ok(existsSync(join(projectPath, ".agents/packages/skills/aix/discover-skill/known-sources.json")));
    assert.ok(existsSync(join(projectPath, ".agents/skills/discover-skill/SKILL.md")));
    assert.equal(lstatSync(join(projectPath, ".agents/skills/task-execute")).isSymbolicLink(), true);
    assert.equal(readlinkSync(join(projectPath, ".agents/skills/task-execute")), "../packages/workflows/aix/design-plan-execute/skills/task-execute");
    assert.equal(lstatSync(join(projectPath, ".agents/skills/code-review-refactor")).isSymbolicLink(), true);
    assert.equal(readlinkSync(join(projectPath, ".agents/skills/code-review-refactor")), "../packages/workflows/aix/design-plan-execute/skills/code-review-refactor");
    assert.equal(lstatSync(join(projectPath, ".agents/skills/brainstorming-skill")).isSymbolicLink(), true);
    assert.equal(readlinkSync(join(projectPath, ".agents/skills/brainstorming-skill")), "../packages/workflows/aix/design-plan-execute/skills/brainstorming-skill");
    assert.equal(lstatSync(join(projectPath, ".agents/skills/discover-skill")).isSymbolicLink(), true);
    assert.equal(readlinkSync(join(projectPath, ".agents/skills/discover-skill")), "../packages/skills/aix/discover-skill");
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
      assert.match(result.stdout, /Materialized 35 workflow assets/);
      assert.match(result.stdout, /Activated 17 workflow-owned skills/);
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

test("initProject leaves project files unchanged when default workflow preflight fails", async () => {
  await withProject(async (projectPath, defaults, cacheRoot) => {
    const existingAgents = "# Existing agents file\n";
    const brokenWorkflowSources = {
      ...defaults.workflowSources,
      aix: {
        ...defaults.workflowSources.aix,
        path: "aix/missing-workflow"
      }
    };

    writeFileSync(join(projectPath, "AGENTS.md"), existingAgents, "utf8");

    assert.throws(
      () => initProject({ workflowSources: brokenWorkflowSources, sources: defaults.sources, cacheRoot }),
      /no such file or directory/
    );

    assert.equal(readFileSync(join(projectPath, "AGENTS.md"), "utf8"), existingAgents);
    assert.equal(existsSync(join(projectPath, "aix.json")), false);
    assert.equal(existsSync(join(projectPath, "aix.lock.json")), false);
    assert.equal(existsSync(join(projectPath, ".agents")), false);
    assert.equal(existsSync(join(projectPath, "_docs")), false);
  });
});

test("initProject is idempotent when files match", async () => {
  await withProject(async (_projectPath, defaults, cacheRoot) => {
    assert.doesNotThrow(() => initProject({ workflowSources: defaults.workflowSources, sources: defaults.sources, cacheRoot }));
    assert.doesNotThrow(() => initProject({ workflowSources: defaults.workflowSources, sources: defaults.sources, cacheRoot }));
  });
});

test("workflow uninstall removes workflow-owned skills and keeps standalone default skills", async () => {
  await withProject(async (projectPath, defaults, cacheRoot) => {
    initProject({ workflowSources: defaults.workflowSources, sources: defaults.sources, cacheRoot });

    const result = run(["workflow", "uninstall"]);
    const manifest = JSON.parse(readFileSync(join(projectPath, "aix.json"), "utf8"));
    const lockfile = JSON.parse(readFileSync(join(projectPath, "aix.lock.json"), "utf8"));

    assert.equal(result.exitCode, 0);
    assert.equal(existsSync(join(projectPath, ".agents/skills/task-execute")), false);
    assert.equal(existsSync(join(projectPath, ".agents/skills/code-review-refactor")), false);
    assert.equal(existsSync(join(projectPath, ".agents/skills/brainstorming-skill")), false);
    assert.equal(existsSync(join(projectPath, ".agents/skills/discover-skill/SKILL.md")), true);
    assert.deepEqual(manifest.skills, ["aix:discover-skill"]);
    assert.equal(lockfile.workflows.length, 0);
    assert.equal(lockfile.skills.length, 1);
    assert.deepEqual(lockfile.skills.map((skill) => skill.activeName).sort(), ["discover-skill"]);
    assert.ok(lockfile.skills.every((skill) => skill.owner === undefined));
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
