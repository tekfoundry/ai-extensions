import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { AixError } from "../errors.js";
import { hashBuffer } from "../fs/hashing.js";
import type { LockfileAgentsMdBlock } from "../schema.js";
import type { WorkflowManifestFile } from "./types.js";

function managedBlockMarkers(marker: string): { start: string; end: string } {
  return {
    start: `<!-- ${marker} start -->`,
    end: `<!-- ${marker} end -->`
  };
}

function managedBlock(marker: string, contents: string): string {
  const markers = managedBlockMarkers(marker);

  return `${markers.start}\n${contents.trimEnd()}\n${markers.end}`;
}

export function findManagedBlock(contents: string, marker: string): { startIndex: number; endIndex: number; block: string } | undefined {
  const markers = managedBlockMarkers(marker);
  const startIndex = contents.indexOf(markers.start);
  const endMarkerIndex = contents.indexOf(markers.end);

  if (startIndex < 0 || endMarkerIndex < 0 || endMarkerIndex < startIndex) {
    return undefined;
  }

  const endIndex = endMarkerIndex + markers.end.length;

  return {
    startIndex,
    endIndex,
    block: contents.slice(startIndex, endIndex)
  };
}

function nextManagedBlock(entry: NonNullable<WorkflowManifestFile["agentsMd"]>, packagePath: string): string {
  return managedBlock(entry.marker, readFileSync(join(packagePath, entry.source), "utf8"));
}

export function assertAgentsMdBlockSafe(
  entry: WorkflowManifestFile["agentsMd"],
  packagePath: string,
  previousHash?: string
): void {
  if (!entry) {
    return;
  }

  const nextBlock = nextManagedBlock(entry, packagePath);
  const existing = existsSync("AGENTS.md") ? readFileSync("AGENTS.md", "utf8") : "";
  const found = findManagedBlock(existing, entry.marker);

  if (found && previousHash && hashBuffer(found.block) !== previousHash) {
    throw new AixError("Refusing to update modified workflow block in AGENTS.md.");
  }

  if (found && !previousHash && found.block !== nextBlock) {
    throw new AixError("Refusing to overwrite unmanaged workflow block in AGENTS.md.");
  }
}

export function installAgentsMdBlock(
  entry: WorkflowManifestFile["agentsMd"],
  packagePath: string
): LockfileAgentsMdBlock | undefined {
  if (!entry) {
    return undefined;
  }

  const nextBlock = nextManagedBlock(entry, packagePath);
  const existing = existsSync("AGENTS.md") ? readFileSync("AGENTS.md", "utf8") : "";
  const found = findManagedBlock(existing, entry.marker);
  const updated = found
    ? `${existing.slice(0, found.startIndex)}${nextBlock}${existing.slice(found.endIndex)}`
    : `${existing.trimEnd()}${existing.trim() ? "\n\n" : ""}${nextBlock}\n`;

  writeFileSync("AGENTS.md", updated, "utf8");

  return {
    path: "AGENTS.md",
    marker: entry.marker,
    sha256: hashBuffer(nextBlock)
  };
}

export function assertAgentsMdBlockUnmodified(block: LockfileAgentsMdBlock | undefined): void {
  if (!block || !existsSync(block.path)) {
    return;
  }

  const found = findManagedBlock(readFileSync(block.path, "utf8"), block.marker);

  if (found && hashBuffer(found.block) !== block.sha256) {
    throw new AixError("Refusing to remove modified workflow block in AGENTS.md.");
  }
}

export function removeAgentsMdBlock(block: LockfileAgentsMdBlock | undefined): boolean {
  if (!block || !existsSync(block.path)) {
    return false;
  }

  const contents = readFileSync(block.path, "utf8");
  const found = findManagedBlock(contents, block.marker);

  if (!found) {
    return false;
  }

  writeFileSync(block.path, `${contents.slice(0, found.startIndex).trimEnd()}\n${contents.slice(found.endIndex).trimStart()}`, "utf8");

  return true;
}

export function addAgentsMdVerifyIssues(issues: string[], block: LockfileAgentsMdBlock | undefined): void {
  if (!block) {
    return;
  }

  if (!existsSync(block.path)) {
    issues.push(`Workflow AGENTS.md target is missing: ${block.path}`);
    return;
  }

  const found = findManagedBlock(readFileSync(block.path, "utf8"), block.marker);
  if (!found) {
    issues.push(`Workflow block is missing from ${block.path}.`);
  } else if (hashBuffer(found.block) !== block.sha256) {
    issues.push(`Workflow block hash changed in ${block.path}.`);
  }
}
