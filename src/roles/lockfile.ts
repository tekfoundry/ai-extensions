import { AixError } from "../errors.js";
import type { LockfileRoleEntry } from "../schema.js";

export function assertNoActiveRoleNameCollision(
  lockfile: { roles?: LockfileRoleEntry[] },
  activeName: string,
  source: string,
  sourcePath: string
): void {
  const existing = (lockfile.roles || []).find((role) => role.activeName === activeName);

  if (existing && (existing.source !== source || existing.sourcePath !== sourcePath)) {
    throw new AixError(`Active role name collision: ${activeName}`);
  }
}
