import type { InitResult } from "./types.js";

export function renderInitResult(result: InitResult): string {
  return [
    "Initialized AI Extensions.",
    `Declared ${result.declaredCount} skills.`,
    `Materialized ${result.materializedCount} package skills.`,
    `Activated ${result.activatedCount} local skills.`,
    `Wrote ${result.manifestPath}.`,
    `Wrote ${result.lockfilePath}.`
  ].join("\n");
}
