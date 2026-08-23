export const MANIFEST_FILE_NAME = "aix.json";
export const LOCKFILE_FILE_NAME = "aix.lock.json";
export const LOCKFILE_VERSION = 1;

export type SourceType = "git";
export type PackageKind = "skill" | "workflow";

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

export interface WorkflowRequest {
  source: string;
  path: string;
  alias?: string;
}

export type WorkflowManifestEntry = string | WorkflowRequest;

export interface SkillsManifest {
  sources?: Record<string, SourceManifestEntry>;
  workflowSources?: Record<string, SourceManifestEntry>;
  workflow?: WorkflowManifestEntry;
  skills: SkillManifestEntry[];
}

export interface FileHash {
  path: string;
  sha256: string;
}

export type SkillDependencyType = "inferred";

export interface LockfileSkillDependency {
  source: string;
  sourcePath: string;
  activeName: string;
  type: SkillDependencyType;
  reason: string;
}

export interface LockfileSkillEntry {
  kind: "skill";
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
  requested: boolean;
  owner?: {
    kind: "workflow";
    name: string;
  };
  dependencies?: LockfileSkillDependency[];
  packageFiles: FileHash[];
  activeFiles: FileHash[];
}

export interface LockfileWorkflowDoc {
  sourcePath: string;
  targetPath: string;
  sha256: string;
}

export interface LockfileAgentsMdBlock {
  path: string;
  marker: string;
  sha256: string;
}

export interface LockfileWorkflowEntry {
  kind: "workflow";
  source: string;
  sourceType: SourceType;
  sourceUrl?: string;
  requestedRef?: string;
  resolvedCommit?: string;
  sourcePath: string;
  packagePath: string;
  name: string;
  title?: string;
  docs: LockfileWorkflowDoc[];
  agentsMd?: LockfileAgentsMdBlock;
  skills: Array<{
    sourcePath: string;
    activeName: string;
  }>;
  templates?: FileHash[];
  packageFiles: FileHash[];
}

export interface SkillsLockfile {
  lockfileVersion: typeof LOCKFILE_VERSION;
  skills: LockfileSkillEntry[];
  workflows?: LockfileWorkflowEntry[];
}

export interface SkillTarget {
  source: string;
  path?: string;
}
