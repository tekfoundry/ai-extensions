import { execFileSync } from "node:child_process";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const npmCache = await mkdtemp(join(tmpdir(), "aix-npm-cache-"));

const output = execFileSync("npm", ["pack", "--dry-run", "--json"], {
  cwd: process.cwd(),
  encoding: "utf8",
  env: {
    ...process.env,
    npm_config_cache: npmCache
  }
});

process.stdout.write(output);
