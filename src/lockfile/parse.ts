import {
  LOCKFILE_FILE_NAME,
  LOCKFILE_VERSION,
  type FileHash,
  type LockfileAgentsMdBlock,
  type LockfileSkillDependency,
  type LockfileSkillEntry,
  type LockfileWorkflowDoc,
  type LockfileWorkflowEntry,
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

function parseSkillOwner(value: unknown, path: string): LockfileSkillEntry["owner"] {
  if (value === undefined) {
    return undefined;
  }

  if (!isRecord(value)) {
    throw new LockfileError(`${path} must be an object.`);
  }

  const kind = requireString(value.kind, `${path}.kind`);
  if (kind !== "workflow") {
    throw new LockfileError(`${path}.kind must be "workflow".`);
  }

  return {
    kind,
    name: requireString(value.name, `${path}.name`)
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
  const owner = parseSkillOwner(value.owner, `${path}.owner`);
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
    ...(owner ? { owner } : {}),
    ...(dependencies ? { dependencies: dependencies.map((dependency, index) => parseSkillDependency(dependency, `${path}.dependencies[${index}]`)) } : {}),
    packageFiles: value.packageFiles.map((file, index) => parseFileHash(file, `${path}.packageFiles[${index}]`)),
    activeFiles: value.activeFiles.map((file, index) => parseFileHash(file, `${path}.activeFiles[${index}]`))
  };
}

function parseWorkflowDoc(value: unknown, path: string): LockfileWorkflowDoc {
  if (!isRecord(value)) {
    throw new LockfileError(`${path} must be an object.`);
  }

  return {
    sourcePath: requireString(value.sourcePath, `${path}.sourcePath`),
    targetPath: requireString(value.targetPath, `${path}.targetPath`),
    sha256: requireString(value.sha256, `${path}.sha256`)
  };
}

function parseAgentsMdBlock(value: unknown, path: string): LockfileAgentsMdBlock | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (!isRecord(value)) {
    throw new LockfileError(`${path} must be an object.`);
  }

  return {
    path: requireString(value.path, `${path}.path`),
    marker: requireString(value.marker, `${path}.marker`),
    sha256: requireString(value.sha256, `${path}.sha256`)
  };
}

function parseWorkflowSkill(value: unknown, path: string): LockfileWorkflowEntry["skills"][number] {
  if (!isRecord(value)) {
    throw new LockfileError(`${path} must be an object.`);
  }

  return {
    sourcePath: requireString(value.sourcePath, `${path}.sourcePath`),
    activeName: requireString(value.activeName, `${path}.activeName`)
  };
}

function parseWorkflowEntry(value: unknown, path: string): LockfileWorkflowEntry {
  if (!isRecord(value)) {
    throw new LockfileError(`${path} must be an object.`);
  }

  const kind = requireString(value.kind, `${path}.kind`);
  if (kind !== "workflow") {
    throw new LockfileError(`${path}.kind must be "workflow".`);
  }

  const sourceType = requireString(value.sourceType, `${path}.sourceType`);
  if (sourceType !== "git") {
    throw new LockfileError(`${path}.sourceType must be "git".`);
  }

  if (!Array.isArray(value.docs)) {
    throw new LockfileError(`${path}.docs must be an array.`);
  }

  if (!Array.isArray(value.skills)) {
    throw new LockfileError(`${path}.skills must be an array.`);
  }

  if (!Array.isArray(value.packageFiles)) {
    throw new LockfileError(`${path}.packageFiles must be an array.`);
  }

  const sourceUrl = optionalString(value.sourceUrl, `${path}.sourceUrl`);
  const requestedRef = optionalString(value.requestedRef, `${path}.requestedRef`);
  const resolvedCommit = optionalString(value.resolvedCommit, `${path}.resolvedCommit`);
  const title = optionalString(value.title, `${path}.title`);
  const agentsMd = parseAgentsMdBlock(value.agentsMd, `${path}.agentsMd`);

  return {
    kind,
    source: requireString(value.source, `${path}.source`),
    sourceType,
    ...(sourceUrl ? { sourceUrl } : {}),
    ...(requestedRef ? { requestedRef } : {}),
    ...(resolvedCommit ? { resolvedCommit } : {}),
    sourcePath: requireString(value.sourcePath, `${path}.sourcePath`),
    packagePath: requireString(value.packagePath, `${path}.packagePath`),
    name: requireString(value.name, `${path}.name`),
    ...(title ? { title } : {}),
    docs: value.docs.map((doc, index) => parseWorkflowDoc(doc, `${path}.docs[${index}]`)),
    ...(agentsMd ? { agentsMd } : {}),
    skills: value.skills.map((skill, index) => parseWorkflowSkill(skill, `${path}.skills[${index}]`)),
    packageFiles: value.packageFiles.map((file, index) => parseFileHash(file, `${path}.packageFiles[${index}]`))
  };
}

export function emptyLockfile(): SkillsLockfile {
  return {
    lockfileVersion: LOCKFILE_VERSION,
    skills: [],
    workflows: []
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

  if (value.workflows !== undefined && !Array.isArray(value.workflows)) {
    throw new LockfileError("workflows must be an array when provided.");
  }

  return {
    lockfileVersion: LOCKFILE_VERSION,
    skills: value.skills.map((skill, index) => parseSkillEntry(skill, `skills[${index}]`)),
    workflows: (value.workflows || []).map((workflow, index) => parseWorkflowEntry(workflow, `workflows[${index}]`))
  };
}
