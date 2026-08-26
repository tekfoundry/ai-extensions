import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PassThrough } from "node:stream";
import { test } from "node:test";
import { run, runInteractive } from "../dist/cli.js";
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

async function createWorkflowRepo(prefix, workflowName = "fixture-workflow", workflowPath = ".") {
  const directory = await mkdtemp(join(tmpdir(), prefix));
  const root = workflowPath === "." ? directory : join(directory, workflowPath);

  writeWorkflow(root, "Initial Workflow", "Use this workflow.", workflowName);
  git(["init", "-b", "master"], directory);
  git(["add", "."], directory);
  git(["commit", "-m", "workflow"], directory);

  return directory;
}

function validRoleMarkdown(name = "quality-engineer", description = "Designs targeted verification for planned work.") {
  return `---
name: ${name}
description: ${description}
skills:
  - work-verify
---

## Purpose

Provide specialist workflow role guidance.

## When To Use

Use when delegated work needs this role's judgment.

## Context To Inspect

Read the active plan, design docs, changed files, and relevant workflow assets.

## Skills To Consider

Consider workflow-owned skills only as optional procedural guidance.

## Stop Conditions

Stop on unclear authorization, unsafe file operations, or scope expansion.

## Expected Output

Return findings, decisions, evidence, gaps, and residual risk.
`;
}

