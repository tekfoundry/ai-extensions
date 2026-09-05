import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { chmodSync, cpSync, existsSync, lstatSync, mkdirSync, readFileSync, renameSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PassThrough } from "node:stream";
import { test } from "node:test";
import { run, runInteractive } from "../dist/cli.js";
import { createForceBackup, isCompleteForceBackup } from "../dist/force-update/inventory.js";
import { forceUpdateWorkspace } from "../dist/force-update/coordinator.js";
import { compareForceUpdate } from "../dist/force-update/audit.js";

function git(args, cwd) {
  return execFileSync("git", args, { cwd, encoding: "utf8", env: { ...process.env, GIT_AUTHOR_NAME: "AIX Tests", GIT_AUTHOR_EMAIL: "aix@example.test", GIT_COMMITTER_NAME: "AIX Tests", GIT_COMMITTER_EMAIL: "aix@example.test" } }).trim();
}
async function source(withAppend = false) {
  const root = await mkdtemp(join(tmpdir(), "aix-force-source-"));
  mkdirSync(join(root, "skills/demo"), { recursive: true });
  writeFileSync(join(root, "skills/demo/SKILL.md"), "---\nname: demo\n---\n\n# Demo v1\n");
  writeFileSync(join(root, "skills/demo/notes.md"), "v1\n");
  if (withAppend) writeFileSync(join(root, "skills/demo/AGENTS.append.md"), "Managed demo instructions.\n");
  git(["init", "-b", "main"], root); git(["add", "."], root); git(["commit", "-m", "initial"], root);
  return root;
}
async function project(callback, withAppend = false) {
  const sourceRoot = await source(withAppend);
  const root = await mkdtemp(join(tmpdir(), "aix-force-project-"));
  const cache = await mkdtemp(join(tmpdir(), "aix-force-cache-"));
  const cwd = process.cwd(); const oldCache = process.env.AIX_CACHE_DIR;
  process.chdir(root); process.env.AIX_CACHE_DIR = cache;
  try { assert.equal(run(["skills", "add", sourceRoot, "fixture"]).exitCode, 0); assert.equal(run(["skill", "activate", "fixture/skills/demo"]).exitCode, 0); await callback(root, sourceRoot); }
  finally { process.chdir(cwd); if (oldCache === undefined) delete process.env.AIX_CACHE_DIR; else process.env.AIX_CACHE_DIR = oldCache; }
}
function backups(root) { return readdirNames(root).filter((name) => name.startsWith("aix_bak_")); }
function readdirNames(root) { return execFileSync(process.platform === "win32" ? "cmd" : "ls", process.platform === "win32" ? ["/c", "dir", "/b"] : ["-1", root], { cwd: process.platform === "win32" ? root : undefined, encoding: "utf8" }).trim().split(/\r?\n/).filter(Boolean); }

// The ordinary path remains conservative when a package is locally edited.
test("force-update help shows the safe backup behavior", () => {
  const result = run(["update", "--help"]);
  assert.equal(result.exitCode, 0);
  assert.match(result.stdout, /Usage: aix update \[--force\]/);
  assert.match(result.stdout, /backs up the AIX installation before a clean rebuild/);
});

test("force coordinator refuses a project-root and cwd mismatch before backup", async () => {
  const root = await mkdtemp(join(tmpdir(), "aix-force-mismatch-"));
  const result = forceUpdateWorkspace({ force: true, projectRoot: root });
  assert.equal(result.state, "failed");
  assert.equal(result.failure.stage, "backup");
  assert.match(result.failure.message, /project root must match/);
  assert.deepEqual(backups(root), []);
});

test("plain update still refuses drift while force mode is explicit", async () => {
  await project(async (root) => {
    writeFileSync(join(root, ".agents/packages/skills/fixture/skills/demo/notes.md"), "local\n");
    const plain = run(["skills", "update"]);
    assert.equal(plain.exitCode, 2);
    assert.match(plain.stderr, /Refusing to update modified package/);
    const force = run(["update", "--force"]);
    assert.equal(force.exitCode, 0, force.stderr);
    assert.match(force.stdout, /Force update completed/);
    assert.equal(existsSync(join(root, ".agents/packages/skills/fixture/skills/demo/notes.md")), true);
  });
});

