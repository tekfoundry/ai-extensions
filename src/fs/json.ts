import { randomUUID } from "node:crypto";
import { existsSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { AixError } from "../errors.js";

export function assertJsonWriteSafe(path: string, contents: string): void {
  if (existsSync(path) && readFileSync(path, "utf8") !== contents) {
    throw new AixError(`Refusing to overwrite local edit: ${path}`);
  }
}

export function writeJsonAtomic(path: string, contents: string): void {
  const tempPath = `${path}.${process.pid}.${randomUUID()}.tmp`;

  writeFileSync(tempPath, contents, { encoding: "utf8", mode: 0o644 });
  renameSync(tempPath, path);
}
