import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { LOCKFILE_FILE_NAME, type SkillsLockfile } from "../schema.js";
import { LockfileError } from "./errors.js";
import { emptyLockfile, parseLockfile } from "./parse.js";

export async function loadLockfile(filePath = LOCKFILE_FILE_NAME): Promise<SkillsLockfile> {
  let raw: string;

  try {
    raw = await readFile(filePath, "utf8");
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
      return emptyLockfile();
    }

    throw error;
  }

  try {
    return parseLockfile(JSON.parse(raw));
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new LockfileError(`Malformed JSON in ${filePath}: ${error.message}`);
    }

    throw error;
  }
}

export async function writeLockfile(lockfile: SkillsLockfile, filePath = LOCKFILE_FILE_NAME): Promise<void> {
  const parsed = parseLockfile(lockfile);
  const directory = dirname(filePath);
  const tempPath = `${filePath}.${process.pid}.${randomUUID()}.tmp`;
  const contents = `${JSON.stringify(parsed, null, 2)}\n`;

  if (directory !== ".") {
    await mkdir(directory, { recursive: true });
  }

  await writeFile(tempPath, contents, { encoding: "utf8", mode: 0o644 });
  await rename(tempPath, filePath);
}
