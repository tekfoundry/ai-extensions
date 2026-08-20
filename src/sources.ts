import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { CliError } from "./errors.js";
import { getDefaultSources } from "./defaults.js";
import { parseManifest } from "./manifest.js";
import { MANIFEST_FILE_NAME, type SourceDefinition } from "./schema.js";

export interface ResolvedSource {
  name: string;
  definition: SourceDefinition;
  rootPath: string;
  resolvedCommit?: string;
}

function runGit(args: string[], cwd?: string): string {
  try {
    return execFileSync("git", args, {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    }).trim();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    throw new CliError(`Git command failed: git ${args.join(" ")}\n${message}`);
  }
}

function safeCacheName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

export function defaultCacheRoot(): string {
  return process.env.AIX_CACHE_DIR || join(tmpdir(), "aix-cache");
}

export function loadSourceDefinitions(): Record<string, SourceDefinition> {
  if (!existsSync(MANIFEST_FILE_NAME)) {
    return getDefaultSources();
  }

  const manifest = parseManifest(JSON.parse(readFileSync(MANIFEST_FILE_NAME, "utf8")));

  return {
    ...getDefaultSources(),
    ...(manifest.sources || {})
  };
}

function cloneOrFetchGitSource(name: string, definition: SourceDefinition, cacheRoot: string): ResolvedSource {
  const sourceCachePath = join(cacheRoot, safeCacheName(name));

  mkdirSync(cacheRoot, { recursive: true });

  if (!existsSync(join(sourceCachePath, ".git"))) {
    runGit(["clone", "--no-checkout", definition.url, sourceCachePath]);
  } else {
    runGit(["fetch", "--prune", "origin"], sourceCachePath);
  }

  const requestedRef = definition.ref || "HEAD";
  let resolvedCommit: string;

  try {
    resolvedCommit = runGit(["rev-parse", `${requestedRef}^{commit}`], sourceCachePath);
  } catch {
    resolvedCommit = runGit(["rev-parse", `origin/${requestedRef}^{commit}`], sourceCachePath);
  }

  runGit(["checkout", "--detach", resolvedCommit], sourceCachePath);

  return {
    name,
    definition,
    rootPath: join(sourceCachePath, definition.path || "."),
    resolvedCommit
  };
}

export function resolveSource(name: string, cacheRoot = defaultCacheRoot()): ResolvedSource {
  return resolveSourceFromDefinitions(name, loadSourceDefinitions(), cacheRoot);
}

export function resolveSourceFromDefinitions(
  name: string,
  sources: Record<string, SourceDefinition>,
  cacheRoot = defaultCacheRoot()
): ResolvedSource {
  const definition = sources[name];

  if (!definition) {
    throw new CliError(`Unknown source: ${name}`);
  }

  return cloneOrFetchGitSource(name, definition, cacheRoot);
}

export function createTempCacheRoot(): string {
  return mkdtempSync(join(tmpdir(), "aix-cache-"));
}

export function removeCacheRoot(path: string): void {
  rmSync(path, { recursive: true, force: true });
}
