import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { run } from "../dist/cli.js";

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

async function createGitSource() {
  const directory = await mkdtemp(join(tmpdir(), "aix-diff-source-"));

  mkdirSync(join(directory, "skills/demo"), { recursive: true });
  writeFileSync(join(directory, "skills/demo/SKILL.md"), "---\nname: demo\n---\n\n# Demo v1\n", "utf8");
  writeFileSync(join(directory, "skills/demo/notes.md"), "notes v1\n", "utf8");
  mkdirSync(join(directory, "skills/other"), { recursive: true });
  writeFileSync(join(directory, "skills/other/SKILL.md"), "---\nname: other\n---\n\n# Other v1\n", "utf8");
  writeFileSync(join(directory, "skills/other/notes.md"), "other notes v1\n", "utf8");
  git(["init", "-b", "main"], directory);
  git(["add", "."], directory);
  git(["commit", "-m", "initial"], directory);

  return { directory };
}

function commitSourceUpdate(directory) {
  writeFileSync(join(directory, "skills/demo/SKILL.md"), "---\nname: demo\n---\n\n# Demo v2\n", "utf8");
  writeFileSync(join(directory, "skills/demo/notes.md"), "notes v2\n", "utf8");
  writeFileSync(join(directory, "skills/other/SKILL.md"), "---\nname: other\n---\n\n# Other v2\n", "utf8");
  writeFileSync(join(directory, "skills/other/notes.md"), "other notes v2\n", "utf8");
  git(["add", "."], directory);
  git(["commit", "-m", "update demo"], directory);
}

async function withProject(callback) {
  const gitSource = await createGitSource();
  const cacheRoot = await mkdtemp(join(tmpdir(), "aix-diff-cache-"));
  const projectRoot = await mkdtemp(join(tmpdir(), "aix-diff-project-"));
  const previousCwd = process.cwd();
  const previousCache = process.env.AIX_CACHE_DIR;

  process.chdir(projectRoot);
  process.env.AIX_CACHE_DIR = cacheRoot;

  try {
    assert.equal(run(["skills", "add", gitSource.directory, "fixture"]).exitCode, 0);
    await callback(projectRoot, gitSource);
  } finally {
    if (previousCache === undefined) {
      delete process.env.AIX_CACHE_DIR;
    } else {
      process.env.AIX_CACHE_DIR = previousCache;
    }

    process.chdir(previousCwd);
  }
}

test("run skills diff reports source changes without mutating package files or the lockfile", async () => {
  await withProject(async (projectRoot, gitSource) => {
    assert.equal(run(["skill", "activate", "fixture/skills/demo"]).exitCode, 0);
    const originalLockfile = readFileSync(join(projectRoot, "aix.lock.json"), "utf8");
    commitSourceUpdate(gitSource.directory);

    const result = run(["skills", "diff"]);

    assert.equal(result.exitCode, 0);
    assert.match(result.stdout, /Diff for fixture\/skills\/demo as demo:/);
    assert.match(result.stdout, /-# Demo v1/);
    assert.match(result.stdout, /\+# Demo v2/);
    assert.match(result.stdout, /-notes v1/);
    assert.match(result.stdout, /\+notes v2/);
    assert.equal(readFileSync(join(projectRoot, "aix.lock.json"), "utf8"), originalLockfile);
    assert.equal(readFileSync(join(projectRoot, ".agents/packages/skills/fixture/skills/demo/notes.md"), "utf8"), "notes v1\n");
  });
});

test("run skills diff reports no changes when locked packages match the source", async () => {
  await withProject(async () => {
    assert.equal(run(["skill", "activate", "fixture/skills/demo"]).exitCode, 0);

    const result = run(["skills", "diff"]);

    assert.equal(result.exitCode, 0);
    assert.equal(result.stdout, "No skill changes.");
  });
});

test("run skills diff with a target reports only the matching locked skill", async () => {
  await withProject(async (projectRoot, gitSource) => {
    assert.equal(run(["skill", "activate", "fixture/skills/demo"]).exitCode, 0);
    assert.equal(run(["skill", "activate", "fixture/skills/other"]).exitCode, 0);
    const originalLockfile = readFileSync(join(projectRoot, "aix.lock.json"), "utf8");
    commitSourceUpdate(gitSource.directory);

    const result = run(["skills", "diff", "fixture/skills/demo"]);

    assert.equal(result.exitCode, 0);
    assert.match(result.stdout, /Diff for fixture\/skills\/demo as demo:/);
    assert.doesNotMatch(result.stdout, /fixture\/skills\/other/);
    assert.match(result.stdout, /-notes v1/);
    assert.match(result.stdout, /\+notes v2/);
    assert.equal(readFileSync(join(projectRoot, "aix.lock.json"), "utf8"), originalLockfile);
  });
});

test("run skills diff with a target fails for unknown locked skills", async () => {
  await withProject(async () => {
    const result = run(["skills", "diff", "fixture/skills/missing"]);

    assert.equal(result.exitCode, 2);
    assert.equal(result.stderr, "Unknown locked skill: fixture/skills/missing");
  });
});

test("run skills diff reports no changes when no skills are locked", async () => {
  await withProject(async () => {
    const result = run(["skills", "diff"]);

    assert.equal(result.exitCode, 0);
    assert.equal(result.stdout, "No skill changes.");
  });
});
