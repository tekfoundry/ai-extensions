import { AixError } from "../errors.js";
import { assertNoRawSecrets } from "./validation.js";
import type { HostCapabilitySnapshot } from "./host.js";

const MAX_TEXT_LENGTH = 128;
const MAX_CAPABILITIES = 64;

export interface HarnessCapabilitySnapshotInput extends Partial<Omit<HostCapabilitySnapshot, "capabilities">> {
  capabilities?: Record<string, boolean | "unknown">;
  vendor?: string;
  protocol?: string;
}

export interface HarnessCapabilityRow {
  capability: string;
  status: "supported" | "missing" | "unknown";
}

export interface HarnessCapabilityMatrix {
  discovered: {
    harness: string;
    vendor: string;
    provider: string;
    model: string;
    runtime: string;
    protocol: string;
  };
  capabilities: HarnessCapabilityRow[];
  missingCapabilities: string[];
  unsupportedCapabilities: string[];
  diagnostics: string[];
}

function boundedText(value: unknown): string {
  if (typeof value !== "string" || value.length === 0) return "unknown";
  return value.length <= MAX_TEXT_LENGTH ? value : `${value.slice(0, MAX_TEXT_LENGTH - 1)}…`;
}

/** Build a bounded, secret-safe capability report from any host discovery result. */
export function createHarnessCapabilityMatrix(
  snapshot: HarnessCapabilitySnapshotInput,
  requiredCapabilities: readonly string[] = []
): HarnessCapabilityMatrix {
  assertNoRawSecrets(snapshot, "capabilitySnapshot");
  const entries = Object.entries(snapshot.capabilities || {});
  if (entries.length > MAX_CAPABILITIES) {
    throw new AixError(`Capability matrix cannot contain more than ${MAX_CAPABILITIES} capabilities.`);
  }

  const capabilities = entries
    .filter(([name]) => name.length > 0 && name.length <= MAX_TEXT_LENGTH)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([capability, value]) => ({
      capability,
      status: value === true ? "supported" : value === "unknown" ? "unknown" : "missing"
    } as HarnessCapabilityRow));
  const discoveredNames = new Set(capabilities.map((entry) => entry.capability));
  const required = [...new Set(requiredCapabilities)].filter((name) => name.length > 0 && name.length <= MAX_TEXT_LENGTH);
  for (const capability of required.filter((name) => !discoveredNames.has(name))) {
    capabilities.push({ capability, status: "missing" });
  }
  capabilities.sort((left, right) => left.capability.localeCompare(right.capability));

  const missingCapabilities = capabilities.filter((entry) => entry.status === "missing").map((entry) => entry.capability);
  const unsupportedCapabilities = capabilities.filter((entry) => entry.status === "unknown").map((entry) => entry.capability);
  const diagnostics = [
    ...(missingCapabilities.length ? [`Missing capabilities: ${missingCapabilities.join(", ")}`] : []),
    ...(unsupportedCapabilities.length ? [`Unknown capabilities: ${unsupportedCapabilities.join(", ")}`] : []),
    ...(!snapshot.harness ? ["Harness metadata was not provided."] : []),
    ...(!snapshot.provider ? ["Provider metadata was not provided."] : []),
    ...(!snapshot.model ? ["Model metadata was not provided."] : []),
    ...(!snapshot.runtime ? ["Runtime metadata was not provided."] : []),
    ...(!snapshot.protocol ? ["Protocol metadata was not provided."] : [])
  ];

  return {
    discovered: {
      harness: boundedText(snapshot.harness),
      vendor: boundedText(snapshot.vendor),
      provider: boundedText(snapshot.provider),
      model: boundedText(snapshot.model),
      runtime: boundedText(snapshot.runtime),
      protocol: boundedText(snapshot.protocol)
    },
    capabilities,
    missingCapabilities,
    unsupportedCapabilities,
    diagnostics
  };
}

export function renderHarnessCapabilityMatrix(matrix: HarnessCapabilityMatrix): string {
  const lines = [
    `Harness: ${matrix.discovered.harness}`,
    `Vendor/provider: ${matrix.discovered.vendor}/${matrix.discovered.provider}`,
    `Model: ${matrix.discovered.model}`,
    `Runtime: ${matrix.discovered.runtime}`,
    `Protocol: ${matrix.discovered.protocol}`,
    "Capabilities:"
  ];
  for (const entry of matrix.capabilities) lines.push(`- ${entry.capability}: ${entry.status}`);
  for (const diagnostic of matrix.diagnostics) lines.push(`Diagnostic: ${diagnostic}`);
  return lines.join("\n");
}
