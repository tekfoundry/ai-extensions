import { readLockfileJson } from "../activation/lockfile.js";
import { AixError } from "../errors.js";
import { readWorkflowManifest } from "../workflows/manifest.js";
import { loadWorkflowTeamContext } from "./context.js";
import { readPmSession } from "./session.js";
import {
  assertHostCapabilities,
  MANAGED_LOCAL_INTEGRATION_CAPABILITY,
  validatePersistedCapabilitySnapshot,
  type HostCapabilitySnapshot
} from "./host.js";
import { createHarnessCapabilityMatrix, renderHarnessCapabilityMatrix, type HarnessCapabilityMatrix } from "./capability-matrix.js";

export const PM_DOCTOR_CORE_CAPABILITIES = [
  "native-worker-creation",
  "correlated-results",
  MANAGED_LOCAL_INTEGRATION_CAPABILITY
] as const;

export interface HostAuthorizationCheck {
  capability: string;
  status: "available" | "missing" | "unknown";
  guidance?: string;
}

export interface HostAuthorizationReport {
  ok: boolean;
  snapshot?: Pick<HostCapabilitySnapshot, "provider" | "harness" | "model" | "runtime" | "discoveredAt">;
  checks: HostAuthorizationCheck[];
  matrix?: HarnessCapabilityMatrix;
  error?: string;
}

function requiredCapabilities(): string[] {
  const workflow = readLockfileJson().workflows?.[0];
  if (!workflow) return [...PM_DOCTOR_CORE_CAPABILITIES];

  try {
    const manifest = readWorkflowManifest(workflow.packagePath);
    const team = loadWorkflowTeamContext(workflow.packagePath).team;
    return [...new Set([
      ...PM_DOCTOR_CORE_CAPABILITIES,
      ...(manifest.requiredCapabilities || []),
      ...team.requiredCapabilities
    ])];
  } catch {
    return [...PM_DOCTOR_CORE_CAPABILITIES];
  }
}

function guidance(capability: string): string {
  if (capability === MANAGED_LOCAL_INTEGRATION_CAPABILITY) {
    return "Use a supported host with managed local integration, or limit delegations to report-only.";
  }
  if (capability === "native-worker-creation") {
    return "Use a host that exposes native worker creation; inline prompt fallback is not supported.";
  }
  if (capability === "correlated-results") {
    return "Use a host that returns correlated worker results so delegation evidence remains auditable.";
  }
  return "Use a supported host that explicitly provides this capability.";
}

export function inspectHostAuthorization(
  snapshot: HostCapabilitySnapshot,
  required: readonly string[] = PM_DOCTOR_CORE_CAPABILITIES
): HostAuthorizationReport {
  const checks = required.map((capability) => {
    const value = snapshot.capabilities[capability];
    return {
      capability,
      status: value === true ? "available" : value === "unknown" ? "unknown" : "missing",
      ...(value === true ? {} : { guidance: guidance(capability) })
    } as HostAuthorizationCheck;
  });
  const matrix = createHarnessCapabilityMatrix(snapshot, required);
  try {
    assertHostCapabilities(snapshot, required);
  } catch {
    return {
      ok: false,
      snapshot: { provider: snapshot.provider, harness: snapshot.harness, model: snapshot.model, runtime: snapshot.runtime, discoveredAt: snapshot.discoveredAt },
      checks,
      matrix
    };
  }
  return {
    ok: true,
    snapshot: { provider: snapshot.provider, harness: snapshot.harness, model: snapshot.model, runtime: snapshot.runtime, discoveredAt: snapshot.discoveredAt },
    checks,
    matrix
  };
}

export function readHostAuthorizationReport(projectRoot = process.cwd()): HostAuthorizationReport {
  const session = readPmSession(projectRoot).session;
  if (!session?.capabilitySnapshot) {
    return { ok: false, checks: [], error: "No PM capability snapshot is available. Start a PM session on the active host and run doctor again." };
  }
  try {
    return inspectHostAuthorization(validatePersistedCapabilitySnapshot(session.capabilitySnapshot), requiredCapabilities());
  } catch {
    return { ok: false, checks: [], error: "The stored PM capability snapshot is invalid or unsafe; refresh it from the active host." };
  }
}

export function renderHostAuthorizationReport(report: HostAuthorizationReport): string {
  const lines = ["PM doctor", `Result: ${report.ok ? "ready" : "not ready"}`];
  if (report.snapshot) {
    lines.push(`Host: ${report.snapshot.harness}/${report.snapshot.provider} (${report.snapshot.runtime})`);
    lines.push(`Model: ${report.snapshot.model}`);
  }
  if (report.matrix) lines.push(renderHarnessCapabilityMatrix(report.matrix));
  if (report.error) lines.push(`Error: ${report.error}`);
  for (const check of report.checks) {
    lines.push(`- ${check.capability}: ${check.status}`);
    if (check.guidance) lines.push(`  Remediation: ${check.guidance}`);
  }
  return lines.join("\n");
}

export function assertDoctorReportUsable(report: HostAuthorizationReport): void {
  if (!report.ok) throw new AixError(renderHostAuthorizationReport(report));
}
