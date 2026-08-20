import { execFileSync } from "node:child_process";
import { join } from "node:path";
import { AixError } from "../errors.js";
import { parseManifest } from "../manifest.js";
import { defaultCacheRoot, loadSourceDefinitions, resolveSourceFromDefinitions } from "../sources/index.js";
import { LOCKFILE_FILE_NAME, MANIFEST_FILE_NAME, type LockfileSkillEntry } from "../schema.js";
import { readJsonObject } from "./json.js";
import { readLockfileJson } from "./lockfile.js";
import { activationTargetFromInput } from "./naming.js";
import type { DiffSkillsResult } from "./types.js";

function gitNoIndexDiff(fromPath: string, toPath: string): string {
  try {
    return execFileSync("git", ["diff", "--no-index", "--", fromPath, toPath], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    });
  } catch (error) {
    if (typeof error === "object" && error !== null && "status" in error && error.status === 1 && "stdout" in error) {
      return String(error.stdout);
    }

    const message = error instanceof Error ? error.message : String(error);

    throw new AixError(`Git diff failed for ${fromPath} and ${toPath}.\n${message}`);
  }
}

export function diffSkills(target?: string, cacheRoot = defaultCacheRoot()): DiffSkillsResult {
  const manifestJson = readJsonObject(MANIFEST_FILE_NAME);
  parseManifest(manifestJson);

  const lockfile = readLockfileJson();
  const requestedTarget = target ? activationTargetFromInput(target) : undefined;
  const skillEntries = lockfile.skills.filter((skill) => !skill.owner);
  const entriesToDiff = requestedTarget
    ? lockfile.skills.filter((skill) => skill.source === requestedTarget.source && skill.sourcePath === requestedTarget.sourcePath)
    : skillEntries;

  if (requestedTarget && entriesToDiff.length === 0) {
    throw new AixError(`Unknown locked skill: ${requestedTarget.source}/${requestedTarget.sourcePath}`);
  }

  if (requestedTarget && entriesToDiff.some((skill) => skill.owner?.kind === "workflow")) {
    throw new AixError(`Cannot diff workflow-owned skill directly: ${requestedTarget.source}/${requestedTarget.sourcePath}`);
  }

  if (entriesToDiff.length === 0) {
    return {
      lockfilePath: LOCKFILE_FILE_NAME,
      diffs: []
    };
  }

  const sourceDefinitions = loadSourceDefinitions();
  const resolvedSources = new Map<string, ReturnType<typeof resolveSourceFromDefinitions>>();

  for (const entry of entriesToDiff) {
    if (!sourceDefinitions[entry.source]) {
      throw new AixError(`Unknown source: ${entry.source}`);
    }

    if (!resolvedSources.has(entry.source)) {
      resolvedSources.set(entry.source, resolveSourceFromDefinitions(entry.source, sourceDefinitions, cacheRoot));
    }
  }

  return {
    lockfilePath: LOCKFILE_FILE_NAME,
    diffs: entriesToDiff
      .map((entry: LockfileSkillEntry) => {
        const resolvedSource = resolvedSources.get(entry.source);

        if (!resolvedSource) {
          throw new AixError(`Unknown source: ${entry.source}`);
        }

        const sourceSkillPath = join(resolvedSource.rootPath, entry.sourcePath);

        return {
          source: entry.source,
          sourcePath: entry.sourcePath,
          activeName: entry.activeName,
          packagePath: entry.packagePath,
          sourceSkillPath,
          diff: gitNoIndexDiff(entry.packagePath, sourceSkillPath)
        };
      })
      .filter((item) => item.diff.trim() !== "")
  };
}
