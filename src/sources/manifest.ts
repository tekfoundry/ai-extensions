import { existsSync } from "node:fs";
import { parseManifest } from "../manifest.js";
import { MANIFEST_FILE_NAME } from "../schema.js";
import { isRecord } from "../validation/types.js";
import { readJsonObject, writeJsonObjectAtomic } from "../activation/json.js";

export function readSourceManifestJson(): Record<string, unknown> {
  if (!existsSync(MANIFEST_FILE_NAME)) {
    return {
      sources: {
        skills: {}
      },
      skills: []
    };
  }

  const manifest = readJsonObject(MANIFEST_FILE_NAME);
  parseManifest(manifest);

  return manifest;
}

export function skillSourceEntries(manifest: Record<string, unknown>): Record<string, unknown> {
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

export function writeSourceManifestJson(manifest: Record<string, unknown>): void {
  writeJsonObjectAtomic(MANIFEST_FILE_NAME, manifest);
}
