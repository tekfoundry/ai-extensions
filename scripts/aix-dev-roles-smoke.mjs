import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { appendFileSync, cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { activateRoleFromDefinitions } from "../dist/roles.js";

const repoRoot = process.cwd();
const aixBin = join(repoRoot, "bin", "aix.js");
const roleNames = [
  "aix-agent-instructions-auditor",
  "aix-package-safety-reviewer",
  "aix-release-readiness-specialist",
  "aix-skill-author",
  "aix-workflow-architect"
];

assert.equal(existsSync(aixBin), true, "Missing bin/aix.js.");

function git(args, cwd) {
  return execFileSync("git", args, {
    cwd,
    encoding: "utf8",
    env: {
      ...process.env,
      GIT_AUTHOR_NAME: "AIX Smoke",
      GIT_AUTHOR_EMAIL: "aix-smoke@example.test",
      GIT_COMMITTER_NAME: "AIX Smoke",
      GIT_COMMITTER_EMAIL: "aix-smoke@example.test"
    }
  }).trim();
}

function runAix(cwd, args) {
  return execFileSync(process.execPath, [aixBin, ...args], {
    cwd,
    encoding: "utf8",
    env: process.env
  });
}

function runAixMaybe(cwd, args) {
  return spawnSync(process.execPath, [aixBin, ...args], {
    cwd,
    encoding: "utf8",
    env: process.env
  });
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

const workDirectory = await mkdtemp(join(tmpdir(), "aix-dev-roles-smoke-"));
const sourceDirectory = join(workDirectory, "source");
const projectDirectory = join(workDirectory, "project");
const cacheDirectory = join(workDirectory, "cache");

try {
  mkdirSync(sourceDirectory, { recursive: true });
  mkdirSync(projectDirectory, { recursive: true });
  mkdirSync(cacheDirectory, { recursive: true });
  cpSync(join(repoRoot, "aix", "roles"), join(sourceDirectory, "roles"), { recursive: true });

  git(["init", "-b", "main"], sourceDirectory);
  git(["add", "."], sourceDirectory);
  git(["commit", "-m", "aix dev roles"], sourceDirectory);

  process.chdir(projectDirectory);
  writeFileSync(
    join(projectDirectory, "aix.json"),
    JSON.stringify({ sources: { skills: {}, workflows: {} }, skills: [] }, null, 2) + "\n",
    "utf8"
  );

  const sourceDefinitions = {
    aix: {
      type: "git",
      url: sourceDirectory,
      path: "roles",
      ref: "main"
    }
  };

  for (const roleName of roleNames) {
    const result = activateRoleFromDefinitions(
      `aix/aix-dev/${roleName}`,
      undefined,
      sourceDefinitions,
      cacheDirectory
    );

    assert.equal(result.activeName, roleName);
    assert.equal(existsSync(join(projectDirectory, ".agents", "roles", `${roleName}.md`)), true);
  }

  const lockfile = readJson(join(projectDirectory, "aix.lock.json"));
  assert.equal(lockfile.roles.length, roleNames.length);

  for (const roleName of roleNames) {
    const role = lockfile.roles.find((entry) => entry.activeName === roleName);
    assert.ok(role, `Missing lockfile entry for ${roleName}`);
    assert.equal(role.source, "aix");
    assert.equal(role.sourceType, "git");
    assert.equal(role.sourceUrl, sourceDirectory);
    assert.equal(role.sourcePath, `aix-dev/${roleName}.md`);
    assert.equal(role.requested, true);
  }

  const statusOutput = runAix(projectDirectory, ["status"]);
  assert.match(statusOutput, /Active roles/);

  for (const roleName of roleNames) {
    assert.match(statusOutput, new RegExp(roleName));
  }

  assert.match(runAix(projectDirectory, ["verify"]), /AI Extensions verification passed/);

  appendFileSync(
    join(projectDirectory, ".agents", "roles", "aix-skill-author.md"),
    "\n<!-- smoke drift -->\n",
    "utf8"
  );

  const drift = runAixMaybe(projectDirectory, ["verify"]);
  const driftOutput = `${drift.stdout || ""}${drift.stderr || ""}`;
  assert.equal(drift.status, 2);
  assert.match(driftOutput, /AI Extensions verification failed/);
  assert.match(driftOutput, /modified active role/);

  console.log(`Activated and verified ${roleNames.length} AIX development roles.`);
  console.log("Role drift detection smoke passed.");
  console.log(`Cleaned ${workDirectory}`);
} finally {
  process.chdir(repoRoot);
  rmSync(workDirectory, { recursive: true, force: true });
}
