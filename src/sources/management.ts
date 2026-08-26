import { existsSync, unlinkSync } from "node:fs";
import { AixError } from "../errors.js";
import { parseSourceDefinition } from "../manifest.js";
import { MANIFEST_FILE_NAME, type SourceDefinition } from "../schema.js";
import { discoverRoles } from "../roles/discovery.js";
import { discoverSkills } from "../skills.js";
import { assertSourceNameSafe, deriveSourceName, parseSourceInput, sameSourceDefinition, sourceManifestEntry } from "./input.js";
import { readSourceManifestJson, roleSourceEntries, skillSourceEntries, writeSourceManifestJson } from "./manifest.js";
import { roleSourceMetadataPath, sourceMetadataPath, writeSourceMetadata } from "./metadata.js";
import {
  lockfileDependsOnSource,
  lockfileRolesDependOnSource,
  manifestDependsOnSource,
  manifestRolesDependOnSource,
  packageSourcePath as sourcePackagePath,
  rolePackageSourcePath as roleSourcePackagePath,
  removalBlockReason,
  removeEmptyPackageSourceDirectory,
  removeEmptyRolePackageSourceDirectory,
  roleRemovalBlockReason
} from "./removal.js";
import { defaultCacheRoot, resolveSourceFromDefinitions } from "./resolver.js";

export interface AddSourceResult {
  name: string;
  added: boolean;
  skillCount: number;
  manifestPath: string;
  metadataPath: string;
}

export interface AddRoleSourceResult {
  name: string;
  added: boolean;
  roleCount: number;
  manifestPath: string;
  metadataPath: string;
}

export interface RemoveSourceResult {
  name: string;
  manifestPath: string;
  metadataPath: string;
  metadataRemoved: boolean;
  packageSourcePath: string;
  packageSourceRemoved: boolean;
}

export interface RemoveRoleSourceResult {
  name: string;
  manifestPath: string;
  metadataPath: string;
  metadataRemoved: boolean;
  packageSourcePath: string;
  packageSourceRemoved: boolean;
}

export interface RemovableSkillSource {
  name: string;
  definition: SourceDefinition;
}

export interface BlockedSkillSource {
  name: string;
  definition: SourceDefinition;
  reason: string;
}

export interface RemoveSourceChoices {
  removable: RemovableSkillSource[];
  blocked: BlockedSkillSource[];
}

export interface RemovableRoleSource {
  name: string;
  definition: SourceDefinition;
}

export interface BlockedRoleSource {
  name: string;
  definition: SourceDefinition;
  reason: string;
}

export interface RemoveRoleSourceChoices {
  removable: RemovableRoleSource[];
  blocked: BlockedRoleSource[];
}

export function addSource(input: string | undefined, requestedName?: string, cacheRoot = defaultCacheRoot()): AddSourceResult {
  if (!input) {
    throw new AixError("Missing source URL.");
  }

  const definition = parseSourceInput(input);
  const name = requestedName || deriveSourceName(input, definition);
  assertSourceNameSafe(name);

  const manifest = readSourceManifestJson();
  const sources = skillSourceEntries(manifest);
  const existingSource = sources[name];
  let added = false;

  if (existingSource !== undefined) {
    const existingDefinition = parseSourceDefinition(existingSource, `sources.${name}`);

    if (!sameSourceDefinition(existingDefinition, definition)) {
      throw new AixError(`Source already exists with different settings: ${name}`);
    }
  } else {
    sources[name] = sourceManifestEntry(definition);
    added = true;
  }

  if (!Array.isArray(manifest.skills)) {
    manifest.skills = [];
  }

  const resolved = resolveSourceFromDefinitions(name, { [name]: definition }, cacheRoot);
  const skills = discoverSkills(resolved.rootPath);

  writeSourceMetadata(
    {
      source: name,
      kind: "skill",
      sourceType: "git",
      sourceUrl: definition.url,
      requestedRef: definition.ref,
      resolvedCommit: resolved.resolvedCommit,
      sourcePath: definition.path,
      skills
    },
    cacheRoot
  );

  if (added) {
    writeSourceManifestJson(manifest);
  }

  return {
    name,
    added,
    skillCount: skills.length,
    manifestPath: MANIFEST_FILE_NAME,
    metadataPath: sourceMetadataPath(name, cacheRoot)
  };
}

