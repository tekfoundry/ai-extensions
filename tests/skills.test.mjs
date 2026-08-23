import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { test } from "node:test";
import { run } from "../dist/cli.js";
import { discoverSkills } from "../dist/skills.js";

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

async function createProject() {
  const projectPath = await mkdtemp(join(tmpdir(), "aix-list-project-"));

  return projectPath;
}

function assertNoManagedProjectWrites(projectPath) {
  assert.equal(existsSync(join(projectPath, "aix.lock.json")), false);
  assert.equal(existsSync(join(projectPath, ".agents/packages")), false);
  assert.equal(existsSync(join(projectPath, ".agents/packages/skills")), false);
  assert.equal(existsSync(join(projectPath, ".agents/skills")), false);
}

async function createAixGitSource() {
  const directory = await mkdtemp(join(tmpdir(), "aix-list-aix-"));

  mkdirSync(join(directory, "aix"), { recursive: true });
  cpSync(resolve(repoRoot, "aix/skills"), join(directory, "aix/skills"), { recursive: true });
  git(["init", "-b", "master"], directory);
  git(["add", "."], directory);
  git(["commit", "-m", "aix skills"], directory);

  return directory;
}

async function createNestedGitSource() {
  const directory = await mkdtemp(join(tmpdir(), "aix-list-git-"));

  mkdirSync(join(directory, "skills/flat"), { recursive: true });
  mkdirSync(join(directory, "skills/group/nested"), { recursive: true });
  writeFileSync(join(directory, "skills/flat/SKILL.md"), "---\nname: flat\n---\n", "utf8");
  writeFileSync(join(directory, "skills/group/nested/SKILL.md"), "---\nname: nested\n---\n", "utf8");
  git(["init", "-b", "main"], directory);
  git(["add", "."], directory);
  git(["commit", "-m", "skills"], directory);

  return directory;
}

test("discoverSkills finds flat and nested skill directories", async () => {
  const source = await createNestedGitSource();

  assert.deepEqual(discoverSkills(join(source, "skills")), [
    {
      path: "flat",
      name: "flat"
    },
    {
      path: "group/nested",
      name: "nested"
    }
  ]);
});

test("discoverSkills rejects SKILL.md without a usable name", async () => {
  const directory = await mkdtemp(join(tmpdir(), "aix-invalid-skill-"));

  mkdirSync(join(directory, "bad"), { recursive: true });
  writeFileSync(join(directory, "bad/SKILL.md"), "---\ndescription: no name\n---\n", "utf8");

  assert.throws(
    () => discoverSkills(directory),
    (error) => error.message.endsWith("bad/SKILL.md must declare a name.")
  );
});

test("run skills list reports aix git source skills without mutating project files", async () => {
  const gitSource = await createAixGitSource();
  const projectPath = await createProject();
  const previousCwd = process.cwd();
  const cacheRoot = await mkdtemp(join(tmpdir(), "aix-list-cache-"));
  const previousCache = process.env.AIX_CACHE_DIR;

  process.chdir(projectPath);
  process.env.AIX_CACHE_DIR = cacheRoot;

  try {
    writeFileSync(
      "aix.json",
      JSON.stringify(
        {
          sources: {
            aix: {
              type: "git",
              url: gitSource,
              path: "aix/skills",
              ref: "master"
            }
          },
          skills: []
        },
        null,
        2
      ) + "\n",
      "utf8"
    );
    const beforeManifest = readFileSync("aix.json", "utf8");
    const result = run(["skills", "list", "aix"]);

    assert.equal(result.exitCode, 0);
    assert.match(result.stdout, /Skills in aix:/);
    assert.match(result.stdout, /Path\s+Name/);
    assert.match(result.stdout, /discover-skill\s+discover-skill/);
    assert.equal(readFileSync("aix.json", "utf8"), beforeManifest);
    assertNoManagedProjectWrites(projectPath);
  } finally {
    if (previousCache === undefined) {
      delete process.env.AIX_CACHE_DIR;
    } else {
      process.env.AIX_CACHE_DIR = previousCache;
    }

    process.chdir(previousCwd);
  }
});

test("run skills list reports git source skills from a manifest source", async () => {
  const gitSource = await createNestedGitSource();
  const projectPath = await createProject();
  const previousCwd = process.cwd();
  const cacheRoot = await mkdtemp(join(tmpdir(), "aix-list-cache-"));
  const previousCache = process.env.AIX_CACHE_DIR;

  process.chdir(projectPath);
  process.env.AIX_CACHE_DIR = cacheRoot;

  try {
    writeFileSync(
      "aix.json",
      JSON.stringify(
        {
          sources: {
            fixture: {
              type: "git",
              url: gitSource,
              path: "skills",
              ref: "main"
            }
          },
          skills: []
        },
        null,
        2
      ) + "\n",
      "utf8"
    );

    const beforeManifest = readFileSync("aix.json", "utf8");
    const result = run(["skills", "list", "fixture"]);

    assert.equal(result.exitCode, 0);
    assert.match(result.stdout, /Skills in fixture:/);
    assert.match(result.stdout, /Path\s+Name/);
    assert.match(result.stdout, /flat\s+flat/);
    assert.match(result.stdout, /group\/nested\s+nested/);
    assert.equal(readFileSync("aix.json", "utf8"), beforeManifest);
    assertNoManagedProjectWrites(projectPath);
  } finally {
    if (previousCache === undefined) {
      delete process.env.AIX_CACHE_DIR;
    } else {
      process.env.AIX_CACHE_DIR = previousCache;
    }

    process.chdir(previousCwd);
  }
});

test("run skills list without a source uses the interactive path", async () => {
  const gitSource = await createNestedGitSource();
  const projectPath = await createProject();
  const previousCwd = process.cwd();

  process.chdir(projectPath);

  try {
    writeFileSync(
      "aix.json",
      JSON.stringify(
        {
          sources: {
            fixture: {
              type: "git",
              url: gitSource,
              path: "skills",
              ref: "main"
            }
          },
          skills: []
        },
        null,
        2
      ) + "\n",
      "utf8"
    );

    const beforeManifest = readFileSync("aix.json", "utf8");
    const result = run(["skills", "list"]);

    assert.equal(result.exitCode, 1);
    assert.equal(result.stderr, "Usage: aix skills list <source>");
    assert.equal(readFileSync("aix.json", "utf8"), beforeManifest);
    assertNoManagedProjectWrites(projectPath);
  } finally {
    process.chdir(previousCwd);
  }
});

test("run skills list fails clearly for unknown sources", async () => {
  const projectPath = await createProject();
  const previousCwd = process.cwd();

  process.chdir(projectPath);

  try {
    const result = run(["skills", "list", "missing"]);

    assert.equal(result.exitCode, 2);
    assert.equal(result.stderr, "Unknown source: missing");
  } finally {
    process.chdir(previousCwd);
  }
});