test("force preserves fixture-owned .claude/.codex content and standalone collisions", async () => {
  const fixture = join(process.cwd(), "tests/fixtures/force-update-safety");
  await project(async (root) => {
    cpSync(fixture, root, { recursive: true });
    const result = run(["update", "--force"]);
    assert.equal(result.exitCode, 0, result.stderr);
    const backup = join(root, backups(root)[0]);
    for (const relativePath of [".claude/settings.json", ".codex/config.toml", ".agents/roles/standalone-collision.md"]) {
      assert.equal(readFileSync(join(root, relativePath), "utf8"), readFileSync(join(fixture, relativePath), "utf8"));
      assert.equal(readFileSync(join(backup, relativePath), "utf8"), readFileSync(join(fixture, relativePath), "utf8"));
    }
    assert.equal(run(["verify"]).exitCode, 0);
  });
});

test("backup records missing compatibility roots, symlinks, and available platform mode metadata", async () => {
  await project(async (root) => {
    const target = join(root, ".claude/target.json");
    mkdirSync(join(root, ".claude"), { recursive: true });
    writeFileSync(target, "target\n");
    chmodSync(target, 0o640);
    symlinkSync("target.json", join(root, ".claude/link.json"));
    const missingRoot = join(root, ".codex");
    if (existsSync(missingRoot)) throw new Error("fixture project unexpectedly contains .codex");
    const result = run(["update", "--force"]);
    assert.equal(result.exitCode, 0, result.stderr);
    const backup = join(root, backups(root)[0]);
    const inventory = JSON.parse(readFileSync(join(backup, "backup-inventory.json"), "utf8"));
    assert.equal(inventory.roots.find((entry) => entry.path === ".codex").present, false);
    assert.equal(inventory.entries.find((entry) => entry.path === ".claude/link.json").kind, "symlink");
    assert.equal(inventory.entries.find((entry) => entry.path === ".claude/target.json").mode & 0o777, 0o640);
    assert.equal(readFileSync(join(backup, ".claude/link.json"), "utf8"), "target\n");
  });
});

test("force creates a complete pre-mutation backup and preserves PM and foreign content", async () => {
  await project(async (root, sourceRoot) => {
    mkdirSync(join(root, ".aix/pm"), { recursive: true });
    writeFileSync(join(root, ".aix/pm/runtime.json"), "pm-state\n");
    mkdirSync(join(root, ".claude"), { recursive: true });
    writeFileSync(join(root, ".claude/settings.json"), "foreign\n");
    writeFileSync(join(root, ".agents/packages/skills/fixture/skills/demo/notes.md"), "edited-before-force\n");
    mkdirSync(join(root, ".agents/packages/skills/fixture/stale"), { recursive: true });
    writeFileSync(join(root, ".agents/packages/skills/fixture/stale/unlisted.txt"), "preserve\n");
    mkdirSync(join(root, ".agents/skills"), { recursive: true });
    writeFileSync(join(root, ".agents/skills/legacy.md"), "legacy\n");
    writeFileSync(join(sourceRoot, "skills/demo/notes.md"), "v2\n");
    git(["add", "."], sourceRoot); git(["commit", "-m", "update"], sourceRoot);
    const result = run(["update", "--force"]);
    assert.equal(result.exitCode, 0, result.stderr);
    const names = backups(root);
    assert.equal(names.length, 1);
    const backup = join(root, names[0]);
    assert.equal(readFileSync(join(backup, ".agents/packages/skills/fixture/skills/demo/notes.md"), "utf8"), "edited-before-force\n");
    assert.equal(readFileSync(join(root, ".aix/pm/runtime.json"), "utf8"), "pm-state\n");
    assert.equal(readFileSync(join(root, ".claude/settings.json"), "utf8"), "foreign\n");
    assert.equal(readFileSync(join(root, ".agents/packages/skills/fixture/stale/unlisted.txt"), "utf8"), "preserve\n");
    assert.equal(readFileSync(join(root, ".agents/skills/legacy.md"), "utf8"), "legacy\n");
    assert.equal(run(["verify"]).exitCode, 0);
  });
});

