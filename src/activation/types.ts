export interface ActivateSkillResult {
  source: string;
  sourcePath: string;
  originalName: string;
  activeName: string;
  dependencies: Array<{
    source: string;
    sourcePath: string;
    activeName: string;
  }>;
  manifestPath: string;
  lockfilePath: string;
  packagePath: string;
  activationPath: string;
}

export interface DeactivateSkillResult {
  activeName: string;
  manifestPath: string;
  lockfilePath: string;
  activationPath: string;
  packagePath: string;
  removedActiveSkills: Array<{
    activeName: string;
    activationPath: string;
  }>;
  removedPackages: Array<{
    activeName: string;
    packagePath: string;
  }>;
}

export interface UpdatedSkill {
  source: string;
  sourcePath: string;
  activeName: string;
  previousResolvedCommit?: string;
  resolvedCommit?: string;
  packagePath: string;
  activationPath: string;
}

export interface UpdateSkillsResult {
  lockfilePath: string;
  updatedSkills: UpdatedSkill[];
}

export interface SkillDiff {
  source: string;
  sourcePath: string;
  activeName: string;
  packagePath: string;
  sourceSkillPath: string;
  diff: string;
}

export interface DiffSkillsResult {
  lockfilePath: string;
  diffs: SkillDiff[];
}

export interface VerifySkillsResult {
  issues: string[];
}
