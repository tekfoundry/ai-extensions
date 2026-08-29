import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { AixError } from "../errors.js";
import { extensionAppendDefinition, lockfileBlockForDefinition, preflightAppendDefinitions, writeExtensionAppendBlocks } from "../extension-append.js";
import { copyFilesSafely } from "../fs/files.js";
import { parseManifest } from "../manifest.js";
import { activeSkillPath, packageSkillPath, SKILL_PACKAGES_DIR } from "../paths/agents.js";
import { LOCKFILE_FILE_NAME, MANIFEST_FILE_NAME, type LockfileSkillDependency, type LockfileSkillEntry, type SourceDefinition, type SourceType } from "../schema.js";
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
import type { AppendBlockDefinition } from "../agents-md.js";

interface SkillActivationPlan {
  source: string;
  sourcePath: string;
  sourceSkillPath: string;
  originalName: string;
  activeName: string;
  alias?: string;
  dependencies: LockfileSkillDependency[];
}

export interface PreparedSkillActivation {
  source: string;
  sourcePath: string;
  definition: SourceDefinition;
  sourceType: SourceType;
  resolvedCommit: string | undefined;
  plans: SkillActivationPlan[];
  requestedPlan: SkillActivationPlan;
  manifestJson: Record<string, unknown>;
  lockfile: { skills: LockfileSkillEntry[] };
}

