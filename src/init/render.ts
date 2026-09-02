import type { InitResult } from "./types.js";

export function renderInitResult(result: InitResult): string {
  return [
    "Initialized AI Extensions.",
    "Initialized package-management features only.",
    `Activated ${result.standaloneActivatedCount} standalone skill${result.standaloneActivatedCount === 1 ? "" : "s"}.`,
    `Wrote ${result.manifestPath}.`,
    `Wrote ${result.lockfilePath}.`
  ].join("\n");
}
