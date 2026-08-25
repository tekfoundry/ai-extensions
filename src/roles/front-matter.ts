import { AixError } from "../errors.js";
import type { RoleMetadataScalar, RoleMetadataValue } from "./types.js";

function parseScalar(rawValue: string, path: string): RoleMetadataScalar {
  const trimmed = rawValue.trim();

  if (trimmed === "") {
    return "";
  }

  const quoted = trimmed.match(/^(['"])(.*)\1$/);
  if (quoted) {
    return quoted[2];
  }

  if (trimmed === "true") {
    return true;
  }

  if (trimmed === "false") {
    return false;
  }

  if (/^\d+$/.test(trimmed)) {
    return Number(trimmed);
  }

  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    throw new AixError(`Invalid role front matter at ${path}: nested YAML values are not supported.`);
  }

  return trimmed;
}

function parseInlineList(rawValue: string, path: string): RoleMetadataScalar[] {
  const inner = rawValue.trim().slice(1, -1).trim();

  if (inner === "") {
    return [];
  }

  return inner.split(",").map((item) => parseScalar(item, path));
}

export function parseRoleFrontMatter(markdown: string, path = "role file"): {
  metadata: Record<string, RoleMetadataValue>;
  body: string;
} {
  const normalized = markdown.replace(/\r\n/g, "\n");

  if (!normalized.startsWith("---\n")) {
    throw new AixError(`Invalid role file: ${path} must start with YAML front matter.`);
  }

  const endIndex = normalized.indexOf("\n---\n", 4);
  if (endIndex < 0) {
    throw new AixError(`Invalid role file: ${path} is missing closing YAML front matter marker.`);
  }

  const frontMatter = normalized.slice(4, endIndex);
  const body = normalized.slice(endIndex + "\n---\n".length);
  const metadata: Record<string, RoleMetadataValue> = {};
  const lines = frontMatter.split("\n");

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];

    if (line.trim() === "" || line.trimStart().startsWith("#")) {
      continue;
    }

    if (/^\s/.test(line)) {
      throw new AixError(`Invalid role front matter at ${path}: unexpected indentation on line ${index + 1}.`);
    }

    const match = line.match(/^([A-Za-z][A-Za-z0-9_-]*):(?:\s*(.*))?$/);
    if (!match) {
      throw new AixError(`Invalid role front matter at ${path}: expected key: value on line ${index + 1}.`);
    }

    const key = match[1];
    const rawValue = match[2] ?? "";

    if (metadata[key] !== undefined) {
      throw new AixError(`Invalid role front matter at ${path}: duplicate key ${key}.`);
    }

    if (rawValue.trim() === "") {
      const items: RoleMetadataScalar[] = [];

      while (index + 1 < lines.length && /^\s+-\s+/.test(lines[index + 1])) {
        index += 1;
        items.push(parseScalar(lines[index].replace(/^\s+-\s+/, ""), path));
      }

      metadata[key] = items;
      continue;
    }

    metadata[key] = rawValue.trim().startsWith("[") && rawValue.trim().endsWith("]")
      ? parseInlineList(rawValue, path)
      : parseScalar(rawValue, path);
  }

  return { metadata, body };
}
