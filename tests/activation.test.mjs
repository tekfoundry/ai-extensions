import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, lstatSync, mkdirSync, readFileSync, readlinkSync, rmSync, writeFileSync } from "node:fs";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PassThrough } from "node:stream";
import { test } from "node:test";
import { preflightSkillActivationFromDefinitions } from "../dist/activation/activate.js";
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

async function createGitSource() {
  const directory = await mkdtemp(join(tmpdir(), "aix-activation-source-"));

  mkdirSync(join(directory, "skills/demo"), { recursive: true });
  writeFileSync(join(directory, "skills/demo/SKILL.md"), "---\nname: demo\n---\n\n# Demo\n", "utf8");
  writeFileSync(join(directory, "skills/demo/notes.md"), "demo notes\n", "utf8");
  git(["init", "-b", "main"], directory);
  git(["add", "."], directory);
  git(["commit", "-m", "initial"], directory);

  return {
    directory,
    commit: git(["rev-parse", "HEAD"], directory)
  };
}

async function createGitSourceWithDependency() {
  const directory = await mkdtemp(join(tmpdir(), "aix-activation-source-"));

  mkdirSync(join(directory, "skills/grilling"), { recursive: true });
  writeFileSync(join(directory, "skills/grilling/SKILL.md"), "---\nname: grilling\n---\n\n# Grilling\n", "utf8");
  mkdirSync(join(directory, "skills/grill-me"), { recursive: true });
  writeFileSync(
    join(directory, "skills/grill-me/SKILL.md"),
    "---\nname: grill-me\n---\n\nCall the Skill tool with \"grilling\".\n",
    "utf8"
  );
  git(["init", "-b", "main"], directory);
  git(["add", "."], directory);
  git(["commit", "-m", "initial"], directory);

  return {
    directory,
    commit: git(["rev-parse", "HEAD"], directory)
  };
}

async function withProject(callback) {
  const gitSource = await createGitSource();
  const cacheRoot = await mkdtemp(join(tmpdir(), "aix-activation-cache-"));
  const projectRoot = await mkdtemp(join(tmpdir(), "aix-activation-project-"));
  const previousCwd = process.cwd();
  const previousCache = process.env.AIX_CACHE_DIR;

  process.chdir(projectRoot);
  process.env.AIX_CACHE_DIR = cacheRoot;

  try {
    assert.equal(run(["skills", "add", gitSource.directory, "fixture"]).exitCode, 0);
    await callback(projectRoot, gitSource, cacheRoot);
  } finally {
    if (previousCache === undefined) {
      delete process.env.AIX_CACHE_DIR;
    } else {
      process.env.AIX_CACHE_DIR = previousCache;
    }

    process.chdir(previousCwd);
  }
}

test("run skill activate materializes a package, updates manifest, writes lockfile, and creates a symlink", async () => {
  await withProject(async (projectRoot, gitSource) => {
    const result = run(["skill", "activate", "fixture/skills/demo"]);
    const manifest = JSON.parse(readFileSync(join(projectRoot, "aix.json"), "utf8"));
    const lockfile = JSON.parse(readFileSync(join(projectRoot, "aix.lock.json"), "utf8"));
    const activePath = join(projectRoot, ".agents/skills/demo");

    assert.equal(result.exitCode, 0);
    assert.match(result.stdout, /Activated skill fixture\/skills\/demo as demo/);
    assert.deepEqual(manifest.skills, ["fixture:skills/demo"]);
    assert.equal(lockfile.skills.length, 1);
    assert.equal(lockfile.skills[0].kind, "skill");
    assert.equal(lockfile.skills[0].source, "fixture");
    assert.equal(lockfile.skills[0].sourceUrl, gitSource.directory);
    assert.equal(lockfile.skills[0].resolvedCommit, gitSource.commit);
    assert.equal(lockfile.skills[0].sourcePath, "skills/demo");
    assert.equal(lockfile.skills[0].originalName, "demo");
    assert.equal(lockfile.skills[0].activeName, "demo");
    assert.equal(lockfile.skills[0].requested, true);
    assert.equal(lockfile.skills[0].packagePath, ".agents/packages/skills/fixture/skills/demo");
    assert.equal(lockfile.skills[0].activationPath, ".agents/skills/demo");
    assert.ok(lockfile.skills[0].packageFiles.some((file) => file.path === "SKILL.md"));
    assert.ok(lockfile.skills[0].activeFiles.some((file) => file.path === "SKILL.md"));
    assert.equal(existsSync(join(projectRoot, ".agents/packages/skills/fixture/skills/demo/SKILL.md")), true);
    assert.equal(lstatSync(activePath).isSymbolicLink(), true);
    assert.equal(readlinkSync(activePath), "../packages/skills/fixture/skills/demo");
  });
});

