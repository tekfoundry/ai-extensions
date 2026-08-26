import { existsSync, readFileSync, readdirSync, rmdirSync } from "node:fs";
import { join } from "node:path";
import { AixError } from "../errors.js";
import { parseLockfile } from "../lockfile.js";
import { LOCKFILE_FILE_NAME } from "../schema.js";
import { isRecord } from "../validation/types.js";

function skillDependsOnSource(skill: unknown, sourceName: string): boolean {
  if (typeof skill === "string") {
    const separatorIndex = skill.indexOf(":");

    return separatorIndex > 0 && skill.slice(0, separatorIndex) === sourceName;
  }

  return isRecord(skill) && skill.source === sourceName;
}

function roleDependsOnSource(role: unknown, sourceName: string): boolean {
  if (typeof role === "string") {
    const separatorIndex = role.indexOf(":");

    return separatorIndex > 0 && role.slice(0, separatorIndex) === sourceName;
  }

  return isRecord(role) && role.source === sourceName;
}

export function manifestDependsOnSource(manifest: Record<string, unknown>, sourceName: string): boolean {
  const skills = Array.isArray(manifest.skills) ? manifest.skills : [];

  return skills.some((skill) => skillDependsOnSource(skill, sourceName));
}

export function manifestRolesDependOnSource(manifest: Record<string, unknown>, sourceName: string): boolean {
  const roles = Array.isArray(manifest.roles) ? manifest.roles : [];

  return roles.some((role) => roleDependsOnSource(role, sourceName));
}

export function lockfileDependsOnSource(sourceName: string): boolean {
  if (!existsSync(LOCKFILE_FILE_NAME)) {
    return false;
  }

  const lockfile = parseLockfile(JSON.parse(readFileSync(LOCKFILE_FILE_NAME, "utf8")));

  return lockfile.skills.some((skill) => skill.source === sourceName);
}

export function lockfileRolesDependOnSource(sourceName: string): boolean {
  if (!existsSync(LOCKFILE_FILE_NAME)) {
    return false;
  }

  const lockfile = parseLockfile(JSON.parse(readFileSync(LOCKFILE_FILE_NAME, "utf8")));

  return (lockfile.roles || []).some((role) => role.source === sourceName);
}

export function packageSourcePath(sourceName: string): string {
  return join(".agents", "packages", "skills", sourceName);
}

export function rolePackageSourcePath(sourceName: string): string {
  return join(".agents", "packages", "roles", sourceName);
}

export function removeEmptyPackageSourceDirectory(sourceName: string): boolean {
  const sourcePath = packageSourcePath(sourceName);

  if (!existsSync(sourcePath)) {
    return false;
  }

  try {
    rmdirSync(sourcePath);
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOTEMPTY") {
      throw new AixError(`Cannot remove skills source ${sourceName}: ${sourcePath} is not empty. Deactivate skills first.`);
    }

    throw error;
  }

  return true;
}

export function removeEmptyRolePackageSourceDirectory(sourceName: string): boolean {
  const sourcePath = rolePackageSourcePath(sourceName);

  if (!existsSync(sourcePath)) {
    return false;
  }

  try {
    rmdirSync(sourcePath);
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOTEMPTY") {
      throw new AixError(`Cannot remove roles source ${sourceName}: ${sourcePath} is not empty. Deactivate roles first.`);
    }

    throw error;
  }

  return true;
}

function packageSourceDirectoryHasContents(sourceName: string): boolean {
  const sourcePath = packageSourcePath(sourceName);

  return existsSync(sourcePath) && readdirSync(sourcePath).length > 0;
}

function rolePackageSourceDirectoryHasContents(sourceName: string): boolean {
  const sourcePath = rolePackageSourcePath(sourceName);

  return existsSync(sourcePath) && readdirSync(sourcePath).length > 0;
}

export function removalBlockReason(manifest: Record<string, unknown>, sourceName: string): string | undefined {
  if (manifestDependsOnSource(manifest, sourceName) || lockfileDependsOnSource(sourceName)) {
    return "active skills still depend on it; deactivate skills first";
  }

  if (packageSourceDirectoryHasContents(sourceName)) {
    return `${packageSourcePath(sourceName)} is not empty; deactivate skills first`;
  }

  return undefined;
}

export function roleRemovalBlockReason(manifest: Record<string, unknown>, sourceName: string): string | undefined {
  if (manifestRolesDependOnSource(manifest, sourceName) || lockfileRolesDependOnSource(sourceName)) {
    return "active roles still depend on it; deactivate roles first";
  }

  if (rolePackageSourceDirectoryHasContents(sourceName)) {
    return `${rolePackageSourcePath(sourceName)} is not empty; deactivate roles first`;
  }

  return undefined;
}
