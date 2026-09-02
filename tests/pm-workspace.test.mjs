import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { test } from "node:test";
import {
  FakeNativeHost,
  createGitWorkspaceManager,
  createPmOrchestrator,
  readWorkspace
} from "../dist/pm/index.js";

const workflowRoot = resolve("aix/workflows/design-plan-execute");

function git(cwd, args) {
  return execFileSync("git", args, { cwd, encoding: "utf8" }).trim();
}

async function gitProject() {
  const root = await mkdtemp(join(tmpdir(), "aix-pm-workspace-"));
  git(root, ["init", "-q"]);
  git(root, ["config", "user.email", "aix@example.test"]);
  git(root, ["config", "user.name", "AIX Test"]);
  await writeFile(join(root, ".gitignore"), ".aix/pm/\n");
  await mkdir(join(root, "src"), { recursive: true });
  await writeFile(join(root, "src/target.txt"), "before\n");
  git(root, ["add", ".gitignore", "src/target.txt"]);
  git(root, ["commit", "-qm", "initial"]);
  return root;
}

test("workspace manager isolates, validates scope, integrates, and cleans safely", async () => {
  const root = await gitProject();
  const manager = createGitWorkspaceManager(root);
  const workspace = manager.create({ delegationId: "delegation-test", ownerSessionId: "session-test", allowedPaths: ["src/target.txt", "src/new.txt"], deniedPaths: [".aix/"] });
  await writeFile(join(workspace.path, "src/target.txt"), "after\n");
  await writeFile(join(workspace.path, "src/new.txt"), "new\n");
  assert.deepEqual(manager.status(workspace).outOfScopePaths, []);
  const integrated = manager.integrate(workspace);
  assert.equal(integrated.state, "integrated");
  const cleaned = manager.cleanup(integrated);
  assert.equal(cleaned.state, "cleaned");
  assert.equal(existsSync(workspace.path), false);
  assert.equal(await readFile(join(root, "src/target.txt"), "utf8"), "after\n");
  assert.equal(await readFile(join(root, "src/new.txt"), "utf8"), "new\n");
  assert.equal(readWorkspace(root, "delegation-test").state, "cleaned");
});

test("workspace manager refuses scope drift and unsafe cleanup", async () => {
  const root = await gitProject();
  const manager = createGitWorkspaceManager(root);
  const workspace = manager.create({ delegationId: "delegation-scope", ownerSessionId: "session-test", allowedPaths: ["src/target.txt"], deniedPaths: [".aix/"] });
  await writeFile(join(workspace.path, "forbidden.txt"), "nope\n");
  assert.deepEqual(manager.status(workspace).outOfScopePaths, ["forbidden.txt"]);
  assert.throws(() => manager.integrate(workspace), /outside its delegated scope/);
  assert.equal(readWorkspace(root, "delegation-scope").state, "scope-violation");
  assert.throws(() => manager.cleanup(workspace), /unmerged changes/);
});

test("workspace manager preserves an integration conflict for PM repair", async () => {
  const root = await gitProject();
  const manager = createGitWorkspaceManager(root);
  const workspace = manager.create({ delegationId: "delegation-conflict", ownerSessionId: "session-test", allowedPaths: ["src/target.txt"], deniedPaths: [".aix/"] });
  await writeFile(join(workspace.path, "src/target.txt"), "worker\n");
  await writeFile(join(root, "src/target.txt"), "main\n");
  git(root, ["add", "src/target.txt"]);
  git(root, ["commit", "-qm", "advance main"]);
  assert.throws(() => manager.integrate(workspace), /advanced after workspace creation/);
  assert.equal(readWorkspace(root, "delegation-conflict").state, "conflict");
});

test("managed host adapter integrates only after AIX validation and cleanup remains safe", async () => {
  const root = await gitProject();
  const manager = createGitWorkspaceManager(root);
  const calls = [];
  const workspace = manager.create({ delegationId: "delegation-adapter", ownerSessionId: "session-test", allowedPaths: ["src/target.txt"], deniedPaths: [".aix/"] });
  await writeFile(join(workspace.path, "src/target.txt"), "adapter\n");
  const integrated = await manager.integrate(workspace, async (request) => {
    calls.push({ changedPaths: request.changedPaths, hasPatch: request.patch.length > 0 });
    request.applyPatch();
  });
  assert.deepEqual(calls, [{ changedPaths: ["src/target.txt"], hasPatch: true }]);
  assert.equal(integrated.state, "integrated");
  assert.equal((await manager.cleanup(integrated)).state, "cleaned");
  assert.equal(await readFile(join(root, "src/target.txt"), "utf8"), "adapter\n");
});

test("managed host adapter refusal preserves scope and unlanded changes", async () => {
  const root = await gitProject();
  const manager = createGitWorkspaceManager(root);
  const workspace = manager.create({ delegationId: "delegation-adapter-refusal", ownerSessionId: "session-test", allowedPaths: ["src/target.txt"], deniedPaths: [".aix/"] });
  await writeFile(join(workspace.path, "forbidden.txt"), "nope\n");
  assert.throws(() => manager.integrate(workspace, async () => {
    throw new Error("must not be called");
  }), /outside its delegated scope/);
  assert.equal(readWorkspace(root, "delegation-adapter-refusal").state, "scope-violation");
  assert.throws(() => manager.cleanup(workspace), /unmerged changes/);
});

test("managed host adapter exceptions preserve the workspace for repair", async () => {
  const root = await gitProject();
  const manager = createGitWorkspaceManager(root);
  const workspace = manager.create({ delegationId: "delegation-adapter-error", ownerSessionId: "session-test", allowedPaths: ["src/target.txt"], deniedPaths: [".aix/"] });
  await writeFile(join(workspace.path, "src/target.txt"), "adapter-error\n");
  await assert.rejects(() => manager.integrate(workspace, async () => {
    throw new Error("native integration unavailable");
  }), /Host workspace integration failed/);
  assert.equal(readWorkspace(root, "delegation-adapter-error").state, "conflict");
  assert.throws(() => manager.cleanup(workspace), /unmerged changes/);
});

test("PM dogfoods a bounded implementation change through an isolated workspace", async () => {
  const root = await gitProject();
  const host = new FakeNativeHost({
    workerAction: async (request) => writeFile(join(request.workspacePath, "src/target.txt"), "dogfooded\n")
  });
  const pm = await createPmOrchestrator({ projectRoot: root, workflowPackageRoot: workflowRoot, host });
  const result = await pm.dispatch({
    role: "implementation-engineer", taskMode: "implementation", deliveryMode: "isolated-change",
    goal: "Make the bounded test change.", constraints: ["Change only target.txt."],
    acceptanceSignals: ["src/target.txt contains dogfooded."], returnRequirements: ["Summary", "Evidence"],
    allowedPaths: ["src/target.txt"], deniedPaths: [".aix/pm/"]
  });
  assert.equal(result.record.state, "completed");
  assert.equal(await readFile(join(root, "src/target.txt"), "utf8"), "dogfooded\n");
  assert.equal(host.workers[0].workspacePath.includes(".aix/pm/workspaces"), true);
  pm.close();
});
