export const MANIFEST_FILE_NAME = "aix.json";
export const LOCKFILE_FILE_NAME = "aix.lock.json";
export const LOCKFILE_VERSION = 1;

export type SourceType = "git";
export type PackageKind = "skill";

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
export type SourceManifestEntry = SourceDefinition | string;

export interface SkillRequest {
  source: string;
  path: string;
  alias?: string;
  ref?: string;
}

export type SkillManifestEntry = string | SkillRequest;

export interface SkillsManifest {
  sources?: Record<string, SourceManifestEntry>;
  skills: SkillManifestEntry[];
}

export interface FileHash {
  path: string;
  sha256: string;
}

export interface LockfileSkillEntry {
  kind: PackageKind;
  source: string;
  sourceType: SourceType;
  sourceUrl?: string;
  requestedRef?: string;
  resolvedCommit?: string;
  sourcePath: string;
  packagePath: string;
  activationPath: string;
  originalName: string;
  activeName: string;
  alias?: string;
  packageFiles: FileHash[];
  activeFiles: FileHash[];
}

export interface SkillsLockfile {
  lockfileVersion: typeof LOCKFILE_VERSION;
  skills: LockfileSkillEntry[];
}

export interface SkillTarget {
  source: string;
  path?: string;
}