test("run skill activate resolves aix/skills paths from local project source first", async () => {
  const projectRoot = await mkdtemp(join(tmpdir(), "aix-local-skill-project-"));
  const previousCwd = process.cwd();

  process.chdir(projectRoot);

  try {
    mkdirSync(join(projectRoot, "aix/skills/local-demo"), { recursive: true });
    writeFileSync(join(projectRoot, "aix/skills/local-demo/SKILL.md"), "---\nname: local-demo\n---\n\n# Local Demo\n", "utf8");
    writeFileSync(
      join(projectRoot, "aix.json"),
      JSON.stringify({ sources: { skills: {}, workflows: {} }, skills: [] }, null, 2) + "\n",
      "utf8"
    );

    const result = run(["skill", "activate", "aix/skills/local-demo"]);
    const lockfile = JSON.parse(readFileSync(join(projectRoot, "aix.lock.json"), "utf8"));

    assert.equal(result.exitCode, 0);
    assert.match(result.stdout, /Activated skill aix\/skills\/local-demo as local-demo/);
    assert.deepEqual(JSON.parse(readFileSync(join(projectRoot, "aix.json"), "utf8")).skills, ["aix:skills/local-demo"]);
    assert.equal(lockfile.skills[0].source, "aix");
    assert.equal(lockfile.skills[0].sourceType, "local");
    assert.equal(lockfile.skills[0].sourceUrl, undefined);
    assert.equal(lockfile.skills[0].resolvedCommit, undefined);
    assert.equal(lockfile.skills[0].sourcePath, "skills/local-demo");
    assert.equal(existsSync(join(projectRoot, ".agents/packages/skills/aix/skills/local-demo/SKILL.md")), true);
    assert.equal(readFileSync(join(projectRoot, ".agents/packages/skills/aix/skills/local-demo/SKILL.md"), "utf8"), "---\nname: local-demo\n---\n\n# Local Demo\n");

    const status = run(["status"]);
    assert.equal(status.exitCode, 0);
    assert.match(status.stdout, /Active skills[\s\S]*local-demo[\s\S]*aix\/skills\/local-demo[\s\S]*local[\s\S]*current/);

    writeFileSync(join(projectRoot, "aix/skills/local-demo/SKILL.md"), "---\nname: local-demo\n---\n\n# Local Demo\n\nUpdated local source.\n", "utf8");

    const diff = run(["skills", "diff"]);
    assert.equal(diff.exitCode, 0);
    assert.match(diff.stdout, /Updated local source/);

    const update = run(["skills", "update"]);
    assert.equal(update.exitCode, 0);
    assert.match(update.stdout, /Updated locked skills/);
    assert.equal(
      readFileSync(join(projectRoot, ".agents/packages/skills/aix/skills/local-demo/SKILL.md"), "utf8"),
      "---\nname: local-demo\n---\n\n# Local Demo\n\nUpdated local source.\n"
    );
    const updatedLockfile = JSON.parse(readFileSync(join(projectRoot, "aix.lock.json"), "utf8"));
    assert.equal(updatedLockfile.skills[0].sourceType, "local");
    assert.equal(updatedLockfile.skills[0].sourceUrl, undefined);
    assert.equal(updatedLockfile.skills[0].resolvedCommit, undefined);

    assert.equal(run(["skill", "deactivate", "local-demo"]).exitCode, 0);
    assert.equal(existsSync(join(projectRoot, "aix/skills/local-demo/SKILL.md")), true);
  } finally {
    process.chdir(previousCwd);
  }
});

test("run skill activate with an alias writes a manifest object and managed active wrapper", async () => {
  await withProject(async (projectRoot) => {
    const result = run(["skill", "activate", "fixture/skills/demo", "demo-alias"]);
    const manifest = JSON.parse(readFileSync(join(projectRoot, "aix.json"), "utf8"));
    const lockfile = JSON.parse(readFileSync(join(projectRoot, "aix.lock.json"), "utf8"));
    const activeSkill = readFileSync(join(projectRoot, ".agents/skills/demo-alias/SKILL.md"), "utf8");
    const packageSkill = readFileSync(join(projectRoot, ".agents/packages/skills/fixture/skills/demo/SKILL.md"), "utf8");

    assert.equal(result.exitCode, 0);
    assert.deepEqual(manifest.skills, [{ source: "fixture", path: "skills/demo", alias: "demo-alias" }]);
    assert.equal(lstatSync(join(projectRoot, ".agents/skills/demo-alias")).isDirectory(), true);
    assert.match(activeSkill, /^name: demo-alias$/m);
    assert.match(packageSkill, /^name: demo$/m);
    assert.equal(lockfile.skills[0].originalName, "demo");
    assert.equal(lockfile.skills[0].activeName, "demo-alias");
    assert.equal(lockfile.skills[0].alias, "demo-alias");
    assert.equal(lockfile.skills[0].requested, true);
  });
});