function writeWorkflow(directory, title, skillBody, workflowName = "fixture-workflow", options = {}) {
  mkdirSync(join(directory, "skills/alpha"), { recursive: true });
  mkdirSync(join(directory, "templates/sections"), { recursive: true });
  writeFileSync(
    join(directory, "workflow.json"),
    JSON.stringify(
      {
        name: workflowName,
        title,
        agentsMd: {
          mode: "managed-block",
          source: "AGENTS.append.md",
          marker: `aix:workflow ${workflowName}`
        },
        docs: ["README.md", "workflow.md", "engineering-best-practices.md"],
        templatesDir: "templates",
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
  writeFileSync(join(directory, "templates/plan.md"), "{{ section:status }}\n{{ repeat:phases section:phase }}\n", "utf8");
  writeFileSync(join(directory, "templates/sections/status.md"), "Backlog\n", "utf8");
  writeFileSync(join(directory, "templates/sections/phase.md"), "{{ phase:title }}\n", "utf8");
  writeFileSync(join(directory, "skills/alpha/SKILL.md"), `---\nname: alpha\n---\n\n# Alpha\n\n${skillBody}\n`, "utf8");

  if (options.roleName) {
    mkdirSync(join(directory, "roles/project-dev"), { recursive: true });
    writeFileSync(join(directory, `roles/project-dev/${options.roleName}.md`), validRoleMarkdown(options.roleName), "utf8");
  }
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

test("run workflow install installs docs, managed AGENTS block, and workflow-owned skills", async () => {
  const source = await createWorkflowRepo("aix-workflow-source-");

  await withProject(async (projectPath) => {
    writeFileSync("AGENTS.md", "# Project Rules\n\nKeep this project text.\n", "utf8");

    const result = run(["workflow", "install", source, "fixture"]);
    const manifest = JSON.parse(readFileSync("aix.json", "utf8"));
    const lockfile = JSON.parse(readFileSync("aix.lock.json", "utf8"));
    const agents = readFileSync("AGENTS.md", "utf8");

    assert.equal(result.exitCode, 0);
    assert.match(result.stdout, /Installed workflow fixture-workflow/);
    assert.match(result.stdout, /Installed 3 workflow templates/);
    assert.equal(manifest.workflow, "fixture:.");
    assert.equal(manifest.sources.workflows.fixture.url, source);
    assert.equal(lockfile.workflows.length, 1);
    assert.equal(lockfile.workflows[0].docs.length, 3);
    assert.equal(lockfile.workflows[0].templates.length, 3);
    assert.equal(lockfile.skills[0].owner.kind, "workflow");
    assert.equal(lockfile.skills[0].owner.name, "fixture-workflow");
    assert.ok(existsSync(join(projectPath, ".agents/README.md")));
    assert.ok(existsSync(join(projectPath, ".agents/packages/workflows/fixture/fixture-workflow/skills/alpha/SKILL.md")));
    assert.ok(existsSync(join(projectPath, ".agents/packages/workflows/fixture/fixture-workflow/templates/plan.md")));
    assert.ok(existsSync(join(projectPath, ".agents/skills/alpha/SKILL.md")));
    assert.ok(existsSync(join(projectPath, "_docs/kb/README.md")));
    assert.ok(existsSync(join(projectPath, "_docs/kb/01-product/README.md")));
    assert.ok(existsSync(join(projectPath, "_docs/kb/07-decisions/README.md")));
    assert.equal(existsSync(join(projectPath, "_docs/design")), false);
    assert.ok(existsSync(join(projectPath, "_docs/plans/backlog")));
    assert.match(agents, /Keep this project text/);
    assert.match(agents, /<!-- aix:workflow fixture-workflow start -->/);
  });
});

test("run workflow install activates workflow-owned roles and reports them in status and verify", async () => {
  const source = await mkdtemp(join(tmpdir(), "aix-workflow-source-"));

  writeWorkflow(source, "Role Workflow", "Role body.", "role-workflow", { roleName: "quality-engineer" });
  git(["init", "-b", "master"], source);
  git(["add", "."], source);
  git(["commit", "-m", "workflow roles"], source);

  await withProject(async (projectPath) => {
    const install = run(["workflow", "install", source, "fixture"]);
    const lockfile = JSON.parse(readFileSync("aix.lock.json", "utf8"));

    assert.equal(install.exitCode, 0);
    assert.match(install.stdout, /Activated 1 workflow-owned roles/);
    assert.equal(lockfile.workflows[0].roles.length, 1);
    assert.equal(lockfile.workflows[0].roles[0].sourcePath, "roles/project-dev/quality-engineer.md");
    assert.equal(lockfile.roles.length, 1);
    assert.equal(lockfile.roles[0].owner.kind, "workflow");
    assert.equal(lockfile.roles[0].owner.name, "role-workflow");
    assert.equal(lockfile.roles[0].requested, false);
    assert.equal(lockfile.roles[0].packagePath, ".agents/packages/workflows/fixture/role-workflow/roles/project-dev/quality-engineer.md");
    assert.equal(lockfile.roles[0].activationPath, ".agents/roles/quality-engineer.md");
    assert.ok(existsSync(join(projectPath, ".agents/packages/workflows/fixture/role-workflow/roles/project-dev/quality-engineer.md")));
    assert.ok(existsSync(join(projectPath, ".agents/roles/quality-engineer.md")));

    const status = run(["status"]);
    assert.equal(status.exitCode, 0);
    assert.match(status.stdout, /Workflow[\s\S]*Roles[\s\S]*1/);
    assert.match(status.stdout, /Workflow-owned roles[\s\S]*quality-engineer[\s\S]*fixture\/roles\/project-dev\/quality-engineer\.md/);

    const verify = run(["verify"]);
    assert.equal(verify.exitCode, 0);
    assert.match(verify.stdout, /verification passed/);
  });
});

test("run workflow install resolves aix/workflows paths from local project source first", async () => {
  await withProject(async (projectPath) => {
    writeWorkflow(join(projectPath, "aix/workflows/local-flow"), "Local Workflow", "Local body.", "local-flow");

    const result = run(["workflow", "install", "aix/workflows/local-flow"]);
    const manifest = JSON.parse(readFileSync("aix.json", "utf8"));
    const lockfile = JSON.parse(readFileSync("aix.lock.json", "utf8"));

    assert.equal(result.exitCode, 0);
    assert.match(result.stdout, /Installed workflow local-flow/);
    assert.equal(manifest.workflow, "aix:aix/workflows/local-flow");
    assert.equal(lockfile.workflows[0].source, "aix");
    assert.equal(lockfile.workflows[0].sourceType, "local");
    assert.equal(lockfile.workflows[0].sourceUrl, undefined);
    assert.equal(lockfile.workflows[0].resolvedCommit, undefined);
    assert.equal(lockfile.skills[0].sourceType, "local");
    assert.ok(existsSync(join(projectPath, ".agents/packages/workflows/aix/local-flow/workflow.json")));
    assert.ok(existsSync(join(projectPath, ".agents/skills/alpha/SKILL.md")));

    const status = run(["status"]);
    assert.equal(status.exitCode, 0);
    assert.match(status.stdout, /Workflow[\s\S]*local-flow[\s\S]*aix\/aix\/workflows\/local-flow[\s\S]*local[\s\S]*current/);
    assert.match(status.stdout, /Workflow-owned skills[\s\S]*alpha[\s\S]*aix\/skills\/alpha[\s\S]*local/);

    writeFileSync(join(projectPath, "aix/workflows/local-flow/skills/alpha/SKILL.md"), "---\nname: alpha\n---\n\n# Alpha\n\nUpdated local workflow skill.\n", "utf8");

    const diff = run(["workflow", "diff"]);
    assert.equal(diff.exitCode, 0);
    assert.match(diff.stdout, /Updated local workflow skill/);

    const update = run(["workflow", "update"]);
    assert.equal(update.exitCode, 0);
    assert.match(update.stdout, /Updated workflow/);
    assert.match(readFileSync(join(projectPath, ".agents/skills/alpha/SKILL.md"), "utf8"), /Updated local workflow skill/);
    const updatedLockfile = JSON.parse(readFileSync("aix.lock.json", "utf8"));
    assert.equal(updatedLockfile.workflows[0].sourceType, "local");
    assert.equal(updatedLockfile.workflows[0].sourceUrl, undefined);
    assert.equal(updatedLockfile.workflows[0].resolvedCommit, undefined);
    assert.equal(updatedLockfile.skills[0].sourceType, "local");

    assert.equal(run(["workflow", "uninstall"]).exitCode, 0);
    assert.ok(existsSync(join(projectPath, "aix/workflows/local-flow/workflow.json")));
  });
});

test("run workflow install falls back to default aix source for missing local aix/workflows paths", async () => {
  const source = await createWorkflowRepo("aix-default-workflow-source-", "remote-flow", "aix/workflows/remote-flow");

  await withProject(async () => {
    const previousUrl = process.env.AIX_SOURCE_AIX_URL;
    const previousRef = process.env.AIX_SOURCE_AIX_REF;
    const previousWorkflowPath = process.env.AIX_SOURCE_AIX_WORKFLOW_PATH;

    process.env.AIX_SOURCE_AIX_URL = source;
    process.env.AIX_SOURCE_AIX_REF = "master";
    delete process.env.AIX_SOURCE_AIX_WORKFLOW_PATH;

    try {
      const result = run(["workflow", "install", "aix/workflows/remote-flow"]);
      const manifest = JSON.parse(readFileSync("aix.json", "utf8"));
      const lockfile = JSON.parse(readFileSync("aix.lock.json", "utf8"));

      assert.equal(result.exitCode, 0);
      assert.match(result.stdout, /Installed workflow remote-flow/);
      assert.equal(manifest.workflow, "aix:aix/workflows/remote-flow");
      assert.equal(manifest.sources.workflows.aix.url, source);
      assert.equal(lockfile.workflows[0].sourceType, "git");
      assert.equal(lockfile.workflows[0].sourceUrl, source);
      assert.equal(lockfile.workflows[0].sourcePath, "aix/workflows/remote-flow");
    } finally {
      if (previousUrl === undefined) {
        delete process.env.AIX_SOURCE_AIX_URL;
      } else {
        process.env.AIX_SOURCE_AIX_URL = previousUrl;
      }

      if (previousRef === undefined) {
        delete process.env.AIX_SOURCE_AIX_REF;
      } else {
        process.env.AIX_SOURCE_AIX_REF = previousRef;
      }

      if (previousWorkflowPath === undefined) {
        delete process.env.AIX_SOURCE_AIX_WORKFLOW_PATH;
      } else {
        process.env.AIX_SOURCE_AIX_WORKFLOW_PATH = previousWorkflowPath;
      }
    }
  });
});

test("runInteractive workflow install prompts for a bundled workflow when no URL is provided", async () => {
  const source = await createWorkflowRepo("aix-bundled-workflow-source-", "design-plan-execute", "aix/workflows/design-plan-execute");
  const input = new PassThrough();
  const output = new PassThrough();
  let rendered = "";

  output.on("data", (chunk) => {
    rendered += chunk.toString("utf8");
  });

  input.end("2\n");

  await withProject(async (projectPath) => {
    const previousUrl = process.env.AIX_SOURCE_AIX_URL;
    const previousRef = process.env.AIX_SOURCE_AIX_REF;
    const previousWorkflowPath = process.env.AIX_SOURCE_AIX_WORKFLOW_PATH;

    process.env.AIX_SOURCE_AIX_URL = source;
    process.env.AIX_SOURCE_AIX_REF = "master";
    delete process.env.AIX_SOURCE_AIX_WORKFLOW_PATH;

    try {
      const result = await runInteractive(["workflow", "install"], input, output);
      const manifest = JSON.parse(readFileSync("aix.json", "utf8"));

      assert.equal(result.exitCode, 0);
      assert.match(rendered, /Select a bundled workflow to install:/);
      assert.match(rendered, /1\. agile-kanban/);
      assert.match(rendered, /2\. design-plan-execute/);
      assert.match(rendered, /q - Quit/);
      assert.match(result.stdout, /Installed workflow design-plan-execute/);
      assert.equal(manifest.workflow, "aix:aix/workflows/design-plan-execute");
      assert.equal(manifest.sources.workflows.aix.url, source);
      assert.ok(existsSync(join(projectPath, ".agents/README.md")));
      assert.ok(existsSync(join(projectPath, ".agents/skills/alpha/SKILL.md")));
    } finally {
      if (previousUrl === undefined) {
        delete process.env.AIX_SOURCE_AIX_URL;
      } else {
        process.env.AIX_SOURCE_AIX_URL = previousUrl;
      }

      if (previousRef === undefined) {
        delete process.env.AIX_SOURCE_AIX_REF;
      } else {
        process.env.AIX_SOURCE_AIX_REF = previousRef;
      }

      if (previousWorkflowPath === undefined) {
        delete process.env.AIX_SOURCE_AIX_WORKFLOW_PATH;
      } else {
        process.env.AIX_SOURCE_AIX_WORKFLOW_PATH = previousWorkflowPath;
      }
    }
  });
});

test("run workflow install refuses to replace a different active workflow", async () => {
  const firstSource = await createWorkflowRepo("aix-workflow-source-");
  const secondSource = await mkdtemp(join(tmpdir(), "aix-workflow-source-"));

  writeWorkflow(secondSource, "Second Workflow", "Second body.");
  writeFileSync(join(secondSource, "workflow.json"), readFileSync(join(secondSource, "workflow.json"), "utf8").replace("fixture-workflow", "second-workflow"), "utf8");
  git(["init", "-b", "master"], secondSource);
  git(["add", "."], secondSource);
  git(["commit", "-m", "workflow"], secondSource);

  await withProject(async () => {
    assert.equal(run(["workflow", "install", firstSource, "first"]).exitCode, 0);

    const result = run(["workflow", "install", secondSource, "second"]);

    assert.equal(result.exitCode, 2);
    assert.match(result.stderr, /A workflow is already active: fixture-workflow. Run aix workflow uninstall before installing another workflow./);
  });
});

test("run workflow install refuses when a workflow is already active", async () => {
  const source = await createWorkflowRepo("aix-workflow-source-");

  await withProject(async () => {
    assert.equal(run(["workflow", "install", source, "fixture"]).exitCode, 0);

    const result = run(["workflow", "install", source, "fixture"]);

    assert.equal(result.exitCode, 2);
    assert.match(result.stderr, /A workflow is already active: fixture-workflow. Run aix workflow uninstall before installing another workflow./);
  });
});

test("workflow-owned skills cannot be deactivated directly", async () => {
  const source = await createWorkflowRepo("aix-workflow-source-");

  await withProject(async () => {
    assert.equal(run(["workflow", "install", source, "fixture"]).exitCode, 0);

    const result = run(["skill", "deactivate", "alpha"]);

    assert.equal(result.exitCode, 2);
    assert.match(result.stderr, /owned by workflow fixture-workflow/);
  });
});

test("workflow-owned roles cannot be deactivated directly", async () => {
  const source = await mkdtemp(join(tmpdir(), "aix-workflow-source-"));

  writeWorkflow(source, "Role Workflow", "Role body.", "role-workflow", { roleName: "quality-engineer" });
  git(["init", "-b", "master"], source);
  git(["add", "."], source);
  git(["commit", "-m", "workflow roles"], source);

  await withProject(async () => {
    assert.equal(run(["workflow", "install", source, "fixture"]).exitCode, 0);

    const result = run(["role", "deactivate", "quality-engineer"]);

    assert.equal(result.exitCode, 2);
    assert.match(result.stderr, /Cannot deactivate quality-engineer directly because it is owned by workflow role-workflow/);
  });
});

test("run workflow diff reports role source changes and workflow update applies them", async () => {
  const source = await mkdtemp(join(tmpdir(), "aix-workflow-source-"));

  writeWorkflow(source, "Role Workflow", "Role body.", "role-workflow", { roleName: "quality-engineer" });
  git(["init", "-b", "master"], source);
  git(["add", "."], source);
  git(["commit", "-m", "workflow roles"], source);

  await withProject(async () => {
    const previousCache = process.env.AIX_CACHE_DIR;
    const cacheRoot = join(tmpdir(), `aix-workflow-role-cache-${Date.now()}`);
    process.env.AIX_CACHE_DIR = cacheRoot;

    try {
      assert.equal(run(["workflow", "install", source, "fixture"]).exitCode, 0);

      writeFileSync(
        join(source, "roles/project-dev/quality-engineer.md"),
        validRoleMarkdown("quality-engineer").replace("Return findings, decisions", "Return updated findings, decisions"),
        "utf8"
      );
      git(["add", "."], source);
      git(["commit", "-m", "update workflow role"], source);

      const diff = run(["workflow", "diff"]);
      assert.equal(diff.exitCode, 0);
      assert.match(diff.stdout, /updated findings/);

      const update = run(["workflow", "update"]);
      assert.equal(update.exitCode, 0);
      assert.match(update.stdout, /Updated workflow/);
      assert.match(readFileSync(".agents/roles/quality-engineer.md", "utf8"), /updated findings/);
    } finally {
      if (previousCache === undefined) {
        delete process.env.AIX_CACHE_DIR;
      } else {
        process.env.AIX_CACHE_DIR = previousCache;
      }
    }
  });
});

test("run workflow update removes workflow-owned roles deleted from the source", async () => {
  const source = await mkdtemp(join(tmpdir(), "aix-workflow-source-"));

  writeWorkflow(source, "Role Workflow", "Role body.", "role-workflow", { roleName: "quality-engineer" });
  git(["init", "-b", "master"], source);
  git(["add", "."], source);
  git(["commit", "-m", "workflow roles"], source);

  await withProject(async () => {
    const previousCache = process.env.AIX_CACHE_DIR;
    const cacheRoot = join(tmpdir(), `aix-workflow-role-cache-${Date.now()}`);
    process.env.AIX_CACHE_DIR = cacheRoot;

    try {
      assert.equal(run(["workflow", "install", source, "fixture"]).exitCode, 0);
      assert.equal(existsSync(".agents/roles/quality-engineer.md"), true);

      rmSync(join(source, "roles/project-dev/quality-engineer.md"));
      git(["add", "."], source);
      git(["commit", "-m", "remove workflow role"], source);

      const update = run(["workflow", "update"]);
      const lockfile = JSON.parse(readFileSync("aix.lock.json", "utf8"));
      const status = run(["status"]);
      const verify = run(["verify"]);

      assert.equal(update.exitCode, 0);
      assert.match(update.stdout, /Updated workflow/);
      assert.equal(existsSync(".agents/roles/quality-engineer.md"), false);
      assert.deepEqual(lockfile.roles, []);
      assert.equal(lockfile.workflows[0].roles, undefined);
      assert.match(status.stdout, /Workflow[\s\S]*Roles[\s\S]*0/);
      assert.match(status.stdout, /Workflow-owned roles\n  none/);
      assert.equal(verify.exitCode, 0);
    } finally {
      if (previousCache === undefined) {
        delete process.env.AIX_CACHE_DIR;
      } else {
        process.env.AIX_CACHE_DIR = previousCache;
      }
    }
  });
});

test("run workflow uninstall removes workflow-owned roles after drift checks", async () => {
  const source = await mkdtemp(join(tmpdir(), "aix-workflow-source-"));

  writeWorkflow(source, "Role Workflow", "Role body.", "role-workflow", { roleName: "quality-engineer" });
  git(["init", "-b", "master"], source);
  git(["add", "."], source);
  git(["commit", "-m", "workflow roles"], source);

  await withProject(async () => {
    assert.equal(run(["workflow", "install", source, "fixture"]).exitCode, 0);
    writeFileSync(".agents/roles/quality-engineer.md", "local role edit\n", "utf8");

    const blockedRemove = run(["workflow", "uninstall"]);
    assert.equal(blockedRemove.exitCode, 2);
    assert.match(blockedRemove.stderr, /Refusing to remove modified active role/);

    writeFileSync(".agents/roles/quality-engineer.md", validRoleMarkdown("quality-engineer"), "utf8");
    const remove = run(["workflow", "uninstall"]);
    const lockfile = JSON.parse(readFileSync("aix.lock.json", "utf8"));

    assert.equal(remove.exitCode, 0);
    assert.match(remove.stdout, /Removed 1 workflow-owned roles/);
    assert.equal(existsSync(".agents/roles/quality-engineer.md"), false);
    assert.deepEqual(lockfile.roles, []);
  });
});

test("run workflow diff reports source changes and workflow update applies them", async () => {
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
    writeFileSync(join(source, "templates/plan.md"), "{{ section:status }}\nUpdated template.\n", "utf8");
    git(["add", "."], source);
    git(["commit", "-m", "update workflow"], source);

    const diff = run(["workflow", "diff"]);
    assert.equal(diff.exitCode, 0);
    assert.match(diff.stdout, /Updated body/);
    assert.match(diff.stdout, /Updated template/);

    const update = run(["workflow", "update"]);
    assert.equal(update.exitCode, 0);
    assert.match(update.stdout, /Updated workflow/);
    assert.match(readFileSync(".agents/skills/alpha/SKILL.md", "utf8"), /Updated body/);
    assert.match(readFileSync(".agents/packages/workflows/fixture/fixture-workflow/templates/plan.md", "utf8"), /Updated template/);
    } finally {
      if (previousCache === undefined) {
        delete process.env.AIX_CACHE_DIR;
      } else {
        process.env.AIX_CACHE_DIR = previousCache;
      }
    }
  });
});

test("run verify reports workflow doc drift and workflow uninstall preserves project AGENTS text", async () => {
  const source = await createWorkflowRepo("aix-workflow-source-");

  await withProject(async () => {
    writeFileSync("AGENTS.md", "# Project Rules\n\nKeep me.\n", "utf8");
    assert.equal(run(["workflow", "install", source, "fixture"]).exitCode, 0);
    writeFileSync(".agents/workflow.md", "# Local edit\n", "utf8");

    const verify = run(["verify"]);
    assert.equal(verify.exitCode, 2);
    assert.match(verify.stdout, /Workflow doc hash changed: .agents\/workflow.md/);

    writeFileSync(".agents/workflow.md", "# Workflow\n", "utf8");
    writeFileSync(".agents/packages/workflows/fixture/fixture-workflow/templates/plan.md", "local template edit\n", "utf8");

    const templateDrift = run(["verify"]);
    assert.equal(templateDrift.exitCode, 2);
    assert.match(templateDrift.stdout, /Workflow package has drift: .agents\/packages\/workflows\/fixture\/fixture-workflow/);
    assert.match(templateDrift.stdout, /Workflow template hash changed: .agents\/packages\/workflows\/fixture\/fixture-workflow\/templates\/plan.md/);

    const blockedRemove = run(["workflow", "uninstall"]);
    assert.equal(blockedRemove.exitCode, 2);
    assert.match(blockedRemove.stderr, /Refusing to remove modified workflow package/);

    writeFileSync(".agents/packages/workflows/fixture/fixture-workflow/templates/plan.md", "{{ section:status }}\n{{ repeat:phases section:phase }}\n", "utf8");
    const remove = run(["workflow", "uninstall"]);

    assert.equal(remove.exitCode, 0);
    assert.match(remove.stdout, /Removed workflow fixture-workflow/);
    assert.equal(existsSync(".agents/skills/alpha"), false);
    assert.equal(existsSync(".agents/README.md"), false);
    assert.match(readFileSync("AGENTS.md", "utf8"), /Keep me/);
    assert.doesNotMatch(readFileSync("AGENTS.md", "utf8"), /aix:workflow fixture-workflow/);
  });
});

test("old remove workflow syntax is not a compatibility alias", async () => {
  const source = await createWorkflowRepo("aix-workflow-source-");

  await withProject(async () => {
    assert.equal(run(["workflow", "install", source, "fixture"]).exitCode, 0);

    const result = run(["remove", "workflow"]);

    assert.equal(result.exitCode, 1);
    assert.match(result.stderr, /Unknown command: remove/);
    assert.equal(existsSync(".agents/skills/alpha"), true);
  });
});
