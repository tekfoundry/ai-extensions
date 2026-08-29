import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { AixError } from "./errors.js";
import { hashBuffer } from "./fs/hashing.js";
import type { AppendBlockOwnerKind, LockfileAgentsMdBlock } from "./schema.js";

export interface AppendBlockOwner {
  kind: AppendBlockOwnerKind;
  name: string;
}

export interface AppendBlockDefinition {
  owner: AppendBlockOwner;
  source: string;
  sourcePath: string;
  marker: string;
  targetPath?: string;
  contents: string;
}

export interface LockfileWithAppendBlocks {
  skills?: Array<{ agentsMd?: LockfileAgentsMdBlock }>;
  roles?: Array<{ agentsMd?: LockfileAgentsMdBlock }>;
  workflows?: Array<{ agentsMd?: LockfileAgentsMdBlock }>;
}

export interface ManagedAppendBlock {
  marker: string;
  ownerKind: AppendBlockOwnerKind;
  startIndex: number;
  endIndex: number;
  block: string;
}

interface ManagedAppendBlockWithHash extends ManagedAppendBlock {
  sha256: string;
}

const OWNER_ORDER: Record<AppendBlockOwnerKind, number> = {
  workflow: 0,
  role: 1,
  skill: 2
};
const ANY_AIX_BLOCK_MARKER_PATTERN = /^<!-- aix:[^<>]+ (start|end) -->$/;

function managedBlockMarkers(marker: string): { start: string; end: string } {
  return {
    start: `<!-- ${marker} start -->`,
    end: `<!-- ${marker} end -->`
  };
}

export function renderManagedAppendBlock(marker: string, contents: string): string {
  const markers = managedBlockMarkers(marker);

  return `${markers.start}\n${contents.trimEnd()}\n${markers.end}`;
}

export function ownerKindFromMarker(marker: string): AppendBlockOwnerKind | undefined {
  if (marker.startsWith("aix:workflow ")) {
    return "workflow";
  }

  if (marker.startsWith("aix:role ")) {
    return "role";
  }

  if (marker.startsWith("aix:skill ")) {
    return "skill";
  }

  return undefined;
}

function lineStartIndexes(contents: string): number[] {
  const indexes = [0];

  for (let index = 0; index < contents.length; index += 1) {
    if (contents[index] === "\n" && index + 1 < contents.length) {
      indexes.push(index + 1);
    }
  }

  return indexes;
}

function markerLinePattern(marker: string): RegExp {
  return new RegExp(`^<!-- ${marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")} (start|end) -->$`);
}

function findManagedAppendBlocks(contents: string, marker: string): ManagedAppendBlock[] {
  const blocks: ManagedAppendBlock[] = [];
  const ownerKind = ownerKindFromMarker(marker);
  const pattern = markerLinePattern(marker);
  let open: { startIndex: number } | undefined;
  const lines = contents.split("\n");
  const indexes = lineStartIndexes(contents);

  if (!ownerKind) {
    throw new AixError(`Refusing to manage malformed AGENTS.md block marker: ${marker}`);
  }

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
    const match = pattern.exec(lines[lineIndex]);

    if (!match) {
      if (open && ANY_AIX_BLOCK_MARKER_PATTERN.test(lines[lineIndex])) {
        throw new AixError(`Refusing to manage nested AGENTS.md block: ${marker}`);
      }

      continue;
    }

    if (match[1] === "start") {
      if (open) {
        throw new AixError(`Refusing to manage nested AGENTS.md block: ${marker}`);
      }

      open = {
        startIndex: indexes[lineIndex] ?? 0
      };
      continue;
    }

    if (!open) {
      throw new AixError(`Refusing to manage orphan AGENTS.md block marker: ${marker}`);
    }

    const endIndex = (indexes[lineIndex] ?? 0) + lines[lineIndex].length;
    blocks.push({
      marker,
      ownerKind,
      startIndex: open.startIndex,
      endIndex,
      block: contents.slice(open.startIndex, endIndex)
    });
    open = undefined;
  }

  if (open) {
    throw new AixError(`Refusing to manage unterminated AGENTS.md block marker: ${marker}`);
  }

  return blocks;
}

