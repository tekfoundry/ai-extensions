import {
  type AppendBlockOwnerKind,
  LOCKFILE_FILE_NAME,
  LOCKFILE_VERSION,
  type FileHash,
  type LockfileRoleEntry,
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
  if (kind !== "workflow" && kind !== "role") {
    throw new LockfileError(`${path}.kind must be "workflow" or "role".`);
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

  if (value.templates !== undefined && !Array.isArray(value.templates)) {
    throw new LockfileError(`${path}.templates must be an array when provided.`);
  }

  if (!Array.isArray(value.activeFiles)) {
    throw new LockfileError(`${path}.activeFiles must be an array.`);
  }

  const sourceType = requireString(value.sourceType, `${path}.sourceType`);
  if (sourceType !== "git" && sourceType !== "local") {
    throw new LockfileError(`${path}.sourceType must be "git" or "local".`);
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
  const agentsMd = parseAgentsMdBlock(value.agentsMd, `${path}.agentsMd`);

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
    ...(agentsMd ? { agentsMd } : {}),
    packageFiles: value.packageFiles.map((file, index) => parseFileHash(file, `${path}.packageFiles[${index}]`)),
    activeFiles: value.activeFiles.map((file, index) => parseFileHash(file, `${path}.activeFiles[${index}]`))
  };
}

function parseRoleOwner(value: unknown, path: string): LockfileRoleEntry["owner"] {
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

function parseRoleEntry(value: unknown, path: string): LockfileRoleEntry {
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
  if (sourceType !== "git" && sourceType !== "local") {
    throw new LockfileError(`${path}.sourceType must be "git" or "local".`);
  }

  const kind = requireString(value.kind, `${path}.kind`);
  if (kind !== "role") {
    throw new LockfileError(`${path}.kind must be "role".`);
  }

  const sourceUrl = optionalString(value.sourceUrl, `${path}.sourceUrl`);
  const requestedRef = optionalString(value.requestedRef, `${path}.requestedRef`);
  const resolvedCommit = optionalString(value.resolvedCommit, `${path}.resolvedCommit`);
  const alias = optionalString(value.alias, `${path}.alias`);
  const owner = parseRoleOwner(value.owner, `${path}.owner`);
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
    activationPath: requireString(value.activationPath, `${path}.activationPath`),
    originalName: requireString(value.originalName, `${path}.originalName`),
    activeName: requireString(value.activeName, `${path}.activeName`),
    ...(alias ? { alias } : {}),
    requested: optionalBoolean(value.requested, `${path}.requested`, true),
    ...(owner ? { owner } : {}),
    ...(agentsMd ? { agentsMd } : {}),
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

function parseAgentsMdBlock(
  value: unknown,
  path: string,
  defaults?: {
    owner: { kind: AppendBlockOwnerKind; name: string };
    source: string;
    sourcePath: string;
  }
): LockfileAgentsMdBlock | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (!isRecord(value)) {
    throw new LockfileError(`${path} must be an object.`);
  }

  const legacySha256 = optionalString(value.sha256, `${path}.sha256`);
  const sourceSha256 = legacySha256
    ? optionalString(value.sourceSha256, `${path}.sourceSha256`) || legacySha256
    : requireString(value.sourceSha256, `${path}.sourceSha256`);
  const renderedSha256 = legacySha256
    ? optionalString(value.renderedSha256, `${path}.renderedSha256`) || legacySha256
    : requireString(value.renderedSha256, `${path}.renderedSha256`);
  const installedSha256 = legacySha256
    ? optionalString(value.installedSha256, `${path}.installedSha256`) || renderedSha256
    : requireString(value.installedSha256, `${path}.installedSha256`);
  let owner: { kind: AppendBlockOwnerKind; name: string };

  if (value.owner !== undefined) {
    if (!isRecord(value.owner)) {
      throw new LockfileError(`${path}.owner must be an object.`);
    }

    const ownerKind = requireString(value.owner.kind, `${path}.owner.kind`);
    if (ownerKind !== "skill" && ownerKind !== "role" && ownerKind !== "workflow") {
      throw new LockfileError(`${path}.owner.kind must be "skill", "role", or "workflow".`);
    }

    const ownerName =
      typeof value.owner.name === "string" && value.owner.name.trim() === "" && defaults?.owner.kind === ownerKind
        ? defaults.owner.name
        : requireString(value.owner.name, `${path}.owner.name`);

    owner = {
      kind: ownerKind,
      name: ownerName
    };
  } else if (legacySha256) {
    owner = {
      kind: "workflow",
      name: ""
    };
  } else {
    throw new LockfileError(`${path}.owner must be an object.`);
  }

  return {
    owner,
    source:
      typeof value.source === "string" && value.source.trim() === "" && defaults
        ? defaults.source
        : legacySha256
          ? optionalString(value.source, `${path}.source`) || ""
          : requireString(value.source, `${path}.source`),
    sourcePath:
      typeof value.sourcePath === "string" && value.sourcePath.trim() === "" && defaults
        ? defaults.sourcePath
        : legacySha256
          ? optionalString(value.sourcePath, `${path}.sourcePath`) || ""
          : requireString(value.sourcePath, `${path}.sourcePath`),
    path: requireString(value.path, `${path}.path`),
    marker: requireString(value.marker, `${path}.marker`),
    sourceSha256,
    renderedSha256,
    installedSha256
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

function parseWorkflowRole(value: unknown, path: string): NonNullable<LockfileWorkflowEntry["roles"]>[number] {
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
  if (sourceType !== "git" && sourceType !== "local") {
    throw new LockfileError(`${path}.sourceType must be "git" or "local".`);
  }

  if (!Array.isArray(value.docs)) {
    throw new LockfileError(`${path}.docs must be an array.`);
  }

  if (!Array.isArray(value.skills)) {
    throw new LockfileError(`${path}.skills must be an array.`);
  }

  if (value.roles !== undefined && !Array.isArray(value.roles)) {
    throw new LockfileError(`${path}.roles must be an array when provided.`);
  }

  if (value.guidance !== undefined && !Array.isArray(value.guidance)) {
    throw new LockfileError(`${path}.guidance must be an array when provided.`);
  }

  if (!Array.isArray(value.packageFiles)) {
    throw new LockfileError(`${path}.packageFiles must be an array.`);
  }

  const source = requireString(value.source, `${path}.source`);
  const sourcePath = requireString(value.sourcePath, `${path}.sourcePath`);
  const name = requireString(value.name, `${path}.name`);
  const sourceUrl = optionalString(value.sourceUrl, `${path}.sourceUrl`);
  const requestedRef = optionalString(value.requestedRef, `${path}.requestedRef`);
  const resolvedCommit = optionalString(value.resolvedCommit, `${path}.resolvedCommit`);
  const title = optionalString(value.title, `${path}.title`);
  const agentsMd = parseAgentsMdBlock(value.agentsMd, `${path}.agentsMd`, {
    owner: {
      kind: "workflow",
      name
    },
    source,
    sourcePath
  });
  const templates = Array.isArray(value.templates) ? value.templates : undefined;
  const guidance = Array.isArray(value.guidance) ? value.guidance : undefined;
  const roles = Array.isArray(value.roles) ? value.roles : undefined;

  return {
    kind,
    source,
    sourceType,
    ...(sourceUrl ? { sourceUrl } : {}),
    ...(requestedRef ? { requestedRef } : {}),
    ...(resolvedCommit ? { resolvedCommit } : {}),
    sourcePath,
    packagePath: requireString(value.packagePath, `${path}.packagePath`),
    name,
    ...(title ? { title } : {}),
    docs: value.docs.map((doc, index) => parseWorkflowDoc(doc, `${path}.docs[${index}]`)),
    ...(agentsMd ? { agentsMd } : {}),
    skills: value.skills.map((skill, index) => parseWorkflowSkill(skill, `${path}.skills[${index}]`)),
    ...(roles ? { roles: roles.map((role, index) => parseWorkflowRole(role, `${path}.roles[${index}]`)) } : {}),
    ...(templates ? { templates: templates.map((file, index) => parseFileHash(file, `${path}.templates[${index}]`)) } : {}),
    ...(guidance ? { guidance: guidance.map((file, index) => parseFileHash(file, `${path}.guidance[${index}]`)) } : {}),
    packageFiles: value.packageFiles.map((file, index) => parseFileHash(file, `${path}.packageFiles[${index}]`))
  };
}

export function emptyLockfile(): SkillsLockfile {
  return {
    lockfileVersion: LOCKFILE_VERSION,
    skills: [],
    roles: [],
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

  if (value.roles !== undefined && !Array.isArray(value.roles)) {
    throw new LockfileError("roles must be an array when provided.");
  }

  return {
    lockfileVersion: LOCKFILE_VERSION,
    skills: value.skills.map((skill, index) => parseSkillEntry(skill, `skills[${index}]`)),
    roles: (value.roles || []).map((role, index) => parseRoleEntry(role, `roles[${index}]`)),
    workflows: (value.workflows || []).map((workflow, index) => parseWorkflowEntry(workflow, `workflows[${index}]`))
  };
}
