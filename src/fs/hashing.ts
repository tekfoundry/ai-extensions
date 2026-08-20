import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

export function hashBuffer(contents: Buffer | string): string {
  return createHash("sha256").update(contents).digest("hex");
}

export function hashFile(path: string): string {
  return hashBuffer(readFileSync(path));
}
