import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
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
    env: { ...process.env, GIT_AUTHOR_NAME: "AIX Tests", GIT_AUTHOR_EMAIL: "aix@example.test", GIT_COMMITTER_NAME: "AIX Tests", GIT_COMMITTER_EMAIL: "aix@example.test" }
  }).trim();
}

async function createSource() {
  const directory = await mkdtemp(join(tmpdir(), "aix-init-source-"));
  execFileSync("mkdir", ["-p", join(directory, "aix")]);
  execFileSync("cp", ["-R", resolve(repoRoot, "aix/skills"), join(directory, "aix/skills")]);
  git(["init", "-b", "master"], directory);
  git(["add", "."], directory);
  git(["commit", "-m", "skills"], directory);
  return { type: "git", url: directory, path: "aix/skills", ref: "master" };
}

async function withProject(callback) {
  const projectPath = await mkdtemp(join(tmpdir(), "aix-init-"));
  const previousCwd = process.cwd();
  const source = await createSource();
  const cacheRoot = await mkdtemp(join(tmpdir(), "aix-init-cache-"));
  process.chdir(projectPath);

  try { await callback(projectPath, source, cacheRoot); }
  finally { process.chdir(previousCwd); }
}

test("initProject initializes package-management features without a workflow", async () => {
  await withProject(async (projectPath, source, cacheRoot) => {
    const result = initProject({ sources: { aix: source }, cacheRoot });
    const manifest = JSON.parse(readFileSync(join(projectPath, "aix.json"), "utf8"));
    const lockfile = JSON.parse(readFileSync(join(projectPath, "aix.lock.json"), "utf8"));

    assert.equal(result.declaredCount, 0);
    assert.equal(result.activatedCount, 0);
    assert.equal(result.standaloneActivatedCount, 1);
    assert.deepEqual(manifest.sources.skills.aix, source);
    assert.deepEqual(manifest.skills, ["aix:discover-skill"]);
    assert.deepEqual(lockfile.workflows, []);
    assert.deepEqual(lockfile.skills.map((skill) => skill.activeName), ["discover-skill"]);
    assert.equal(existsSync(join(projectPath, ".agents/roles")), false);
  });
});

test("run init reports package-only initialization", async () => {
  await withProject(async (_projectPath, source, cacheRoot) => {
    const previous = process.env.AIX_CACHE_DIR;
    process.env.AIX_CACHE_DIR = cacheRoot;
    process.env.AIX_SOURCE_AIX_URL = source.url;
    process.env.AIX_SOURCE_AIX_PATH = source.path;
    process.env.AIX_SOURCE_AIX_REF = source.ref;

    try {
      const result = run(["init"]);
      assert.equal(result.exitCode, 0);
      assert.match(result.stdout, /package-management features only/);
      assert.doesNotMatch(result.stdout, /Declared .* workflow/);
    } finally {
      if (previous === undefined) delete process.env.AIX_CACHE_DIR;
      else process.env.AIX_CACHE_DIR = previous;
      delete process.env.AIX_SOURCE_AIX_URL;
      delete process.env.AIX_SOURCE_AIX_PATH;
      delete process.env.AIX_SOURCE_AIX_REF;
    }
  });
});

test("initProject is idempotent when package state already exists", async () => {
  await withProject(async (_projectPath, source, cacheRoot) => {
    assert.doesNotThrow(() => initProject({ sources: { aix: source }, cacheRoot }));
    assert.doesNotThrow(() => initProject({ sources: { aix: source }, cacheRoot }));
  });
});