export function findManagedAppendBlock(contents: string, marker: string): ManagedAppendBlock | undefined {
  return normalizedKnownBlocks(contents, [{ marker, installedSha256: undefined }])[0];
}

function blockSortKey(block: Pick<AppendBlockDefinition, "owner" | "source" | "sourcePath" | "marker">): string {
  return [
    String(OWNER_ORDER[block.owner.kind]).padStart(2, "0"),
    block.owner.name,
    block.source,
    block.sourcePath,
    block.marker
  ].join("\0");
}

function sortedDefinitions(definitions: AppendBlockDefinition[]): AppendBlockDefinition[] {
  return [...definitions].sort((left, right) => blockSortKey(left).localeCompare(blockSortKey(right)));
}

function normalizeDocumentWithBlocks(prefix: string, blocks: string[]): string {
  const parts = [
    prefix.trimEnd(),
    ...blocks.map((block) => block.trim())
  ].filter((part) => part.length > 0);

  return `${parts.join("\n\n")}${parts.length > 0 ? "\n" : ""}`;
}

function normalizedKnownBlocks(
  contents: string,
  knownBlocks: Array<Pick<LockfileAgentsMdBlock, "marker"> & Partial<Pick<LockfileAgentsMdBlock, "installedSha256">>>
): ManagedAppendBlockWithHash[] {
  const normalized: ManagedAppendBlockWithHash[] = [];

  for (const knownBlock of knownBlocks) {
    const matches = findManagedAppendBlocks(contents, knownBlock.marker);

    if (matches.length === 0) {
      continue;
    }

    const firstBlock = matches[0].block;
    if (matches.some((match) => match.block !== firstBlock)) {
      throw new AixError(`Refusing to manage duplicate AGENTS.md block marker with different content: ${knownBlock.marker}`);
    }

    const sha256 = hashBuffer(firstBlock);
    if (knownBlock.installedSha256 && sha256 !== knownBlock.installedSha256) {
      throw new AixError(`Refusing to manage modified ${matches[0].ownerKind} block in AGENTS.md.`);
    }

    normalized.push(...matches.map((match) => ({ ...match, sha256 })));
  }

  return normalized.sort((left, right) => left.startIndex - right.startIndex);
}

export function lockfileAppendBlocks(lockfile: LockfileWithAppendBlocks): LockfileAgentsMdBlock[] {
  return [
    ...(lockfile.workflows || []).map((entry) => entry.agentsMd),
    ...(lockfile.roles || []).map((entry) => entry.agentsMd),
    ...(lockfile.skills || []).map((entry) => entry.agentsMd)
  ].filter((block): block is LockfileAgentsMdBlock => block !== undefined);
}

function removeKnownBlockRanges(contents: string, blocks: ManagedAppendBlock[]): string {
  return [...blocks]
    .sort((left, right) => right.startIndex - left.startIndex)
    .reduce((updated, block) => removeManagedAppendBlockByRange(updated, block), contents);
}

export function composeManagedAppendBlocks(contents: string, definitions: AppendBlockDefinition[]): string {
  const parsed = normalizedKnownBlocks(contents, definitions.map((definition) => ({ marker: definition.marker })));
  const userOwnedContents = removeKnownBlockRanges(contents, parsed);
  const renderedBlocks = sortedDefinitions(definitions).map((definition) =>
    renderManagedAppendBlock(definition.marker, definition.contents)
  );

  return normalizeDocumentWithBlocks(userOwnedContents, renderedBlocks);
}

function removeManagedAppendBlockByRange(contents: string, block: Pick<ManagedAppendBlock, "startIndex" | "endIndex">): string {
  let startIndex = block.startIndex;
  let endIndex = block.endIndex;

  if (startIndex >= 2 && contents.slice(startIndex - 2, startIndex) === "\n\n") {
    startIndex -= 1;
  }

  if (endIndex < contents.length && contents[endIndex] === "\n") {
    endIndex += 1;
  }

  return `${contents.slice(0, startIndex)}${contents.slice(endIndex)}`;
}

export function removeManagedAppendBlock(contents: string, marker: string): string {
  const found = findManagedAppendBlock(contents, marker);

  return found ? removeManagedAppendBlockByRange(contents, found) : contents;
}