test("skill append content uses active-name markers, reports drift, and is removed when the package drops it", async () => {
  await withProject(async (projectRoot, gitSource) => {
    writeFileSync(join(gitSource.directory, "skills/demo/AGENTS.append.md"), "Use demo-alias for request entry.\n", "utf8");
    git(["add", "."], gitSource.directory);
    git(["commit", "-m", "add skill append"], gitSource.directory);
    writeFileSync(
      join(projectRoot, "AGENTS.md"),
      [
        "# Project Rules",
        "",
        "<!-- aix:skill copied-user-block start -->",
        "User-owned copied block.",
        ""
      ].join("\n"),
      "utf8"
    );

    const result = run(["skill", "activate", "fixture/skills/demo", "demo-alias"]);
    const lockfile = JSON.parse(readFileSync(join(projectRoot, "aix.lock.json"), "utf8"));
    const agents = readFileSync(join(projectRoot, "AGENTS.md"), "utf8");

    assert.equal(result.exitCode, 0);
    assert.equal(lockfile.skills[0].agentsMd.marker, "aix:skill demo-alias");
    assert.match(agents, /copied-user-block start/);
    assert.match(agents, /<!-- aix:skill demo-alias start -->/);
    assert.ok(agents.indexOf("copied-user-block start") < agents.indexOf("aix:skill demo-alias start"));

    writeFileSync(
      join(projectRoot, "AGENTS.md"),
      agents.replace("Use demo-alias for request entry.", "Use locally edited demo-alias instructions."),
      "utf8"
    );

    const verify = run(["verify"]);
    const status = run(["status"]);
    const blockedDeactivate = run(["skill", "deactivate", "demo-alias"]);

    assert.equal(verify.exitCode, 2);
    assert.match(verify.stdout, /skill block hash changed in AGENTS\.md/);
    assert.equal(status.exitCode, 0);
    assert.match(status.stdout, /skill block hash changed in AGENTS\.md/);
    assert.equal(blockedDeactivate.exitCode, 2);
    assert.match(blockedDeactivate.stderr, /Refusing to manage modified skill block in AGENTS\.md/);

    writeFileSync(join(projectRoot, "AGENTS.md"), agents, "utf8");
    rmSync(join(gitSource.directory, "skills/demo/AGENTS.append.md"));
    git(["add", "."], gitSource.directory);
    git(["commit", "-m", "remove skill append"], gitSource.directory);

    const update = run(["skills", "update"]);
    const updatedLockfile = JSON.parse(readFileSync(join(projectRoot, "aix.lock.json"), "utf8"));
    const updatedAgents = readFileSync(join(projectRoot, "AGENTS.md"), "utf8");

    assert.equal(update.exitCode, 0);
    assert.equal(updatedLockfile.skills[0].agentsMd, undefined);
    assert.doesNotMatch(updatedAgents, /aix:skill demo-alias/);
    assert.match(updatedAgents, /copied-user-block start/);
  });
});

test("run skill activate detects active-name collisions before materializing a package", async () => {
  await withProject(async (projectRoot) => {
    mkdirSync(join(projectRoot, ".agents/skills/demo"), { recursive: true });
    writeFileSync(join(projectRoot, ".agents/skills/demo/SKILL.md"), "local skill\n", "utf8");

    const result = run(["skill", "activate", "fixture/skills/demo"]);

    assert.equal(result.exitCode, 2);
    assert.match(result.stderr, /Active skill name collision: \.agents\/skills\/demo/);
    assert.equal(existsSync(join(projectRoot, ".agents/packages")), false);
    assert.equal(existsSync(join(projectRoot, "aix.lock.json")), false);
  });
});

test("preflightSkillActivationFromDefinitions validates activation without writes", async () => {
  await withProject(async (projectRoot, _gitSource, cacheRoot) => {
    const manifestPath = join(projectRoot, "aix.json");
    const manifestBefore = readFileSync(manifestPath, "utf8");

    preflightSkillActivationFromDefinitions("fixture/skills/demo", undefined, {}, cacheRoot);

    assert.equal(readFileSync(manifestPath, "utf8"), manifestBefore);
    assert.equal(existsSync(join(projectRoot, ".agents/packages")), false);
    assert.equal(existsSync(join(projectRoot, ".agents/skills")), false);
    assert.equal(existsSync(join(projectRoot, "aix.lock.json")), false);
  });
});

test("run skill activate refuses a dirty untracked package directory", async () => {
  await withProject(async (projectRoot) => {
    mkdirSync(join(projectRoot, ".agents/packages/skills/fixture/skills/demo"), { recursive: true });
    writeFileSync(join(projectRoot, ".agents/packages/skills/fixture/skills/demo/SKILL.md"), "local package edit\n", "utf8");

    const result = run(["skill", "activate", "fixture/skills/demo"]);
    const manifest = JSON.parse(readFileSync(join(projectRoot, "aix.json"), "utf8"));

    assert.equal(result.exitCode, 2);
    assert.match(result.stderr, /Refusing to activate fixture\/skills\/demo because an untracked package directory has local changes:/);
    assert.deepEqual(manifest.skills, []);
    assert.equal(existsSync(join(projectRoot, "aix.lock.json")), false);
    assert.equal(existsSync(join(projectRoot, ".agents/skills/demo")), false);
  });
});

