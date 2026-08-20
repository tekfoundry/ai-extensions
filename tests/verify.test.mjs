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
  const directory = await mkdtemp(join(tmpdir(), "aix-verify-source-"));

  mkdirSync(join(directory, "skills/demo"), { recursive: true });
  writeFileSync(join(directory, "skills/demo/SKILL.md"), "---\nname: demo\n---\n\n# Demo\n", "utf8");
  writeFileSync(join(directory, "skills/demo/notes.md"), "notes\n", "utf8");
  git(["init", "-b", "main"], directory);
  git(["add", "."], directory);
  git(["commit", "-m", "initial"], directory);

  return { directory };
}

async function withProject(callback) {
  const gitSource = await createGitSource();
  const cacheRoot = await mkdtemp(join(tmpdir(), "aix-verify-cache-"));
  const projectRoot = await mkdtemp(join(tmpdir(), "aix-verify-project-"));
  const previousCwd = process.cwd();
  const previousCache = process.env.AIX_CACHE_DIR;

  process.chdir(projectRoot);
  process.env.AIX_CACHE_DIR = cacheRoot;

  try {
    assert.equal(run(["add", "skills", gitSource.directory, "fixture"]).exitCode, 0);
    await callback(projectRoot);
  } finally {
    if (previousCache === undefined) {
      delete process.env.AIX_CACHE_DIR;
    } else {
      process.env.AIX_CACHE_DIR = previousCache;
    }

    process.chdir(previousCwd);
  }
}

test("run verify passes when manifest, lockfile, package, and active skill agree", async () => {
  await withProject(async () => {
    assert.equal(run(["activate", "skill", "fixture/skills/demo"]).exitCode, 0);

    const result = run(["verify"]);

    assert.equal(result.exitCode, 0);
    assert.equal(result.stdout, "AI Extensions verification passed.");
  });
});

test("run verify reports package and active hash drift", async () => {
  await withProject(async (projectRoot) => {
    assert.equal(run(["activate", "skill", "fixture/skills/demo"]).exitCode, 0);
    writeFileSync(join(projectRoot, ".agents/packages/skills/fixture/skills/demo/notes.md"), "edited\n", "utf8");

    const result = run(["verify"]);

    assert.equal(result.exitCode, 2);
    assert.match(result.stdout, /AI Extensions verification failed:/);
    assert.match(result.stdout, /Package file hash changed: \.agents\/packages\/skills\/fixture\/skills\/demo\/notes.md/);
    assert.match(result.stdout, /Active skill file hash changed: \.agents\/skills\/demo\/notes.md/);
  });
});

test("run verify reports active front matter alias mismatches", async () => {
  await withProject(async (projectRoot) => {
    assert.equal(run(["activate", "skill", "fixture/skills/demo", "demo-alias"]).exitCode, 0);
    writeFileSync(join(projectRoot, ".agents/skills/demo-alias/SKILL.md"), "---\nname: wrong\n---\n\n# Demo\n", "utf8");

    const result = run(["verify"]);

    assert.equal(result.exitCode, 2);
    assert.match(result.stdout, /Active SKILL\.md name mismatch for demo-alias: got wrong/);
  });
});

test("run verify reports manifest skills missing from the lockfile", async () => {
  await withProject(async (projectRoot) => {
    writeFileSync(
      join(projectRoot, "aix.json"),
      JSON.stringify(
        {
          sources: {
            skills: {
              fixture: {
                type: "git",
                url: "https://example.test/fixture.git",
                path: "skills"
              }
            }
          },
          skills: ["fixture:skills/demo"]
        },
        null,
        2
      ) + "\n",
      "utf8"
    );

    const result = run(["verify"]);

    assert.equal(result.exitCode, 2);
    assert.match(result.stdout, /Manifest skill is not locked: fixture\/skills\/demo/);
  });
});