test("force audit reports edited content with stable categories and retains backup non-interactively", async () => {
  await project(async (root) => {
    const managed = join(root, ".agents/packages/skills/fixture/skills/demo/notes.md");
    writeFileSync(managed, "edited-by-user\\n");
    const result = run(["update", "--force"]);
    assert.equal(result.exitCode, 0, result.stderr);
    assert.match(result.stdout, /Force-update audit \(schema 1\)/);
    assert.match(result.stdout, /user-edited=[1-9]/);
    assert.match(result.stdout, /non-interactive mode/);
    const backup = join(root, backups(root)[0]);
    const audit = compareForceUpdate(root, backup);
    assert.equal(audit.schemaVersion, 1);
    assert.ok(audit.counts["user-edited"] >= 1);
    assert.equal(audit.findings[0].backupPath, join(backup, audit.findings[0].path));
    assert.equal(existsSync(backup), true);
  });
});

test("0.4 legacy fixture migrates to the verified current installation", async () => {
  const fixture = join(process.cwd(), "tests/fixtures/legacy-0.4");
  const legacyManifest = JSON.parse(readFileSync(join(fixture, "aix.json"), "utf8"));
  const legacyLockfile = JSON.parse(readFileSync(join(fixture, "aix.lock.json"), "utf8"));
  assert.deepEqual(legacyManifest.roles, ["documentation-specialist"]);
  assert.equal(legacyLockfile.lockfileVersion, 1);

  await project(async (root) => {
    cpSync(join(fixture, ".agents/roles"), join(root, ".agents/roles"), { recursive: true });
    cpSync(join(fixture, ".agents/packages/legacy"), join(root, ".agents/packages/legacy"), { recursive: true });
    writeFileSync(join(root, "AGENTS.md"), readFileSync(join(root, "AGENTS.md"), "utf8") + "\\n" + readFileSync(join(fixture, "AGENTS.md"), "utf8"));

    const result = run(["update", "--force"]);
    assert.equal(result.exitCode, 0, result.stderr);
    assert.equal(run(["verify"]).exitCode, 0);
    assert.equal(readFileSync(join(root, ".agents/roles/documentation-specialist.md"), "utf8"), readFileSync(join(fixture, ".agents/roles/documentation-specialist.md"), "utf8"));
    assert.equal(readFileSync(join(root, ".agents/packages/legacy/stale.md"), "utf8"), readFileSync(join(fixture, ".agents/packages/legacy/stale.md"), "utf8"));
    assert.match(result.stdout, /Force update completed/);
  }, true);
});

test("force replaces modified managed blocks but refuses unmanaged marker collisions", async () => {
  await project(async (root) => {
    const agentsPath = join(root, "AGENTS.md");
    writeFileSync(agentsPath, readFileSync(agentsPath, "utf8").replace("Managed demo instructions.", "Locally edited managed instructions."));
    const managed = run(["update", "--force"]);
    assert.equal(managed.exitCode, 0, JSON.stringify(managed));
    assert.match(readFileSync(agentsPath, "utf8"), /Managed demo instructions/);

    const lockfilePath = join(root, "aix.lock.json");
    const lockfile = JSON.parse(readFileSync(lockfilePath, "utf8"));
    delete lockfile.skills[0].agentsMd;
    writeFileSync(lockfilePath, JSON.stringify(lockfile, null, 2) + "\n");
    writeFileSync(agentsPath, readFileSync(agentsPath, "utf8").replace("Managed demo instructions.", "Unmanaged collision."));
    const collision = run(["update", "--force"]);
    assert.equal(collision.exitCode, 2);
    assert.match(collision.stdout, /Refusing to overwrite unmanaged skill block/);
    assert.match(readFileSync(agentsPath, "utf8"), /Unmanaged collision/);
  }, true);
});

