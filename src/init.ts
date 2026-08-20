import { createHash, randomUUID } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  statSync,
  writeFileSync
} from "node:fs";
import { dirname, join, relative } from "node:path";
import { CliError } from "./errors.js";
import { createSkillManifestEntry, getDefaultSources } from "./defaults.js";
import { discoverSkills } from "./skills.js";
import { defaultCacheRoot, resolveSourceFromDefinitions, type ResolvedSource } from "./sources.js";
import {
  LOCKFILE_FILE_NAME,
  LOCKFILE_VERSION,
  MANIFEST_FILE_NAME,
  type FileHash,
  type LockfileSkillEntry,
  type SkillsLockfile,
  type SkillsManifest,
  type SourceDefinition
} from "./schema.js";

const AGENTS_DIR = ".agents";
const INSTALLED_SKILLS_DIR = ".agents/skills";

interface SkillSource {
  source: string;
  resolvedSource: ResolvedSource;
  sourcePath: string;
}

interface InitResult {
  declaredCount: number;
  installedCount: number;
  manifestPath: string;
  lockfilePath: string;
}

interface InitOptions {
  sources?: Record<string, SourceDefinition>;
  cacheRoot?: string;
}

function listFilesRecursively(root: string): string[] {
  return readdirSync(root, { withFileTypes: true })
    .flatMap((entry) => {
      const path = join(root, entry.name);

      if (entry.isDirectory()) {
        return listFilesRecursively(path);
      }

      return entry.isFile() ? [path] : [];
    })
    .sort();
}

function parseSkillName(skillPath: string): string {
  const skillFile = join(skillPath, "SKILL.md");

  if (!existsSync(skillFile)) {
    throw new CliError(`Invalid skill source: ${skillPath} is missing SKILL.md`);
  }

  const match = readFileSync(skillFile, "utf8").match(/^name:\s*([^\n\r]+)/m);
  const name = match?.[1]?.trim();

  if (!name) {
    throw new CliError(`Invalid skill source: ${skillFile} must declare a name.`);
  }

  return name;
}