test("run skill activate activates inferred dependencies first and records lockfile edges", async () => {
  const gitSource = await createGitSourceWithDependency();
  const cacheRoot = await mkdtemp(join(tmpdir(), "aix-activation-cache-"));
  const projectRoot = await mkdtemp(join(tmpdir(), "aix-activation-project-"));
  const previousCwd = process.cwd();
  const previousCache = process.env.AIX_CACHE_DIR;

  process.chdir(projectRoot);
  process.env.AIX_CACHE_DIR = cacheRoot;

  try {
    assert.equal(run(["skills", "add", gitSource.directory, "fixture"]).exitCode, 0);

    const result = run(["skill", "activate", "fixture/skills/grill-me"]);
    const manifest = JSON.parse(readFileSync(join(projectRoot, "aix.json"), "utf8"));
    const lockfile = JSON.parse(readFileSync(join(projectRoot, "aix.lock.json"), "utf8"));
    const grillMe = lockfile.skills.find((skill) => skill.activeName === "grill-me");
    const grilling = lockfile.skills.find((skill) => skill.activeName === "grilling");

    assert.equal(result.exitCode, 0);
    assert.match(result.stdout, /Activated dependency fixture\/skills\/grilling as grilling/);
    assert.match(result.stdout, /Activated skill fixture\/skills\/grill-me as grill-me/);
    assert.deepEqual(manifest.skills, ["fixture:skills/grill-me"]);
    assert.equal(lockfile.skills.length, 2);
    assert.equal(grilling.requested, false);
    assert.equal(grillMe.requested, true);
    assert.equal(existsSync(join(projectRoot, ".agents/skills/grilling/SKILL.md")), true);
    assert.equal(existsSync(join(projectRoot, ".agents/skills/grill-me/SKILL.md")), true);
    assert.deepEqual(grillMe.dependencies, [
      {
        source: "fixture",
        sourcePath: "skills/grilling",
        activeName: "grilling",
        type: "inferred",
        reason: 'Call the Skill tool with "grilling"'
      }
    ]);
  } finally {
    if (previousCache === undefined) {
      delete process.env.AIX_CACHE_DIR;
    } else {
      process.env.AIX_CACHE_DIR = previousCache;
    }

    process.chdir(previousCwd);
  }
});

test("skill deactivation removes append blocks for orphaned dependency-only skills", async () => {
  const gitSource = await createGitSourceWithDependency();
  const cacheRoot = await mkdtemp(join(tmpdir(), "aix-activation-cache-"));
  const projectRoot = await mkdtemp(join(tmpdir(), "aix-activation-project-"));
  const previousCwd = process.cwd();
  const previousCache = process.env.AIX_CACHE_DIR;

  writeFileSync(join(gitSource.directory, "skills/grilling/AGENTS.append.md"), "Use grilling dependency guidance.\n", "utf8");
  writeFileSync(join(gitSource.directory, "skills/grill-me/AGENTS.append.md"), "Use grill-me guidance.\n", "utf8");
  git(["add", "."], gitSource.directory);
  git(["commit", "-m", "add dependency append files"], gitSource.directory);

  process.chdir(projectRoot);
  process.env.AIX_CACHE_DIR = cacheRoot;

  try {
    assert.equal(run(["skills", "add", gitSource.directory, "fixture"]).exitCode, 0);
    assert.equal(run(["skill", "activate", "fixture/skills/grill-me"]).exitCode, 0);

    const agents = readFileSync(join(projectRoot, "AGENTS.md"), "utf8");
    assert.match(agents, /aix:skill grilling/);
    assert.match(agents, /aix:skill grill-me/);

    const deactivate = run(["skill", "deactivate", "grill-me"]);
    const updatedAgents = readFileSync(join(projectRoot, "AGENTS.md"), "utf8");
    const lockfile = JSON.parse(readFileSync(join(projectRoot, "aix.lock.json"), "utf8"));

    assert.equal(deactivate.exitCode, 0);
    assert.doesNotMatch(updatedAgents, /aix:skill grilling/);
    assert.doesNotMatch(updatedAgents, /aix:skill grill-me/);
    assert.deepEqual(lockfile.skills, []);
  } finally {
    if (previousCache === undefined) {
      delete process.env.AIX_CACHE_DIR;
    } else {
      process.env.AIX_CACHE_DIR = previousCache;
    }

    process.chdir(previousCwd);
  }
});

