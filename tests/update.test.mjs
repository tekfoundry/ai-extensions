import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
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
  const directory = await mkdtemp(join(tmpdir(), "aix-update-source-"));

  mkdirSync(join(directory, "skills/demo"), { recursive: true });
  writeFileSync(join(directory, "skills/demo/SKILL.md"), "---\nname: demo\n---\n\n# Demo v1\n", "utf8");
  writeFileSync(join(directory, "skills/demo/notes.md"), "notes v1\n", "utf8");
  mkdirSync(join(directory, "skills/other"), { recursive: true });
  writeFileSync(join(directory, "skills/other/SKILL.md"), "---\nname: other\n---\n\n# Other v1\n", "utf8");
  writeFileSync(join(directory, "skills/other/notes.md"), "other notes v1\n", "utf8");
  git(["init", "-b", "main"], directory);
  git(["add", "."], directory);
  git(["commit", "-m", "initial"], directory);

  return {
    directory,
    initialCommit: git(["rev-parse", "HEAD"], directory)
  };
}

function commitSourceUpdate(directory) {
  writeFileSync(join(directory, "skills/demo/SKILL.md"), "---\nname: demo\n---\n\n# Demo v2\n", "utf8");
  writeFileSync(join(directory, "skills/demo/notes.md"), "notes v2\n", "utf8");
  writeFileSync(join(directory, "skills/other/SKILL.md"), "---\nname: other\n---\n\n# Other v2\n", "utf8");
  writeFileSync(join(directory, "skills/other/notes.md"), "other notes v2\n", "utf8");
  git(["add", "."], directory);
  git(["commit", "-m", "update demo"], directory);

  return git(["rev-parse", "HEAD"], directory);
}

