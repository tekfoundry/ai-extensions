import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { AixError } from "../errors.js";
import { copyFilesSafely } from "../fs/files.js";
import { parseManifest } from "../manifest.js";
import { activeSkillPath, packageSkillPath, SKILL_PACKAGES_DIR } from "../paths/agents.js";
import { LOCKFILE_FILE_NAME, MANIFEST_FILE_NAME, type LockfileSkillDependency, type LockfileSkillEntry, type SourceDefinition } from "../schema.js";
import { discoverSkills, parseSkillNameFromDirectory } from "../skills.js";
import { defaultCacheRoot, loadSourceDefinitions, resolveSourceFromDefinitions, type ResolvedSource } from "../sources/index.js";
import { activateAliasWrapper, activateDirectSymlink, assertActivationPathAvailable, assertActiveFilesMatchLockfile } from "./active-files.js";
import { resolveInferredDependencies } from "./dependencies.js";
import { readJsonObject, writeJsonObjectAtomic } from "./json.js";
import { assertNoActiveNameCollision, readLockfileJson, upsertLockfileEntry } from "./lockfile.js";
import { manifestSourceDefinitions, updateManifestSkills } from "./manifest.js";
import { activationTargetFromInput, assertFolderNameSafe } from "./naming.js";
import { assertPackageFilesMatchLockfile, assertPackagePathMatchesSource } from "./package-files.js";
import type { ActivateSkillResult } from "./types.js";

interface SkillActivationPlan {
  source: string;
  sourcePath: string;
  sourceSkillPath: string;
  originalName: string;
  activeName: string;
  alias?: string;
  dependencies: LockfileSkillDependency[];
}

function assertKnownSkill(sourceRoot: string, sourceName: string, sourcePath: string): void {
  const skills = discoverSkills(sourceRoot);

  if (!skills.some((skill) => skill.path === sourcePath)) {
    throw new AixError(`Unknown skill in source ${sourceName}: ${sourcePath}`);
  }
}

function createActivationPlan(
  resolvedSource: ResolvedSource,
  sourcePath: string,
  alias: string | undefined,
  stack: string[] = [],
  plans = new Map<string, SkillActivationPlan>()
): SkillActivationPlan[] {
  const source = resolvedSource.name;
  const planKey = `${source}:${sourcePath}`;

  if (stack.includes(planKey)) {
    throw new AixError(`Detected skill dependency cycle: ${[...stack, planKey].join(" -> ")}`);
  }

  if (plans.has(planKey)) {
    return [...plans.values()];
  }

  assertKnownSkill(resolvedSource.rootPath, source, sourcePath);

  const sourceSkillPath = join(resolvedSource.rootPath, sourcePath);
  const originalName = parseSkillNameFromDirectory(sourceSkillPath);
  const activeName = alias || originalName;

  assertFolderNameSafe(activeName, "active skill name");

  const discoveredSkills = discoverSkills(resolvedSource.rootPath);
  const dependencies = resolveInferredDependencies(source, sourcePath, sourceSkillPath, discoveredSkills);

  for (const dependency of dependencies) {
    createActivationPlan(resolvedSource, dependency.sourcePath, undefined, [...stack, planKey], plans);
  }

  plans.set(planKey, {
    source,
    sourcePath,
    sourceSkillPath,
    originalName,
    activeName,
    ...(alias ? { alias } : {}),
    dependencies
  });

  return [...plans.values()];
}

function assertActivationPlanSafe(lockfile: { skills: LockfileSkillEntry[] }, plan: SkillActivationPlan): void {
  const existingSkill = lockfile.skills.find(
    (skill) => skill.source === plan.source && skill.sourcePath === plan.sourcePath
  );

  if (existingSkill && existingSkill.activeName !== plan.activeName) {
    throw new AixError(
      `Skill ${plan.source}/${plan.sourcePath} is already active as ${existingSkill.activeName}. Deactivate it before activating it as ${plan.activeName}.`
    );
  }

  const packagePath = packageSkillPath(plan.source, plan.sourcePath);

  if (existingSkill) {
    assertPackageFilesMatchLockfile(existingSkill, "refresh");
    assertActiveFilesMatchLockfile(existingSkill, "refresh");
  } else {
    assertPackagePathMatchesSource(packagePath, plan.sourceSkillPath, plan.source, plan.sourcePath);
  }

  assertNoActiveNameCollision(lockfile, plan.activeName, plan.source, plan.sourcePath);

  const activationPath = activeSkillPath(plan.activeName);

  if (plan.alias && existsSync(activationPath)) {
    throw new AixError(`Active skill name collision: ${activationPath}`);
  }

  if (!plan.alias) {
    assertActivationPathAvailable(activationPath, packagePath);
  }
}

