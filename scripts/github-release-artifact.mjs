import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const repoRoot = process.cwd();
const npmCache = await mkdtemp(join(tmpdir(), "aix-npm-cache-"));
const artifactDirectory = resolve(repoRoot, "release-artifacts");

mkdirSync(artifactDirectory, { recursive: true });

const env = {
  ...process.env,
  npm_config_cache: npmCache
};

execFileSync("npm", ["run", "build"], {
  cwd: repoRoot,
  stdio: "inherit",
  env
});

const packOutput = execFileSync(
  "npm",
  ["pack", "--pack-destination", artifactDirectory, "--json"],
  {
    cwd: repoRoot,
    encoding: "utf8",
    env
  }
);
const [packResult] = JSON.parse(packOutput);
const archivePath = join(artifactDirectory, packResult.filename);
const archive = readFileSync(archivePath);
const checksum = createHash("sha256").update(archive).digest("hex");
const checksumPath = `${archivePath}.sha256`;

writeFileSync(checksumPath, `${checksum}  ${packResult.filename}\n`, "utf8");

console.log("");
console.log(`Created ${archivePath}`);
console.log(`Created ${checksumPath}`);
console.log("");
console.log("Attach the .tgz file to the matching GitHub Release.");
console.log("");
console.log("Release note checksum:");
console.log("");
console.log("```text");
console.log(`SHA-256 ${packResult.filename}`);
console.log(checksum);
console.log("```");
