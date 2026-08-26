import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { SourceDefinition } from "../schema.js";
import { defaultCacheRoot } from "./resolver.js";
import type { RoleSourceMetadata, SkillSourceMetadata, SourceMetadata } from "./types.js";

export function safeCacheName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

export function sourceMetadataPath(name: string, cacheRoot = defaultCacheRoot()): string {
  return join(cacheRoot, "metadata", `${safeCacheName(name)}.json`);
}

export function roleSourceMetadataPath(name: string, cacheRoot = defaultCacheRoot()): string {
  return join(cacheRoot, "metadata", `roles-${safeCacheName(name)}.json`);
}

function metadataPath(metadata: SourceMetadata, cacheRoot: string): string {
  return metadata.kind === "role"
    ? roleSourceMetadataPath(metadata.source, cacheRoot)
    : sourceMetadataPath(metadata.source, cacheRoot);
}

export function writeSourceMetadata(metadata: SourceMetadata, cacheRoot = defaultCacheRoot()): void {
  const path = metadataPath(metadata, cacheRoot);
  const tempPath = `${path}.${process.pid}.${randomUUID()}.tmp`;

  mkdirSync(join(cacheRoot, "metadata"), { recursive: true });
  writeFileSync(tempPath, `${JSON.stringify(metadata, null, 2)}\n`, { encoding: "utf8", mode: 0o644 });
  renameSync(tempPath, path);
}

export function readSkillSourceMetadata(name: string, definition: SourceDefinition, cacheRoot = defaultCacheRoot()): SkillSourceMetadata | undefined {
  const metadataPath = sourceMetadataPath(name, cacheRoot);

  if (!existsSync(metadataPath)) {
    return undefined;
  }

  const metadata = JSON.parse(readFileSync(metadataPath, "utf8")) as SourceMetadata;

  if (
    metadata.source !== name ||
    metadata.kind !== "skill" ||
    metadata.sourceType !== "git" ||
    metadata.sourceUrl !== definition.url ||
    metadata.requestedRef !== definition.ref ||
    metadata.sourcePath !== definition.path ||
    !Array.isArray(metadata.skills)
  ) {
    return undefined;
  }

  return metadata;
}

export function readRoleSourceMetadata(name: string, definition: SourceDefinition, cacheRoot = defaultCacheRoot()): RoleSourceMetadata | undefined {
  const metadataPath = roleSourceMetadataPath(name, cacheRoot);

  if (!existsSync(metadataPath)) {
    return undefined;
  }

  const metadata = JSON.parse(readFileSync(metadataPath, "utf8")) as SourceMetadata;

  if (
    metadata.source !== name ||
    metadata.kind !== "role" ||
    metadata.sourceType !== "git" ||
    metadata.sourceUrl !== definition.url ||
    metadata.requestedRef !== definition.ref ||
    metadata.sourcePath !== definition.path ||
    !Array.isArray(metadata.roles)
  ) {
    return undefined;
  }

  return metadata;
}

export const readSourceMetadata = readSkillSourceMetadata;
