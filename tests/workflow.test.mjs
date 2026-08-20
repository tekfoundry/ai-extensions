import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { run } from "../dist/cli.js";
import { installWorkflowFromDefinitions } from "../dist/workflows/index.js";

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

async function createWorkflowRepo(prefix) {
  const directory = await mkdtemp(join(tmpdir(), prefix));

  writeWorkflow(directory, "Initial Workflow", "Use this workflow.");
  git(["init", "-b", "master"], directory);
  git(["add", "."], directory);
  git(["commit", "-m", "workflow"], directory);

  return directory;
}

function writeWorkflow(directory, title, skillBody) {
  mkdirSync(join(directory, "skills/alpha"), { recursive: true });
  writeFileSync(
    join(directory, "workflow.json"),
    JSON.stringify(
      {
        name: "fixture-workflow",
        title,
        agentsMd: {
          mode: "managed-block",
          source: "AGENTS.append.md",
          marker: "aix:workflow fixture-workflow"
        },
        docs: ["README.md", "workflow.md", "engineering-best-practices.md"],
        skillsDir: "skills"
      },
      null,
      2
    ) + "\n",
    "utf8"
  );
  writeFileSync(join(directory, "AGENTS.append.md"), `## ${title}\n\nFollow the fixture process.\n`, "utf8");
  writeFileSync(join(directory, "README.md"), `# ${title}\n`, "utf8");
  writeFileSync(join(directory, "workflow.md"), "# Workflow\n", "utf8");
  writeFileSync(join(directory, "engineering-best-practices.md"), "# Engineering\n", "utf8");
  writeFileSync(join(directory, "skills/alpha/SKILL.md"), `---\nname: alpha\n---\n\n# Alpha\n\n${skillBody}\n`, "utf8");
}

async function withProject(callback) {
  const projectPath = await mkdtemp(join(tmpdir(), "aix-workflow-project-"));
  const previousCwd = process.cwd();

  process.chdir(projectPath);

  try {
    await callback(projectPath);
  } finally {
    process.chdir(previousCwd);
  }
}

test("run install workflow installs docs, managed AGENTS block, and workflow-owned skills", async () => {
  const source = await createWorkflowRepo("aix-workflow-source-");

  await withProject(async (projectPath) => {
    writeFileSync("AGENTS.md", "# Project Rules\n\nKeep this project text.\n", "utf8");

    const result = run(["install", "workflow", source, "fixture"]);
    const manifest = JSON.parse(readFileSync("aix.json", "utf8"));
    const lockfile = JSON.parse(readFileSync("aix.lock.json", "utf8"));
    const agents = readFileSync("AGENTS.md", "utf8");

    assert.equal(result.exitCode, 0);
    assert.match(result.stdout, /Installed workflow fixture-workflow/);
    assert.equal(manifest.workflow, "fixture:.");
    assert.equal(manifest.sources.workflows.fixture.url, source);
    assert.equal(lockfile.workflows.length, 1);
    assert.equal(lockfile.workflows[0].docs.length, 3);
    assert.equal(lockfile.skills[0].owner.kind, "workflow");
    assert.equal(lockfile.skills[0].owner.name, "fixture-workflow");
    assert.ok(existsSync(join(projectPath, ".agents/README.md")));
    assert.ok(existsSync(join(projectPath, ".agents/packages/workflows/fixture/fixture-workflow/skills/alpha/SKILL.md")));
    assert.ok(existsSync(join(projectPath, ".agents/skills/alpha/SKILL.md")));
    assert.ok(existsSync(join(projectPath, "_docs/design")));
    assert.ok(existsSync(join(projectPath, "_docs/plans/backlog")));
    assert.match(agents, /Keep this project text/);
    assert.match(agents, /<!-- aix:workflow fixture-workflow start -->/);
  });
});