test("run skill deactivate refuses active skills that other skills depend on", async () => {
  const gitSource = await createGitSourceWithDependency();
  const cacheRoot = await mkdtemp(join(tmpdir(), "aix-activation-cache-"));
  const projectRoot = await mkdtemp(join(tmpdir(), "aix-activation-project-"));
  const previousCwd = process.cwd();
  const previousCache = process.env.AIX_CACHE_DIR;

  process.chdir(projectRoot);
  process.env.AIX_CACHE_DIR = cacheRoot;

  try {
    assert.equal(run(["skills", "add", gitSource.directory, "fixture"]).exitCode, 0);
    assert.equal(run(["skill", "activate", "fixture/skills/grill-me"]).exitCode, 0);

    const result = run(["skill", "deactivate", "grilling"]);
    const manifest = JSON.parse(readFileSync(join(projectRoot, "aix.json"), "utf8"));
    const lockfile = JSON.parse(readFileSync(join(projectRoot, "aix.lock.json"), "utf8"));

    assert.equal(result.exitCode, 2);
    assert.match(result.stderr, /Cannot deactivate grilling because active skills depend on it:/);
    assert.match(result.stderr, /- grill-me/);
    assert.deepEqual(manifest.skills, ["fixture:skills/grill-me"]);
    assert.equal(lockfile.skills.length, 2);
    assert.equal(existsSync(join(projectRoot, ".agents/skills/grilling/SKILL.md")), true);
  } finally {
    if (previousCache === undefined) {
      delete process.env.AIX_CACHE_DIR;
    } else {
      process.env.AIX_CACHE_DIR = previousCache;
    }

    process.chdir(previousCwd);
  }
});

test("run skill deactivate removes orphaned dependency-only active skills", async () => {
  const gitSource = await createGitSourceWithDependency();
  const cacheRoot = await mkdtemp(join(tmpdir(), "aix-activation-cache-"));
  const projectRoot = await mkdtemp(join(tmpdir(), "aix-activation-project-"));
  const previousCwd = process.cwd();
  const previousCache = process.env.AIX_CACHE_DIR;

  process.chdir(projectRoot);
  process.env.AIX_CACHE_DIR = cacheRoot;

  try {
    assert.equal(run(["skills", "add", gitSource.directory, "fixture"]).exitCode, 0);
    assert.equal(run(["skill", "activate", "fixture/skills/grill-me"]).exitCode, 0);

    const result = run(["skill", "deactivate", "grill-me"]);
    const manifest = JSON.parse(readFileSync(join(projectRoot, "aix.json"), "utf8"));
    const lockfile = JSON.parse(readFileSync(join(projectRoot, "aix.lock.json"), "utf8"));

    assert.equal(result.exitCode, 0);
    assert.match(result.stdout, /Deactivated skill grill-me/);
    assert.match(result.stdout, /- grill-me at \.agents\/skills\/grill-me/);
    assert.match(result.stdout, /- grilling at \.agents\/skills\/grilling/);
    assert.match(result.stdout, /- grill-me at \.agents\/packages\/skills\/fixture\/skills\/grill-me/);
    assert.match(result.stdout, /- grilling at \.agents\/packages\/skills\/fixture\/skills\/grilling/);
    assert.deepEqual(manifest.skills, []);
    assert.deepEqual(lockfile.skills, []);
    assert.equal(existsSync(join(projectRoot, ".agents/skills/grill-me")), false);
    assert.equal(existsSync(join(projectRoot, ".agents/skills/grilling")), false);
    assert.equal(existsSync(join(projectRoot, ".agents/packages/skills/fixture/skills/grill-me")), false);
    assert.equal(existsSync(join(projectRoot, ".agents/packages/skills/fixture/skills/grilling")), false);
    assert.equal(existsSync(join(projectRoot, ".agents/packages/skills/fixture/skills")), false);
    assert.equal(existsSync(join(projectRoot, ".agents/packages/skills/fixture")), false);
  } finally {
    if (previousCache === undefined) {
      delete process.env.AIX_CACHE_DIR;
    } else {
      process.env.AIX_CACHE_DIR = previousCache;
    }

    process.chdir(previousCwd);
  }
});

