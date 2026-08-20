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
