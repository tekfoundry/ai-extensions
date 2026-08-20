import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { randomUUID } from "node:crypto";
import {
  LOCKFILE_FILE_NAME,
  LOCKFILE_VERSION,
  type FileHash,
  type LockfileSkillEntry,
  type SkillsLockfile
} from "./schema.js";

export class LockfileError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LockfileError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

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

function parseFileHash(value: unknown, path: string): FileHash {
  if (!isRecord(value)) {
    throw new LockfileError(`${path} must be an object.`);
  }

  return {
    path: requireString(value.path, `${path}.path`),
    sha256: requireString(value.sha256, `${path}.sha256`)
  };
}

function parseSkillEntry(value: unknown, path: string): LockfileSkillEntry {
  if (!isRecord(value)) {
    throw new LockfileError(`${path} must be an object.`);
  }

  if (!Array.isArray(value.files)) {
    throw new LockfileError(`${path}.files must be an array.`);
  }

  const sourceType = requireString(value.sourceType, `${path}.sourceType`);
  if (sourceType !== "git") {
    throw new LockfileError(`${path}.sourceType must be "git".`);
  }

  const sourceUrl = optionalString(value.sourceUrl, `${path}.sourceUrl`);
  const requestedRef = optionalString(value.requestedRef, `${path}.requestedRef`);
  const resolvedCommit = optionalString(value.resolvedCommit, `${path}.resolvedCommit`);
  const alias = optionalString(value.alias, `${path}.alias`);

  return {
    source: requireString(value.source, `${path}.source`),
    sourceType,
    ...(sourceUrl ? { sourceUrl } : {}),
    ...(requestedRef ? { requestedRef } : {}),
    ...(resolvedCommit ? { resolvedCommit } : {}),
    sourcePath: requireString(value.sourcePath, `${path}.sourcePath`),
    installPath: requireString(value.installPath, `${path}.installPath`),
    originalName: requireString(value.originalName, `${path}.originalName`),
    installedName: requireString(value.installedName, `${path}.installedName`),
    ...(alias ? { alias } : {}),
    files: value.files.map((file, index) => parseFileHash(file, `${path}.files[${index}]`))
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

export async function loadLockfile(filePath = LOCKFILE_FILE_NAME): Promise<SkillsLockfile> {
  let raw: string;

  try {
    raw = await readFile(filePath, "utf8");
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
      return emptyLockfile();
    }

    throw error;
  }

  try {
    return parseLockfile(JSON.parse(raw));
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new LockfileError(`Malformed JSON in ${filePath}: ${error.message}`);
    }

    throw error;
  }
}

export async function writeLockfile(lockfile: SkillsLockfile, filePath = LOCKFILE_FILE_NAME): Promise<void> {
  const parsed = parseLockfile(lockfile);
  const directory = dirname(filePath);
  const tempPath = `${filePath}.${process.pid}.${randomUUID()}.tmp`;
  const contents = `${JSON.stringify(parsed, null, 2)}\n`;

  if (directory !== ".") {
    await mkdir(directory, { recursive: true });
  }

  await writeFile(tempPath, contents, { encoding: "utf8", mode: 0o644 });
  await rename(tempPath, filePath);
}
