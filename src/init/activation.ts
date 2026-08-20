import { existsSync, lstatSync, mkdirSync, readlinkSync, symlinkSync } from "node:fs";
import { dirname, relative } from "node:path";
import { AixError } from "../errors.js";
import { ACTIVE_SKILLS_DIR } from "../paths/agents.js";

function expectedActivationTarget(packagePath: string): string {
  return relative(ACTIVE_SKILLS_DIR, packagePath);
}

export function assertActivationSafe(activationPath: string, packagePath: string): void {
  if (!existsSync(activationPath)) {
    return;
  }

  const stats = lstatSync(activationPath);

  if (!stats.isSymbolicLink()) {
    throw new AixError(`Refusing to overwrite local edit: ${activationPath}`);
  }

  const actualTarget = readlinkSync(activationPath);
  const expectedTarget = expectedActivationTarget(packagePath);

  if (actualTarget !== expectedTarget) {
    throw new AixError(`Refusing to overwrite local edit: ${activationPath}`);
  }
}

export function activateSkillSafely(activationPath: string, packagePath: string): void {
  assertActivationSafe(activationPath, packagePath);

  if (!existsSync(activationPath)) {
    mkdirSync(dirname(activationPath), { recursive: true });
    symlinkSync(expectedActivationTarget(packagePath), activationPath, "dir");
  }
}
