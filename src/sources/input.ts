import { AixError } from "../errors.js";
import { parseSourceDefinition } from "../manifest.js";
import type { SourceDefinition, SourceManifestEntry } from "../schema.js";

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
    return parseSourceDefinition(input, "source");
  } catch {
    return {
      type: "git",
      url: input
    };
  }
}

export function deriveSourceName(input: string, definition: SourceDefinition): string {
  const sourcePath = definition.path?.split("/").filter(Boolean) || [];
  const pathName = sourcePath.at(-2) || sourcePath.at(-1);

  if (pathName && pathName !== "skills") {
    return pathName;
  }

  const urlName = definition.url.split("/").filter(Boolean).at(-1)?.replace(/\.git$/, "");

  return urlName || input.replace(/[^a-zA-Z0-9._-]/g, "_");
}

export function assertSourceNameSafe(name: string): void {
  if (!/^[a-zA-Z0-9._-]+$/.test(name)) {
    throw new AixError(`Invalid source name: ${name}`);
  }
}

export function sameSourceDefinition(left: SourceDefinition, right: SourceDefinition): boolean {
  return left.type === right.type && left.url === right.url && left.path === right.path && left.ref === right.ref;
}
