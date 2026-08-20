export const MANIFEST_FILE_NAME = "aix.json";
export const LOCKFILE_FILE_NAME = "aix.lock.json";
export const LOCKFILE_VERSION = 1;

export type SourceType = "git";

export interface BaseSourceDefinition {
  type: SourceType;
  path?: string;
  ref?: string;
}

export interface GitSourceDefinition extends BaseSourceDefinition {
  type: "git";
  url: string;
}

export type SourceDefinition = GitSourceDefinition;

export interface SkillRequest {
  source: string;
  path: string;
  alias?: string;
  ref?: string;
}

export type SkillManifestEntry = string | SkillRequest;

export interface SkillsManifest {
  sources?: Record<string, SourceDefinition>;
  skills: SkillManifestEntry[];
}

export interface FileHash {
  path: string;
  sha256: string;
}

export interface LockfileSkillEntry {
  source: string;
  sourceType: SourceType;
  sourceUrl?: string;
  requestedRef?: string;
  resolvedCommit?: string;
  sourcePath: string;
  installPath: string;
  originalName: string;
  installedName: string;
  alias?: string;
  files: FileHash[];
}

export interface SkillsLockfile {
  lockfileVersion: typeof LOCKFILE_VERSION;
  skills: LockfileSkillEntry[];
}

export interface SkillTarget {
  source: string;
  path?: string;
}
