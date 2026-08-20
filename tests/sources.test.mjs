import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { getDefaultSources } from "../dist/defaults.js";
import { resolveSource } from "../dist/sources.js";

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
  const directory = await mkdtemp(join(tmpdir(), "aix-git-source-"));

  mkdirSync(join(directory, "skills/demo"), { recursive: true });
  writeFileSync(join(directory, "skills/demo/SKILL.md"), "---\nname: demo\n---\n\n# Demo\n", "utf8");
  git(["init", "-b", "main"], directory);
  git(["add", "."], directory);
  git(["commit", "-m", "initial"], directory);

  return {
    directory,
    commit: git(["rev-parse", "HEAD"], directory)
  };
}

test("getDefaultSources defines aix as a remote git source", () => {
  const sources = getDefaultSources();

  assert.deepEqual(sources.aix, {
    type: "git",
    url: "https://github.com/tekfoundry/ai-extension.git",
    path: "aix/skills",
    ref: "master"
  });
});

test("resolveSource clones and resolves git sources into a deterministic cache", async () => {
  const gitSource = await createGitSource();
  const cacheRoot = await mkdtemp(join(tmpdir(), "aix-cache-test-"));
  const projectRoot = await mkdtemp(join(tmpdir(), "aix-source-project-"));
  const previousCwd = process.cwd();

  process.chdir(projectRoot);

  try {
    writeFileSync(
      "aix.json",
      JSON.stringify(
        {
          sources: {
            fixture: {
              type: "git",
              url: gitSource.directory,
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

    const resolved = resolveSource("fixture", cacheRoot);

    assert.equal(resolved.name, "fixture");
    assert.equal(resolved.rootPath, join(cacheRoot, "fixture", "skills"));
    assert.equal(resolved.resolvedCommit, gitSource.commit);
  } finally {
    process.chdir(previousCwd);
  }
});
