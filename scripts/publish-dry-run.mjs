import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const npmCache = await mkdtemp(join(tmpdir(), "aix-npm-cache-"));
const packageJson = JSON.parse(readFileSync(join(process.cwd(), "package.json"), "utf8"));

const output = execFileSync("npm", ["publish", "--dry-run", "--json"], {
  cwd: process.cwd(),
  encoding: "utf8",
  env: {
    ...process.env,
    npm_config_cache: npmCache
  }
});

const jsonStart = output.indexOf("{");
assert.notEqual(jsonStart, -1, "npm publish dry run did not return JSON output");

const publishResult = JSON.parse(output.slice(jsonStart));
const publishId = publishResult.id ?? "";
const expectedId = `${packageJson.name}@${packageJson.version}`;
const packageName = publishResult.name ?? (publishId.endsWith(`@${packageJson.version}`)
  ? publishId.slice(0, -`@${packageJson.version}`.length)
  : packageJson.name);
const packageVersion = publishResult.version ?? (publishId.startsWith(`${packageJson.name}@`)
  ? publishId.slice(`${packageJson.name}@`.length)
  : packageJson.version);
const packageFiles = publishResult.files ?? publishResult.contents ?? [];

assert.equal(publishId || expectedId, expectedId);
assert.equal(packageName, packageJson.name);
assert.equal(packageVersion, packageJson.version);

if (publishResult.filename !== undefined) {
  assert.equal(
    publishResult.filename,
    `${packageJson.name.replace("@", "").replace("/", "-")}-${packageJson.version}.tgz`
  );
}

if (packageFiles.length > 0) {
  assert.ok(
    packageFiles.some((file) => file.path === "bin/aix.js"),
    "publish dry run did not include bin/aix.js"
  );
}

console.log(
  `Publish dry run passed for ${packageName}@${packageVersion} (${publishResult.filename}).`
);
