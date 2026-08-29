import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  assertManagedAppendBlockSafe,
  lockfileAppendBlock,
  lockfileAppendBlocks,
  writeAppendLifecycleBlocks,
  type AppendBlockDefinition,
  type LockfileWithAppendBlocks
} from "./agents-md.js";
import type { AppendBlockOwnerKind, LockfileAgentsMdBlock } from "./schema.js";

const APPEND_FILE_NAME = "AGENTS.append.md";
const APPEND_TARGET_PATH = "AGENTS.md";

export function extensionAppendDefinition(
  ownerKind: AppendBlockOwnerKind,
  ownerName: string,
  source: string,
  sourcePath: string,
  packagePath: string
): AppendBlockDefinition | undefined {
  const appendPath = join(packagePath, APPEND_FILE_NAME);

  if (!existsSync(appendPath)) {
    return undefined;
  }

  return {
    owner: {
      kind: ownerKind,
      name: ownerName
    },
    source,
    sourcePath,
    marker: `aix:${ownerKind} ${ownerName}`,
    targetPath: APPEND_TARGET_PATH,
    contents: readFileSync(appendPath, "utf8")
  };
}

export function preflightAppendDefinitions(
  previousLockfile: LockfileWithAppendBlocks,
  definitions: Array<AppendBlockDefinition | undefined>
): void {
  const previousBlocks = lockfileAppendBlocks(previousLockfile);

  for (const definition of definitions) {
    if (!definition) {
      continue;
    }

    const previousBlock = previousBlocks.find((block) => block.marker === definition.marker);

    assertManagedAppendBlockSafe(definition, previousBlock);
  }
}

export function lockfileBlockForDefinition(
  definition: AppendBlockDefinition | undefined
): LockfileAgentsMdBlock | undefined {
  return definition ? lockfileAppendBlock(definition) : undefined;
}

export function writeExtensionAppendBlocks(
  previousLockfile: LockfileWithAppendBlocks,
  nextLockfile: LockfileWithAppendBlocks,
  definitions: AppendBlockDefinition[]
): void {
  writeAppendLifecycleBlocks(
    lockfileAppendBlocks(previousLockfile),
    lockfileAppendBlocks(nextLockfile),
    definitions
  );
}
