import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const repoRoot = process.cwd();
const aixCli = join(repoRoot, "bin", "aix.js");

assert.equal(existsSync(aixCli), true, "Missing bin/aix.js.");

function runAix(cwd, args) {
  return execFileSync("node", [aixCli, ...args], {
    cwd,
    encoding: "utf8",
    env: process.env
  });
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

async function smokeLocalSkill() {
  const projectRoot = await mkdtemp(join(tmpdir(), "aix-local-skill-smoke-"));

  try {
    mkdirSync(join(projectRoot, "aix/skills/local-smoke"), { recursive: true });
    writeFileSync(
      join(projectRoot, "aix/skills/local-smoke/SKILL.md"),
      [
        "---",
        "name: local-smoke",
        "description: Local smoke test skill.",
        "---",
        "",
        "# Local Smoke",
        ""
      ].join("\n"),
      "utf8"
    );
    writeFileSync(
      join(projectRoot, "aix.json"),
      JSON.stringify({ sources: { skills: {}, workflows: {} }, skills: [] }, null, 2) + "\n",
      "utf8"
    );

    const activateOutput = runAix(projectRoot, ["skill", "activate", "aix/skills/local-smoke"]);
    assert.match(activateOutput, /Activated skill aix\/skills\/local-smoke as local-smoke/);

    runAix(projectRoot, ["status"]);
    runAix(projectRoot, ["verify"]);

    const lockfile = readJson(join(projectRoot, "aix.lock.json"));
    assert.equal(lockfile.skills[0].source, "aix");
    assert.equal(lockfile.skills[0].sourceType, "local");
    assert.equal(lockfile.skills[0].sourceUrl, undefined);
    assert.equal(existsSync(join(projectRoot, ".agents/packages/skills/aix/skills/local-smoke/SKILL.md")), true);

    runAix(projectRoot, ["skill", "deactivate", "local-smoke"]);

    assert.equal(existsSync(join(projectRoot, "aix/skills/local-smoke/SKILL.md")), true);
    assert.equal(existsSync(join(projectRoot, ".agents/packages/skills/aix/skills/local-smoke/SKILL.md")), false);

    return projectRoot;
  } finally {
    rmSync(projectRoot, { recursive: true, force: true });
  }
}

async function smokeLocalWorkflow() {
  const projectRoot = await mkdtemp(join(tmpdir(), "aix-local-workflow-smoke-"));

  try {
    mkdirSync(join(projectRoot, "aix/workflows/local-flow/skills/alpha"), { recursive: true });
    writeFileSync(
      join(projectRoot, "aix/workflows/local-flow/workflow.json"),
      JSON.stringify(
        {
          name: "local-flow",
          title: "Local Flow",
          docs: [],
          skillsDir: "skills"
        },
        null,
        2
      ) + "\n",
      "utf8"
    );
    writeFileSync(
      join(projectRoot, "aix/workflows/local-flow/skills/alpha/SKILL.md"),
      [
        "---",
        "name: alpha",
        "description: Local workflow skill.",
        "---",
        "",
        "# Alpha",
        ""
      ].join("\n"),
      "utf8"
    );

    const installOutput = runAix(projectRoot, ["workflow", "install", "aix/workflows/local-flow"]);
    assert.match(installOutput, /Installed workflow local-flow/);

    runAix(projectRoot, ["status"]);
    runAix(projectRoot, ["verify"]);

    const lockfile = readJson(join(projectRoot, "aix.lock.json"));
    assert.equal(lockfile.workflows[0].source, "aix");
    assert.equal(lockfile.workflows[0].sourceType, "local");
    assert.equal(lockfile.workflows[0].sourceUrl, undefined);
    assert.equal(existsSync(join(projectRoot, ".agents/packages/workflows/aix/local-flow/workflow.json")), true);

    runAix(projectRoot, ["workflow", "uninstall"]);

    assert.equal(existsSync(join(projectRoot, "aix/workflows/local-flow/workflow.json")), true);
    assert.equal(existsSync(join(projectRoot, ".agents/packages/workflows/aix/local-flow/workflow.json")), false);

    return projectRoot;
  } finally {
    rmSync(projectRoot, { recursive: true, force: true });
  }
}

const skillProject = await smokeLocalSkill();
console.log(`Local skill smoke passed and cleaned ${skillProject}`);

const workflowProject = await smokeLocalWorkflow();
console.log(`Local workflow smoke passed and cleaned ${workflowProject}`);

console.log("Local asset smoke passed.");
