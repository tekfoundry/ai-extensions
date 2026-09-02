import { cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { AixError } from "../errors.js";
import { assertInstalledAppendBlockUnmodified, lockfileAppendBlocks, type AppendBlockDefinition } from "../agents-md.js";
import { extensionAppendDefinition, lockfileBlockForDefinition, preflightAppendDefinitions, writeExtensionAppendBlocks } from "../extension-append.js";
import { copyFilesSafely } from "../fs/files.js";
import { parseManifest } from "../manifest.js";
import { packageWorkflowPath, WORKFLOW_PACKAGES_DIR } from "../paths/agents.js";
import {
  LOCKFILE_FILE_NAME,
  MANIFEST_FILE_NAME,
  type LockfileRoleEntry,
  type LockfileSkillEntry,
  type LockfileWorkflowEntry,
  type SourceDefinition,
  type SourceType
} from "../schema.js";
import { readJsonObject, writeJsonObjectAtomic } from "../activation/json.js";
import { readLockfileJson } from "../activation/lockfile.js";
import { manifestRoleSourceDefinitions } from "../activation/manifest.js";
import { assertFolderNameSafe } from "../activation/naming.js";
import { defaultCacheRoot, getDefaultWorkflowSources, resolveSourceFromDefinitions } from "../sources/index.js";
import { activateRoleFromDefinitions } from "../roles/activation.js";
import { getDefaultRoleSources } from "../sources/index.js";
import { assertAgentsMdBlockSafe, workflowAppendDefinition } from "./agents-md.js";
import { assertWorkflowDocsSafe, installWorkflowDocs, scaffoldProjectDocs } from "./docs.js";
import { discoverWorkflowGuidance, validateWorkflowGuidance, workflowGuidanceHashes } from "./guidance.js";
import { readWorkflowManifest } from "./manifest.js";
import { readWorkflowTeam, workflowTeamHash } from "./team.js";
import { assertWorkflowActiveRolesUnmodified, assertWorkflowRolesSafe, installWorkflowRoles, replaceWorkflowRoleEntries, workflowRoles } from "./roles.js";
import { assertWorkflowActiveSkillsUnmodified, assertWorkflowSkillsSafe, installWorkflowSkills } from "./skills.js";
import { deriveWorkflowSourceName, parseSourceInput, sourceManifestEntry, workflowSourcesJson } from "./source.js";
import {
  assertWorkflowPackageUnmodified,
  removeStagedWorkflowPackage,
  replaceWorkflowSkillEntries,
  stageWorkflowPackage,
  workflowSkills
} from "./shared.js";
import { discoverWorkflowTemplates, validateWorkflowTemplates, workflowTemplateHashes } from "./templates.js";
import type { InstallWorkflowResult } from "./types.js";

function preflightWorkflowInstall(
  source: string,
  workflow: ReturnType<typeof readWorkflowManifest>,
  stagedPackagePath: string,
  finalPackagePath: string,
  lockfile: { skills: LockfileSkillEntry[]; roles?: LockfileRoleEntry[]; workflows?: LockfileWorkflowEntry[] },
  allowExistingWorkflow = false
): LockfileWorkflowEntry | undefined {
  const existingWorkflow = (lockfile.workflows || [])[0];

  if (existingWorkflow && !allowExistingWorkflow) {
    throw new AixError(
      `A workflow is already active: ${existingWorkflow.name}. Run aix workflow uninstall before installing another workflow.`
    );
  }

  if (existingWorkflow) {
    assertWorkflowPackageUnmodified(existingWorkflow, "update");
    assertWorkflowActiveSkillsUnmodified(lockfile, existingWorkflow.name);
    assertWorkflowActiveRolesUnmodified(lockfile, existingWorkflow.name);
  }

  for (const block of lockfileAppendBlocks(lockfile)) {
    assertInstalledAppendBlockUnmodified(block);
  }

  assertWorkflowDocsSafe(workflow, stagedPackagePath, existingWorkflow);
  assertAgentsMdBlockSafe(workflow.agentsMd, stagedPackagePath, existingWorkflow?.agentsMd, workflow.name);
  assertWorkflowSkillsSafe(workflow, source, stagedPackagePath, finalPackagePath, lockfile);
  assertWorkflowRolesSafe(workflow, source, stagedPackagePath, finalPackagePath, lockfile);
  validateWorkflowGuidance(discoverWorkflowGuidance(workflow, stagedPackagePath));
  validateWorkflowTemplates(discoverWorkflowTemplates(workflow, stagedPackagePath));
  if (workflow.team) {
    readWorkflowTeam(workflow, stagedPackagePath);
  }

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
  lockfile: { skills: LockfileSkillEntry[]; roles?: LockfileRoleEntry[]; workflows?: LockfileWorkflowEntry[] },
  options: { allowExistingWorkflow?: boolean; sourceType?: SourceType } = {}
): InstallWorkflowResult {
  const sourceType = options.sourceType || "git";
  const previousLockfile = structuredClone(lockfile);
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
    const workflowAppend = workflow.agentsMd ? workflowAppendDefinition(workflow.agentsMd, packagePath, workflow.name) : undefined;
    const agentsMd = lockfileBlockForDefinition(workflowAppend);
    const previousWorkflowSkills = existingWorkflow ? workflowSkills(lockfile, existingWorkflow.name) : [];
    const previousWorkflowRoles = existingWorkflow ? workflowRoles(lockfile, existingWorkflow.name) : [];
    const skillEntries = installWorkflowSkills(workflow, source, sourceType, packagePath, previousWorkflowSkills);
    const roleEntries = installWorkflowRoles(workflow, source, sourceType, packagePath, existingWorkflow, previousWorkflowRoles);
    const guidance = workflowGuidanceHashes(discoverWorkflowGuidance(workflow, packagePath));
    const templates = workflowTemplateHashes(discoverWorkflowTemplates(workflow, packagePath));

    scaffoldProjectDocs();
    replaceWorkflowSkillEntries(lockfile, workflow.name, skillEntries);
    replaceWorkflowRoleEntries(lockfile, workflow.name, roleEntries);

    lockfile.workflows = [
      {
        kind: "workflow",
        source,
        sourceType,
        ...(sourceType === "git" ? { sourceUrl: definition.url } : {}),
        ...(sourceType === "git" && definition.ref ? { requestedRef: definition.ref } : {}),
        ...(sourceType === "git" && resolvedCommit ? { resolvedCommit } : {}),
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
        ...(roleEntries.length > 0
          ? {
              roles: roleEntries.map((role) => ({
                sourcePath: role.sourcePath,
                activeName: role.activeName
              }))
            }
          : {}),
        ...(templates.length > 0 ? { templates } : {}),
        ...(guidance.length > 0 ? { guidance } : {}),
        ...(workflow.team ? { team: workflowTeamHash(workflow, packagePath) } : {}),
        packageFiles
      }
    ];
    manifestJson.workflow = `${source}:${sourcePath}`;

    const appendDefinitions: AppendBlockDefinition[] = [
      workflowAppend,
      ...skillEntries.map((skill) => extensionAppendDefinition("skill", skill.activeName, skill.source, skill.sourcePath, skill.packagePath)),
      ...roleEntries.map((role) => extensionAppendDefinition("role", role.activeName, role.source, role.sourcePath, role.packagePath))
    ].filter((definition): definition is AppendBlockDefinition => definition !== undefined);

    preflightAppendDefinitions(previousLockfile, appendDefinitions);
    writeExtensionAppendBlocks(previousLockfile, lockfile, appendDefinitions);

    return {
      name: workflow.name,
      ...(workflow.title ? { title: workflow.title } : {}),
      manifestPath: MANIFEST_FILE_NAME,
      lockfilePath: LOCKFILE_FILE_NAME,
      packagePath,
      installedDocs: docs.map((doc) => doc.targetPath),
      installedGuidance: guidance.length,
      installedTemplates: templates.length,
      activatedSkills: skillEntries.map((skill) => skill.activeName),
      activatedRoles: roleEntries.map((role) => role.activeName)
    };
  } finally {
    removeStagedWorkflowPackage(stagedPackage.path);
  }
}