test("run install workflow refuses to replace a different active workflow", async () => {
  const firstSource = await createWorkflowRepo("aix-workflow-source-");
  const secondSource = await mkdtemp(join(tmpdir(), "aix-workflow-source-"));

  writeWorkflow(secondSource, "Second Workflow", "Second body.");
  writeFileSync(join(secondSource, "workflow.json"), readFileSync(join(secondSource, "workflow.json"), "utf8").replace("fixture-workflow", "second-workflow"), "utf8");
  git(["init", "-b", "master"], secondSource);
  git(["add", "."], secondSource);
  git(["commit", "-m", "workflow"], secondSource);

  await withProject(async () => {
    assert.equal(run(["install", "workflow", firstSource, "first"]).exitCode, 0);

    const result = run(["install", "workflow", secondSource, "second"]);

    assert.equal(result.exitCode, 2);
    assert.match(result.stderr, /A workflow is already active: fixture-workflow/);
  });
});

test("workflow-owned skills cannot be deactivated directly", async () => {
  const source = await createWorkflowRepo("aix-workflow-source-");

  await withProject(async () => {
    assert.equal(run(["install", "workflow", source, "fixture"]).exitCode, 0);

    const result = run(["deactivate", "skill", "alpha"]);

    assert.equal(result.exitCode, 2);
    assert.match(result.stderr, /owned by workflow fixture-workflow/);
  });
});

test("run diff workflow reports source changes and update workflow applies them", async () => {
  const source = await createWorkflowRepo("aix-workflow-source-");

  await withProject(async () => {
    const previousCache = process.env.AIX_CACHE_DIR;
    const cacheRoot = join(tmpdir(), `aix-workflow-cache-${Date.now()}`);
    process.env.AIX_CACHE_DIR = cacheRoot;

    try {
    installWorkflowFromDefinitions(
      {
        fixture: {
          type: "git",
          url: source,
          path: ".",
          ref: "master"
        }
      },
      cacheRoot
    );

    writeWorkflow(source, "Updated Workflow", "Updated body.");
    git(["add", "."], source);
    git(["commit", "-m", "update workflow"], source);

    const diff = run(["diff", "workflow"]);
    assert.equal(diff.exitCode, 0);
    assert.match(diff.stdout, /Updated body/);

    const update = run(["update", "workflow"]);
    assert.equal(update.exitCode, 0);
    assert.match(update.stdout, /Updated workflow/);
    assert.match(readFileSync(".agents/skills/alpha/SKILL.md", "utf8"), /Updated body/);
    } finally {
      if (previousCache === undefined) {
        delete process.env.AIX_CACHE_DIR;
      } else {
        process.env.AIX_CACHE_DIR = previousCache;
      }
    }
  });
});

test("run verify reports workflow doc drift and remove workflow preserves project AGENTS text", async () => {
  const source = await createWorkflowRepo("aix-workflow-source-");

  await withProject(async () => {
    writeFileSync("AGENTS.md", "# Project Rules\n\nKeep me.\n", "utf8");
    assert.equal(run(["install", "workflow", source, "fixture"]).exitCode, 0);
    writeFileSync(".agents/workflow.md", "# Local edit\n", "utf8");

    const verify = run(["verify"]);
    assert.equal(verify.exitCode, 2);
    assert.match(verify.stdout, /Workflow doc hash changed: .agents\/workflow.md/);

    writeFileSync(".agents/workflow.md", "# Workflow\n", "utf8");
    const remove = run(["remove", "workflow"]);

    assert.equal(remove.exitCode, 0);
    assert.match(remove.stdout, /Removed workflow fixture-workflow/);
    assert.equal(existsSync(".agents/skills/alpha"), false);
    assert.equal(existsSync(".agents/README.md"), false);
    assert.match(readFileSync("AGENTS.md", "utf8"), /Keep me/);
    assert.doesNotMatch(readFileSync("AGENTS.md", "utf8"), /aix:workflow fixture-workflow/);
  });
});
