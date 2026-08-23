import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { run } from "../dist/cli.js";
import { getDefaultSources, resolveSource } from "../dist/sources/index.js";

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

async function createGitSourceWithBranch(branch) {
  const directory = await mkdtemp(join(tmpdir(), "aix-git-source-"));

  mkdirSync(join(directory, "skills/demo"), { recursive: true });
  writeFileSync(join(directory, "skills/demo/SKILL.md"), "---\nname: demo\n---\n\n# Demo\n", "utf8");
  git(["init", "-b", branch], directory);
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
    url: "https://github.com/tekfoundry/ai-extensions.git",
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

test("resolveSource updates a cached remote when a source URL changes", async () => {
  const firstSource = await createGitSourceWithBranch("master");
  const secondSource = await createGitSourceWithBranch("main");
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
              url: firstSource.directory,
              path: "skills",
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

    assert.equal(resolveSource("fixture", cacheRoot).resolvedCommit, firstSource.commit);

    writeFileSync(
      "aix.json",
      JSON.stringify(
        {
          sources: {
            fixture: {
              type: "git",
              url: secondSource.directory,
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

    assert.equal(resolveSource("fixture", cacheRoot).resolvedCommit, secondSource.commit);
  } finally {
    process.chdir(previousCwd);
  }
});

test("resolveSource reclones a cached repo with no origin remote", async () => {
  const gitSource = await createGitSource();
  const cacheRoot = await mkdtemp(join(tmpdir(), "aix-cache-test-"));
  const projectRoot = await mkdtemp(join(tmpdir(), "aix-source-project-"));
  const cachedSource = join(cacheRoot, "fixture");
  const previousCwd = process.cwd();

  mkdirSync(cachedSource, { recursive: true });
  git(["init", "-b", "main"], cachedSource);
  writeFileSync(join(cachedSource, "stale.txt"), "stale cache\n", "utf8");
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
    assert.equal(existsSync(join(cachedSource, "stale.txt")), false);
    assert.equal(git(["remote", "get-url", "origin"], cachedSource), gitSource.directory);
  } finally {
    process.chdir(previousCwd);
  }
});

test("run skills add adds a git source and writes cache metadata without activating skills", async () => {
  const gitSource = await createGitSource();
  const cacheRoot = await mkdtemp(join(tmpdir(), "aix-cache-test-"));
  const projectRoot = await mkdtemp(join(tmpdir(), "aix-source-project-"));
  const previousCwd = process.cwd();
  const previousCache = process.env.AIX_CACHE_DIR;

  process.chdir(projectRoot);
  process.env.AIX_CACHE_DIR = cacheRoot;

  try {
    const result = run(["skills", "add", gitSource.directory, "fixture"]);
    const manifest = JSON.parse(readFileSync(join(projectRoot, "aix.json"), "utf8"));
    const metadata = JSON.parse(readFileSync(join(cacheRoot, "metadata/fixture.json"), "utf8"));

    assert.equal(result.exitCode, 0);
    assert.match(result.stdout, /Added skills source fixture/);
    assert.match(result.stdout, /Discovered 1 skills/);
    assert.equal(manifest.sources.skills.fixture.type, "git");
    assert.equal(manifest.sources.skills.fixture.url, gitSource.directory);
    assert.deepEqual(manifest.skills, []);
    assert.equal(metadata.kind, "skill");
    assert.equal(metadata.resolvedCommit, gitSource.commit);
    assert.deepEqual(metadata.skills, [{ path: "skills/demo", name: "demo" }]);
    assert.equal(existsSync(join(projectRoot, "aix.lock.json")), false);
    assert.equal(existsSync(join(projectRoot, ".agents/packages")), false);
    assert.equal(existsSync(join(projectRoot, ".agents/skills")), false);
  } finally {
    if (previousCache === undefined) {
      delete process.env.AIX_CACHE_DIR;
    } else {
      process.env.AIX_CACHE_DIR = previousCache;
    }

    process.chdir(previousCwd);
  }
});

test("run skills list uses source metadata written by source addition", async () => {
  const gitSource = await createGitSource();
  const cacheRoot = await mkdtemp(join(tmpdir(), "aix-cache-test-"));
  const projectRoot = await mkdtemp(join(tmpdir(), "aix-source-project-"));
  const previousCwd = process.cwd();
  const previousCache = process.env.AIX_CACHE_DIR;

  process.chdir(projectRoot);
  process.env.AIX_CACHE_DIR = cacheRoot;

  try {
    assert.equal(run(["skills", "add", gitSource.directory, "fixture"]).exitCode, 0);
    rmSync(gitSource.directory, { recursive: true, force: true });

    const result = run(["skills", "list", "fixture"]);

    assert.equal(result.exitCode, 0);
    assert.match(result.stdout, /Skills in fixture:/);
    assert.match(result.stdout, /Path\s+Name/);
    assert.match(result.stdout, /skills\/demo\s+demo/);
    assert.equal(existsSync(join(projectRoot, "aix.lock.json")), false);
    assert.equal(existsSync(join(projectRoot, ".agents/packages")), false);
    assert.equal(existsSync(join(projectRoot, ".agents/skills")), false);
  } finally {
    if (previousCache === undefined) {
      delete process.env.AIX_CACHE_DIR;
    } else {
      process.env.AIX_CACHE_DIR = previousCache;
    }

    process.chdir(previousCwd);
  }
});

test("run skills add normalizes a GitHub tree URL", async () => {
  const gitSource = await createGitSource();
  const cacheRoot = await mkdtemp(join(tmpdir(), "aix-cache-test-"));
  const projectRoot = await mkdtemp(join(tmpdir(), "aix-source-project-"));
  const gitConfig = join(projectRoot, "gitconfig");
  const previousCwd = process.cwd();
  const previousCache = process.env.AIX_CACHE_DIR;
  const previousGitConfig = process.env.GIT_CONFIG_GLOBAL;

  writeFileSync(
    gitConfig,
    `[url "${gitSource.directory}"]\n\tinsteadOf = https://github.com/example/repo.git\n`,
    "utf8"
  );

  process.chdir(projectRoot);
  process.env.AIX_CACHE_DIR = cacheRoot;
  process.env.GIT_CONFIG_GLOBAL = gitConfig;

  try {
    const sourceUrl = "https://github.com/example/repo/tree/main/skills";
    const result = run(["skills", "add", sourceUrl, "fixture"]);
    const manifest = JSON.parse(readFileSync(join(projectRoot, "aix.json"), "utf8"));
    const metadata = JSON.parse(readFileSync(join(cacheRoot, "metadata/fixture.json"), "utf8"));

    assert.equal(result.exitCode, 0);
    assert.equal(manifest.sources.skills.fixture, sourceUrl);
    assert.equal(metadata.sourceUrl, "https://github.com/example/repo.git");
    assert.equal(metadata.sourcePath, "skills");
    assert.equal(metadata.requestedRef, "main");
    assert.deepEqual(metadata.skills, [{ path: "demo", name: "demo" }]);
    assert.equal(existsSync(join(projectRoot, ".agents/packages")), false);
    assert.equal(existsSync(join(projectRoot, ".agents/skills")), false);
  } finally {
    if (previousCache === undefined) {
      delete process.env.AIX_CACHE_DIR;
    } else {
      process.env.AIX_CACHE_DIR = previousCache;
    }

    if (previousGitConfig === undefined) {
      delete process.env.GIT_CONFIG_GLOBAL;
    } else {
      process.env.GIT_CONFIG_GLOBAL = previousGitConfig;
    }

    process.chdir(previousCwd);
  }
});

test("run skills remove removes a manifest source and cached metadata", async () => {
  const gitSource = await createGitSource();
  const cacheRoot = await mkdtemp(join(tmpdir(), "aix-cache-test-"));
  const projectRoot = await mkdtemp(join(tmpdir(), "aix-source-project-"));
  const previousCwd = process.cwd();
  const previousCache = process.env.AIX_CACHE_DIR;

  process.chdir(projectRoot);
  process.env.AIX_CACHE_DIR = cacheRoot;

  try {
    assert.equal(run(["skills", "add", gitSource.directory, "fixture"]).exitCode, 0);
    mkdirSync(join(projectRoot, ".agents/packages/skills/fixture"), { recursive: true });
    assert.equal(existsSync(join(cacheRoot, "metadata/fixture.json")), true);
    assert.equal(existsSync(join(projectRoot, ".agents/packages/skills/fixture")), true);

    const result = run(["skills", "remove", "fixture"]);
    const manifest = JSON.parse(readFileSync(join(projectRoot, "aix.json"), "utf8"));

    assert.equal(result.exitCode, 0);
    assert.match(result.stdout, /Removed skills source fixture/);
    assert.deepEqual(manifest.sources.skills, {});
    assert.deepEqual(manifest.skills, []);
    assert.equal(existsSync(join(cacheRoot, "metadata/fixture.json")), false);
    assert.equal(existsSync(join(projectRoot, ".agents/packages/skills/fixture")), false);
    assert.equal(existsSync(join(projectRoot, "aix.lock.json")), false);
    assert.equal(existsSync(join(projectRoot, ".agents/skills")), false);
  } finally {
    if (previousCache === undefined) {
      delete process.env.AIX_CACHE_DIR;
    } else {
      process.env.AIX_CACHE_DIR = previousCache;
    }

    process.chdir(previousCwd);
  }
});

test("run skills remove refuses sources with active manifest skills", async () => {
  const gitSource = await createGitSource();
  const cacheRoot = await mkdtemp(join(tmpdir(), "aix-cache-test-"));
  const projectRoot = await mkdtemp(join(tmpdir(), "aix-source-project-"));
  const previousCwd = process.cwd();
  const previousCache = process.env.AIX_CACHE_DIR;

  process.chdir(projectRoot);
  process.env.AIX_CACHE_DIR = cacheRoot;

  try {
    assert.equal(run(["skills", "add", gitSource.directory, "fixture"]).exitCode, 0);

    const manifestPath = join(projectRoot, "aix.json");
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
    manifest.skills = ["fixture:skills/demo"];
    writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

    const result = run(["skills", "remove", "fixture"]);
    const unchangedManifest = JSON.parse(readFileSync(manifestPath, "utf8"));

    assert.equal(result.exitCode, 2);
    assert.match(result.stderr, /active skills still depend on it\. Deactivate skills first/);
    assert.deepEqual(unchangedManifest.skills, ["fixture:skills/demo"]);
    assert.equal(existsSync(join(cacheRoot, "metadata/fixture.json")), true);
  } finally {
    if (previousCache === undefined) {
      delete process.env.AIX_CACHE_DIR;
    } else {
      process.env.AIX_CACHE_DIR = previousCache;
    }

    process.chdir(previousCwd);
  }
});

test("run skills remove refuses sources with active lockfile skills", async () => {
  const gitSource = await createGitSource();
  const cacheRoot = await mkdtemp(join(tmpdir(), "aix-cache-test-"));
  const projectRoot = await mkdtemp(join(tmpdir(), "aix-source-project-"));
  const previousCwd = process.cwd();
  const previousCache = process.env.AIX_CACHE_DIR;

  process.chdir(projectRoot);
  process.env.AIX_CACHE_DIR = cacheRoot;

  try {
    assert.equal(run(["skills", "add", gitSource.directory, "fixture"]).exitCode, 0);

    writeFileSync(
      join(projectRoot, "aix.lock.json"),
      JSON.stringify(
        {
          lockfileVersion: 1,
          skills: [
            {
              kind: "skill",
              source: "fixture",
              sourceType: "git",
              sourceUrl: gitSource.directory,
              requestedRef: "main",
              resolvedCommit: gitSource.commit,
              sourcePath: "skills/demo",
              packagePath: ".agents/packages/skills/fixture/skills/demo",
              activationPath: ".agents/skills/demo",
              originalName: "demo",
              activeName: "demo",
              packageFiles: [{ path: "SKILL.md", sha256: "package-hash" }],
              activeFiles: [{ path: "SKILL.md", sha256: "active-hash" }]
            }
          ]
        },
        null,
        2
      ) + "\n",
      "utf8"
    );

    const result = run(["skills", "remove", "fixture"]);
    const manifest = JSON.parse(readFileSync(join(projectRoot, "aix.json"), "utf8"));

    assert.equal(result.exitCode, 2);
    assert.match(result.stderr, /active skills still depend on it\. Deactivate skills first/);
    assert.notDeepEqual(manifest.sources.skills, {});
    assert.equal(existsSync(join(cacheRoot, "metadata/fixture.json")), true);
  } finally {
    if (previousCache === undefined) {
      delete process.env.AIX_CACHE_DIR;
    } else {
      process.env.AIX_CACHE_DIR = previousCache;
    }

    process.chdir(previousCwd);
  }
});

test("run skills remove refuses a non-empty package source directory", async () => {
  const gitSource = await createGitSource();
  const cacheRoot = await mkdtemp(join(tmpdir(), "aix-cache-test-"));
  const projectRoot = await mkdtemp(join(tmpdir(), "aix-source-project-"));
  const previousCwd = process.cwd();
  const previousCache = process.env.AIX_CACHE_DIR;

  process.chdir(projectRoot);
  process.env.AIX_CACHE_DIR = cacheRoot;

  try {
    assert.equal(run(["skills", "add", gitSource.directory, "fixture"]).exitCode, 0);
    mkdirSync(join(projectRoot, ".agents/packages/skills/fixture"), { recursive: true });
    writeFileSync(join(projectRoot, ".agents/packages/skills/fixture/leftover.txt"), "leftover", "utf8");

    const result = run(["skills", "remove", "fixture"]);
    const manifest = JSON.parse(readFileSync(join(projectRoot, "aix.json"), "utf8"));

    assert.equal(result.exitCode, 2);
    assert.match(result.stderr, /.agents\/packages\/skills\/fixture is not empty\. Deactivate skills first/);
    assert.notDeepEqual(manifest.sources.skills, {});
    assert.equal(existsSync(join(cacheRoot, "metadata/fixture.json")), true);
    assert.equal(existsSync(join(projectRoot, ".agents/packages/skills/fixture/leftover.txt")), true);
  } finally {
    if (previousCache === undefined) {
      delete process.env.AIX_CACHE_DIR;
    } else {
      process.env.AIX_CACHE_DIR = previousCache;
    }

    process.chdir(previousCwd);
  }
});
