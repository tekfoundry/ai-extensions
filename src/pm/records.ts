import { mkdirSync, renameSync, writeFileSync } from "node:fs";
import { basename, dirname, resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { AixError } from "../errors.js";
import { assertPmRuntimePath } from "./paths.js";
import { assertNoRawSecrets } from "./validation.js";

function projectRootForPmPath(path: string, projectRoot?: string): string {
  if (projectRoot) return projectRoot;

  let current = resolve(path);
  while (true) {
    const parent = resolve(current, "..");
    if (basename(current) === "pm" && basename(parent) === ".aix") {
      return resolve(parent, "..");
    }
    if (parent === current) break;
    current = parent;
  }

  throw new AixError(`PM record path must be inside canonical .aix/pm: ${path}`);
}

export function writePmTextAtomic(path: string, contents: string, projectRoot?: string): void {
  assertPmRuntimePath(projectRootForPmPath(path, projectRoot), path);
  const temporaryPath = `${path}.${process.pid}.${randomUUID()}.tmp`;

  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(temporaryPath, contents, { encoding: "utf8", mode: 0o600 });
  renameSync(temporaryPath, path);
}

export function writePmJsonAtomic(path: string, value: unknown, projectRoot?: string): void {
  assertNoRawSecrets(value);
  writePmTextAtomic(path, `${JSON.stringify(value, null, 2)}\n`, projectRoot);
}
