import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { AixError } from "../errors.js";
import { isRecord } from "../validation/types.js";
import type { WorkflowManifestFile } from "./types.js";

export function readWorkflowManifest(root: string): WorkflowManifestFile {
  const manifestPath = join(root, "workflow.json");

  if (!existsSync(manifestPath)) {
    throw new AixError(`Missing workflow manifest: ${manifestPath}`);
  }

  const raw = JSON.parse(readFileSync(manifestPath, "utf8")) as unknown;

  if (!isRecord(raw)) {
    throw new AixError(`${manifestPath} must contain a JSON object.`);
  }

  if (typeof raw.name !== "string" || raw.name.trim() === "") {
    throw new AixError(`${manifestPath} name must be a non-empty string.`);
  }

  if (!/^[a-zA-Z0-9._-]+$/.test(raw.name)) {
    throw new AixError(`${manifestPath} name contains unsafe characters: ${raw.name}`);
  }

  if (!Array.isArray(raw.docs) || raw.docs.some((doc) => typeof doc !== "string" || doc.trim() === "")) {
    throw new AixError(`${manifestPath} docs must be an array of non-empty strings.`);
  }

  if (typeof raw.skillsDir !== "string" || raw.skillsDir.trim() === "") {
    throw new AixError(`${manifestPath} skillsDir must be a non-empty string.`);
  }

  if (raw.templatesDir !== undefined && (typeof raw.templatesDir !== "string" || raw.templatesDir.trim() === "")) {
    throw new AixError(`${manifestPath} templatesDir must be a non-empty string when provided.`);
  }

  let agentsMd: WorkflowManifestFile["agentsMd"];
  if (raw.agentsMd !== undefined) {
    if (!isRecord(raw.agentsMd)) {
      throw new AixError(`${manifestPath} agentsMd must be an object.`);
    }

    if (raw.agentsMd.mode !== "managed-block") {
      throw new AixError(`${manifestPath} agentsMd.mode must be "managed-block".`);
    }

    if (typeof raw.agentsMd.source !== "string" || raw.agentsMd.source.trim() === "") {
      throw new AixError(`${manifestPath} agentsMd.source must be a non-empty string.`);
    }

    if (typeof raw.agentsMd.marker !== "string" || raw.agentsMd.marker.trim() === "") {
      throw new AixError(`${manifestPath} agentsMd.marker must be a non-empty string.`);
    }

    agentsMd = {
      mode: "managed-block",
      source: raw.agentsMd.source,
      marker: raw.agentsMd.marker
    };
  }

  return {
    name: raw.name,
    ...(typeof raw.title === "string" && raw.title.trim() !== "" ? { title: raw.title } : {}),
    ...(agentsMd ? { agentsMd } : {}),
    docs: raw.docs,
    ...(typeof raw.templatesDir === "string" ? { templatesDir: raw.templatesDir } : {}),
    skillsDir: raw.skillsDir
  };
}
