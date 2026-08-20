import { mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { AixError } from "../errors.js";
import { copyFilesSafely } from "../fs/files.js";
import { parseManifest } from "../manifest.js";
import { defaultCacheRoot, loadSourceDefinitions, resolveSourceFromDefinitions } from "../sources/index.js";
import { parseSkillNameFromDirectory } from "../skills.js";
import { LOCKFILE_FILE_NAME, MANIFEST_FILE_NAME, type LockfileSkillEntry } from "../schema.js";
import { activateAliasWrapper, assertActivationPathAvailable, assertActiveFilesMatchLockfile } from "./active-files.js";
import { readJsonObject, writeJsonObjectAtomic } from "./json.js";
import { readLockfileJson } from "./lockfile.js";
import { activationTargetFromInput } from "./naming.js";
import { assertPackageFilesMatchLockfile, packageFileHashes } from "./package-files.js";
import type { UpdateSkillsResult, UpdatedSkill } from "./types.js";

interface PlannedSkillUpdate {
  entry: LockfileSkillEntry;
  sourceSkillPath: string;
  originalName: string;
  sourceUrl: string;
  requestedRef?: string;
  resolvedCommit?: string;
}

function entryKey(entry: Pick<LockfileSkillEntry, "source" | "sourcePath">): string {
  return `${entry.source}:${entry.sourcePath}`;
}

function assertNoLocalDrift(entry: LockfileSkillEntry): void {
  assertPackageFilesMatchLockfile(entry, "update");
  assertActiveFilesMatchLockfile(entry, "update");

  if (!entry.alias) {
    assertActivationPathAvailable(entry.activationPath, entry.packagePath);
  }
}

function replacePackageFromSource(entry: LockfileSkillEntry, sourceSkillPath: string, originalName: string): LockfileSkillEntry {
  rmSync(entry.packagePath, { recursive: true });
  const packageFiles = copyFilesSafely(sourceSkillPath, entry.packagePath);
  const activeFiles = entry.alias
    ? replaceAliasWrapper(entry, sourceSkillPath)
    : packageFileHashes(entry.packagePath);

  return {
    ...entry,
    originalName,
    packageFiles,
    activeFiles
  };
}

function replaceAliasWrapper(entry: LockfileSkillEntry, sourceSkillPath: string) {
  rmSync(entry.activationPath, { recursive: true });
  mkdirSync(entry.packagePath, { recursive: true });

  return activateAliasWrapper(entry.activationPath, sourceSkillPath, entry.activeName);
}

export function updateSkills(target?: string, cacheRoot = defaultCacheRoot()): UpdateSkillsResult {
  const manifestJson = readJsonObject(MANIFEST_FILE_NAME);
  parseManifest(manifestJson);

  const lockfile = readLockfileJson();
  const requestedTarget = target ? activationTargetFromInput(target) : undefined;
  const skillEntries = lockfile.skills.filter((skill) => !skill.owner);
  const entriesToUpdate = requestedTarget
    ? lockfile.skills.filter((skill) => skill.source === requestedTarget.source && skill.sourcePath === requestedTarget.sourcePath)
    : skillEntries;

  if (requestedTarget && entriesToUpdate.length === 0) {
    throw new AixError(`Unknown locked skill: ${requestedTarget.source}/${requestedTarget.sourcePath}`);
  }

  if (requestedTarget && entriesToUpdate.some((skill) => skill.owner?.kind === "workflow")) {
    throw new AixError(`Cannot update workflow-owned skill directly: ${requestedTarget.source}/${requestedTarget.sourcePath}`);
  }

  if (entriesToUpdate.length === 0) {
    return {
      lockfilePath: LOCKFILE_FILE_NAME,
      updatedSkills: []
    };
  }

  for (const entry of entriesToUpdate) {
    assertNoLocalDrift(entry);
  }

  const sourceDefinitions = loadSourceDefinitions();
  const resolvedSources = new Map<string, ReturnType<typeof resolveSourceFromDefinitions>>();

  for (const entry of entriesToUpdate) {
    if (!sourceDefinitions[entry.source]) {
      throw new AixError(`Unknown source: ${entry.source}`);
    }

    if (!resolvedSources.has(entry.source)) {
      resolvedSources.set(entry.source, resolveSourceFromDefinitions(entry.source, sourceDefinitions, cacheRoot));
    }
  }

  const updatedSkills: UpdatedSkill[] = [];
  const updatePlans = entriesToUpdate.map((entry): PlannedSkillUpdate => {
    const resolvedSource = resolvedSources.get(entry.source);

    if (!resolvedSource) {
      throw new AixError(`Unknown source: ${entry.source}`);
    }

    const sourceSkillPath = join(resolvedSource.rootPath, entry.sourcePath);

    return {
      entry,
      sourceSkillPath,
      originalName: parseSkillNameFromDirectory(sourceSkillPath),
      sourceUrl: resolvedSource.definition.url,
      requestedRef: resolvedSource.definition.ref,
      resolvedCommit: resolvedSource.resolvedCommit
    };
  });
  const updatePlansByKey = new Map(updatePlans.map((plan) => [entryKey(plan.entry), plan]));

  lockfile.skills = lockfile.skills.map((entry) => {
    const updatePlan = updatePlansByKey.get(entryKey(entry));

    if (!updatePlan) {
      return entry;
    }

    const updatedEntry = replacePackageFromSource(entry, updatePlan.sourceSkillPath, updatePlan.originalName);

    updatedSkills.push({
      source: updatedEntry.source,
      sourcePath: updatedEntry.sourcePath,
      activeName: updatedEntry.activeName,
      previousResolvedCommit: updatedEntry.resolvedCommit,
      resolvedCommit: updatePlan.resolvedCommit,
      packagePath: updatedEntry.packagePath,
      activationPath: updatedEntry.activationPath
    });

    return {
      ...updatedEntry,
      sourceUrl: updatePlan.sourceUrl,
      requestedRef: updatePlan.requestedRef,
      resolvedCommit: updatePlan.resolvedCommit
    };
  });

  writeJsonObjectAtomic(LOCKFILE_FILE_NAME, lockfile);

  return {
    lockfilePath: LOCKFILE_FILE_NAME,
    updatedSkills
  };
}
