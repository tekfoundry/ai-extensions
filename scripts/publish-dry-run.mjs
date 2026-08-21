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

assert.equal(publishResult.name, packageJson.name);
assert.equal(publishResult.version, packageJson.version);
assert.equal(
  publishResult.filename,
  `${packageJson.name.replace("@", "").replace("/", "-")}-${packageJson.version}.tgz`
);
assert.ok(
  publishResult.files.some((file) => file.path === "bin/aix.js"),
  "publish dry run did not include bin/aix.js"
);

console.log(
  `Publish dry run passed for ${publishResult.name}@${publishResult.version} (${publishResult.filename}).`
);
