import { existsSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { AixError } from "../errors.js";
import { copyFilesSafely } from "../fs/files.js";
import { parseManifest } from "../manifest.js";
import { packageWorkflowPath, WORKFLOW_PACKAGES_DIR } from "../paths/agents.js";
import {
  LOCKFILE_FILE_NAME,
  MANIFEST_FILE_NAME,
  type LockfileSkillEntry,
  type LockfileWorkflowEntry,
  type SourceDefinition
} from "../schema.js";
import { readJsonObject, writeJsonObjectAtomic } from "../activation/json.js";
import { readLockfileJson } from "../activation/lockfile.js";
import { assertFolderNameSafe } from "../activation/naming.js";
import { defaultCacheRoot, getDefaultWorkflowSources, resolveSourceFromDefinitions } from "../sources/index.js";
import { assertAgentsMdBlockSafe, installAgentsMdBlock } from "./agents-md.js";
import { assertWorkflowDocsSafe, installWorkflowDocs, scaffoldProjectDocs } from "./docs.js";
import { readWorkflowManifest } from "./manifest.js";
import { assertWorkflowActiveSkillsUnmodified, assertWorkflowSkillsSafe, installWorkflowSkills } from "./skills.js";
import { deriveWorkflowSourceName, parseSourceInput, sourceManifestEntry, workflowSourcesJson } from "./source.js";
import { assertWorkflowPackageUnmodified, removeStagedWorkflowPackage, replaceWorkflowSkillEntries, stageWorkflowPackage } from "./shared.js";
import type { InstallWorkflowResult } from "./types.js";

function preflightWorkflowInstall(
  source: string,
  workflow: ReturnType<typeof readWorkflowManifest>,
  stagedPackagePath: string,
  finalPackagePath: string,
  lockfile: { skills: LockfileSkillEntry[]; workflows?: LockfileWorkflowEntry[] },
  allowExistingWorkflow = false
): LockfileWorkflowEntry | undefined {
  const existingWorkflow = (lockfile.workflows || [])[0];

  if (existingWorkflow && !allowExistingWorkflow) {
    throw new AixError(
      `A workflow is already active: ${existingWorkflow.name}. Run aix uninstall workflow before installing another workflow.`
    );
  }

  if (existingWorkflow) {
    assertWorkflowPackageUnmodified(existingWorkflow, "update");
    assertWorkflowActiveSkillsUnmodified(lockfile, existingWorkflow.name);
  }

  assertWorkflowDocsSafe(workflow, stagedPackagePath, existingWorkflow);
  assertAgentsMdBlockSafe(workflow.agentsMd, stagedPackagePath, existingWorkflow?.agentsMd?.sha256);
  assertWorkflowSkillsSafe(workflow, source, stagedPackagePath, finalPackagePath, lockfile);

  return existingWorkflow;
}

function writeWorkflowPackage(stagedPackagePath: string, finalPackagePath: string): LockfileWorkflowEntry["packageFiles"] {
  mkdirSync(WORKFLOW_PACKAGES_DIR, { recursive: true });
  rmSync(finalPackagePath, { recursive: true, force: true });

  return copyFilesSafely(stagedPackagePath, finalPackagePath);
}

export function installResolvedWorkflow(
  source: string,
  definition: SourceDefinition,
  sourcePath: string,
  resolvedRoot: string,
  resolvedCommit: string | undefined,
  manifestJson: Record<string, unknown>,
  lockfile: { skills: LockfileSkillEntry[]; workflows?: LockfileWorkflowEntry[] },
  options: { allowExistingWorkflow?: boolean } = {}
): InstallWorkflowResult {
  const stagedPackage = stageWorkflowPackage(resolvedRoot);

  try {
    const workflow = readWorkflowManifest(stagedPackage.path);
    const packagePath = packageWorkflowPath(source, workflow.name);
    const existingWorkflow = preflightWorkflowInstall(
      source,
      workflow,
      stagedPackage.path,
      packagePath,
      lockfile,
      options.allowExistingWorkflow
    );
    const packageFiles = writeWorkflowPackage(stagedPackage.path, packagePath);
    const docs = installWorkflowDocs(workflow, packagePath);
    const agentsMd = installAgentsMdBlock(workflow.agentsMd, packagePath);
    const skillEntries = installWorkflowSkills(workflow, source, packagePath, existingWorkflow);

    scaffoldProjectDocs();
    replaceWorkflowSkillEntries(lockfile, workflow.name, skillEntries);

    lockfile.workflows = [
      {
        kind: "workflow",
        source,
        sourceType: "git",
        sourceUrl: definition.url,
        requestedRef: definition.ref,
        resolvedCommit,
        sourcePath,
        packagePath,
        name: workflow.name,
        ...(workflow.title ? { title: workflow.title } : {}),
        docs,
        ...(agentsMd ? { agentsMd } : {}),
        skills: skillEntries.map((skill) => ({
          sourcePath: skill.sourcePath,
          activeName: skill.activeName
        })),
        packageFiles
      }
    ];
    manifestJson.workflow = `${source}:${sourcePath}`;

    return {
      name: workflow.name,
      ...(workflow.title ? { title: workflow.title } : {}),
      manifestPath: MANIFEST_FILE_NAME,
      lockfilePath: LOCKFILE_FILE_NAME,
      packagePath,
      installedDocs: docs.map((doc) => doc.targetPath),
      activatedSkills: skillEntries.map((skill) => skill.activeName)
    };
  } finally {
    removeStagedWorkflowPackage(stagedPackage.path);
  }
}

export function installWorkflowFromDefinitions(
  sourceDefinitions: Record<string, SourceDefinition>,
  cacheRoot = defaultCacheRoot(),
  options: { allowExistingWorkflow?: boolean } = {}
): InstallWorkflowResult {
  const manifestJson = existsSync(MANIFEST_FILE_NAME) ? readJsonObject(MANIFEST_FILE_NAME) : { sources: { skills: {}, workflows: {} }, skills: [] };
  parseManifest(manifestJson);

  const source = Object.keys(sourceDefinitions)[0];
  const definition = sourceDefinitions[source];

  if (!source || !definition) {
    throw new AixError("Missing workflow source.");
  }

  const resolved = resolveSourceFromDefinitions(source, sourceDefinitions, cacheRoot);
  const sources = workflowSourcesJson(manifestJson);
  sources[source] = sourceManifestEntry(definition);

  const lockfile = readLockfileJson();
  const result = installResolvedWorkflow(
    source,
    definition,
    definition.path || ".",
    resolved.rootPath,
    resolved.resolvedCommit,
    manifestJson,
    lockfile,
    options
  );

  writeJsonObjectAtomic(MANIFEST_FILE_NAME, manifestJson);
  writeJsonObjectAtomic(LOCKFILE_FILE_NAME, lockfile);

  return result;
}

export function installWorkflow(input?: string, alias?: string, cacheRoot = defaultCacheRoot()): InstallWorkflowResult {
  if (!input) {
    return installWorkflowFromDefinitions(getDefaultWorkflowSources(), cacheRoot);
  }

  const definition = parseSourceInput(input);
  const source = alias || deriveWorkflowSourceName(input, definition);
  assertFolderNameSafe(source, "workflow source name");

  return installWorkflowFromDefinitions({ [source]: definition }, cacheRoot);
}

export interface BundledWorkflow {
  name: string;
  title?: string;
  path: string;
  source: SourceDefinition;
}

export function bundledWorkflowsRoot(): string {
  return resolve(dirname(fileURLToPath(import.meta.url)), "../../aix/workflows");
}

export function listBundledWorkflows(root = bundledWorkflowsRoot()): BundledWorkflow[] {
  if (!existsSync(root)) {
    return [];
  }

  return readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => {
      const path = resolve(root, entry.name);
      const manifest = readWorkflowManifest(path);
      const defaultSource = getDefaultWorkflowSources().aix;

      return {
        name: manifest.name,
        ...(manifest.title ? { title: manifest.title } : {}),
        path,
        source: {
          type: "git" as const,
          url: defaultSource.url,
          path: `aix/workflows/${manifest.name}`,
          ...(defaultSource.ref ? { ref: defaultSource.ref } : {})
        }
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function installBundledWorkflow(workflowName: string, cacheRoot = defaultCacheRoot()): InstallWorkflowResult {
  const workflow = listBundledWorkflows().find((candidate) => candidate.name === workflowName);

  if (!workflow) {
    throw new AixError(`Unknown bundled workflow: ${workflowName}`);
  }

  return installWorkflowFromDefinitions({ aix: workflow.source }, cacheRoot);
}
