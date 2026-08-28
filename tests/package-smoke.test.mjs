import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, renameSync, symlinkSync } from "node:fs";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

const repoRoot = process.cwd();

test("npm pack artifact contains a working aix binary", async () => {
  const packDirectory = await mkdtemp(join(tmpdir(), "aix-pack-"));
  const npmCache = await mkdtemp(join(tmpdir(), "aix-npm-cache-"));

  const packOutput = execFileSync("npm", ["pack", "--pack-destination", packDirectory, "--json"], {
    cwd: repoRoot,
    encoding: "utf8",
    env: {
      ...process.env,
      npm_config_cache: npmCache
    }
  });
  const [packResult] = JSON.parse(packOutput);
  const archivePath = join(packDirectory, packResult.filename);
  const unpackDirectory = join(packDirectory, "unpacked");

  execFileSync("tar", ["-xzf", archivePath, "-C", packDirectory]);
  renameSync(join(packDirectory, "package"), unpackDirectory);
  symlinkSync(join(repoRoot, "node_modules"), join(unpackDirectory, "node_modules"), "dir");

  const packageJson = JSON.parse(readFileSync(join(unpackDirectory, "package.json"), "utf8"));
  const helpOutput = execFileSync(process.execPath, [join(unpackDirectory, "bin/aix.js"), "--help"], {
    cwd: unpackDirectory,
    encoding: "utf8"
  });

  assert.equal(packageJson.name, "@tekfoundry/aix");
  assert.deepEqual(packageJson.bin, { aix: "bin/aix.js" });
  assert.equal(packageJson.publishConfig.access, "public");
  assert.equal(packageJson.dependencies["@inquirer/prompts"], "^8.6.0");
  assert.equal(packageJson.dependencies.yoctocolors, "^2.2.0");
  assert.equal(existsSync(join(unpackDirectory, "dist/cli.js")), true);
  assert.equal(existsSync(join(unpackDirectory, "aix/skills/discover-skill/SKILL.md")), true);
  assert.equal(existsSync(join(unpackDirectory, "aix/skills/discover-skill/known-sources.json")), true);
  assert.equal(existsSync(join(unpackDirectory, "aix/skills/get-guidance/SKILL.md")), true);
  assert.equal(existsSync(join(unpackDirectory, "aix/skills/get-guidance/README.md")), true);
  assert.equal(existsSync(join(unpackDirectory, "aix/workflows/design-plan-execute/skills/brainstorming-skill/SKILL.md")), true);
  assert.equal(existsSync(join(unpackDirectory, "aix/workflows/design-plan-execute/skills/brainstorming-skill/README.md")), true);
  assert.equal(existsSync(join(unpackDirectory, "aix/workflows/design-plan-execute/skills/task-execute/SKILL.md")), true);
  assert.equal(existsSync(join(unpackDirectory, "aix/workflows/design-plan-execute/guidance/README.md")), true);
  assert.equal(existsSync(join(unpackDirectory, "aix/workflows/design-plan-execute/guidance/shared.md")), true);
  assert.equal(existsSync(join(unpackDirectory, "aix/workflows/design-plan-execute/guidance/activities/verification.md")), true);
  assert.equal(existsSync(join(unpackDirectory, "aix/workflows/design-plan-execute/templates/sections/security-review.md")), true);
  assert.equal(existsSync(join(unpackDirectory, "aix/workflows/design-plan-execute/roles/project-dev/requirements-engineer/ROLE.md")), true);
  assert.equal(existsSync(join(unpackDirectory, "aix/workflows/design-plan-execute/roles/project-dev/security-engineer/ROLE.md")), true);
  assert.equal(existsSync(join(unpackDirectory, "aix/workflows/design-plan-execute/roles/project-dev/technical-architect/ROLE.md")), true);
  assert.equal(existsSync(join(unpackDirectory, "aix/workflows/design-plan-execute/roles/project-dev/ux-writer/ROLE.md")), true);
  assert.equal(existsSync(join(unpackDirectory, "aix/workflows/design-plan-execute/roles/project-dev/quality-engineer/ROLE.md")), true);
  assert.equal(existsSync(join(unpackDirectory, "aix/workflows/design-plan-execute/roles/project-dev/documentation-specialist/ROLE.md")), true);
  assert.equal(existsSync(join(unpackDirectory, "aix/workflows/design-plan-execute/roles/project-dev/implementation-engineer/ROLE.md")), true);
  for (const rolePath of [
    "aix/roles/aix-dev/aix-agent-instructions-auditor",
    "aix/roles/aix-dev/aix-package-safety-reviewer",
    "aix/roles/aix-dev/aix-release-readiness-specialist",
    "aix/roles/aix-dev/aix-skill-author",
    "aix/roles/aix-dev/aix-workflow-architect",
    "aix/workflows/design-plan-execute/roles/project-dev/requirements-engineer",
    "aix/workflows/design-plan-execute/roles/project-dev/security-engineer",
    "aix/workflows/design-plan-execute/roles/project-dev/technical-architect",
    "aix/workflows/design-plan-execute/roles/project-dev/ux-writer",
    "aix/workflows/design-plan-execute/roles/project-dev/quality-engineer",
    "aix/workflows/design-plan-execute/roles/project-dev/documentation-specialist",
    "aix/workflows/design-plan-execute/roles/project-dev/implementation-engineer",
    "aix/workflows/design-plan-execute/roles/project-dev/product-designer",
    "aix/workflows/design-plan-execute/roles/project-dev/product-strategist"
  ]) {
    const guidance = readFileSync(join(unpackDirectory, rolePath, "GUIDANCE.md"), "utf8");

    assert.equal(existsSync(join(unpackDirectory, rolePath, "ROLE.md")), true);
    assert.match(guidance, /^uses_guidance:/m);
    assert.doesNotMatch(guidance, /TODO|placeholder/i);
  }
  assert.equal(readdirSync(packDirectory).some((entry) => entry.endsWith(".tgz")), true);
  assert.match(helpOutput, /AI Extensions/);
  assert.match(helpOutput, new RegExp(`aix v${packageJson.version.replaceAll(".", "\\.")}`));
});
