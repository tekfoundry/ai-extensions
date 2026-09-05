import { existsSync, lstatSync, readFileSync, realpathSync, rmSync } from "node:fs";
import { isAbsolute, join, relative, resolve, sep } from "node:path";
import { createHash } from "node:crypto";
import { isCompleteForceBackup, type BackupInventory, type ForceAuditCategory } from "./inventory.js";

export const FORCE_AUDIT_SCHEMA_VERSION = 1 as const;
export interface ForceAuditFinding { path: string; category: ForceAuditCategory; backupPath: string; }
export interface ForceAuditResult {
  schemaVersion: typeof FORCE_AUDIT_SCHEMA_VERSION;
  baseline: { manifest: "backed-up" | "missing"; lockfile: "backed-up" | "missing"; oldVersion?: number; newVersion?: number };
  source: { oldCommit?: string; newCommit?: string };
  backupPath: string;
  counts: Record<ForceAuditCategory, number>;
  findings: ForceAuditFinding[];
}
function hash(path: string): string | undefined {
  try { if (!lstatSync(path).isFile()) return undefined; return createHash("sha256").update(readFileSync(path)).digest("hex"); } catch { return undefined; }
}
function json(path: string): any {
  try { return JSON.parse(readFileSync(path, "utf8")); } catch { return {}; }
}
function safeManagedPath(path: string): boolean {
  const normalized = path.replace(/[\\\\]+/g, "/");
  return Boolean(normalized) && !isAbsolute(path) && !/^[A-Za-z]:\//.test(normalized)
    && !normalized.split("/").includes("..") && normalized.startsWith(".agents/");
}
function safeJoin(root: string, path: string): string | undefined {
  if (!safeManagedPath(path)) return undefined;
  const candidate = resolve(root, path);
  const rel = relative(resolve(root, ".agents"), candidate);
  return rel && rel !== ".." && !rel.startsWith(`..${sep}`) && !isAbsolute(rel) ? candidate : undefined;
}
function lockFiles(lock: any): Map<string, string> {
  const result = new Map<string, string>();
  for (const entry of [...(lock.skills || []), ...(lock.roles || []), ...(lock.workflows || [])]) {
    const add = (base: string | undefined, file: any) => { if (base && file?.path && file?.sha256) result.set(`${base}/${file.path}`.replaceAll("\\", "/"), file.sha256); };
    for (const file of [...(entry.packageFiles || []), ...(entry.templates || []), ...(entry.guidance || [])]) add(entry.packagePath, file);
    for (const file of (entry.activeFiles || [])) add(entry.activationPath, file);
    for (const doc of entry.docs || []) if (doc.targetPath && doc.sha256) result.set(doc.targetPath.replaceAll("\\", "/"), doc.sha256);
  }
  return result;
}
function manifestCandidates(manifest: any): Set<string> {
  const result = new Set<string>();
  const visit = (value: any) => {
    if (typeof value === "string") { const path = value.replaceAll("\\", "/"); if (path.startsWith(".agents/")) result.add(path); return; }
    if (Array.isArray(value)) value.forEach(visit); else if (value && typeof value === "object") Object.values(value).forEach(visit);
  };
  visit(manifest); return result;
}
export function compareForceUpdate(root: string, backupPath: string): ForceAuditResult {
  const projectRoot = resolve(root);
  const inventory = json(join(backupPath, "backup-inventory.json")) as BackupInventory;
  const oldLock = json(join(backupPath, "aix.lock.json"));
  const newLock = existsSync(join(projectRoot, "aix.lock.json")) ? json(join(projectRoot, "aix.lock.json")) : {};
  const oldManifest = json(join(backupPath, "aix.json"));
  const baseline = lockFiles(oldLock); const currentBaseline = lockFiles(newLock);
  const candidates = new Set<string>([...baseline.keys(), ...manifestCandidates(oldManifest)]);
  const entries = inventory.entries || [];
  const backupHashes = new Map(entries.filter((e) => e.kind === "file").map((e) => [e.path.replaceAll("\\", "/"), e.sha256!]));
  const findings: ForceAuditFinding[] = [];
  for (const path of [...candidates].sort()) {
    if (!safeManagedPath(path)) continue;
    const backed = backupHashes.get(path); const currentPath = safeJoin(projectRoot, path);
    if (!currentPath) continue;
    const current = hash(currentPath); const oldKnown = baseline.get(path);
    if (backed === undefined && current === undefined) continue;
    let category: ForceAuditCategory | undefined;
    if (oldKnown && backed !== oldKnown && current !== backed) category = "user-edited";
    else if (oldKnown && backed === oldKnown && current !== backed) category = "upstream-only";
    else if (!oldKnown && current === undefined) category = "legacy-only";
    else if (!oldKnown && current !== undefined) category = currentBaseline.has(path) ? "collision" : "ambiguous";
    if (category) {
      const backupCopy = safeJoin(backupPath, path);
      // Lockfile and inventory data are untrusted. Never report a path that
      // would make rendering or later recovery traverse outside .agents.
      if (backupCopy) findings.push({ path, category, backupPath: backupCopy });
    }
  }
  // Include old-lock files that disappeared even when their current path was not
  // materialized by the new package. Manifest-only paths are candidates, never
  // deletion authority.
  findings.sort((a, b) => a.path.localeCompare(b.path));
  const counts = { "user-edited": 0, "upstream-only": 0, "legacy-only": 0, ambiguous: 0, collision: 0 } as Record<ForceAuditCategory, number>;
  for (const finding of findings) counts[finding.category] += 1;
  return { schemaVersion: FORCE_AUDIT_SCHEMA_VERSION, baseline: { manifest: existsSync(join(backupPath, "aix.json")) ? "backed-up" : "missing", lockfile: existsSync(join(backupPath, "aix.lock.json")) ? "backed-up" : "missing", oldVersion: oldLock.lockfileVersion, newVersion: newLock.lockfileVersion }, source: { oldCommit: oldLock.resolvedCommit, newCommit: newLock.resolvedCommit }, backupPath, counts, findings };
}
export function renderForceAudit(audit: ForceAuditResult): string {
  const summary = Object.entries(audit.counts).map(([name, count]) => `${name}=${count}`).join(" ");
  const lines = [`Force-update audit (schema ${audit.schemaVersion}): ${summary}`, `Baseline: manifest=${audit.baseline.manifest} lockfile=${audit.baseline.lockfile}`, `Source: old=${audit.source.oldCommit || "unknown"} new=${audit.source.newCommit || "unknown"}`, `Backup: ${audit.backupPath}`];
  for (const finding of audit.findings) lines.push(`- ${finding.category}: ${finding.path} (backup copy: ${finding.backupPath}; review before restoring)`);
  if (!audit.findings.length) lines.push("- No differences requiring recovery were detected.");
  return lines.join("\n");
}
export function deleteForceBackup(path: string, projectRoot: string): void {
  if (!path) throw new Error("Backup path is required");
  const root = realpathSync(resolve(projectRoot));
  const candidate = resolve(path);
  const candidateReal = realpathSync(candidate);
  const rel = relative(root, candidateReal);
  const name = candidate.split(sep).pop() ?? "";
  if (isAbsolute(rel) || rel.includes(sep) || !/^aix_bak_\d{4}_\d{2}_\d{2}_\d{2}_\d{2}_\d{2}(?:_\d+)?$/.test(name)) {
    throw new Error("Refusing to delete a backup outside the project root");
  }
  if (!isCompleteForceBackup(candidate)) throw new Error("Refusing to delete an incomplete or tampered backup");
  const stat = lstatSync(candidate);
  if (!stat.isDirectory() || stat.isSymbolicLink()) throw new Error("Refusing to delete a non-directory backup");
  rmSync(candidate, { recursive: true, force: false });
}