test("runInteractive skill deactivate lists only user-requested root skills", async () => {
  const gitSource = await createGitSourceWithDependency();
  const cacheRoot = await mkdtemp(join(tmpdir(), "aix-activation-cache-"));
  const projectRoot = await mkdtemp(join(tmpdir(), "aix-activation-project-"));
  const previousCwd = process.cwd();
  const previousCache = process.env.AIX_CACHE_DIR;
  const input = new PassThrough();
  const output = new PassThrough();
  let rendered = "";

  output.on("data", (chunk) => {
    rendered += chunk.toString("utf8");
  });

  input.end("1\n");
  process.chdir(projectRoot);
  process.env.AIX_CACHE_DIR = cacheRoot;

  try {
    assert.equal(run(["skills", "add", gitSource.directory, "fixture"]).exitCode, 0);
    assert.equal(run(["skill", "activate", "fixture/skills/grill-me"]).exitCode, 0);

    const result = await runInteractive(["skill", "deactivate"], input, output);
    const manifest = JSON.parse(readFileSync(join(projectRoot, "aix.json"), "utf8"));
    const lockfile = JSON.parse(readFileSync(join(projectRoot, "aix.lock.json"), "utf8"));

    assert.equal(result.exitCode, 0);
    assert.match(rendered, /Select a skill to deactivate:/);
    assert.match(rendered, /1\. grill-me/);
    assert.doesNotMatch(rendered, /2\. grilling/);
    assert.match(result.stdout, /Deactivated skill grill-me/);
    assert.match(result.stdout, /- grill-me at \.agents\/skills\/grill-me/);
    assert.match(result.stdout, /- grilling at \.agents\/skills\/grilling/);
    assert.match(result.stdout, /- grill-me at \.agents\/packages\/skills\/fixture\/skills\/grill-me/);
    assert.match(result.stdout, /- grilling at \.agents\/packages\/skills\/fixture\/skills\/grilling/);
    assert.deepEqual(manifest.skills, []);
    assert.deepEqual(lockfile.skills, []);
    assert.equal(existsSync(join(projectRoot, ".agents/skills/grill-me")), false);
    assert.equal(existsSync(join(projectRoot, ".agents/skills/grilling")), false);
    assert.equal(existsSync(join(projectRoot, ".agents/packages/skills/fixture/skills/grill-me")), false);
    assert.equal(existsSync(join(projectRoot, ".agents/packages/skills/fixture/skills/grilling")), false);
  } finally {
    if (previousCache === undefined) {
      delete process.env.AIX_CACHE_DIR;
    } else {
      process.env.AIX_CACHE_DIR = previousCache;
    }

    process.chdir(previousCwd);
  }
});

test("runInteractive skill activate prompts for source and skill when no target is provided", async () => {
  const gitSource = await createGitSource();
  const cacheRoot = await mkdtemp(join(tmpdir(), "aix-activation-cache-"));
  const projectRoot = await mkdtemp(join(tmpdir(), "aix-activation-project-"));
  const previousCwd = process.cwd();
  const previousCache = process.env.AIX_CACHE_DIR;
  const input = new PassThrough();
  const output = new PassThrough();
  let rendered = "";
  let sentSkillSelection = false;

  output.on("data", (chunk) => {
    rendered += chunk.toString("utf8");

    if (!sentSkillSelection && rendered.includes("Select skill number:")) {
      sentSkillSelection = true;
      input.end("1\n");
    }
  });

  input.write("1\n");
  process.chdir(projectRoot);
  process.env.AIX_CACHE_DIR = cacheRoot;

  try {
    assert.equal(run(["skills", "add", gitSource.directory, "aaa"]).exitCode, 0);

    const result = await runInteractive(["skill", "activate"], input, output);
    const manifest = JSON.parse(readFileSync(join(projectRoot, "aix.json"), "utf8"));

    assert.equal(result.exitCode, 0);
    assert.match(rendered, /Select a skills source to activate from:/);
    assert.match(rendered, /1\. aaa/);
    assert.match(rendered, /Select a skill from aaa:/);
    assert.match(rendered, /1\. skills\/demo/);
    assert.match(result.stdout, /Activated skill aaa\/skills\/demo as demo/);
    assert.deepEqual(manifest.skills, ["aaa:skills/demo"]);
  } finally {
    if (previousCache === undefined) {
      delete process.env.AIX_CACHE_DIR;
    } else {
      process.env.AIX_CACHE_DIR = previousCache;
    }

    process.chdir(previousCwd);
  }
});

test("runInteractive skill activate prompts for source and skill", async () => {
  const gitSource = await createGitSource();
  const cacheRoot = await mkdtemp(join(tmpdir(), "aix-activation-cache-"));
  const projectRoot = await mkdtemp(join(tmpdir(), "aix-activation-project-"));
  const previousCwd = process.cwd();
  const previousCache = process.env.AIX_CACHE_DIR;
  const input = new PassThrough();
  const output = new PassThrough();
  let rendered = "";
  let sentSourceSelection = false;
  let sentSkillSelection = false;

  output.on("data", (chunk) => {
    rendered += chunk.toString("utf8");

    if (!sentSourceSelection && rendered.includes("Select source number:")) {
      sentSourceSelection = true;
      input.write("1\n");
    }

    if (!sentSkillSelection && rendered.includes("Select skill number:")) {
      sentSkillSelection = true;
      input.end("1\n");
    }
  });

  input.write("1\n");
  process.chdir(projectRoot);
  process.env.AIX_CACHE_DIR = cacheRoot;

  try {
    assert.equal(run(["skills", "add", gitSource.directory, "aaa"]).exitCode, 0);

    const result = await runInteractive(["skill", "activate"], input, output);
    const manifest = JSON.parse(readFileSync(join(projectRoot, "aix.json"), "utf8"));

    assert.equal(result.exitCode, 0);
    assert.match(rendered, /q - Quit/);
    assert.match(rendered, /Select a skills source to activate from:/);
    assert.match(rendered, /Select a skill from aaa:/);
    assert.match(result.stdout, /Activated skill aaa\/skills\/demo as demo/);
    assert.deepEqual(manifest.skills, ["aaa:skills/demo"]);
  } finally {
    if (previousCache === undefined) {
      delete process.env.AIX_CACHE_DIR;
    } else {
      process.env.AIX_CACHE_DIR = previousCache;
    }

    process.chdir(previousCwd);
  }
});

