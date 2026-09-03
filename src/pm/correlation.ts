import { AixError } from "../errors.js";
import { listDelegations, type DelegationRecord } from "./delegation.js";
import type { HostExecution, HostWorkerHandle } from "./host.js";

export type CorrelationIdentifier = "delegationId" | "subagentId" | "hostWorkerId" | "hostMissionId" | "hostRunId";

export interface DelegationCorrelation {
  delegationId: string;
  subagentId: string;
  hostWorkerId?: string;
  hostMissionId?: string;
  hostRunId?: string;
}

export interface DelegationInspection {
  record: DelegationRecord;
  matchedBy: CorrelationIdentifier;
  hostState?: string;
}

function mapping(record: DelegationRecord): DelegationCorrelation {
  const identity = record.contract.identity;
  return {
    delegationId: identity.delegationId,
    subagentId: identity.subagentId,
    ...(identity.hostWorkerId ? { hostWorkerId: identity.hostWorkerId } : {}),
    ...(identity.hostMissionId ? { hostMissionId: identity.hostMissionId } : {}),
    ...(identity.hostRunId ? { hostRunId: identity.hostRunId } : {})
  };
}

export function delegationCorrelation(record: DelegationRecord): DelegationCorrelation {
  return Object.freeze(mapping(record));
}

export function findDelegationByIdentifier(projectRoot: string, identifier: string, kind?: CorrelationIdentifier): { record: DelegationRecord; matchedBy: CorrelationIdentifier } {
  const matches = listDelegations(projectRoot).flatMap((record) => {
    const ids = mapping(record);
    const keys = kind ? [kind] : Object.keys(ids) as CorrelationIdentifier[];
    return keys.filter((key) => ids[key] === identifier).map((matchedBy) => ({ record, matchedBy }));
  });
  if (matches.length === 0) throw new AixError(`No delegation is correlated with ${kind || "identifier"} ${identifier}.`);
  if (matches.length > 1) throw new AixError(`Correlation identifier ${identifier} is ambiguous.`);
  return matches[0];
}

function hostHandle(record: DelegationRecord): HostWorkerHandle {
  const identity = record.contract.identity;
  if (!identity.hostWorkerId) throw new AixError(`Delegation ${identity.delegationId} has no persisted host worker identity.`);
  return {
    subagentId: identity.subagentId,
    hostWorkerId: identity.hostWorkerId,
    ...(identity.hostMissionId ? { hostMissionId: identity.hostMissionId } : {}),
    ...(identity.hostRunId ? { hostRunId: identity.hostRunId } : {}),
    displayName: identity.displayName
  };
}

export async function inspectDelegation(projectRoot: string, identifier: string, host?: HostExecution, kind?: CorrelationIdentifier): Promise<DelegationInspection> {
  const match = findDelegationByIdentifier(projectRoot, identifier, kind);
  if (!host || ["completed", "failed", "cancelled", "expired", "superseded"].includes(match.record.state)) return match;
  if (!host.inspectWorker) return match;
  const state = await host.inspectWorker(hostHandle(match.record));
  return { ...match, hostState: state.state };
}
