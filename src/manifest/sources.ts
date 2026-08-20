import type { SourceDefinition } from "../schema.js";
import { isRecord } from "../validation/types.js";
import { ManifestError } from "./errors.js";
import { optionalString, requireString } from "./strings.js";

function parseGitHubTreeSource(value: string, path: string): SourceDefinition {
  let url: URL;

  try {
    url = new URL(value);
  } catch {
    throw new ManifestError(`${path} must be a GitHub tree URL or a source object.`);
  }

  const segments = url.pathname.split("/").filter(Boolean);

  if (url.hostname !== "github.com" || segments.length < 5 || segments[2] !== "tree") {
    throw new ManifestError(`${path} must be a GitHub tree URL or a source object.`);
  }

  const owner = segments[0];
  const repo = segments[1]?.replace(/\.git$/, "");
  const ref = segments[3];
  const sourcePath = segments.slice(4).join("/");

  if (!owner || !repo || !ref || !sourcePath) {
    throw new ManifestError(`${path} must include owner, repo, ref, and source path.`);
  }

  return {
    type: "git",
    url: `https://github.com/${owner}/${repo}.git`,
    ref,
    path: sourcePath
  };
}

export function parseSourceDefinition(value: unknown, path: string): SourceDefinition {
  if (typeof value === "string") {
    return parseGitHubTreeSource(requireString(value, path), path);
  }

  if (!isRecord(value)) {
    throw new ManifestError(`${path} must be a GitHub tree URL or a source object.`);
  }

  const type = requireString(value.type, `${path}.type`);
  const sourcePath = optionalString(value.path, `${path}.path`);
  const ref = optionalString(value.ref, `${path}.ref`);

  if (type === "git") {
    return {
      type,
      url: requireString(value.url, `${path}.url`),
      ...(sourcePath ? { path: sourcePath } : {}),
      ...(ref ? { ref } : {})
    };
  }

  throw new ManifestError(`${path}.type must be "git".`);
}