test("runInteractive skill activate supports quit", async () => {
  const input = new PassThrough();
  const output = new PassThrough();
  let rendered = "";

  output.on("data", (chunk) => {
    rendered += chunk.toString("utf8");
  });

  input.end("q\n");

  const result = await runInteractive(["skill", "activate"], input, output);

  assert.equal(result.exitCode, 0);
  assert.match(rendered, /Select a skills source to activate from:/);
  assert.match(rendered, /q - Quit/);
  assert.equal(result.stdout, "No skills source selected.");
});

test("run skill deactivate removes active state and package copy", async () => {
  await withProject(async (projectRoot) => {
    assert.equal(run(["skill", "activate", "fixture/skills/demo"]).exitCode, 0);

    const result = run(["skill", "deactivate", "demo"]);
    const manifest = JSON.parse(readFileSync(join(projectRoot, "aix.json"), "utf8"));
    const lockfile = JSON.parse(readFileSync(join(projectRoot, "aix.lock.json"), "utf8"));

    assert.equal(result.exitCode, 0);
    assert.match(result.stdout, /Deactivated skill demo/);
    assert.match(result.stdout, /Removed package:/);
    assert.match(result.stdout, /- demo at \.agents\/packages\/skills\/fixture\/skills\/demo/);
    assert.deepEqual(manifest.skills, []);
    assert.deepEqual(lockfile.skills, []);
    assert.equal(existsSync(join(projectRoot, ".agents/skills/demo")), false);
    assert.equal(existsSync(join(projectRoot, ".agents/packages/skills/fixture/skills/demo")), false);
    assert.equal(existsSync(join(projectRoot, ".agents/packages/skills/fixture/skills")), false);
    assert.equal(existsSync(join(projectRoot, ".agents/packages/skills/fixture")), false);
  });
});

test("run skill deactivate preserves non-empty package parent directories", async () => {
  await withProject(async (projectRoot) => {
    assert.equal(run(["skill", "activate", "fixture/skills/demo"]).exitCode, 0);
    mkdirSync(join(projectRoot, ".agents/packages/skills/fixture/skills/other"), { recursive: true });
    writeFileSync(join(projectRoot, ".agents/packages/skills/fixture/skills/other/notes.md"), "other package\n", "utf8");

    const result = run(["skill", "deactivate", "demo"]);

    assert.equal(result.exitCode, 0);
    assert.equal(existsSync(join(projectRoot, ".agents/packages/skills/fixture/skills/demo")), false);
    assert.equal(existsSync(join(projectRoot, ".agents/packages/skills/fixture/skills/other/notes.md")), true);
    assert.equal(existsSync(join(projectRoot, ".agents/packages/skills/fixture/skills")), true);
    assert.equal(existsSync(join(projectRoot, ".agents/packages/skills/fixture")), true);
  });
});

test("runInteractive skill deactivate prompts for an active skill", async () => {
  await withProject(async (projectRoot) => {
    assert.equal(run(["skill", "activate", "fixture/skills/demo"]).exitCode, 0);

    const input = new PassThrough();
    const output = new PassThrough();
    let rendered = "";
    let sentSkillSelection = false;

    output.on("data", (chunk) => {
      rendered += chunk.toString("utf8");

      if (!sentSkillSelection && rendered.includes("Select skill number:")) {
        sentSkillSelection = true;
        input.end("1\n");
      }
    });

    const result = await runInteractive(["skill", "deactivate"], input, output);
    const manifest = JSON.parse(readFileSync(join(projectRoot, "aix.json"), "utf8"));
    const lockfile = JSON.parse(readFileSync(join(projectRoot, "aix.lock.json"), "utf8"));

    assert.equal(result.exitCode, 0);
    assert.match(rendered, /q - Quit/);
    assert.match(rendered, /Select a skill to deactivate:/);
    assert.match(rendered, /1\. demo/);
    assert.match(result.stdout, /Deactivated skill demo/);
    assert.deepEqual(manifest.skills, []);
    assert.deepEqual(lockfile.skills, []);
    assert.equal(existsSync(join(projectRoot, ".agents/skills/demo")), false);
  });
});

