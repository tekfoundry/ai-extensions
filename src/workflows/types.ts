export interface WorkflowManifestFile {
  name: string;
  title?: string;
  agentsMd?: {
    mode: "managed-block";
    source: string;
    marker: string;
  };
  docs: string[];
  skillsDir: string;
}

export interface InstallWorkflowResult {
  name: string;
  title?: string;
  manifestPath: string;
  lockfilePath: string;
  packagePath: string;
  installedDocs: string[];
  activatedSkills: string[];
}

export interface RemoveWorkflowResult {
  name: string;
  manifestPath: string;
  lockfilePath: string;
  removedDocs: string[];
  removedSkills: string[];
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