function hashFile(path: string): string {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function copySkillSafely(sourcePath: string, installPath: string): FileHash[] {
  const sourceFiles = listFilesRecursively(sourcePath);
  const fileHashes: FileHash[] = [];

  mkdirSync(installPath, { recursive: true });

  for (const sourceFile of sourceFiles) {
    const relativePath = relative(sourcePath, sourceFile);
    const targetFile = join(installPath, relativePath);
    const contents = readFileSync(sourceFile);

    if (existsSync(targetFile) && !readFileSync(targetFile).equals(contents)) {
      throw new CliError(`Refusing to overwrite local edit: ${targetFile}`);
    }

    mkdirSync(dirname(targetFile), { recursive: true });
    writeFileSync(targetFile, contents);
    fileHashes.push({
      path: relativePath,
      sha256: hashFile(targetFile)
    });
  }

  return fileHashes.sort((a, b) => a.path.localeCompare(b.path));
}

function assertJsonWriteSafe(path: string, contents: string): void {
  if (existsSync(path) && readFileSync(path, "utf8") !== contents) {
    throw new CliError(`Refusing to overwrite local edit: ${path}`);
  }
}

function writeJsonAtomic(path: string, contents: string): void {
  const tempPath = `${path}.${process.pid}.${randomUUID()}.tmp`;

  writeFileSync(tempPath, contents, { encoding: "utf8", mode: 0o644 });
  renameSync(tempPath, path);
}

function buildSkillSources(sources: Record<string, SourceDefinition>, cacheRoot: string): SkillSource[] {
  const aixSource = resolveSourceFromDefinitions("aix", sources, cacheRoot);
  const cursorPstackSource = resolveSourceFromDefinitions("cursor-pstack", sources, cacheRoot);
  const bundledSkills = discoverSkills(aixSource.rootPath).map((skill) => ({
    source: "aix",
    resolvedSource: aixSource,
    sourcePath: skill.path
  }));

  return [
    ...bundledSkills,
    {
      source: "cursor-pstack",
      resolvedSource: cursorPstackSource,
      sourcePath: "unslop"
    }
  ];
}

function createManifest(skillSources: SkillSource[], sources: Record<string, SourceDefinition>): SkillsManifest {
  return {
    sources,
    skills: skillSources.map((skill) => createSkillManifestEntry(skill.source, skill.sourcePath))
  };
}

function hashSourceFiles(sourcePath: string): FileHash[] {
  return listFilesRecursively(sourcePath)
    .map((sourceFile) => ({
      path: relative(sourcePath, sourceFile),
      sha256: hashFile(sourceFile)
    }))
    .sort((a, b) => a.path.localeCompare(b.path));
}

function createLockEntry(skill: SkillSource): LockfileSkillEntry {
  const sourcePath = join(skill.resolvedSource.rootPath, skill.sourcePath);
  const originalName = parseSkillName(sourcePath);
  const installedName = originalName;
  const installPath = join(INSTALLED_SKILLS_DIR, installedName);
  const definition = skill.resolvedSource.definition;

  return {
    source: skill.source,
    sourceType: "git",
    sourceUrl: definition.url,
    requestedRef: definition.ref,
    resolvedCommit: skill.resolvedSource.resolvedCommit,
    sourcePath: skill.sourcePath,
    installPath,
    originalName,
    installedName,
    files: hashSourceFiles(sourcePath)
  };
}

function createLockfile(skillSources: SkillSource[]): SkillsLockfile {
  return {
    lockfileVersion: LOCKFILE_VERSION,
    skills: skillSources.map(createLockEntry)
  };
}

function assertSkillCopiesSafe(skillSources: SkillSource[]): void {
  for (const skill of skillSources) {
    const sourcePath = join(skill.resolvedSource.rootPath, skill.sourcePath);
    const installedName = parseSkillName(sourcePath);
    const installPath = join(INSTALLED_SKILLS_DIR, installedName);

    for (const sourceFile of listFilesRecursively(sourcePath)) {
      const targetFile = join(installPath, relative(sourcePath, sourceFile));

      if (existsSync(targetFile) && !readFileSync(targetFile).equals(readFileSync(sourceFile))) {
        throw new CliError(`Refusing to overwrite local edit: ${targetFile}`);
      }
    }
  }
}

export function initProject(options: InitOptions = {}): InitResult {
  if (existsSync(AGENTS_DIR) && !statSync(AGENTS_DIR).isDirectory()) {
    throw new CliError(`${AGENTS_DIR} exists but is not a directory.`);
  }

  const sources = options.sources || getDefaultSources();
  const cacheRoot = options.cacheRoot || defaultCacheRoot();
  const skillSources = buildSkillSources(sources, cacheRoot);
  const manifest = createManifest(skillSources, sources);
  const lockfile = createLockfile(skillSources);
  const manifestJson = `${JSON.stringify(manifest, null, 2)}\n`;
  const lockfileJson = `${JSON.stringify(lockfile, null, 2)}\n`;

  assertJsonWriteSafe(MANIFEST_FILE_NAME, manifestJson);
  assertJsonWriteSafe(LOCKFILE_FILE_NAME, lockfileJson);
  assertSkillCopiesSafe(skillSources);

  mkdirSync(INSTALLED_SKILLS_DIR, { recursive: true });

  for (const skill of skillSources) {
    const sourcePath = join(skill.resolvedSource.rootPath, skill.sourcePath);

    copySkillSafely(sourcePath, join(INSTALLED_SKILLS_DIR, parseSkillName(sourcePath)));
  }

  writeJsonAtomic(MANIFEST_FILE_NAME, manifestJson);
  writeJsonAtomic(LOCKFILE_FILE_NAME, lockfileJson);

  return {
    declaredCount: manifest.skills.length,
    installedCount: lockfile.skills.length,
    manifestPath: MANIFEST_FILE_NAME,
    lockfilePath: LOCKFILE_FILE_NAME
  };
}

export function renderInitResult(result: InitResult): string {
  return [
    "Initialized AI Extensions.",
    `Declared ${result.declaredCount} skills.`,
    `Installed ${result.installedCount} local skills.`,
    `Wrote ${result.manifestPath}.`,
    `Wrote ${result.lockfilePath}.`
  ].join("\n");
}
