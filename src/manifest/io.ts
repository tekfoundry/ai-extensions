import { readFile } from "node:fs/promises";
import { MANIFEST_FILE_NAME, type SkillsManifest } from "../schema.js";
import { ManifestError } from "./errors.js";
import { parseManifest } from "./parse.js";

export async function loadManifest(filePath = MANIFEST_FILE_NAME): Promise<SkillsManifest> {
  let raw: string;

  try {
    raw = await readFile(filePath, "utf8");
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
      throw new ManifestError(`Missing ${filePath}.`);
    }

    throw error;
  }

  try {
    return parseManifest(JSON.parse(raw));
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new ManifestError(`Malformed JSON in ${filePath}: ${error.message}`);
    }

    throw error;
  }
}