export interface PrepareSkillActivationOptions {
  allowMissingManifest?: boolean;
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

function emptyManifestJson(): Record<string, unknown> {
  return {
    sources: {
      skills: {},
      workflows: {}
    },
    skills: []
  };
}

function readActivationManifestJson(options: PrepareSkillActivationOptions): Record<string, unknown> {
  if (options.allowMissingManifest && !existsSync(MANIFEST_FILE_NAME)) {
    return emptyManifestJson();
  }

  return readJsonObject(MANIFEST_FILE_NAME);
}

function localAixSkillPath(source: string, sourcePath: string): string | undefined {
  if (source !== "aix" || !sourcePath.startsWith("skills/")) {
    return undefined;
  }

  const path = join("aix", sourcePath);

  return existsSync(path) ? path : undefined;
}

function remoteAixSkillPath(source: string, sourcePath: string): string {
  if (source === "aix" && sourcePath.startsWith("skills/")) {
    return sourcePath.slice("skills/".length);
  }

  return sourcePath;
}

function resolveSkillActivationSource(
  source: string,
  sourcePath: string,
  sourceDefinitions: Record<string, SourceDefinition>,
  cacheRoot: string
): { definition: SourceDefinition; resolvedSource: ResolvedSource; sourcePath: string; sourceType: SourceType } {
  const localPath = localAixSkillPath(source, sourcePath);

  if (localPath) {
    const definition: SourceDefinition = {
      type: "git",
      url: ".",
      path: "aix"
    };

    return {
      definition,
      resolvedSource: {
        name: source,
        definition,
        rootPath: "aix"
      },
      sourcePath,
      sourceType: "local"
    };
  }

  const definition = sourceDefinitions[source];

  if (!definition) {
    throw new AixError(`Unknown source: ${source}`);
  }

  return {
    definition,
    resolvedSource: resolveSourceFromDefinitions(source, sourceDefinitions, cacheRoot),
    sourcePath: remoteAixSkillPath(source, sourcePath),
    sourceType: "git"
  };
}

function activatePlannedSkill(
  plan: SkillActivationPlan,
  definition: SourceDefinition,
  sourceType: SourceType,
  resolvedCommit: string | undefined,
  manifestJson: Record<string, unknown>,
  lockfile: { skills: LockfileSkillEntry[] },
  requested: boolean
): AppendBlockDefinition | undefined {
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
  const appendDefinition = extensionAppendDefinition("skill", plan.activeName, plan.source, plan.sourcePath, packagePath);
  const agentsMd = lockfileBlockForDefinition(appendDefinition);

  if (requested) {
    updateManifestSkills(manifestJson, plan.source, plan.sourcePath, plan.alias);
  }

  upsertLockfileEntry(lockfile, {
    kind: "skill",
    source: plan.source,
    sourceType,
    ...(sourceType === "git" ? { sourceUrl: definition.url } : {}),
    ...(sourceType === "git" && definition.ref ? { requestedRef: definition.ref } : {}),
    ...(sourceType === "git" && resolvedCommit ? { resolvedCommit } : {}),
    sourcePath: plan.sourcePath,
    packagePath,
    activationPath,
    originalName: plan.originalName,
    activeName: plan.activeName,
    ...(plan.alias ? { alias: plan.alias } : {}),
    requested: isRequested,
    ...(plan.dependencies.length > 0 ? { dependencies: plan.dependencies } : {}),
    ...(agentsMd ? { agentsMd } : {}),
    packageFiles,
    activeFiles
  });

  return appendDefinition;
}

export function prepareSkillActivationFromDefinitions(
  target: string,
  alias: string | undefined,
  defaultSourceDefinitions: Record<string, SourceDefinition>,
  cacheRoot = defaultCacheRoot(),
  options: PrepareSkillActivationOptions = {}
): PreparedSkillActivation {
  const { source, sourcePath } = activationTargetFromInput(target);

  if (alias) {
    assertFolderNameSafe(alias, "alias");
  }

  const manifestJson = readActivationManifestJson(options);
  parseManifest(manifestJson);

  const manifestSources = manifestSourceDefinitions(manifestJson);
  const sourceDefinitions = {
    ...defaultSourceDefinitions,
    ...manifestSources
  };
  const sourceResolution = resolveSkillActivationSource(source, sourcePath, sourceDefinitions, cacheRoot);
  const { definition, resolvedSource, sourceType } = sourceResolution;
  const resolvedSourcePath = sourceResolution.sourcePath;
  const plans = createActivationPlan(resolvedSource, resolvedSourcePath, alias);
  const lockfile = readLockfileJson();

  for (const plan of plans) {
    assertActivationPlanSafe(lockfile, plan);
  }

  const requestedPlan = plans.find((plan) => plan.source === source && plan.sourcePath === resolvedSourcePath);

  if (!requestedPlan) {
    throw new AixError(`Unknown skill in source ${source}: ${resolvedSourcePath}`);
  }

  return {
    source,
    sourcePath: resolvedSourcePath,
    definition,
    sourceType,
    resolvedCommit: resolvedSource.resolvedCommit,
    plans,
    requestedPlan,
    manifestJson,
    lockfile
  };
}

export function preflightSkillActivationFromDefinitions(
  target: string,
  alias: string | undefined,
  defaultSourceDefinitions: Record<string, SourceDefinition>,
  cacheRoot = defaultCacheRoot(),
  options: PrepareSkillActivationOptions = {}
): void {
  prepareSkillActivationFromDefinitions(target, alias, defaultSourceDefinitions, cacheRoot, options);
}

export function activateSkillFromDefinitions(
  target: string,
  alias: string | undefined,
  defaultSourceDefinitions: Record<string, SourceDefinition>,
  cacheRoot = defaultCacheRoot()
): ActivateSkillResult {
  const prepared = prepareSkillActivationFromDefinitions(target, alias, defaultSourceDefinitions, cacheRoot);
  const previousLockfile = structuredClone(prepared.lockfile);
  const sourceAppendDefinitions = prepared.plans.map((plan) =>
    extensionAppendDefinition("skill", plan.activeName, plan.source, plan.sourcePath, plan.sourceSkillPath)
  );

  preflightAppendDefinitions(previousLockfile, sourceAppendDefinitions);

  mkdirSync(SKILL_PACKAGES_DIR, { recursive: true });

  const appendDefinitions: AppendBlockDefinition[] = [];
  for (const plan of prepared.plans) {
    const appendDefinition = activatePlannedSkill(
      plan,
      prepared.definition,
      prepared.sourceType,
      prepared.resolvedCommit,
      prepared.manifestJson,
      prepared.lockfile,
      plan === prepared.requestedPlan
    );

    if (appendDefinition) {
      appendDefinitions.push(appendDefinition);
    }
  }

  writeExtensionAppendBlocks(previousLockfile, prepared.lockfile, appendDefinitions);
  writeJsonObjectAtomic(MANIFEST_FILE_NAME, prepared.manifestJson);
  writeJsonObjectAtomic(LOCKFILE_FILE_NAME, prepared.lockfile);

  return {
    source: prepared.source,
    sourcePath: prepared.sourcePath,
    originalName: prepared.requestedPlan.originalName,
    activeName: prepared.requestedPlan.activeName,
    dependencies: prepared.requestedPlan.dependencies.map((dependency) => ({
      source: dependency.source,
      sourcePath: dependency.sourcePath,
      activeName: dependency.activeName
    })),
    manifestPath: MANIFEST_FILE_NAME,
    lockfilePath: LOCKFILE_FILE_NAME,
    packagePath: packageSkillPath(prepared.source, prepared.sourcePath),
    activationPath: activeSkillPath(prepared.requestedPlan.activeName)
  };
}

export function activateSkill(target: string, alias?: string, cacheRoot = defaultCacheRoot()): ActivateSkillResult {
  return activateSkillFromDefinitions(target, alias, loadSourceDefinitions(), cacheRoot);
}
