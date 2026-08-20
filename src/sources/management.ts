import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, rmdirSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { AixError } from "../errors.js";
import { parseLockfile } from "../lockfile.js";
import { parseManifest, parseSourceDefinition } from "../manifest.js";
import { LOCKFILE_FILE_NAME, MANIFEST_FILE_NAME, type SourceDefinition, type SourceManifestEntry } from "../schema.js";
import { discoverSkills } from "../skills.js";
import { isRecord } from "../validation/types.js";
import { sourceMetadataPath, writeSourceMetadata } from "./metadata.js";
import { defaultCacheRoot, resolveSourceFromDefinitions } from "./resolver.js";

export interface AddSourceResult {
  name: string;
  added: boolean;
  skillCount: number;
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

function sourceManifestEntry(definition: SourceDefinition): SourceManifestEntry {
  const match = definition.url.match(/^https:\/\/github\.com\/([^/]+)\/(.+?)(?:\.git)?$/);

  if (!match || !definition.ref || !definition.path) {
    return definition;
  }

  const [, owner, repo] = match;

  return `https://github.com/${owner}/${repo}/tree/${definition.ref}/${definition.path}`;
}

function parseSourceInput(input: string): SourceDefinition {
  try {
    return parseSourceDefinition(input, "source");
  } catch {
    return {
      type: "git",
      url: input
    };
  }
}

function deriveSourceName(input: string, definition: SourceDefinition): string {
  const sourcePath = definition.path?.split("/").filter(Boolean) || [];
  const pathName = sourcePath.at(-2) || sourcePath.at(-1);

  if (pathName && pathName !== "skills") {
    return pathName;
  }

  const urlName = definition.url.split("/").filter(Boolean).at(-1)?.replace(/\.git$/, "");

  return urlName || input.replace(/[^a-zA-Z0-9._-]/g, "_");
}

function assertSourceNameSafe(name: string): void {
  if (!/^[a-zA-Z0-9._-]+$/.test(name)) {
    throw new AixError(`Invalid source name: ${name}`);
  }
}

function readManifestJson(): Record<string, unknown> {
  if (!existsSync(MANIFEST_FILE_NAME)) {
    return {
      sources: {
        skills: {}
      },
      skills: []
    };
  }

  const raw = JSON.parse(readFileSync(MANIFEST_FILE_NAME, "utf8")) as unknown;

  if (!isRecord(raw)) {
    throw new AixError(`${MANIFEST_FILE_NAME} must contain a JSON object.`);
  }

  parseManifest(raw);

  return raw;
}

function skillSourceEntries(manifest: Record<string, unknown>): Record<string, unknown> {
  if (!isRecord(manifest.sources)) {
    manifest.sources = {
      skills: {}
    };

    return (manifest.sources as Record<string, unknown>).skills as Record<string, unknown>;
  }

  if (isRecord(manifest.sources.skills)) {
    return manifest.sources.skills;
  }

  const legacySources = manifest.sources;
  manifest.sources = {
    skills: legacySources
  };

  return legacySources;
}

function writeManifestJson(manifest: Record<string, unknown>): void {
  const tempPath = `${MANIFEST_FILE_NAME}.${process.pid}.${randomUUID()}.tmp`;

  mkdirSync(dirname(MANIFEST_FILE_NAME), { recursive: true });
  writeFileSync(tempPath, `${JSON.stringify(manifest, null, 2)}\n`, { encoding: "utf8", mode: 0o644 });
  renameSync(tempPath, MANIFEST_FILE_NAME);
}

function sameSourceDefinition(left: SourceDefinition, right: SourceDefinition): boolean {
  return (
    left.type === right.type &&
    left.url === right.url &&
    left.path === right.path &&
    left.ref === right.ref
  );
}

export function addSource(input: string | undefined, requestedName?: string, cacheRoot = defaultCacheRoot()): AddSourceResult {
  if (!input) {
    throw new AixError("Missing source URL.");
  }

  const definition = parseSourceInput(input);
  const name = requestedName || deriveSourceName(input, definition);
  assertSourceNameSafe(name);

  const manifest = readManifestJson();
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
    writeManifestJson(manifest);
  }

  return {
    name,
    added,
    skillCount: skills.length,
    manifestPath: MANIFEST_FILE_NAME,
    metadataPath: sourceMetadataPath(name, cacheRoot)
  };
}

function skillDependsOnSource(skill: unknown, sourceName: string): boolean {
  if (typeof skill === "string") {
    const separatorIndex = skill.indexOf(":");

    return separatorIndex > 0 && skill.slice(0, separatorIndex) === sourceName;
  }

  return isRecord(skill) && skill.source === sourceName;
}

function manifestDependsOnSource(manifest: Record<string, unknown>, sourceName: string): boolean {
  const skills = Array.isArray(manifest.skills) ? manifest.skills : [];

  return skills.some((skill) => skillDependsOnSource(skill, sourceName));
}

function lockfileDependsOnSource(sourceName: string): boolean {
  if (!existsSync(LOCKFILE_FILE_NAME)) {
    return false;
  }

  const lockfile = parseLockfile(JSON.parse(readFileSync(LOCKFILE_FILE_NAME, "utf8")));

  return lockfile.skills.some((skill) => skill.source === sourceName);
}

function removeEmptyPackageSourceDirectory(sourceName: string): boolean {
  const packageSourcePath = join(".agents", "packages", "skills", sourceName);

  if (!existsSync(packageSourcePath)) {
    return false;
  }

  try {
    rmdirSync(packageSourcePath);
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOTEMPTY") {
      throw new AixError(
        `Cannot remove skills source ${sourceName}: ${packageSourcePath} is not empty. Deactivate skills first.`
      );
    }

    throw error;
  }

  return true;
}

function packageSourceDirectoryHasContents(sourceName: string): boolean {
  const packageSourcePath = join(".agents", "packages", "skills", sourceName);

  return existsSync(packageSourcePath) && readdirSync(packageSourcePath).length > 0;
}

function removalBlockReason(manifest: Record<string, unknown>, sourceName: string): string | undefined {
  if (manifestDependsOnSource(manifest, sourceName) || lockfileDependsOnSource(sourceName)) {
    return "active skills still depend on it; deactivate skills first";
  }

  if (packageSourceDirectoryHasContents(sourceName)) {
    return `.agents/packages/skills/${sourceName} is not empty; deactivate skills first`;
  }

  return undefined;
}

export function removeSource(name: string | undefined, cacheRoot = defaultCacheRoot()): RemoveSourceResult {
  if (!name) {
    throw new AixError("Missing source name.");
  }

  assertSourceNameSafe(name);

  const manifest = readManifestJson();
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
  const packageSourcePath = join(".agents", "packages", "skills", name);
  const packageSourceRemoved = removeEmptyPackageSourceDirectory(name);

  writeManifestJson(manifest);

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
  const manifest = readManifestJson();
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
