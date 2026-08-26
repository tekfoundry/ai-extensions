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
  const kbAreas = [
    "01-product",
    "02-requirements",
    "03-architecture",
    "04-security",
    "05-quality",
    "06-operations",
    "07-decisions"
  ];

  for (const path of ["_docs/kb", ...kbAreas.map((area) => `_docs/kb/${area}`), "_docs/plans", "_docs/plans/backlog", "_docs/plans/completed"]) {
    mkdirSync(path, { recursive: true });
  }

  writeIfMissing("_docs/README.md", `# Project documentation

This directory contains project-owned documentation.

## Start here

- [Knowledge base](kb/README.md): current implemented project knowledge.
- [Active plans](plans/): authorized implementation plans and execution records.
- [Backlog plans](plans/backlog/): planned work that has not been activated.
- [Completed plans](plans/completed/): archived implementation records.

If a preserved [design baseline](design/README.md) exists, use it only as a
migration review source. Do not edit, move, delete, or rewrite existing
\`_docs/design\` files during migration.
`);

  writeIfMissing("_docs/kb/README.md", `# Knowledge base

This directory holds current implemented project knowledge.

## Directory map

- [01-product](01-product/README.md)
- [02-requirements](02-requirements/README.md)
- [03-architecture](03-architecture/README.md)
- [04-security](04-security/README.md)
- [05-quality](05-quality/README.md)
- [06-operations](06-operations/README.md)
- [07-decisions](07-decisions/README.md)
- [Glossary](glossary.md)

Plans can guide inspection, but implementation evidence owns current-state
truth.
`);

  const areaReadmes: Record<string, string> = {
    "01-product": "Product behavior, user workflows, UX principles, and acceptance signals.",
    "02-requirements": "Requirements, actors, use cases, constraints, non-goals, and acceptance criteria.",
    "03-architecture": "Architecture, subsystem boundaries, runtime contracts, data flow, and module maps.",
    "04-security": "Threat models, trust boundaries, secrets posture, destructive operations, and auditability.",
    "05-quality": "Testing strategy, verification matrices, regression risk, manual validation, and known gaps.",
    "06-operations": "Build, release, runtime, rollback, smoke checks, and incident validation.",
    "07-decisions": "Accepted decisions, tradeoffs, decision records, and cross-links."
  };

  for (const [area, description] of Object.entries(areaReadmes)) {
    writeIfMissing(`_docs/kb/${area}/README.md`, `# ${area} knowledge

${description}
`);
  }

  writeIfMissing("_docs/kb/glossary.md", `# Glossary

Define shared project terms here.
`);
}

function writeIfMissing(path: string, contents: string): void {
  if (!existsSync(path)) {
    writeFileSync(path, contents);
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