test("malformed prior state fails closed after retaining the backup", async () => {
  await project(async (root) => {
    writeFileSync(join(root, "aix.json"), "{ malformed\n");
    const result = run(["update", "--force"]);
    assert.equal(result.exitCode, 2);
    assert.match(result.stdout, /Force update stopped during the (backup|validate) stage/);
    assert.equal(backups(root).length, 1);
    assert.equal(readFileSync(join(root, "aix.json"), "utf8"), "{ malformed\n");
  });
});

test("path-invalid lockfile records fail closed before replacement writes", async () => {
  for (const packagePath of ["../outside-target.txt", "..\\\\outside-target.txt", "C:\\\\outside-target.txt"]) {
    await project(async (root) => {
      const outside = join(root, "outside-target.txt");
      writeFileSync(outside, "must-survive\n");
      const lockfilePath = join(root, "aix.lock.json");
      const lockfile = JSON.parse(readFileSync(lockfilePath, "utf8"));
      lockfile.skills[0].packagePath = packagePath;
      writeFileSync(lockfilePath, JSON.stringify(lockfile, null, 2) + "\n");
      const result = run(["update", "--force"]);
      assert.equal(result.exitCode, 2);
      assert.match(result.stdout, /path-invalid package path/);
      assert.equal(readFileSync(outside, "utf8"), "must-survive\n");
      assert.equal(backups(root).length, 1);
    });
  }
});

test("force refuses symlinked managed record paths and concurrent reservations", async () => {
  await project(async (root) => {
    const lockfilePath = join(root, "aix.lock.json");
    const lockfile = JSON.parse(readFileSync(lockfilePath, "utf8"));
    const target = join(root, ".agents/packages/skills/other");
    const linkedPackage = join(root, ".agents/packages/skills/linked");
    mkdirSync(target, { recursive: true });
    symlinkSync("other", linkedPackage, "junction");
    lockfile.skills[0].packagePath = ".agents/packages/skills/linked";
    writeFileSync(lockfilePath, JSON.stringify(lockfile, null, 2) + "\n");
    const symlinkResult = run(["update", "--force"]);
    assert.equal(symlinkResult.exitCode, 2);
    assert.match(symlinkResult.stdout, /symlinked package path/);
    assert.equal(existsSync(join(target, "skills/demo")), false);

    mkdirSync(join(root, ".aix/force-update.lock"), { recursive: true });
    const concurrent = forceUpdateWorkspace({ force: true, projectRoot: root });
    assert.equal(concurrent.state, "failed");
    assert.equal(concurrent.failure.stage, "backup");
    assert.match(concurrent.failure.message, /Another force update is already running/);
    assert.equal(backups(root).length, 1);
  });
});

test("force refuses dangling activation symlinks before replacement writes", async () => {
  await project(async (root) => {
    const lockfilePath = join(root, "aix.lock.json");
    const lockfile = JSON.parse(readFileSync(lockfilePath, "utf8"));
    const activationPath = lockfile.skills[0].activationPath;
    const activationTarget = join(root, activationPath);
    const savedTarget = `${activationTarget}.saved`;
    renameSync(activationTarget, savedTarget);
    try {
      symlinkSync("missing-activation-target", activationTarget, "junction");
      const result = run(["update", "--force"]);
      assert.equal(result.exitCode, 2);
      assert.match(result.stdout, /dangling symlinked activation path/);
      assert.equal(lstatSync(activationTarget).isSymbolicLink(), true);
      assert.equal(existsSync(savedTarget), true);
    } finally {
      rmSync(activationTarget, { force: true, recursive: true });
      renameSync(savedTarget, activationTarget);
    }
  });
});

