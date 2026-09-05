import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { link, mkdir, mkdtemp, readFile, readdir, symlink, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import {
  assertForceBackupPath,
  BackupInventoryError,
  createBackupInventory,
  isForceBackupPath,
  createForceBackup,
  isCompleteForceBackup
} from "../dist/force-update/inventory.js";

async function project() {
  return mkdtemp(join(tmpdir(), "aix-force-inventory-"));
}

test("inventory covers the declared roots and files without unrelated content", async () => {
  const root = await project();
  await mkdir(join(root, ".agents/packages/skills/demo"), { recursive: true });
  await mkdir(join(root, ".claude"), { recursive: true });
  await writeFile(join(root, ".agents/packages/skills/demo/SKILL.md"), "skill\n");
  await writeFile(join(root, ".claude/settings.json"), "{}\n");
  await writeFile(join(root, "aix.json"), '{"skills":[]}\n');
  await writeFile(join(root, "outside.txt"), "not managed\n");

  const inventory = createBackupInventory(root);

  assert.equal(inventory.schemaVersion, 1);
  assert.deepEqual(inventory.roots, [
    { path: ".agents", present: true },
    { path: ".claude", present: true },
    { path: ".codex", present: false },
    { path: "aix.json", present: true },
    { path: "aix.lock.json", present: false },
    { path: "AGENTS.md", present: false }
  ]);
  assert.deepEqual(inventory.entries.map((entry) => entry.path), [
    ".agents",
    ".agents/packages",
    ".agents/packages/skills",
    ".agents/packages/skills/demo",
    ".agents/packages/skills/demo/SKILL.md",
    ".claude",
    ".claude/settings.json",
    "aix.json"
  ]);
  assert.equal(inventory.entries.find((entry) => entry.path === ".agents/packages/skills/demo/SKILL.md")?.sha256.length, 64);
  assert.equal(inventory.entries.some((entry) => entry.path === "outside.txt"), false);
});

test("inventory records symlinks without traversing them", async () => {
  const root = await project();
  await mkdir(join(root, ".agents"), { recursive: true });
  await mkdir(join(root, "outside"), { recursive: true });
  await writeFile(join(root, "outside/secret.txt"), "secret\n");
  await symlink("../outside", join(root, ".agents/escape"));
  await symlink("escape", join(root, ".agents/inside-link"));

  const inventory = createBackupInventory(root);
  const escape = inventory.entries.find((entry) => entry.path === ".agents/escape");
  const insideLink = inventory.entries.find((entry) => entry.path === ".agents/inside-link");

  assert.equal(escape?.kind, "symlink");
  assert.equal(escape?.linkTargetWithinProject, true);
  assert.equal(insideLink?.kind, "symlink");
  assert.equal(inventory.entries.some((entry) => entry.path.includes("secret.txt")), false);
});

test("inventory refuses hard-linked files in the backup scope", async () => {
  const root = await project();
  await mkdir(join(root, ".agents"), { recursive: true });
  await writeFile(join(root, ".agents/source.txt"), "content\n");
  await link(join(root, ".agents/source.txt"), join(root, ".agents/alias.txt"));

  assert.throws(() => createBackupInventory(root), (error) =>
    error instanceof BackupInventoryError && /hard-linked file/.test(error.message)
  );
});

test("inventory records dangling symlinks and refuses special files", async (t) => {
  const root = await project();
  await mkdir(join(root, ".agents"), { recursive: true });
  await symlink("missing-target", join(root, ".agents/dangling"));
  const danglingInventory = createBackupInventory(root);
  const dangling = danglingInventory.entries.find((entry) => entry.path === ".agents/dangling");
  assert.equal(dangling?.kind, "symlink");
  assert.equal(dangling?.size, 14);
  assert.equal(dangling?.linkTarget, "missing-target");
  assert.equal(dangling?.linkTargetWithinProject, true);
  assert.equal(typeof dangling?.mtimeMs, "number");

  if (process.platform === "win32") {
    t.skip("named-pipe fixture is Unix-only");
    return;
  }
  execFileSync("mkfifo", [join(root, ".agents/pipe")]);
  assert.throws(() => createBackupInventory(root), (error) =>
    error instanceof BackupInventoryError && /Unsupported file type/.test(error.message)
  );
});

test("failed inventory cannot leave a backup or mutate the source", async () => {
  const root = await project();
  await mkdir(join(root, ".agents"), { recursive: true });
  await writeFile(join(root, ".agents/keep.txt"), "keep\n");
  await link(join(root, ".agents/keep.txt"), join(root, ".agents/hardlink.txt"));

  assert.throws(() => createForceBackup(root, new Date("2025-03-04T05:06:07.000Z")), BackupInventoryError);
  assert.equal(await readFile(join(root, ".agents/keep.txt"), "utf8"), "keep\n");
  assert.deepEqual((await readdir(root)).filter((name) => name.startsWith("aix_bak_")), []);
});

test("creates a uniquely named complete backup with metadata and permissions", async () => {
  const root = await project();
  await mkdir(join(root, ".agents"), { recursive: true });
  await writeFile(join(root, ".agents/private.txt"), "private\n", { mode: 0o600 });
  const first = createForceBackup(root, new Date("2025-01-02T03:04:05.000Z"));
  const second = createForceBackup(root, new Date("2025-01-02T03:04:05.000Z"));
  assert.match(first.backupPath, /aix_bak_2025_01_02_03_04_05$/);
  assert.notEqual(first.backupPath, second.backupPath);
  assert.equal(isCompleteForceBackup(first.backupPath), true);
  assert.equal((await readFile(join(first.backupPath, "backup-metadata.json"), "utf8")).includes('"schemaVersion": 1'), true);
  assert.equal((await (await import("node:fs/promises")).stat(join(first.backupPath, ".agents/private.txt"))).mode & 0o777, 0o600);
});

test("incomplete or tampered backups are not reusable", async () => {
  const root = await project();
  await mkdir(join(root, ".agents"), { recursive: true });
  await writeFile(join(root, ".agents/state.txt"), "state\n");
  const backup = createForceBackup(root, new Date("2025-02-03T04:05:06.000Z"));
  assert.equal(isCompleteForceBackup(backup.backupPath), true);
  await writeFile(join(backup.backupPath, "BACKUP_COMPLETE"), "interrupted\n");
  assert.equal(isCompleteForceBackup(backup.backupPath), false);
  await writeFile(join(backup.backupPath, "BACKUP_COMPLETE"), `${backup.metadata.inventorySha256}\n`);
  await writeFile(join(backup.backupPath, ".agents/state.txt"), "tampered\n");
  assert.equal(isCompleteForceBackup(backup.backupPath), false);
  await writeFile(join(backup.backupPath, ".agents/state.txt"), "state\n");
  assert.equal(isCompleteForceBackup(backup.backupPath), true);

  // A completion marker does not authorize unexpected backup payloads.
  await writeFile(join(backup.backupPath, "unexpected.txt"), "planted\n");
  assert.equal(isCompleteForceBackup(backup.backupPath), false);
});

test("completion validation rejects a tampered inventory path even with a refreshed marker", async () => {
  const root = await project();
  await mkdir(join(root, ".agents"), { recursive: true });
  await writeFile(join(root, ".agents/state.txt"), "state\n");
  const backup = createForceBackup(root, new Date("2025-02-03T04:05:06.000Z"));
  const inventoryPath = join(backup.backupPath, "backup-inventory.json");
  const inventoryJson = (await readFile(inventoryPath, "utf8")).replace(".agents/state.txt", "../escaped.txt");
  const inventorySha256 = createHash("sha256").update(inventoryJson).digest("hex");
  const metadataPath = join(backup.backupPath, "backup-metadata.json");
  const metadata = JSON.parse(await readFile(metadataPath, "utf8"));
  metadata.inventorySha256 = inventorySha256;
  await writeFile(inventoryPath, inventoryJson);
  await writeFile(metadataPath, JSON.stringify(metadata, null, 2) + "\n");
  await writeFile(join(backup.backupPath, "BACKUP_COMPLETE"), `${inventorySha256}\n`);
  assert.equal(isCompleteForceBackup(backup.backupPath), false);
});

test("completion validation rejects a backup path with a non-reserved name", async () => {
  const root = await project();
  await mkdir(join(root, ".agents"), { recursive: true });
  await writeFile(join(root, ".agents/state.txt"), "state\n");
  const backup = createForceBackup(root, new Date("2025-02-03T04:05:06.000Z"));
  assert.equal(isCompleteForceBackup(join(root, "not-a-backup")), false);
  assert.equal(isCompleteForceBackup(backup.backupPath), true);
});

test("backup path checks reject traversal and unrelated files", () => {
  assert.equal(isForceBackupPath(".agents/packages/skills/demo/SKILL.md"), true);
  assert.equal(isForceBackupPath(".agents/../outside.txt"), false);
  assert.equal(isForceBackupPath("../outside.txt"), false);
  assert.equal(isForceBackupPath("src/index.ts"), false);
  assert.doesNotThrow(() => assertForceBackupPath("aix.lock.json"));
  assert.throws(() => assertForceBackupPath("_docs/README.md"), /outside the force-update backup scope/);
});