export function composeLockfileManagedAppendBlocks(
  contents: string,
  lockfileBlocks: LockfileAgentsMdBlock[],
  definitions: AppendBlockDefinition[]
): string {
  const definitionMarkers = new Set(definitions.map((definition) => definition.marker));
  const retainedBlocks = lockfileBlocks.filter((block) => !definitionMarkers.has(block.marker));
  const knownBlocks = [...retainedBlocks, ...definitions.map(lockfileAppendBlock)];
  const parsed = normalizedKnownBlocks(contents, knownBlocks);
  const userOwnedContents = removeKnownBlockRanges(contents, parsed);
  const existingBlocksByMarker = new Map(parsed.map((block) => [block.marker, block.block]));
  const renderedBlocks = [
    ...retainedBlocks.map((block) => ({
      owner: block.owner,
      source: block.source,
      sourcePath: block.sourcePath,
      marker: block.marker,
      block: existingBlocksByMarker.get(block.marker)
    })),
    ...definitions.map((definition) => ({
      owner: definition.owner,
      source: definition.source,
      sourcePath: definition.sourcePath,
      marker: definition.marker,
      block: renderManagedAppendBlock(definition.marker, definition.contents)
    }))
  ].filter((block): block is { owner: AppendBlockOwner; source: string; sourcePath: string; marker: string; block: string } =>
    block.block !== undefined
  );

  return normalizeDocumentWithBlocks(
    userOwnedContents,
    renderedBlocks
      .sort((left, right) => blockSortKey(left).localeCompare(blockSortKey(right)))
      .map((block) => block.block)
  );
}

function uniqueLockfileBlocks(blocks: LockfileAgentsMdBlock[]): LockfileAgentsMdBlock[] {
  const byMarker = new Map<string, LockfileAgentsMdBlock>();

  for (const block of blocks) {
    if (!byMarker.has(block.marker)) {
      byMarker.set(block.marker, block);
    }
  }

  return [...byMarker.values()];
}

export function composeAppendLifecycleBlocks(
  contents: string,
  previousBlocks: LockfileAgentsMdBlock[],
  nextBlocks: LockfileAgentsMdBlock[],
  definitions: AppendBlockDefinition[]
): string {
  const definitionMarkers = new Set(definitions.map((definition) => definition.marker));
  const definitionBlocks = definitions.map(lockfileAppendBlock);
  const outputBlocks = [
    ...nextBlocks.filter((block) => !definitionMarkers.has(block.marker)),
    ...definitionBlocks
  ];
  const knownBlocks = uniqueLockfileBlocks([...previousBlocks, ...nextBlocks, ...definitionBlocks]);
  const parsed = normalizedKnownBlocks(contents, knownBlocks);
  const userOwnedContents = removeKnownBlockRanges(contents, parsed);
  const existingBlocksByMarker = new Map(parsed.map((block) => [block.marker, block.block]));
  const renderedBlocks = outputBlocks
    .map((block) => ({
      owner: block.owner,
      source: block.source,
      sourcePath: block.sourcePath,
      marker: block.marker,
      block: definitionMarkers.has(block.marker)
        ? renderManagedAppendBlock(block.marker, definitions.find((definition) => definition.marker === block.marker)?.contents || "")
        : existingBlocksByMarker.get(block.marker)
    }))
    .filter((block): block is { owner: AppendBlockOwner; source: string; sourcePath: string; marker: string; block: string } =>
      block.block !== undefined
    );

  return normalizeDocumentWithBlocks(
    userOwnedContents,
    renderedBlocks
      .sort((left, right) => blockSortKey(left).localeCompare(blockSortKey(right)))
      .map((block) => block.block)
  );
}

export function writeAppendLifecycleBlocks(
  previousBlocks: LockfileAgentsMdBlock[],
  nextBlocks: LockfileAgentsMdBlock[],
  definitions: AppendBlockDefinition[]
): void {
  if (previousBlocks.length === 0 && nextBlocks.length === 0 && definitions.length === 0) {
    return;
  }

  const targetPath = definitions[0]?.targetPath || nextBlocks[0]?.path || previousBlocks[0]?.path || "AGENTS.md";
  const existing = existsSync(targetPath) ? readFileSync(targetPath, "utf8") : "";
  const updated = composeAppendLifecycleBlocks(existing, previousBlocks, nextBlocks, definitions);

  writeFileSync(targetPath, updated, "utf8");
}