test("runInteractive skill deactivate prompts for active skill when no target is provided", async () => {
  await withProject(async (projectRoot) => {
    assert.equal(run(["skill", "activate", "fixture/skills/demo"]).exitCode, 0);

    const input = new PassThrough();
    const output = new PassThrough();
    let rendered = "";

    output.on("data", (chunk) => {
      rendered += chunk.toString("utf8");
    });

    input.end("1\n");

    const result = await runInteractive(["skill", "deactivate"], input, output);
    const manifest = JSON.parse(readFileSync(join(projectRoot, "aix.json"), "utf8"));

    assert.equal(result.exitCode, 0);
    assert.match(rendered, /Select a skill to deactivate:/);
    assert.match(rendered, /1\. demo/);
    assert.match(result.stdout, /Deactivated skill demo/);
    assert.deepEqual(manifest.skills, []);
  });
});

test("runInteractive skill deactivate supports quit", async () => {
  const input = new PassThrough();
  const output = new PassThrough();
  let rendered = "";

  output.on("data", (chunk) => {
    rendered += chunk.toString("utf8");
  });

  input.end("q\n");

  const result = await runInteractive(["skill", "deactivate"], input, output);

  assert.equal(result.exitCode, 0);
  assert.match(rendered, /Select a skill to deactivate:/);
  assert.match(rendered, /q - Quit/);
  assert.equal(result.stdout, "No skill selected.");
});

test("run skill deactivate refuses to remove an edited active skill", async () => {
  await withProject(async (projectRoot) => {
    assert.equal(run(["skill", "activate", "fixture/skills/demo", "demo-alias"]).exitCode, 0);
    writeFileSync(join(projectRoot, ".agents/skills/demo-alias/SKILL.md"), "---\nname: edited\n---\n", "utf8");

    const result = run(["skill", "deactivate", "demo-alias"]);
    const manifest = JSON.parse(readFileSync(join(projectRoot, "aix.json"), "utf8"));
    const lockfile = JSON.parse(readFileSync(join(projectRoot, "aix.lock.json"), "utf8"));

    assert.equal(result.exitCode, 2);
    assert.match(result.stderr, /Refusing to remove modified active skill: \.agents\/skills\/demo-alias/);
    assert.deepEqual(manifest.skills, [{ source: "fixture", path: "skills/demo", alias: "demo-alias" }]);
    assert.equal(lockfile.skills.length, 1);
    assert.equal(existsSync(join(projectRoot, ".agents/skills/demo-alias/SKILL.md")), true);
    assert.equal(existsSync(join(projectRoot, ".agents/packages/skills/fixture/skills/demo/SKILL.md")), true);
  });
});

test("run skill activate refuses to refresh an active skill with edited active files", async () => {
  await withProject(async (projectRoot) => {
    assert.equal(run(["skill", "activate", "fixture/skills/demo", "demo-alias"]).exitCode, 0);
    writeFileSync(join(projectRoot, ".agents/skills/demo-alias/SKILL.md"), "---\nname: edited\n---\n", "utf8");

    const result = run(["skill", "activate", "fixture/skills/demo", "demo-alias"]);
    const manifest = JSON.parse(readFileSync(join(projectRoot, "aix.json"), "utf8"));
    const lockfile = JSON.parse(readFileSync(join(projectRoot, "aix.lock.json"), "utf8"));

    assert.equal(result.exitCode, 2);
    assert.match(result.stderr, /Refusing to refresh modified active skill: \.agents\/skills\/demo-alias/);
    assert.deepEqual(manifest.skills, [{ source: "fixture", path: "skills/demo", alias: "demo-alias" }]);
    assert.equal(lockfile.skills.length, 1);
    assert.match(readFileSync(join(projectRoot, ".agents/skills/demo-alias/SKILL.md"), "utf8"), /^name: edited$/m);
  });
});

test("run skill deactivate refuses to remove an edited package copy", async () => {
  await withProject(async (projectRoot) => {
    assert.equal(run(["skill", "activate", "fixture/skills/demo", "demo-alias"]).exitCode, 0);
    writeFileSync(join(projectRoot, ".agents/packages/skills/fixture/skills/demo/notes.md"), "package edit\n", "utf8");

    const result = run(["skill", "deactivate", "demo-alias"]);
    const manifest = JSON.parse(readFileSync(join(projectRoot, "aix.json"), "utf8"));
    const lockfile = JSON.parse(readFileSync(join(projectRoot, "aix.lock.json"), "utf8"));

    assert.equal(result.exitCode, 2);
    assert.match(result.stderr, /Refusing to remove modified package: \.agents\/packages\/skills\/fixture\/skills\/demo/);
    assert.deepEqual(manifest.skills, [{ source: "fixture", path: "skills/demo", alias: "demo-alias" }]);
    assert.equal(lockfile.skills.length, 1);
    assert.equal(existsSync(join(projectRoot, ".agents/skills/demo-alias/SKILL.md")), true);
    assert.equal(existsSync(join(projectRoot, ".agents/packages/skills/fixture/skills/demo/SKILL.md")), true);
  });
});