test("backup reservations never overwrite an existing backup and reruns create a new one", async () => {
  await project(async (root) => {
    const first = createForceBackup(root, new Date("2025-01-02T03:04:05.000Z"));
    const second = createForceBackup(root, new Date("2025-01-02T03:04:05.000Z"));
    assert.notEqual(first.backupPath, second.backupPath);
    assert.equal(lstatSync(first.backupPath).isDirectory(), true);
    assert.equal(lstatSync(second.backupPath).isDirectory(), true);
    assert.equal(backups(root).length, 2);
  });
});

test("incomplete and interrupted journals refuse rerun without touching PM workspaces or worktrees", async () => {
  await project(async (root) => {
    git(["init", "-b", "main"], root);
    git(["add", "."], root);
    git(["commit", "-m", "pm preservation baseline"], root);
    const worktreePath = await mkdtemp(join(tmpdir(), "aix-registered-worktree-"));
    execFileSync("git", ["worktree", "add", "--detach", worktreePath, "HEAD"], { cwd: root, encoding: "utf8" });
    writeFileSync(join(worktreePath, "unlanded.txt"), "unlanded-worktree\n");
    mkdirSync(join(root, ".aix/pm"), { recursive: true });
    writeFileSync(join(root, ".aix/pm/registered-worktree.json"), JSON.stringify({ path: worktreePath, state: "active" }));
    writeFileSync(join(root, ".aix/pm/active-delegation.json"), "active-delegation\n");
    const incomplete = join(root, "aix_bak_2025_01_02_03_04_05");
    mkdirSync(incomplete, { recursive: true });
    writeFileSync(join(incomplete, "backup-inventory.json"), "{}\n");
    const before = readFileSync(join(root, ".aix/pm/registered-worktree.json"), "utf8");
    const interrupted = createForceBackup(root);
    writeFileSync(join(root, ".aix/force-update.transaction.json"), JSON.stringify({ schemaVersion: 1, backupPath: interrupted.backupPath, stage: "skills", status: "running" }));
    const result = run(["update", "--force"]);
    assert.equal(result.exitCode, 2);
    assert.match(result.stdout, /interrupted force update/);
    assert.equal(readFileSync(join(root, ".aix/pm/registered-worktree.json"), "utf8"), before);
    assert.equal(readFileSync(join(worktreePath, "unlanded.txt"), "utf8"), "unlanded-worktree\n");
    assert.equal(readFileSync(join(root, ".aix/pm/active-delegation.json"), "utf8"), "active-delegation\n");
    assert.equal(isCompleteForceBackup(incomplete), false);
    assert.equal(backups(root).length, 2);
    assert.equal(existsSync(join(root, ".aix/force-update.lock")), false);
  });
});

test("isolated rebuild failures name the failing stage and retain the backup", async () => {
  for (const stage of ["workflow", "skills", "roles", "persist", "cleanup", "verify"]) {
    await project(async (root) => {
      const previousCwd = process.cwd();
      process.chdir(root);
      const result = forceUpdateWorkspace({ force: true, projectRoot: ".", failureInjection: stage });
      process.chdir(previousCwd);
      assert.equal(result.state, "failed");
      assert.equal(result.failure.stage, stage, result.failure.message);
      assert.match(result.failure.message, new RegExp(`Injected force-update failure at ${stage} stage`));
      assert.equal(backups(root).length, 1);
      assert.equal(existsSync(join(root, backups(root)[0], "BACKUP_COMPLETE")), true);
    });
  }
});

test("an interrupted transaction is refused without creating a second backup", async () => {
  await project(async (root) => {
    const backup = createForceBackup(root);
    mkdirSync(join(root, ".aix"), { recursive: true });
    writeFileSync(join(root, ".aix/force-update.transaction.json"), JSON.stringify({ schemaVersion: 1, backupPath: backup.backupPath, stage: "skills", status: "running" }));
    const result = run(["update", "--force"]);
    assert.equal(result.exitCode, 2);
    assert.match(result.stdout, /interrupted force update/);
    assert.equal(backups(root).length, 1);
  });
});

