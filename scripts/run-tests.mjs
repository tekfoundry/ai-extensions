import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const testsDirectory = join(process.cwd(), "tests");

if (!existsSync(testsDirectory)) {
  throw new Error("The tests directory is missing. Confirm tests/ is committed before running CI.");
}

const testFiles = readdirSync(testsDirectory)
  .filter((file) => file.endsWith(".test.mjs"))
  .sort()
  .map((file) => join("tests", file));

if (testFiles.length === 0) {
  throw new Error("No test files found in tests/*.test.mjs");
}

execFileSync(process.execPath, ["--test", "--test-concurrency=1", ...testFiles], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    AIX_CACHE_DIR: process.env.AIX_CACHE_DIR || mkdtempSync(join(tmpdir(), "aix-test-cache-"))
  },
  stdio: "inherit"
});