export function addRoleSource(input: string | undefined, requestedName?: string, cacheRoot = defaultCacheRoot()): AddRoleSourceResult {
  if (!input) {
    throw new AixError("Missing source URL.");
  }

  const definition = parseSourceInput(input);
  const name = requestedName || deriveSourceName(input, definition);
  assertSourceNameSafe(name);

  const manifest = readSourceManifestJson();
  const sources = roleSourceEntries(manifest);
  const existingSource = sources[name];
  let added = false;

  if (existingSource !== undefined) {
    const existingDefinition = parseSourceDefinition(existingSource, `sources.roles.${name}`);

    if (!sameSourceDefinition(existingDefinition, definition)) {
      throw new AixError(`Role source already exists with different settings: ${name}`);
    }
  } else {
    sources[name] = sourceManifestEntry(definition);
    added = true;
  }

  if (!Array.isArray(manifest.skills)) {
    manifest.skills = [];
  }

  if (!Array.isArray(manifest.roles)) {
    manifest.roles = [];
  }

  const resolved = resolveSourceFromDefinitions(name, { [name]: definition }, cacheRoot);
  const roles = discoverRoles(resolved.rootPath);

  writeSourceMetadata(
    {
      source: name,
      kind: "role",
      sourceType: "git",
      sourceUrl: definition.url,
      requestedRef: definition.ref,
      resolvedCommit: resolved.resolvedCommit,
      sourcePath: definition.path,
      roles
    },
    cacheRoot
  );

  if (added) {
    writeSourceManifestJson(manifest);
  }

  return {
    name,
    added,
    roleCount: roles.length,
    manifestPath: MANIFEST_FILE_NAME,
    metadataPath: roleSourceMetadataPath(name, cacheRoot)
  };
}

export function removeSource(name: string | undefined, cacheRoot = defaultCacheRoot()): RemoveSourceResult {
  if (!name) {
    throw new AixError("Missing source name.");
  }

  assertSourceNameSafe(name);

  const manifest = readSourceManifestJson();
  const sources = skillSourceEntries(manifest);

  if (sources[name] === undefined) {
    throw new AixError(`Unknown source in ${MANIFEST_FILE_NAME}: ${name}`);
  }

  if (manifestDependsOnSource(manifest, name) || lockfileDependsOnSource(name)) {
    throw new AixError(`Cannot remove skills source ${name}: active skills still depend on it. Deactivate skills first.`);
  }

  delete sources[name];

  if (!Array.isArray(manifest.skills)) {
    manifest.skills = [];
  }

  const metadataPath = sourceMetadataPath(name, cacheRoot);
  const metadataRemoved = existsSync(metadataPath);
  const packageSourcePath = sourcePackagePath(name);
  const packageSourceRemoved = removeEmptyPackageSourceDirectory(name);

  writeSourceManifestJson(manifest);

  if (metadataRemoved) {
    unlinkSync(metadataPath);
  }

  return {
    name,
    manifestPath: MANIFEST_FILE_NAME,
    metadataPath,
    metadataRemoved,
    packageSourcePath,
    packageSourceRemoved
  };
}

export function removeRoleSource(name: string | undefined, cacheRoot = defaultCacheRoot()): RemoveRoleSourceResult {
  if (!name) {
    throw new AixError("Missing source name.");
  }

  assertSourceNameSafe(name);

  const manifest = readSourceManifestJson();
  const sources = roleSourceEntries(manifest);

  if (sources[name] === undefined) {
    throw new AixError(`Unknown role source in ${MANIFEST_FILE_NAME}: ${name}`);
  }

  if (manifestRolesDependOnSource(manifest, name) || lockfileRolesDependOnSource(name)) {
    throw new AixError(`Cannot remove roles source ${name}: active roles still depend on it. Deactivate roles first.`);
  }

  delete sources[name];

  if (!Array.isArray(manifest.skills)) {
    manifest.skills = [];
  }

  if (!Array.isArray(manifest.roles)) {
    manifest.roles = [];
  }

  const metadataPath = roleSourceMetadataPath(name, cacheRoot);
  const metadataRemoved = existsSync(metadataPath);
  const packageSourcePath = roleSourcePackagePath(name);
  const packageSourceRemoved = removeEmptyRolePackageSourceDirectory(name);

  writeSourceManifestJson(manifest);

  if (metadataRemoved) {
    unlinkSync(metadataPath);
  }

  return {
    name,
    manifestPath: MANIFEST_FILE_NAME,
    metadataPath,
    metadataRemoved,
    packageSourcePath,
    packageSourceRemoved
  };
}

export function listRemoveSourceChoices(): RemoveSourceChoices {
  const manifest = readSourceManifestJson();
  const sources = skillSourceEntries(manifest);
  const choices: RemoveSourceChoices = {
    removable: [],
    blocked: []
  };

  for (const [name, source] of Object.entries(sources).sort(([left], [right]) => left.localeCompare(right))) {
    const definition = parseSourceDefinition(source, `sources.skills.${name}`);
    const reason = removalBlockReason(manifest, name);

    if (reason) {
      choices.blocked.push({ name, definition, reason });
    } else {
      choices.removable.push({ name, definition });
    }
  }

  return choices;
}

export function listRemoveRoleSourceChoices(): RemoveRoleSourceChoices {
  const manifest = readSourceManifestJson();
  const sources = roleSourceEntries(manifest);
  const choices: RemoveRoleSourceChoices = {
    removable: [],
    blocked: []
  };

  for (const [name, source] of Object.entries(sources).sort(([left], [right]) => left.localeCompare(right))) {
    const definition = parseSourceDefinition(source, `sources.roles.${name}`);
    const reason = roleRemovalBlockReason(manifest, name);

    if (reason) {
      choices.blocked.push({ name, definition, reason });
    } else {
      choices.removable.push({ name, definition });
    }
  }

  return choices;
}