function activatePlannedSkill(
  plan: SkillActivationPlan,
  definition: SourceDefinition,
  resolvedCommit: string | undefined,
  manifestJson: Record<string, unknown>,
  lockfile: { skills: LockfileSkillEntry[] },
  requested: boolean
): void {
  const packagePath = packageSkillPath(plan.source, plan.sourcePath);
  const activationPath = activeSkillPath(plan.activeName);
  const existingEntry = lockfile.skills.find(
    (skill) => skill.source === plan.source && skill.sourcePath === plan.sourcePath
  );
  const isRequested = requested || existingEntry?.requested === true;
  const packageFiles = copyFilesSafely(plan.sourceSkillPath, packagePath);
  const activeFiles = plan.alias
    ? activateAliasWrapper(activationPath, packagePath, plan.activeName)
    : activateDirectSymlink(activationPath, packagePath);

  if (requested) {
    updateManifestSkills(manifestJson, plan.source, plan.sourcePath, plan.alias);
  }

  upsertLockfileEntry(lockfile, {
    kind: "skill",
    source: plan.source,
    sourceType: "git",
    sourceUrl: definition.url,
    requestedRef: definition.ref,
    resolvedCommit,
    sourcePath: plan.sourcePath,
    packagePath,
    activationPath,
    originalName: plan.originalName,
    activeName: plan.activeName,
    ...(plan.alias ? { alias: plan.alias } : {}),
    requested: isRequested,
    ...(plan.dependencies.length > 0 ? { dependencies: plan.dependencies } : {}),
    packageFiles,
    activeFiles
  });
}

export function activateSkillFromDefinitions(
  target: string,
  alias: string | undefined,
  defaultSourceDefinitions: Record<string, SourceDefinition>,
  cacheRoot = defaultCacheRoot()
): ActivateSkillResult {
  const { source, sourcePath } = activationTargetFromInput(target);

  if (alias) {
    assertFolderNameSafe(alias, "alias");
  }

  const manifestJson = readJsonObject(MANIFEST_FILE_NAME);
  parseManifest(manifestJson);

  const manifestSources = manifestSourceDefinitions(manifestJson);
  const sourceDefinitions = {
    ...defaultSourceDefinitions,
    ...manifestSources
  };
  const definition = sourceDefinitions[source];

  if (!definition) {
    throw new AixError(`Unknown source: ${source}`);
  }

  const resolvedSource = resolveSourceFromDefinitions(source, sourceDefinitions, cacheRoot);
  const plans = createActivationPlan(resolvedSource, sourcePath, alias);
  const lockfile = readLockfileJson();

  for (const plan of plans) {
    assertActivationPlanSafe(lockfile, plan);
  }

  mkdirSync(SKILL_PACKAGES_DIR, { recursive: true });

  for (const plan of plans) {
    activatePlannedSkill(
      plan,
      definition,
      resolvedSource.resolvedCommit,
      manifestJson,
      lockfile,
      plan.source === source && plan.sourcePath === sourcePath
    );
  }

  writeJsonObjectAtomic(MANIFEST_FILE_NAME, manifestJson);
  writeJsonObjectAtomic(LOCKFILE_FILE_NAME, lockfile);

  const requestedPlan = plans.find((plan) => plan.source === source && plan.sourcePath === sourcePath);

  if (!requestedPlan) {
    throw new AixError(`Unknown skill in source ${source}: ${sourcePath}`);
  }

  return {
    source,
    sourcePath,
    originalName: requestedPlan.originalName,
    activeName: requestedPlan.activeName,
    dependencies: requestedPlan.dependencies.map((dependency) => ({
      source: dependency.source,
      sourcePath: dependency.sourcePath,
      activeName: dependency.activeName
    })),
    manifestPath: MANIFEST_FILE_NAME,
    lockfilePath: LOCKFILE_FILE_NAME,
    packagePath: packageSkillPath(source, sourcePath),
    activationPath: activeSkillPath(requestedPlan.activeName)
  };
}

export function activateSkill(target: string, alias?: string, cacheRoot = defaultCacheRoot()): ActivateSkillResult {
  return activateSkillFromDefinitions(target, alias, loadSourceDefinitions(), cacheRoot);
}
