import { mkdirSync, renameSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { randomUUID } from "node:crypto";
import { assertNoRawSecrets } from "./validation.js";

export function writePmTextAtomic(path: string, contents: string): void {
  const temporaryPath = `${path}.${process.pid}.${randomUUID()}.tmp`;

  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(temporaryPath, contents, { encoding: "utf8", mode: 0o600 });
  renameSync(temporaryPath, path);
}

export function writePmJsonAtomic(path: string, value: unknown): void {
  assertNoRawSecrets(value);
  writePmTextAtomic(path, `${JSON.stringify(value, null, 2)}\n`);
}
