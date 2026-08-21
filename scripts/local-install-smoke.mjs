import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, renameSync, symlinkSync } from "node:fs";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const repoRoot = process.cwd();
const workDirectory = await mkdtemp(join(tmpdir(), "aix-local-release-"));
const packDirectory = join(workDirectory, "pack");
const installDirectory = join(workDirectory, "install");
const scopedInstallDirectory = join(installDirectory, "node_modules", "@tekfoundry");
const npmCache = join(workDirectory, "npm-cache");

mkdirSync(packDirectory, { recursive: true });
mkdirSync(scopedInstallDirectory, { recursive: true });
mkdirSync(npmCache, { recursive: true });

const env = {
  ...process.env,
  npm_config_cache: npmCache
};

const packOutput = execFileSync(
  "npm",
  ["pack", "--pack-destination", packDirectory, "--json"],
  {
    cwd: repoRoot,
    encoding: "utf8",
    env
  }
);
const [packResult] = JSON.parse(packOutput);
const archivePath = join(packDirectory, packResult.filename);

execFileSync("tar", ["-xzf", archivePath, "-C", installDirectory]);
renameSync(join(installDirectory, "package"), join(scopedInstallDirectory, "aix"));
symlinkSync(join(repoRoot, "node_modules"), join(installDirectory, "node_modules", "@tekfoundry", "aix", "node_modules"), "dir");

const installedPackageJsonPath = join(
  installDirectory,
  "node_modules",
  "@tekfoundry",
  "aix",
  "package.json"
);
assert.equal(existsSync(installedPackageJsonPath), true);

const installedPackageJson = JSON.parse(readFileSync(installedPackageJsonPath, "utf8"));
assert.equal(installedPackageJson.name, "@tekfoundry/aix");
assert.deepEqual(installedPackageJson.bin, { aix: "bin/aix.js" });

const aixBin = join(installDirectory, "node_modules", "@tekfoundry", "aix", "bin", "aix.js");
const helpOutput = execFileSync(aixBin, ["--help"], {
  cwd: installDirectory,
  encoding: "utf8",
  env
});
const statusOutput = execFileSync(aixBin, ["status"], {
  cwd: installDirectory,
  encoding: "utf8",
  env
});

assert.match(helpOutput, /AI Extensions/);
assert.match(helpOutput, /aix v/);
assert.match(statusOutput, /Workspace/);

console.log(`Packed ${archivePath}`);
console.log(`Unpacked into ${join(scopedInstallDirectory, "aix")}`);
console.log("Local install smoke passed.");