function activateWorkflowDependencies(
  workflow: ReturnType<typeof readWorkflowManifest>,
  cacheRoot: string,
  context?: { source: string; definition: SourceDefinition; resolvedRoot: string; sourceType: SourceType; resolvedCommit?: string }
): string[] {
  const dependencies = workflow.dependencies?.roles || [];

  if (dependencies.length === 0 && !workflow.requiredCapabilities) {
    return [];
  }

  const sourceDefinitions = {
    ...getDefaultRoleSources(),
    ...manifestRoleSourceDefinitions(readWorkflowInstallManifestJson())
  };
  const activatedRoles = dependencies.map((dependency) => {
    const canonicalSourcePath = dependency.source === "aix" && dependency.path.startsWith("roles/")
      ? dependency.path.slice("roles/".length)
      : dependency.path;
    const beforeLockfile = readLockfileJson();
    const wasAlreadyActive = (beforeLockfile.roles || []).some(
      (role) => role.source === dependency.source && role.sourcePath === canonicalSourcePath
    );
    const roleDefinition = sourceDefinitions[dependency.source] || (
      context && dependency.source === context.source
        ? { ...context.definition, path: "." }
        : undefined
    );

    if (!roleDefinition) {
      throw new AixError(`Unknown role source: ${dependency.source}`);
    }

    const effectiveSourceDefinitions = {
      ...sourceDefinitions,
      [dependency.source]: roleDefinition
    };

    if (context && dependency.source === context.source) {
      const sourceRoot = resolve(context.resolvedRoot, relative(context.definition.path || ".", "."));
      const sourceRolePath = dependency.source === "aix" && dependency.path.startsWith("roles/")
        ? resolve(sourceRoot, "aix", "roles", dependency.path.slice("roles/".length))
        : resolve(sourceRoot, roleDefinition.path || ".", dependency.path);
      const result = activateRoleFromDefinitions(
        `${dependency.source}/${dependency.path}`,
        dependency.activeName,
        effectiveSourceDefinitions,
        cacheRoot,
        {
          definition: roleDefinition,
          sourceType: context.sourceType,
          sourcePath: canonicalSourcePath,
          sourceRolePath,
          resolvedCommit: context.resolvedCommit
        }
      );

      if (!wasAlreadyActive) {
        const lockfile = readLockfileJson();
        const entry = lockfile.roles?.find(
          (role) => role.source === result.source && role.sourcePath === result.sourcePath
        );

        if (entry) {
          entry.owner = { kind: "workflow", name: workflow.name };
          entry.requested = false;
          writeJsonObjectAtomic(LOCKFILE_FILE_NAME, lockfile);
        }
      }

      return {
        source: result.source,
        sourcePath: result.sourcePath,
        activeName: result.activeName
      };
    }

    const result = activateRoleFromDefinitions(
      `${dependency.source}/${dependency.path}`,
      dependency.activeName,
      effectiveSourceDefinitions,
      cacheRoot
    );

    return {
      source: result.source,
      sourcePath: result.sourcePath,
      activeName: result.activeName
    };
  });
  const lockfile = readLockfileJson();
  const activeWorkflow = lockfile.workflows?.find((entry) => entry.name === workflow.name);

  if (!activeWorkflow) {
    throw new AixError(`Unable to record dependencies for active workflow: ${workflow.name}`);
  }

  activeWorkflow.dependencies = {
    roles: activatedRoles,
    ...(workflow.requiredCapabilities ? { requiredCapabilities: workflow.requiredCapabilities } : {})
  };
  writeJsonObjectAtomic(LOCKFILE_FILE_NAME, lockfile);

  return activatedRoles.map((role) => role.activeName);
}

