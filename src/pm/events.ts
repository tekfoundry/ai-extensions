import type { DelegationEventIdentity } from "./types.js";

export type EventClassification = "accepted" | "duplicate" | "stale" | "out-of-order" | "conflict";

export interface EventHistory {
  events: readonly DelegationEventIdentity[];
  lastSequence: number;
}

export function classifyDelegationEvent(event: DelegationEventIdentity, history: EventHistory): EventClassification {
  const duplicate = history.events.find((existing) => existing.eventId === event.eventId);

  if (duplicate) {
    return JSON.stringify(duplicate) === JSON.stringify(event) ? "duplicate" : "conflict";
  }

  const sameSequence = history.events.find(
    (existing) => existing.delegationId === event.delegationId && existing.sequence === event.sequence
  );

  if (sameSequence) {
    return "conflict";
  }

  if (event.sequence <= history.lastSequence) {
    return "stale";
  }

  if (event.sequence > history.lastSequence + 1) {
    return "out-of-order";
  }

  return "accepted";
}