async function withProject(callback) {
  const gitSource = await createGitSource();
  const cacheRoot = await mkdtemp(join(tmpdir(), "aix-update-cache-"));
  const projectRoot = await mkdtemp(join(tmpdir(), "aix-update-project-"));
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

test("run skills update refreshes all locked direct skill packages and hashes", async () => {
  await withProject(async (projectRoot, gitSource) => {
    assert.equal(run(["skill", "activate", "fixture/skills/demo"]).exitCode, 0);
    const updatedCommit = commitSourceUpdate(gitSource.directory);

    const result = run(["skills", "update"]);
    const lockfile = JSON.parse(readFileSync(join(projectRoot, "aix.lock.json"), "utf8"));

    assert.equal(result.exitCode, 0);
    assert.match(result.stdout, /Updated locked skills:/);
    assert.match(result.stdout, /- fixture\/skills\/demo as demo/);
    assert.equal(lockfile.skills[0].resolvedCommit, updatedCommit);
    assert.equal(readFileSync(join(projectRoot, ".agents/packages/skills/fixture/skills/demo/notes.md"), "utf8"), "notes v2\n");
    assert.equal(readFileSync(join(projectRoot, ".agents/skills/demo/notes.md"), "utf8"), "notes v2\n");
    assert.equal(lockfile.skills[0].packageFiles.find((file) => file.path === "notes.md")?.sha256, lockfile.skills[0].activeFiles.find((file) => file.path === "notes.md")?.sha256);
  });
});

test("run skills update refreshes aliased active wrappers without changing the active name", async () => {
  await withProject(async (projectRoot, gitSource) => {
    assert.equal(run(["skill", "activate", "fixture/skills/demo", "demo-alias"]).exitCode, 0);
    commitSourceUpdate(gitSource.directory);

    const result = run(["skills", "update"]);
    const lockfile = JSON.parse(readFileSync(join(projectRoot, "aix.lock.json"), "utf8"));
    const activeSkill = readFileSync(join(projectRoot, ".agents/skills/demo-alias/SKILL.md"), "utf8");

    assert.equal(result.exitCode, 0);
    assert.match(result.stdout, /- fixture\/skills\/demo as demo-alias/);
    assert.match(activeSkill, /^name: demo-alias$/m);
    assert.match(activeSkill, /# Demo v2/);
    assert.equal(readFileSync(join(projectRoot, ".agents/packages/skills/fixture/skills/demo/SKILL.md"), "utf8"), "---\nname: demo\n---\n\n# Demo v2\n");
    assert.equal(lockfile.skills[0].activeName, "demo-alias");
  });
});

test("run skills update refuses package drift before changing files or lockfile state", async () => {
  await withProject(async (projectRoot, gitSource) => {
    assert.equal(run(["skill", "activate", "fixture/skills/demo"]).exitCode, 0);
    const originalLockfile = readFileSync(join(projectRoot, "aix.lock.json"), "utf8");
    commitSourceUpdate(gitSource.directory);
    writeFileSync(join(projectRoot, ".agents/packages/skills/fixture/skills/demo/notes.md"), "local edit\n", "utf8");

    const result = run(["skills", "update"]);

    assert.equal(result.exitCode, 2);
    assert.match(result.stderr, /Refusing to update modified package: \.agents\/packages\/skills\/fixture\/skills\/demo/);
    assert.equal(readFileSync(join(projectRoot, "aix.lock.json"), "utf8"), originalLockfile);
    assert.equal(readFileSync(join(projectRoot, ".agents/packages/skills/fixture/skills/demo/notes.md"), "utf8"), "local edit\n");
    assert.equal(existsSync(join(projectRoot, ".agents/skills/demo/notes.md")), true);
  });
});

test("run skills update refuses active drift before changing files or lockfile state", async () => {
  await withProject(async (projectRoot, gitSource) => {
    assert.equal(run(["skill", "activate", "fixture/skills/demo", "demo-alias"]).exitCode, 0);
    const originalLockfile = readFileSync(join(projectRoot, "aix.lock.json"), "utf8");
    commitSourceUpdate(gitSource.directory);
    writeFileSync(join(projectRoot, ".agents/skills/demo-alias/SKILL.md"), "---\nname: edited\n---\n", "utf8");

    const result = run(["skills", "update"]);

    assert.equal(result.exitCode, 2);
    assert.match(result.stderr, /Refusing to update modified active skill: \.agents\/skills\/demo-alias/);
    assert.equal(readFileSync(join(projectRoot, "aix.lock.json"), "utf8"), originalLockfile);
    assert.equal(readFileSync(join(projectRoot, ".agents/packages/skills/fixture/skills/demo/notes.md"), "utf8"), "notes v1\n");
    assert.match(readFileSync(join(projectRoot, ".agents/skills/demo-alias/SKILL.md"), "utf8"), /^name: edited$/m);
  });
});

test("run skills update with a target refreshes only the matching locked skill", async () => {
  await withProject(async (projectRoot, gitSource) => {
    assert.equal(run(["skill", "activate", "fixture/skills/demo"]).exitCode, 0);
    assert.equal(run(["skill", "activate", "fixture/skills/other"]).exitCode, 0);
    const updatedCommit = commitSourceUpdate(gitSource.directory);

    const result = run(["skills", "update", "fixture/skills/demo"]);
    const lockfile = JSON.parse(readFileSync(join(projectRoot, "aix.lock.json"), "utf8"));
    const demo = lockfile.skills.find((skill) => skill.sourcePath === "skills/demo");
    const other = lockfile.skills.find((skill) => skill.sourcePath === "skills/other");

    assert.equal(result.exitCode, 0);
    assert.match(result.stdout, /- fixture\/skills\/demo as demo/);
    assert.doesNotMatch(result.stdout, /fixture\/skills\/other/);
    assert.equal(demo.resolvedCommit, updatedCommit);
    assert.equal(other.resolvedCommit, gitSource.initialCommit);
    assert.equal(readFileSync(join(projectRoot, ".agents/packages/skills/fixture/skills/demo/notes.md"), "utf8"), "notes v2\n");
    assert.equal(readFileSync(join(projectRoot, ".agents/packages/skills/fixture/skills/other/notes.md"), "utf8"), "other notes v1\n");
  });
});

test("run skills update with a target fails for unknown locked skills", async () => {
  await withProject(async () => {
    const result = run(["skills", "update", "fixture/skills/missing"]);

    assert.equal(result.exitCode, 2);
    assert.equal(result.stderr, "Unknown locked skill: fixture/skills/missing");
  });
});

test("run skills update reports when no skills are locked", async () => {
  await withProject(async () => {
    const result = run(["skills", "update"]);

    assert.equal(result.exitCode, 0);
    assert.equal(result.stdout, "No locked skills to update.");
  });
});

test("run update composes workflow update and skills update", async () => {
  await withProject(async () => {
    const result = run(["update"]);

    assert.equal(result.exitCode, 0);
    assert.equal(result.stdout, "No active workflow to update.\n\nNo locked skills to update.");
  });
});
