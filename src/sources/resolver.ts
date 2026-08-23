import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { AixError } from "../errors.js";
import { parseManifest } from "../manifest.js";
import { MANIFEST_FILE_NAME, type SourceDefinition } from "../schema.js";
import { getDefaultSources, getDefaultWorkflowSources } from "./defaults.js";
import { safeCacheName } from "./metadata.js";
import type { NamedSourceDefinition, ResolvedSource } from "./types.js";

function runGit(args: string[], cwd?: string): string {
  try {
    return execFileSync("git", args, {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    }).trim();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    throw new AixError(`Git command failed: git ${args.join(" ")}\n${message}`);
  }
}

export function defaultCacheRoot(): string {
  return process.env.AIX_CACHE_DIR || join(tmpdir(), "aix-cache");
}

export function loadSourceDefinitions(): Record<string, SourceDefinition> {
  if (!existsSync(MANIFEST_FILE_NAME)) {
    return getDefaultSources();
  }

  const manifest = parseManifest(JSON.parse(readFileSync(MANIFEST_FILE_NAME, "utf8")));
  const manifestSources = (manifest.sources || {}) as Record<string, SourceDefinition>;

  return {
    ...getDefaultSources(),
    ...manifestSources
  };
}

export function loadWorkflowSourceDefinitions(): Record<string, SourceDefinition> {
  if (!existsSync(MANIFEST_FILE_NAME)) {
    return getDefaultWorkflowSources();
  }

  const manifest = parseManifest(JSON.parse(readFileSync(MANIFEST_FILE_NAME, "utf8")));
  const manifestSources = (manifest.workflowSources || {}) as Record<string, SourceDefinition>;

  return {
    ...getDefaultWorkflowSources(),
    ...manifestSources
  };
}

export function listSourceDefinitions(): NamedSourceDefinition[] {
  return Object.entries(loadSourceDefinitions())
    .map(([name, definition]) => ({ name, definition }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

function cloneOrFetchGitSource(name: string, definition: SourceDefinition, cacheRoot: string): ResolvedSource {
  const sourceCachePath = join(cacheRoot, safeCacheName(name));

  mkdirSync(cacheRoot, { recursive: true });

  if (!existsSync(join(sourceCachePath, ".git"))) {
    runGit(["clone", "--no-checkout", definition.url, sourceCachePath]);
  } else {
    let currentUrl: string;

    try {
      currentUrl = runGit(["remote", "get-url", "origin"], sourceCachePath);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      if (!message.includes("No such remote")) {
        throw error;
      }

      rmSync(sourceCachePath, { recursive: true, force: true });
      runGit(["clone", "--no-checkout", definition.url, sourceCachePath]);
      currentUrl = definition.url;
    }

    if (currentUrl !== definition.url) {
      runGit(["remote", "set-url", "origin", definition.url], sourceCachePath);
    }

    runGit(["fetch", "--prune", "origin"], sourceCachePath);
  }

  const requestedRef = definition.ref || "HEAD";
  let resolvedCommit: string | undefined;
  const refCandidates = requestedRef === "HEAD"
    ? ["origin/HEAD^{commit}", "HEAD^{commit}"]
    : [`origin/${requestedRef}^{commit}`, `${requestedRef}^{commit}`];

  for (const refCandidate of refCandidates) {
    try {
      resolvedCommit = runGit(["rev-parse", refCandidate], sourceCachePath);
      break;
    } catch {
      // Try the next supported ref spelling before reporting a source error.
    }
  }

  if (!resolvedCommit) {
    throw new AixError(`Unable to resolve ref "${requestedRef}" for source "${name}" from ${definition.url}.`);
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
    throw new AixError(`Unknown source: ${name}`);
  }

  return cloneOrFetchGitSource(name, definition, cacheRoot);
}

export function createTempCacheRoot(): string {
  return mkdtempSync(join(tmpdir(), "aix-cache-"));
}

export function removeCacheRoot(path: string): void {
  rmSync(path, { recursive: true, force: true });
}
