import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  addManagedAppendVerifyIssues,
  assertInstalledAppendBlockUnmodified,
  assertManagedAppendBlockSafe,
  findManagedAppendBlock,
  installManagedAppendBlock,
  removeInstalledAppendBlock,
  renderManagedAppendBlock
} from "../agents-md.js";
import { hashBuffer } from "../fs/hashing.js";
import type { AppendBlockDefinition } from "../agents-md.js";
import type { LockfileAgentsMdBlock } from "../schema.js";
import type { WorkflowManifestFile } from "./types.js";

export function workflowAppendDefinition(
  entry: NonNullable<WorkflowManifestFile["agentsMd"]>,
  packagePath: string,
  workflowName: string
): AppendBlockDefinition {
  return {
    owner: {
      kind: "workflow" as const,
      name: workflowName
    },
    source: "workflow",
    sourcePath: entry.source,
    marker: entry.marker,
    targetPath: "AGENTS.md",
    contents: readFileSync(join(packagePath, entry.source), "utf8")
  };
}

export function findManagedBlock(contents: string, marker: string): { startIndex: number; endIndex: number; block: string } | undefined {
  return findManagedAppendBlock(contents, marker);
}

export function assertAgentsMdBlockSafe(
  entry: WorkflowManifestFile["agentsMd"],
  packagePath: string,
  previousBlock?: LockfileAgentsMdBlock,
  workflowName = ""
): void {
  if (!entry) {
    return;
  }

  assertManagedAppendBlockSafe(workflowAppendDefinition(entry, packagePath, workflowName), previousBlock);
}

export function installAgentsMdBlock(
  entry: WorkflowManifestFile["agentsMd"],
  packagePath: string,
  workflowName = ""
): LockfileAgentsMdBlock | undefined {
  if (!entry) {
    return undefined;
  }

  return installManagedAppendBlock(workflowAppendDefinition(entry, packagePath, workflowName));
}

export function assertAgentsMdBlockUnmodified(block: LockfileAgentsMdBlock | undefined): void {
  assertInstalledAppendBlockUnmodified(block);
}

export function removeAgentsMdBlock(block: LockfileAgentsMdBlock | undefined): boolean {
  return removeInstalledAppendBlock(block);
}

export function addAgentsMdVerifyIssues(issues: string[], block: LockfileAgentsMdBlock | undefined): void {
  const issueCount = issues.length;

  addManagedAppendVerifyIssues(issues, block);

  for (let index = issueCount; index < issues.length; index += 1) {
    issues[index] = issues[index]
      .replace(/^workflow AGENTS\.md target is missing:/, "Workflow AGENTS.md target is missing:")
      .replace(/^workflow block is missing/, "Workflow block is missing")
      .replace(/^workflow block hash changed/, "Workflow block hash changed");
  }
}

export function legacyWorkflowBlockHash(entry: NonNullable<WorkflowManifestFile["agentsMd"]>, packagePath: string): string {
  return hashBuffer(renderManagedAppendBlock(entry.marker, readFileSync(join(packagePath, entry.source), "utf8")));
}
