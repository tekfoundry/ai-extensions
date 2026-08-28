import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PassThrough } from "node:stream";
import { test } from "node:test";
import { run, runInteractive } from "../dist/cli.js";

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

function roleMarkdown() {
  return `---
name: quality-engineer
description: Designs targeted verification for planned work.
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

function roleGuidanceMarkdown(body = "Use focused role guidance.") {
  return `---
uses_guidance:
  - activities/verification
  - activities/review
---

# Quality engineer guidance

${body}
`;
}

function workflowGuidanceMarkdown(name, skill = "task-execute") {
  return `---
applies_to:
  roles:
    - quality-engineer
  skills:
    - ${skill}
---

# ${name} guidance

Use ${name} guidance.
`;
}

function writeGuidance(directory) {
  mkdirSync(join(directory, "guidance/activities"), { recursive: true });
  writeFileSync(join(directory, "guidance/README.md"), "# Workflow guidance\n\nRead relevant guidance.\n", "utf8");
  writeFileSync(join(directory, "guidance/shared.md"), workflowGuidanceMarkdown("shared", "phase-execute"), "utf8");

  for (const activity of ["planning", "implementation", "verification", "review", "documentation"]) {
    writeFileSync(
      join(directory, `guidance/activities/${activity}.md`),
      workflowGuidanceMarkdown(activity, activity === "planning" ? "plan-create" : "task-execute"),
      "utf8"
    );
  }
}

function writeWorkflow(directory) {
  mkdirSync(join(directory, "skills/alpha"), { recursive: true });
  mkdirSync(join(directory, "roles/project-dev/quality-engineer"), { recursive: true });
  writeGuidance(directory);
  writeFileSync(
    join(directory, "workflow.json"),
    JSON.stringify(
      {
        name: "guidance-workflow",
        docs: [],
        guidanceDir: "guidance",
        skillsDir: "skills"
      },
      null,
      2
    ) + "\n",
    "utf8"
  );
  writeFileSync(join(directory, "skills/alpha/SKILL.md"), "---\nname: alpha\n---\n\n# Alpha\n", "utf8");
  writeFileSync(join(directory, "roles/project-dev/quality-engineer/ROLE.md"), roleMarkdown(), "utf8");
  writeFileSync(join(directory, "roles/project-dev/quality-engineer/GUIDANCE.md"), roleGuidanceMarkdown(), "utf8");
}

async function createWorkflowRepo() {
  const root = await mkdtemp(join(tmpdir(), "aix-guidance-workflow-"));

  writeWorkflow(root);
  git(["init", "-b", "master"], root);
  git(["add", "."], root);
  git(["commit", "-m", "workflow guidance"], root);

  return root;
}

async function withProject(callback) {
  const projectPath = await mkdtemp(join(tmpdir(), "aix-guidance-project-"));
  const previousCwd = process.cwd();

  process.chdir(projectPath);

  try {
    await callback(projectPath);
  } finally {
    process.chdir(previousCwd);
  }
}

async function installGuidanceWorkflow(callback) {
  const source = await createWorkflowRepo();

  await withProject(async (projectPath) => {
    const previousCache = process.env.AIX_CACHE_DIR;
    process.env.AIX_CACHE_DIR = join(projectPath, ".cache");

    try {
      const install = run(["workflow", "install", source, "fixture"]);

      assert.equal(install.exitCode, 0, install.stderr);
      await callback(projectPath);
    } finally {
      if (previousCache === undefined) {
        delete process.env.AIX_CACHE_DIR;
      } else {
        process.env.AIX_CACHE_DIR = previousCache;
      }
    }
  });
}

test("guidance list aggregates workflow and active role guidance", async () => {
  await installGuidanceWorkflow(async () => {
    const list = run(["guidance", "list"]);

    assert.equal(list.exitCode, 0, list.stderr);
    assert.match(list.stdout, /Guidance for guidance-workflow/);
    assert.match(list.stdout, /shared\s+shared\s+workflow:fixture\/guidance-workflow\s+origin\s+role:quality-engineer,skill:phase-execute/);
    assert.match(list.stdout, /activities\/verification\s+activity\s+workflow:fixture\/guidance-workflow\s+origin/);
    assert.match(list.stdout, /roles\/quality-engineer\s+role\s+role:workflow\/guidance-workflow\s+editable\s+activities\/verification,activities\/review/);
    assert.doesNotMatch(list.stdout, /README/);
  });
});

test("guidance publish copies workflow guidance and reports role guidance as editable", async () => {
  await installGuidanceWorkflow(async (projectPath) => {
    const publish = run(["guidance", "publish"]);

    assert.equal(publish.exitCode, 0, publish.stderr);
    assert.match(publish.stdout, /Published 6 workflow guidance documents/);
    assert.match(publish.stdout, /Found 1 active role guidance documents already editable/);
    assert.equal(existsSync(join(projectPath, ".agents/guidance/shared.md")), true);
    assert.equal(existsSync(join(projectPath, ".agents/guidance/activities/verification.md")), true);
    assert.equal(existsSync(join(projectPath, ".agents/guidance/README.md")), false);

    const list = run(["guidance", "list"]);
    assert.match(list.stdout, /shared\s+shared\s+workflow:fixture\/guidance-workflow\s+editable/);
  });
});

test("guidance publish refuses targeted publishing and local edits", async () => {
  await installGuidanceWorkflow(async () => {
    const targeted = run(["guidance", "publish", "shared"]);

    assert.equal(targeted.exitCode, 1);
    assert.match(targeted.stderr, /Publishing exposes the complete active guidance set/);

    assert.equal(run(["guidance", "publish"]).exitCode, 0);
    writeFileSync(".agents/guidance/shared.md", "local guidance edit\n", "utf8");

    const republish = run(["guidance", "publish"]);
    assert.equal(republish.exitCode, 2);
    assert.match(republish.stderr, /Refusing to overwrite locally edited guidance/);
  });
});

test("guidance diff lists valid commands and diffs workflow and role guidance", async () => {
  await installGuidanceWorkflow(async () => {
    assert.equal(run(["guidance", "publish"]).exitCode, 0);
    writeFileSync(".agents/guidance/activities/verification.md", "Local verification guidance.\n", "utf8");
    writeFileSync(".agents/roles/quality-engineer/GUIDANCE.md", roleGuidanceMarkdown("Use local role guidance."), "utf8");

    const commands = run(["guidance", "diff"]);
    assert.equal(commands.exitCode, 0, commands.stderr);
    assert.match(commands.stdout, /aix guidance diff shared/);
    assert.match(commands.stdout, /aix guidance diff activities\/verification/);
    assert.match(commands.stdout, /aix guidance diff roles\/quality-engineer/);

    const workflowDiff = run(["guidance", "diff", "activities/verification"]);
    assert.equal(workflowDiff.exitCode, 0, workflowDiff.stderr);
    assert.match(workflowDiff.stdout, /Diff for guidance activities\/verification/);
    assert.match(workflowDiff.stdout, /Local verification guidance/);

    const roleDiff = run(["guidance", "diff", "roles/quality-engineer"]);
    assert.equal(roleDiff.exitCode, 0, roleDiff.stderr);
    assert.match(roleDiff.stdout, /Use local role guidance/);
  });
});

test("guidance reset handles workflow overrides and role guidance", async () => {
  await installGuidanceWorkflow(async () => {
    assert.equal(run(["guidance", "publish"]).exitCode, 0);
    writeFileSync(".agents/guidance/activities/review.md", "Local review guidance.\n", "utf8");
    writeFileSync(".agents/guidance/local-note.md", "Project-owned note.\n", "utf8");
    writeFileSync(".agents/roles/quality-engineer/GUIDANCE.md", roleGuidanceMarkdown("Use local role guidance."), "utf8");

    const workflowReset = run(["guidance", "reset", "activities/review"]);
    assert.equal(workflowReset.exitCode, 0, workflowReset.stderr);
    assert.match(workflowReset.stdout, /Reset guidance activities\/review/);
    assert.equal(existsSync(".agents/guidance/activities/review.md"), false);
    assert.equal(readFileSync(".agents/guidance/local-note.md", "utf8"), "Project-owned note.\n");

    const roleReset = run(["guidance", "reset", "roles/quality-engineer"]);
    assert.equal(roleReset.exitCode, 0, roleReset.stderr);
    assert.match(roleReset.stdout, /Reset guidance roles\/quality-engineer/);
    assert.match(readFileSync(".agents/roles/quality-engineer/GUIDANCE.md", "utf8"), /Use focused role guidance/);
  });
});

test("guidance reset --all previews changes and requires confirmation", async () => {
  await installGuidanceWorkflow(async () => {
    assert.equal(run(["guidance", "publish"]).exitCode, 0);
    writeFileSync(".agents/guidance/shared.md", "Local shared guidance.\n", "utf8");
    writeFileSync(".agents/guidance/local-note.md", "Project-owned note.\n", "utf8");
    writeFileSync(".agents/roles/quality-engineer/GUIDANCE.md", roleGuidanceMarkdown("Use local role guidance."), "utf8");

    const cancelledInput = new PassThrough();
    const cancelledOutput = new PassThrough();
    cancelledInput.end("no\n");

    const cancelled = await runInteractive(["guidance", "reset", "--all"], cancelledInput, cancelledOutput);

    assert.equal(cancelled.exitCode, 0, cancelled.stderr);
    assert.equal(cancelled.stdout, "Guidance reset cancelled.");
    assert.match(cancelledOutput.read().toString(), /Guidance customizations to reset/);
    assert.equal(existsSync(".agents/guidance/shared.md"), true);

    const input = new PassThrough();
    const output = new PassThrough();
    input.end("reset guidance\n");

    const reset = await runInteractive(["guidance", "reset", "--all"], input, output);

    assert.equal(reset.exitCode, 0, reset.stderr);
    assert.match(output.read().toString(), /Type reset guidance to continue/);
    assert.match(reset.stdout, /Reset guidance customizations for guidance-workflow/);
    assert.equal(existsSync(".agents/guidance/shared.md"), false);
    assert.equal(existsSync(".agents/guidance/activities/verification.md"), false);
    assert.equal(readFileSync(".agents/guidance/local-note.md", "utf8"), "Project-owned note.\n");
    assert.match(readFileSync(".agents/roles/quality-engineer/GUIDANCE.md", "utf8"), /Use focused role guidance/);
  });
});

test("guidance commands report missing workflow and unknown names", async () => {
  await withProject(async () => {
    const missing = run(["guidance", "list"]);
    assert.equal(missing.exitCode, 2);
    assert.match(missing.stderr, /No active workflow is installed/);
  });

  await installGuidanceWorkflow(async () => {
    const unknown = run(["guidance", "diff", "missing"]);
    assert.equal(unknown.exitCode, 2);
    assert.match(unknown.stderr, /Unknown guidance document: missing/);

    const nonInteractiveAll = run(["guidance", "reset", "--all"]);
    assert.equal(nonInteractiveAll.exitCode, 1);
    assert.match(nonInteractiveAll.stderr, /Use interactive `aix guidance reset --all`/);
  });
});
