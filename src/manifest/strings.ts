import { ManifestError } from "./errors.js";

export function requireString(value: unknown, path: string): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new ManifestError(`${path} must be a non-empty string.`);
  }

  return value;
}

export function optionalString(value: unknown, path: string): string | undefined {
  if (value === undefined) {
    return undefined;
  }

  return requireString(value, path);
}
