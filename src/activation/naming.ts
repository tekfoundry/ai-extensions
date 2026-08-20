import { AixError } from "../errors.js";

export function activationTargetFromInput(target: string): { source: string; sourcePath: string } {
  const separatorIndex = target.indexOf("/");

  if (separatorIndex <= 0 || separatorIndex === target.length - 1) {
    throw new AixError("Usage: aix skill activate <source/path> [alias]");
  }

  return {
    source: target.slice(0, separatorIndex),
    sourcePath: target.slice(separatorIndex + 1)
  };
}

export function assertFolderNameSafe(name: string, label: string): void {
  if (!/^[a-zA-Z0-9._-]+$/.test(name)) {
    throw new AixError(`Invalid ${label}: ${name}`);
  }
}
