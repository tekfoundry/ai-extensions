export interface WorkflowManifestFile {
  name: string;
  title?: string;
  agentsMd?: {
    mode: "managed-block";
    source: string;
    marker: string;
  };
  docs: string[];
  guidanceDir?: string;
  templatesDir?: string;
  skillsDir: string;
  dependencies?: {
    roles: Array<{
      source: string;
      path: string;
      activeName?: string;
    }>;
  };
  team?: {
    path: string;
    version: string;
  };
  requiredCapabilities?: string[];
}

export interface InstallWorkflowResult {
  name: string;
  title?: string;
  manifestPath: string;
  lockfilePath: string;
  packagePath: string;
  installedDocs: string[];
  installedGuidance: number;
  installedTemplates: number;
  activatedSkills: string[];
  activatedRoles: string[];
}

export interface RemoveWorkflowResult {
  name: string;
  manifestPath: string;
  lockfilePath: string;
  removedDocs: string[];
  removedSkills: string[];
  removedRoles: string[];
  removedAgentsMdBlock: boolean;
}

export interface WorkflowDiff {
  name: string;
  packagePath: string;
  sourcePath: string;
  diff: string;
}

export interface DiffWorkflowResult {
  lockfilePath: string;
  diffs: WorkflowDiff[];
}

export interface UpdateWorkflowResult {
  lockfilePath: string;
  updatedWorkflows: Array<{
    name: string;
    previousResolvedCommit?: string;
    resolvedCommit?: string;
  }>;
}

export interface VerifyWorkflowResult {
  issues: string[];
}
