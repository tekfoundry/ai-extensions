import { randomUUID } from "node:crypto";
import { existsSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { AixError } from "../errors.js";
import { isRecord } from "../validation/types.js";

export function readJsonObject(path: string): Record<string, unknown> {
  if (!existsSync(path)) {
    throw new AixError(`Missing ${path}.`);
  }

  const value = JSON.parse(readFileSync(path, "utf8")) as unknown;

  if (!isRecord(value)) {
    throw new AixError(`${path} must contain a JSON object.`);
  }

  return value;
}

export function writeJsonObjectAtomic(path: string, value: unknown): void {
  const tempPath = `${path}.${process.pid}.${randomUUID()}.tmp`;

  writeFileSync(tempPath, `${JSON.stringify(value, null, 2)}\n`, { encoding: "utf8", mode: 0o644 });
  renameSync(tempPath, path);
}
