import {
  LOCKFILE_FILE_NAME,
  LOCKFILE_VERSION,
  type FileHash,
  type LockfileSkillDependency,
  type LockfileSkillEntry,
  type SkillsLockfile
} from "../schema.js";
import { isRecord } from "../validation/types.js";
import { LockfileError } from "./errors.js";

function requireString(value: unknown, path: string): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new LockfileError(`${path} must be a non-empty string.`);
  }

  return value;
}

function optionalString(value: unknown, path: string): string | undefined {
  if (value === undefined) {
    return undefined;
  }

  return requireString(value, path);
}

function optionalBoolean(value: unknown, path: string, defaultValue: boolean): boolean {
  if (value === undefined) {
    return defaultValue;
  }

  if (typeof value !== "boolean") {
    throw new LockfileError(`${path} must be a boolean.`);
  }

  return value;
}

function parseFileHash(value: unknown, path: string): FileHash {
  if (!isRecord(value)) {
    throw new LockfileError(`${path} must be an object.`);
  }

  return {
    path: requireString(value.path, `${path}.path`),
    sha256: requireString(value.sha256, `${path}.sha256`)
  };
}

function parseSkillDependency(value: unknown, path: string): LockfileSkillDependency {
  if (!isRecord(value)) {
    throw new LockfileError(`${path} must be an object.`);
  }

  const type = requireString(value.type, `${path}.type`);
  if (type !== "inferred") {
    throw new LockfileError(`${path}.type must be "inferred".`);
  }

  return {
    source: requireString(value.source, `${path}.source`),
    sourcePath: requireString(value.sourcePath, `${path}.sourcePath`),
    activeName: requireString(value.activeName, `${path}.activeName`),
    type,
    reason: requireString(value.reason, `${path}.reason`)
  };
}

function parseSkillEntry(value: unknown, path: string): LockfileSkillEntry {
  if (!isRecord(value)) {
    throw new LockfileError(`${path} must be an object.`);
  }

  if (!Array.isArray(value.packageFiles)) {
    throw new LockfileError(`${path}.packageFiles must be an array.`);
  }

  if (!Array.isArray(value.activeFiles)) {
    throw new LockfileError(`${path}.activeFiles must be an array.`);
  }

  const sourceType = requireString(value.sourceType, `${path}.sourceType`);
  if (sourceType !== "git") {
    throw new LockfileError(`${path}.sourceType must be "git".`);
  }

  const kind = requireString(value.kind, `${path}.kind`);
  if (kind !== "skill") {
    throw new LockfileError(`${path}.kind must be "skill".`);
  }

  const sourceUrl = optionalString(value.sourceUrl, `${path}.sourceUrl`);
  const requestedRef = optionalString(value.requestedRef, `${path}.requestedRef`);
  const resolvedCommit = optionalString(value.resolvedCommit, `${path}.resolvedCommit`);
  const alias = optionalString(value.alias, `${path}.alias`);
  const dependencies = value.dependencies;

  if (dependencies !== undefined && !Array.isArray(dependencies)) {
    throw new LockfileError(`${path}.dependencies must be an array.`);
  }

  return {
    kind,
    source: requireString(value.source, `${path}.source`),
    sourceType,
    ...(sourceUrl ? { sourceUrl } : {}),
    ...(requestedRef ? { requestedRef } : {}),
    ...(resolvedCommit ? { resolvedCommit } : {}),
    sourcePath: requireString(value.sourcePath, `${path}.sourcePath`),
    packagePath: requireString(value.packagePath, `${path}.packagePath`),
    activationPath: requireString(value.activationPath, `${path}.activationPath`),
    originalName: requireString(value.originalName, `${path}.originalName`),
    activeName: requireString(value.activeName, `${path}.activeName`),
    ...(alias ? { alias } : {}),
    requested: optionalBoolean(value.requested, `${path}.requested`, true),
    ...(dependencies ? { dependencies: dependencies.map((dependency, index) => parseSkillDependency(dependency, `${path}.dependencies[${index}]`)) } : {}),
    packageFiles: value.packageFiles.map((file, index) => parseFileHash(file, `${path}.packageFiles[${index}]`)),
    activeFiles: value.activeFiles.map((file, index) => parseFileHash(file, `${path}.activeFiles[${index}]`))
  };
}

export function emptyLockfile(): SkillsLockfile {
  return {
    lockfileVersion: LOCKFILE_VERSION,
    skills: []
  };
}

export function parseLockfile(value: unknown): SkillsLockfile {
  if (!isRecord(value)) {
    throw new LockfileError(`${LOCKFILE_FILE_NAME} must contain a JSON object.`);
  }

  if (value.lockfileVersion !== LOCKFILE_VERSION) {
    throw new LockfileError(`lockfileVersion must be ${LOCKFILE_VERSION}.`);
  }

  if (!Array.isArray(value.skills)) {
    throw new LockfileError("skills must be an array.");
  }

  return {
    lockfileVersion: LOCKFILE_VERSION,
    skills: value.skills.map((skill, index) => parseSkillEntry(skill, `skills[${index}]`))
  };
}
