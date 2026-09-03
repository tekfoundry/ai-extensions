import { randomUUID } from "node:crypto";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { AixError } from "../errors.js";
import { pmDecisionPaths, ensurePmRuntimeLayout } from "./paths.js";
import { writePmJsonAtomic, writePmTextAtomic } from "./records.js";
import { utcTimestamp } from "./time.js";

export const PM_CONVERSATIONAL_ALIASES = ["pm", "project manager", "manager", "project-manager"] as const;
export type PmConversationalAlias = (typeof PM_CONVERSATIONAL_ALIASES)[number];

export function normalizePmReference(value: string): "project-manager" | undefined {
  const normalized = value.trim().toLowerCase().replace(/\s+/g, " ");
  return (PM_CONVERSATIONAL_ALIASES as readonly string[]).includes(normalized) ? "project-manager" : undefined;
}

export function classifyFirstPmPrompt(prompt: string): "conversational" | "concrete" {
  const normalized = prompt.trim().toLowerCase();
  if (!normalized) return "conversational";
  const concreteSignals = /\b(review|inspect|analy[sz]e|implement|fix|update|create|complete|run|test|build|migrate|change|add|remove|document|delegate)\b/;
  return concreteSignals.test(normalized) ? "concrete" : "conversational";
}

export function openingForFirstPmPrompt(prompt: string): string {
  return classifyFirstPmPrompt(prompt) === "concrete"
    ? "Okay Boss! Let me delegate that work."
    : "Hey Boss! What are we working on?";
}

/** Ensure a direct PM response names the human decision principal as Boss once. */
export function addressBoss(response: string): string {
  const trimmed = response.trim();
  if (/\bboss\b/i.test(trimmed)) return trimmed.replace(/\bboss\b/gi, "Boss");
  return `Boss, ${trimmed ? trimmed[0].toLowerCase() + trimmed.slice(1) : ""}`.trimEnd();
}

export type PmDecisionState = "open" | "resolved" | "declined" | "expired";

export interface PmDecisionRecord {
  decisionId: string;
  sessionId: string;
  question: string;
  options: string[];
  recommendation?: string;
  state: PmDecisionState;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  resolution?: string;
  context?: { delegationIds?: string[]; taskIds?: string[] };
}

function readDecision(projectRoot: string, decisionId: string): PmDecisionRecord {
  const path = pmDecisionPaths(projectRoot, decisionId).record;
  if (!existsSync(path)) throw new AixError(`Unknown PM decision: ${decisionId}`);
  return JSON.parse(readFileSync(path, "utf8")) as PmDecisionRecord;
}

function appendDecisionEvent(projectRoot: string, decision: PmDecisionRecord, type: string, data: Record<string, unknown> = {}): void {
  const paths = pmDecisionPaths(projectRoot, decision.decisionId);
  const existing = existsSync(paths.events) ? readFileSync(paths.events, "utf8") : "";
  writePmTextAtomic(paths.events, `${existing}${JSON.stringify({ type, decisionId: decision.decisionId, timestamp: utcTimestamp(), ...data })}\n`);
}

export function createPmDecision(input: {
  projectRoot?: string;
  sessionId: string;
  question: string;
  options?: string[];
  recommendation?: string;
  context?: PmDecisionRecord["context"];
}): PmDecisionRecord {
  const projectRoot = input.projectRoot || process.cwd();
  const now = utcTimestamp();
  const decision: PmDecisionRecord = {
    decisionId: `decision-${randomUUID()}`,
    sessionId: input.sessionId,
    question: input.question,
    options: input.options || [],
    ...(input.recommendation ? { recommendation: input.recommendation } : {}),
    state: "open",
    createdAt: now,
    updatedAt: now,
    ...(input.context ? { context: input.context } : {})
  };
  ensurePmRuntimeLayout(projectRoot);
  const paths = pmDecisionPaths(projectRoot, decision.decisionId);
  writePmJsonAtomic(paths.record, decision);
  appendDecisionEvent(projectRoot, decision, "created", { state: decision.state });
  return decision;
}

export function resolvePmDecision(projectRoot: string, decisionId: string, resolution: string, state: "resolved" | "declined" = "resolved"): PmDecisionRecord {
  const current = readDecision(projectRoot, decisionId);
  if (current.state !== "open") throw new AixError(`PM decision is already ${current.state}: ${decisionId}`);
  const updated: PmDecisionRecord = { ...current, state, resolution, resolvedAt: utcTimestamp(), updatedAt: utcTimestamp() };
  const paths = pmDecisionPaths(projectRoot, decisionId);
  writePmJsonAtomic(paths.record, updated);
  appendDecisionEvent(projectRoot, updated, "resolved", { state, resolution });
  return updated;
}

export function listOpenPmDecisions(projectRoot = process.cwd()): PmDecisionRecord[] {
  const root = ensurePmRuntimeLayout(projectRoot).decisions;
  if (!existsSync(root)) return [];
  return readFileNames(root).map((decisionId) => readDecision(projectRoot, decisionId)).filter((decision) => decision.state === "open");
}

function readFileNames(root: string): string[] {
  return requireDirectory(root);
}

function requireDirectory(root: string): string[] {
  return readdirSync(root, { withFileTypes: true }).filter((entry) => entry.isDirectory()).map((entry) => entry.name);
}
