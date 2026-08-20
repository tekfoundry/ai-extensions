import { parseSourceDefinition } from "../manifest.js";
import type { SourceDefinition, SourceManifestEntry } from "../schema.js";
import { isRecord } from "../validation/types.js";

export function sourceManifestEntry(definition: SourceDefinition): SourceManifestEntry {
  const match = definition.url.match(/^https:\/\/github\.com\/([^/]+)\/(.+?)(?:\.git)?$/);

  if (!match || !definition.ref || !definition.path) {
    return definition;
  }

  const [, owner, repo] = match;

  return `https://github.com/${owner}/${repo}/tree/${definition.ref}/${definition.path}`;
}

export function parseSourceInput(input: string): SourceDefinition {
  try {
    return parseSourceDefinition(input, "workflow source");
  } catch {
    return {
      type: "git",
      url: input
    };
  }
}

export function deriveWorkflowSourceName(input: string, definition: SourceDefinition): string {
  const sourcePath = definition.path?.split("/").filter(Boolean) || [];
  const pathName = sourcePath.at(-1);

  if (pathName && pathName !== "workflows") {
    return pathName;
  }

  return definition.url.split("/").filter(Boolean).at(-1)?.replace(/\.git$/, "") || input.replace(/[^a-zA-Z0-9._-]/g, "_");
}

export function workflowSourcesJson(manifest: Record<string, unknown>): Record<string, unknown> {
  if (!isRecord(manifest.sources)) {
    manifest.sources = {
      skills: {},
      workflows: {}
    };
  }

  const sources = manifest.sources as Record<string, unknown>;

  if (!isRecord(sources.workflows)) {
    sources.workflows = {};
  }

  return sources.workflows as Record<string, unknown>;
}
