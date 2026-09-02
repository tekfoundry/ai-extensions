import { appendFileSync, existsSync, mkdirSync, renameSync, rmSync, statSync } from "node:fs";
import { dirname } from "node:path";
import { utcTimestamp } from "./time.js";

export const DIAGNOSTIC_LEVELS = ["debug", "info", "warn", "error"] as const;
export type DiagnosticLevel = (typeof DIAGNOSTIC_LEVELS)[number];

export interface DiagnosticContext {
  sessionId?: string;
  delegationId?: string;
  subagentId?: string;
  hostWorkerId?: string;
  eventId?: string;
  workspaceId?: string;
}

export interface DiagnosticEvent {
  timestamp: string;
  level: DiagnosticLevel;
  message: string;
  context: DiagnosticContext;
  data?: Record<string, unknown>;
}

export interface DiagnosticLoggerOptions {
  minLevel?: DiagnosticLevel;
  maxBytes?: number;
  maxRotations?: number;
  knownSecrets?: string[];
  now?: () => string;
}

export interface DiagnosticLogger {
  emit(level: DiagnosticLevel, message: string, context?: DiagnosticContext, data?: Record<string, unknown>): DiagnosticEvent;
  debug(message: string, context?: DiagnosticContext, data?: Record<string, unknown>): DiagnosticEvent | undefined;
  info(message: string, context?: DiagnosticContext, data?: Record<string, unknown>): DiagnosticEvent | undefined;
  warn(message: string, context?: DiagnosticContext, data?: Record<string, unknown>): DiagnosticEvent | undefined;
  error(message: string, context?: DiagnosticContext, data?: Record<string, unknown>): DiagnosticEvent | undefined;
}

const SECRET_KEY_PATTERN = /(?:password|secret|token|api[_-]?key|private[_-]?key|credential)/i;
const RAW_SECRET_PATTERN = /-----BEGIN [^-]+ PRIVATE KEY-----|\bBearer\s+[A-Za-z0-9._~+/=-]{12,}|\b(?:ghp|github_pat|sk)-[A-Za-z0-9_-]{12,}\b/g;

function levelRank(level: DiagnosticLevel): number {
  return DIAGNOSTIC_LEVELS.indexOf(level);
}

function redact(value: unknown, knownSecrets: readonly string[], key?: string): unknown {
  if (key && SECRET_KEY_PATTERN.test(key) && !/Ref$/i.test(key)) {
    return "[REDACTED]";
  }

  if (Array.isArray(value)) {
    return value.map((item) => redact(item, knownSecrets));
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([childKey, child]) => [childKey, redact(child, knownSecrets, childKey)]));
  }

  if (typeof value !== "string") {
    return value;
  }

  let safeValue = value;

  for (const secret of knownSecrets) {
    if (secret !== "") {
      safeValue = safeValue.split(secret).join("[REDACTED]");
    }
  }

  return safeValue.replace(RAW_SECRET_PATTERN, "[REDACTED]");
}

function truncateEvent(event: DiagnosticEvent, maxBytes: number): DiagnosticEvent {
  const serialized = JSON.stringify(event);

  if (Buffer.byteLength(serialized, "utf8") <= maxBytes) {
    return event;
  }

  return {
    ...event,
    data: {
      truncated: true,
      originalBytes: Buffer.byteLength(serialized, "utf8")
    }
  };
}

function rotateLog(path: string, maxRotations: number): void {
  if (maxRotations < 1) {
    rmSync(path, { force: true });
    return;
  }

  for (let index = maxRotations; index >= 1; index -= 1) {
    const source = index === 1 ? path : `${path}.${index - 1}`;
    const target = `${path}.${index}`;

    if (existsSync(source)) {
      if (existsSync(target)) {
        rmSync(target, { force: true });
      }
      renameSync(source, target);
    }
  }
}

export function createDiagnosticLogger(path: string, options: DiagnosticLoggerOptions = {}): DiagnosticLogger {
  const minLevel = options.minLevel || "info";
  const maxBytes = options.maxBytes || 1024 * 1024;
  const maxRotations = options.maxRotations ?? 2;
  const knownSecrets = options.knownSecrets || [];
  const now = options.now || (() => utcTimestamp());

  function emit(level: DiagnosticLevel, message: string, context: DiagnosticContext = {}, data?: Record<string, unknown>): DiagnosticEvent {
    const event = truncateEvent(
      {
        timestamp: now(),
        level,
        message: String(redact(message, knownSecrets)),
        context: redact(context, knownSecrets) as DiagnosticContext,
        ...(data ? { data: redact(data, knownSecrets) as Record<string, unknown> } : {})
      },
      maxBytes
    );
    const line = `${JSON.stringify(event)}\n`;

    mkdirSync(dirname(path), { recursive: true });

    if (existsSync(path) && statSync(path).size + Buffer.byteLength(line, "utf8") > maxBytes) {
      rotateLog(path, maxRotations);
    }

    appendFileSync(path, line, { encoding: "utf8", mode: 0o600 });
    return event;
  }

  function emitIfEnabled(level: DiagnosticLevel, message: string, context?: DiagnosticContext, data?: Record<string, unknown>): DiagnosticEvent | undefined {
    return levelRank(level) >= levelRank(minLevel) ? emit(level, message, context, data) : undefined;
  }

  return {
    emit,
    debug: (message, context, data) => emitIfEnabled("debug", message, context, data),
    info: (message, context, data) => emitIfEnabled("info", message, context, data),
    warn: (message, context, data) => emitIfEnabled("warn", message, context, data),
    error: (message, context, data) => emitIfEnabled("error", message, context, data)
  };
}
