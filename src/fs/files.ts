import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { AixError } from "../errors.js";
import type { FileHash } from "../schema.js";
import { hashFile } from "./hashing.js";

export function listFilesRecursively(root: string): string[] {
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

export function copyFilesSafely(sourcePath: string, targetPath: string): FileHash[] {
  const sourceFiles = listFilesRecursively(sourcePath);
  const fileHashes: FileHash[] = [];

  mkdirSync(targetPath, { recursive: true });

  for (const sourceFile of sourceFiles) {
    const relativePath = relative(sourcePath, sourceFile);
    const targetFile = join(targetPath, relativePath);
    const contents = readFileSync(sourceFile);

    if (existsSync(targetFile) && !readFileSync(targetFile).equals(contents)) {
      throw new AixError(`Refusing to overwrite local edit: ${targetFile}`);
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