function completeWorkflowInstallation(
  result: InstallWorkflowResult,
  cacheRoot: string,
  context?: { source: string; definition: SourceDefinition; resolvedRoot: string; sourceType: SourceType; resolvedCommit?: string }
): InstallWorkflowResult {
  const workflow = readWorkflowManifest(result.packagePath);
  const dependencyRoles = activateWorkflowDependencies(workflow, cacheRoot, context);

  return dependencyRoles.length === 0
    ? result
    : { ...result, activatedRoles: [...result.activatedRoles, ...dependencyRoles] };
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

const INSTALL_TRANSACTION_PATHS = ["aix.json", "aix.lock.json", "AGENTS.md", ".agents", "_docs"];

function withWorkflowInstallTransaction<T>(operation: () => T): T {
  const snapshotRoot = mkdtempSync(join(tmpdir(), "aix-workflow-transaction-"));
  const existingPaths = new Set<string>();

  try {
    for (const path of INSTALL_TRANSACTION_PATHS) {
      if (!existsSync(path)) {
        continue;
      }

      existingPaths.add(path);
      cpSync(path, join(snapshotRoot, path), { recursive: true });
    }

    return operation();
  } catch (error) {
    for (const path of INSTALL_TRANSACTION_PATHS) {
      rmSync(path, { recursive: true, force: true });
    }

    for (const path of existingPaths) {
      cpSync(join(snapshotRoot, path), path, { recursive: true });
    }

    throw error;
  } finally {
    rmSync(snapshotRoot, { recursive: true, force: true });
  }
}

function readWorkflowInstallManifestJson(): Record<string, unknown> {
  return existsSync(MANIFEST_FILE_NAME) ? readJsonObject(MANIFEST_FILE_NAME) : emptyManifestJson();
}

function localAixWorkflowPath(input: string): string | undefined {
  if (!input.startsWith("aix/workflows/")) {
    return undefined;
  }

  return existsSync(input) ? input : undefined;
}

function installLocalAixWorkflow(
  sourcePath: string,
  cacheRoot: string,
  options: { allowExistingWorkflow?: boolean } = {}
): InstallWorkflowResult {
  return withWorkflowInstallTransaction(() => {
    const manifestJson = readWorkflowInstallManifestJson();
    parseManifest(manifestJson);

  const definition: SourceDefinition = {
    type: "git",
    url: ".",
    path: sourcePath
  };
  const lockfile = readLockfileJson();
  const result = installResolvedWorkflow(
    "aix",
    definition,
    sourcePath,
    sourcePath,
    undefined,
    manifestJson,
    lockfile,
    {
      ...options,
      sourceType: "local"
    }
  );

  writeJsonObjectAtomic(MANIFEST_FILE_NAME, manifestJson);
  writeJsonObjectAtomic(LOCKFILE_FILE_NAME, lockfile);

    return completeWorkflowInstallation(result, cacheRoot, {
      source: "aix",
      definition,
      resolvedRoot: sourcePath,
      sourceType: "local",
      resolvedCommit: undefined
    });
  });
}

function installDefaultAixWorkflowPath(
  sourcePath: string,
  cacheRoot: string,
  options: { allowExistingWorkflow?: boolean } = {}
): InstallWorkflowResult {
  const defaultSource = getDefaultWorkflowSources().aix;

  return installWorkflowFromDefinitions(
    {
      aix: {
        ...defaultSource,
        path: sourcePath
      }
    },
    cacheRoot,
    options
  );
}

export function installWorkflowFromDefinitions(
  sourceDefinitions: Record<string, SourceDefinition>,
  cacheRoot = defaultCacheRoot(),
  options: { allowExistingWorkflow?: boolean } = {}
): InstallWorkflowResult {
  return withWorkflowInstallTransaction(() => {
    const manifestJson = readWorkflowInstallManifestJson();
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

    return completeWorkflowInstallation(result, cacheRoot, {
      source,
      definition,
      resolvedRoot: resolved.rootPath,
      sourceType: "git",
      resolvedCommit: resolved.resolvedCommit
    });
  });
}

export function installWorkflow(input?: string, alias?: string, cacheRoot = defaultCacheRoot()): InstallWorkflowResult {
  if (!input) {
    return installWorkflowFromDefinitions(getDefaultWorkflowSources(), cacheRoot);
  }

  const localWorkflowPath = localAixWorkflowPath(input);

  if (localWorkflowPath) {
    if (alias) {
      throw new AixError("Local aix workflow paths always use the aix source name and do not accept an alias.");
    }

    return installLocalAixWorkflow(localWorkflowPath, cacheRoot);
  }

  if (input.startsWith("aix/workflows/")) {
    if (alias) {
      throw new AixError("Default aix workflow paths always use the aix source name and do not accept an alias.");
    }

    return installDefaultAixWorkflowPath(input, cacheRoot);
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
