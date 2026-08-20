import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { AixError } from "../errors.js";
import { copyFilesSafely } from "../fs/files.js";

export function gitNoIndexDiff(fromPath: string, toPath: string): string {
  try {
    return execFileSync("git", ["diff", "--no-index", "--", fromPath, toPath], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    });
  } catch (error) {
    if (typeof error === "object" && error !== null && "status" in error && error.status === 1 && "stdout" in error) {
      return String(error.stdout);
    }

    const message = error instanceof Error ? error.message : String(error);

    throw new AixError(`Git diff failed for ${fromPath} and ${toPath}.\n${message}`);
  }
}

export function diffPackageAgainstSourceSnapshot(packagePath: string, sourcePath: string): string {
  const sourceSnapshot = mkdtempSync(join(tmpdir(), "aix-workflow-diff-"));
  copyFilesSafely(sourcePath, sourceSnapshot);

  try {
    return gitNoIndexDiff(packagePath, sourceSnapshot);
  } finally {
    rmSync(sourceSnapshot, { recursive: true, force: true });
  }
}
