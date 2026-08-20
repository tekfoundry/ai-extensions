import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { AixError } from "../errors.js";
import { hashBuffer, hashFile } from "../fs/hashing.js";
import { AGENTS_DIR } from "../paths/agents.js";
import type { LockfileWorkflowEntry } from "../schema.js";
import type { WorkflowManifestFile } from "./types.js";

export function assertWorkflowDocsSafe(workflow: WorkflowManifestFile, packagePath: string, previous?: LockfileWorkflowEntry): void {
  for (const doc of workflow.docs) {
    const sourcePath = join(packagePath, doc);
    const targetPath = join(AGENTS_DIR, doc);

    if (!existsSync(sourcePath)) {
      throw new AixError(`Workflow doc is missing from package: ${sourcePath}`);
    }

    if (!existsSync(targetPath)) {
      continue;
    }

    const existing = readFileSync(targetPath);
    const expectedHash = previous?.docs.find((lockedDoc) => lockedDoc.targetPath === targetPath)?.sha256;

    if (expectedHash && hashBuffer(existing) !== expectedHash) {
      throw new AixError(`Refusing to overwrite modified workflow doc: ${targetPath}`);
    }

    if (!expectedHash && !existing.equals(readFileSync(sourcePath))) {
      throw new AixError(`Refusing to overwrite local edit: ${targetPath}`);
    }
  }
}

export function installWorkflowDocs(workflow: WorkflowManifestFile, packagePath: string): LockfileWorkflowEntry["docs"] {
  mkdirSync(AGENTS_DIR, { recursive: true });

  return workflow.docs.map((doc) => {
    const sourcePath = join(packagePath, doc);
    const targetPath = join(AGENTS_DIR, doc);
    const contents = readFileSync(sourcePath);

    mkdirSync(dirname(targetPath), { recursive: true });
    writeFileSync(targetPath, contents);

    return {
      sourcePath: doc,
      targetPath,
      sha256: hashFile(targetPath)
    };
  });
}

export function scaffoldProjectDocs(): void {
  for (const path of ["_docs/design", "_docs/plans", "_docs/plans/backlog", "_docs/plans/completed"]) {
    mkdirSync(path, { recursive: true });
  }
}

export function assertWorkflowDocsUnmodified(workflow: LockfileWorkflowEntry): void {
  for (const doc of workflow.docs) {
    if (existsSync(doc.targetPath) && hashFile(doc.targetPath) !== doc.sha256) {
      throw new AixError(`Refusing to remove modified workflow doc: ${doc.targetPath}`);
    }
  }
}

export function removeWorkflowDocs(workflow: LockfileWorkflowEntry): void {
  for (const doc of workflow.docs) {
    rmSync(doc.targetPath, { force: true });
  }
}

export function addWorkflowDocVerifyIssues(issues: string[], workflow: LockfileWorkflowEntry): void {
  for (const doc of workflow.docs) {
    if (!existsSync(doc.targetPath)) {
      issues.push(`Workflow doc is missing: ${doc.targetPath}`);
    } else if (hashFile(doc.targetPath) !== doc.sha256) {
      issues.push(`Workflow doc hash changed: ${doc.targetPath}`);
    }
  }
}