function sha256(value) { return createHash("sha256").update(value).digest("hex"); }
async function auditCase({ oldContent, backupContent, currentContent, oldKnown = true, currentKnown = false, oldVersion = 1, newVersion = 1 }) {
  const root = await mkdtemp(join(tmpdir(), "aix-audit-root-"));
  const backup = join(root, "aix_bak_test"); const rel = ".agents/packages/p/item.txt";
  mkdirSync(join(backup, ".agents/packages/p"), { recursive: true });
  if (backupContent !== undefined) writeFileSync(join(backup, rel), backupContent);
  const oldLock = oldKnown ? { lockfileVersion: oldVersion, skills: [{ packagePath: ".agents/packages/p", packageFiles: [{ path: "item.txt", sha256: sha256(oldContent) }] }] } : { lockfileVersion: oldVersion, skills: [] };
  const newLock = currentKnown ? { lockfileVersion: newVersion, skills: [{ packagePath: ".agents/packages/p", packageFiles: [{ path: "item.txt", sha256: sha256(currentContent || "") }] }] } : { lockfileVersion: newVersion, skills: [] };
  writeFileSync(join(backup, "aix.lock.json"), JSON.stringify(oldLock));
  writeFileSync(join(backup, "aix.json"), JSON.stringify({ skills: [rel] }));
  writeFileSync(join(backup, "backup-inventory.json"), JSON.stringify({ schemaVersion: 1, roots: [], entries: backupContent === undefined ? [] : [{ path: rel, kind: "file", mode: 0o600, size: backupContent.length, mtimeMs: 0, sha256: sha256(backupContent) }] }));
  writeFileSync(join(root, "aix.lock.json"), JSON.stringify(newLock));
  if (currentContent !== undefined) { mkdirSync(join(root, ".agents/packages/p"), { recursive: true }); writeFileSync(join(root, rel), currentContent); }
  const before = readFileSync(join(backup, "backup-inventory.json"), "utf8");
  const result = compareForceUpdate(root, backup);
  assert.equal(readFileSync(join(backup, "backup-inventory.json"), "utf8"), before);
  return result;
}

test("audit comparison covers unchanged, edits, upstream changes, deletion, legacy, collisions, versions, and local-equals-new", async () => {
  assert.equal((await auditCase({ oldContent: "same", backupContent: "same", currentContent: "same" })).findings.length, 0);
  assert.equal((await auditCase({ oldContent: "old", backupContent: "local", currentContent: "new" })).counts["user-edited"], 1);
  assert.equal((await auditCase({ oldContent: "old", backupContent: "old", currentContent: "new" })).counts["upstream-only"], 1);
  assert.equal((await auditCase({ oldContent: "old", backupContent: "old", currentContent: undefined })).counts["upstream-only"], 1);
  assert.equal((await auditCase({ oldContent: "legacy", backupContent: "legacy", currentContent: "legacy" , oldKnown: false })).counts.ambiguous, 1);
  assert.equal((await auditCase({ oldContent: "legacy", backupContent: "legacy", currentContent: "new", oldKnown: false, currentKnown: true })).counts.collision, 1);
  assert.equal((await auditCase({ oldContent: "old", backupContent: "old", currentContent: "new", oldVersion: 1, newVersion: 2 })).counts["upstream-only"], 1);
  assert.equal((await auditCase({ oldContent: "old", backupContent: "local", currentContent: "local" })).findings.length, 0);
});

test("interactive force prompt defaults to keep and honors explicit delete", async () => {
  await project(async (root) => {
    for (const answer of ["\n", "y\n"]) {
      const input = new PassThrough(); const output = new PassThrough(); let text = "";
      output.on("data", (chunk) => { text += chunk.toString(); });
      const pending = runInteractive(["update", "--force"], input, output);
      setImmediate(() => input.end(answer));
      const result = await pending; assert.equal(result.exitCode, 0, result.stderr);
      assert.match(text + result.stdout, /Force-update audit/);
      if (answer.startsWith("y")) assert.match(result.stdout, /deleted after explicit operator confirmation/);
      else assert.match(result.stdout, /retained .*default: keep/);
      assert.equal((text + result.stdout).match(/Force-update audit/g)?.length, 1);
    }
  });
});