export function lockfileAppendBlock(definition: AppendBlockDefinition): LockfileAgentsMdBlock {
  const targetPath = definition.targetPath || "AGENTS.md";
  const sourceHash = hashBuffer(definition.contents);
  const renderedBlock = renderManagedAppendBlock(definition.marker, definition.contents);
  const renderedHash = hashBuffer(renderedBlock);
  const ownerKind = ownerKindFromMarker(definition.marker);

  if (ownerKind !== definition.owner.kind) {
    throw new AixError(`Append block marker ${definition.marker} must match ${definition.owner.kind} ownership.`);
  }

  return {
    owner: definition.owner,
    source: definition.source,
    sourcePath: definition.sourcePath,
    marker: definition.marker,
    path: targetPath,
    sourceSha256: sourceHash,
    renderedSha256: renderedHash,
    installedSha256: renderedHash
  };
}

export function assertManagedAppendBlockSafe(
  definition: AppendBlockDefinition | undefined,
  previousBlock?: LockfileAgentsMdBlock
): void {
  if (!definition) {
    return;
  }

  const targetPath = definition.targetPath || "AGENTS.md";
  const existing = existsSync(targetPath) ? readFileSync(targetPath, "utf8") : "";
  const found = findManagedAppendBlock(existing, definition.marker);

  if (found && previousBlock && hashBuffer(found.block) !== previousBlock.installedSha256) {
    throw new AixError(`Refusing to update modified ${definition.owner.kind} block in ${targetPath}.`);
  }

  if (found && !previousBlock) {
    throw new AixError(`Refusing to overwrite unmanaged ${definition.owner.kind} block in ${targetPath}.`);
  }
}

export function installManagedAppendBlock(definition: AppendBlockDefinition | undefined): LockfileAgentsMdBlock | undefined {
  if (!definition) {
    return undefined;
  }

  const targetPath = definition.targetPath || "AGENTS.md";
  const existing = existsSync(targetPath) ? readFileSync(targetPath, "utf8") : "";
  const updated = composeManagedAppendBlocks(existing, [definition]);

  writeFileSync(targetPath, updated, "utf8");

  return lockfileAppendBlock(definition);
}

export function assertInstalledAppendBlockUnmodified(block: LockfileAgentsMdBlock | undefined): void {
  if (!block || !existsSync(block.path)) {
    return;
  }

  const found = findManagedAppendBlock(readFileSync(block.path, "utf8"), block.marker);

  if (found && hashBuffer(found.block) !== block.installedSha256) {
    throw new AixError(`Refusing to remove modified ${block.owner.kind} block in ${block.path}.`);
  }
}

export function removeInstalledAppendBlock(block: LockfileAgentsMdBlock | undefined): boolean {
  if (!block || !existsSync(block.path)) {
    return false;
  }

  const contents = readFileSync(block.path, "utf8");
  const found = findManagedAppendBlock(contents, block.marker);

  if (!found) {
    return false;
  }

  writeFileSync(block.path, removeManagedAppendBlock(contents, block.marker), "utf8");

  return true;
}

export function addManagedAppendVerifyIssues(issues: string[], block: LockfileAgentsMdBlock | undefined): void {
  if (!block) {
    return;
  }

  if (!existsSync(block.path)) {
    issues.push(`${block.owner.kind} AGENTS.md target is missing: ${block.path}`);
    return;
  }

  let found: ManagedAppendBlock | undefined;

  try {
    found = findManagedAppendBlock(readFileSync(block.path, "utf8"), block.marker);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    issues.push(message);
    return;
  }

  if (!found) {
    issues.push(`${block.owner.kind} block is missing from ${block.path}.`);
  } else if (hashBuffer(found.block) !== block.installedSha256) {
    issues.push(`${block.owner.kind} block hash changed in ${block.path}.`);
  }
}
