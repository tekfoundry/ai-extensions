import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { SourceDefinition } from "../schema.js";
import { defaultCacheRoot } from "./resolver.js";
import type { SourceMetadata } from "./types.js";

export function safeCacheName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

export function sourceMetadataPath(name: string, cacheRoot = defaultCacheRoot()): string {
  return join(cacheRoot, "metadata", `${safeCacheName(name)}.json`);
}

export function writeSourceMetadata(metadata: SourceMetadata, cacheRoot = defaultCacheRoot()): void {
  const metadataPath = sourceMetadataPath(metadata.source, cacheRoot);
  const tempPath = `${metadataPath}.${process.pid}.${randomUUID()}.tmp`;

  mkdirSync(join(cacheRoot, "metadata"), { recursive: true });
  writeFileSync(tempPath, `${JSON.stringify(metadata, null, 2)}\n`, { encoding: "utf8", mode: 0o644 });
  renameSync(tempPath, metadataPath);
}

export function readSourceMetadata(name: string, definition: SourceDefinition, cacheRoot = defaultCacheRoot()): SourceMetadata | undefined {
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
