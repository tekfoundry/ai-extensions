import type { InitResult } from "./types.js";

export function renderInitResult(result: InitResult): string {
  return [
    "Initialized AI Extensions.",
    `Declared ${result.declaredCount} workflow.`,
    `Materialized ${result.materializedCount} workflow assets.`,
    `Activated ${result.activatedCount} workflow-owned skills.`,
    `Activated ${result.standaloneActivatedCount} standalone skill${result.standaloneActivatedCount === 1 ? "" : "s"}.`,
    `Wrote ${result.manifestPath}.`,
    `Wrote ${result.lockfilePath}.`
  ].join("\n");
}
