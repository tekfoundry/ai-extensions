import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import {
  activateRoleFromDefinitions,
  assertNoActiveRoleNameCollision,
  assertRoleContract,
  buildPromptOverlayDelegation,
  deactivateRole,
  discoverRoles,
  parseRoleFile,
  parseRoleFileFromPath,
  resolveRoleDelegation,
  roleContractIssues,
  verifyRoles
} from "../dist/roles.js";
import { activeRolePath, bundledAixRolePackPath, packageRolePath, workflowRoleSourcePath } from "../dist/paths/agents.js";
import { collectWorkspaceStatus } from "../dist/status/index.js";
import { run } from "../dist/cli.js";

function git(args, cwd) {
  return execFileSync("git", args, {
    cwd,
    encoding: "utf8",
    env: {
      ...process.env,
      GIT_AUTHOR_NAME: "AIX Tests",
      GIT_AUTHOR_EMAIL: "aix@example.test",
      GIT_COMMITTER_NAME: "AIX Tests",
      GIT_COMMITTER_EMAIL: "aix@example.test"
    }
  }).trim();
}

function validRoleMarkdown(overrides = "") {
  return `---
name: quality-engineer
description: Designs targeted verification and regression coverage for planned work.
tools: Read, Glob, Grep, Bash
model: inherit
maxTurns: 4
skills:
  - work-verify
color: green
${overrides}---

# Purpose

Design targeted verification.

# When To Use

Use for test and acceptance planning.

# Context To Inspect

Read plans, design docs, changed files, and tests.

# Skills To Consider

Consider work-verify.

# Stop Conditions

Stop on unclear scope or unsafe verification.

# Expected Output

Return commands, evidence, gaps, and risk.
`;
}

async function createRoleGitSource() {
  const directory = await mkdtemp(join(tmpdir(), "aix-role-source-"));

  mkdirSync(join(directory, "roles/aix-dev"), { recursive: true });
  writeFileSync(join(directory, "roles/aix-dev/quality-engineer.md"), validRoleMarkdown(), "utf8");
  git(["init", "-b", "main"], directory);
  git(["add", "."], directory);
  git(["commit", "-m", "roles"], directory);

  return {
    directory,
    commit: git(["rev-parse", "HEAD"], directory)
  };
}

async function withProject(callback) {
  const projectRoot = await mkdtemp(join(tmpdir(), "aix-role-project-"));
  const previousCwd = process.cwd();

  process.chdir(projectRoot);

  try {
    await callback(projectRoot);
  } finally {
    process.chdir(previousCwd);
  }
}

test("role path helpers return canonical package and active paths", () => {
  assert.equal(packageRolePath("fixture", "roles/quality-engineer.md"), ".agents/packages/roles/fixture/roles/quality-engineer.md");
  assert.equal(activeRolePath("quality-engineer"), ".agents/roles/quality-engineer.md");
  assert.equal(workflowRoleSourcePath("project-dev", "quality-engineer.md"), "roles/project-dev/quality-engineer.md");
  assert.equal(bundledAixRolePackPath("aix-dev"), "aix/roles/aix-dev");
});

test("parseRoleFile preserves front matter hints and body", () => {
  const role = parseRoleFile(validRoleMarkdown("routing: explicit\n"), "quality-engineer.md");

  assert.equal(role.name, "quality-engineer");
  assert.equal(role.description, "Designs targeted verification and regression coverage for planned work.");
  assert.equal(role.hints.tools, "Read, Glob, Grep, Bash");
  assert.equal(role.hints.model, "inherit");
  assert.equal(role.hints.maxTurns, 4);
  assert.deepEqual(role.hints.skills, ["work-verify"]);
  assert.equal(role.hints.color, "green");
  assert.equal(role.frontMatter.routing, "explicit");
  assert.match(role.body, /# Purpose/);
});

test("resolveRoleDelegation resolves explicit role prompts and builds prompt-overlay fallback", () => {
  const role = parseRoleFile(validRoleMarkdown(), "quality-engineer.md");
  const resolution = resolveRoleDelegation("use quality-engineer to plan verification", [role]);

  assert.equal(resolution.mode, "prompt-overlay");
  assert.equal(resolution.role.name, "quality-engineer");

  const prompt = buildPromptOverlayDelegation(role, "Plan verification for the role workflow changes.");

  assert.match(prompt, /Mode: prompt-overlay fallback/);
  assert.match(prompt, /Name: quality-engineer/);
  assert.match(prompt, /The parent context owns plan state, worktree safety, verification review, and final decisions/);
  assert.match(prompt, /Plan verification for the role workflow changes/);
  assert.match(prompt, /# Purpose/);
  assert.match(prompt, /Return findings, recommended next actions/);
});

test("resolveRoleDelegation stops on missing and ambiguous role prompts", () => {
  const qualityEngineer = parseRoleFile(validRoleMarkdown(), "quality-engineer.md");
  const documentationSpecialist = parseRoleFile(
    validRoleMarkdown().replaceAll("quality-engineer", "documentation-specialist"),
    "documentation-specialist.md"
  );

  assert.throws(
    () => resolveRoleDelegation("delegate to missing-role for this task", [qualityEngineer]),
    /Unknown role for delegation: missing-role/
  );

  assert.throws(
    () => resolveRoleDelegation("use quality-engineer or documentation-specialist", [qualityEngineer, documentationSpecialist]),
    /Ambiguous role delegation: quality-engineer, documentation-specialist/
  );
});

test("resolveRoleDelegation keeps implicit routing conservative", () => {
  const role = parseRoleFile(validRoleMarkdown(), "quality-engineer.md");

  assert.equal(resolveRoleDelegation("please review the verification plan", [role]), undefined);
});

test("prompt-overlay delegation does not write host-native agent files", async () => {
  const projectRoot = await mkdtemp(join(tmpdir(), "aix-role-host-compat-"));
  const originalCwd = process.cwd();
  const role = parseRoleFile(validRoleMarkdown(), "quality-engineer.md");

  try {
    process.chdir(projectRoot);

    const prompt = buildPromptOverlayDelegation(role, "Review verification without exposing host-native agents.");

    assert.match(prompt, /Mode: prompt-overlay fallback/);
    assert.equal(existsSync(join(projectRoot, ".claude/agents/quality-engineer.md")), false);
    assert.equal(existsSync(join(projectRoot, ".codex/agents/quality-engineer.md")), false);
    assert.equal(existsSync(join(projectRoot, ".agents/agents/quality-engineer.md")), false);
  } finally {
    process.chdir(originalCwd);
  }
});

test("parseRoleFile rejects missing front matter", () => {
  assert.throws(
    () => parseRoleFile("# Purpose\n\nNo front matter.", "missing.md"),
    /must start with YAML front matter/
  );
});

test("parseRoleFile validates required name and description", () => {
  assert.throws(
    () => parseRoleFile("---\nname: quality-engineer\n---\n\n# Purpose\n", "missing-description.md"),
    /must declare a non-empty description/
  );
});

test("parseRoleFile validates lowercase hyphenated names and rejects colons", () => {
  assert.throws(
    () => parseRoleFile(validRoleMarkdown().replace("quality-engineer", "QualityEngineer"), "bad-name.md"),
    /must use lowercase letters, numbers, and hyphens/
  );

  assert.throws(
    () => parseRoleFile(validRoleMarkdown().replace("quality-engineer", "team:quality-engineer"), "scoped-name.md"),
    /must not contain ":"/
  );
});

test("parseRoleFile treats skills metadata as safe hints, not dependency lookups", () => {
  const role = parseRoleFile(validRoleMarkdown().replace("work-verify", "missing-but-well-formed"), "quality-engineer.md");

  assert.deepEqual(role.hints.skills, ["missing-but-well-formed"]);
});

test("parseRoleFile rejects invalid skill reference shape", () => {
  assert.throws(
    () => parseRoleFile(validRoleMarkdown().replace("work-verify", "bad:skill"), "quality-engineer.md"),
    /role skill reference: bad:skill must not contain ":"/
  );
});

test("roleContractIssues catches missing sections without matching prose", () => {
  const role = parseRoleFile(`---
name: quality-engineer
description: Designs targeted verification.
---

# Purpose

Design verification.
`, "quality-engineer.md");

  assert.deepEqual(roleContractIssues(role), [
    "Role quality-engineer is missing required section: when to use.",
    "Role quality-engineer is missing required section: context to inspect.",
    "Role quality-engineer is missing required section: skills to consider.",
    "Role quality-engineer is missing required section: stop conditions.",
    "Role quality-engineer is missing required section: expected output."
  ]);
  assert.throws(() => assertRoleContract(role), /missing required section: when to use/);
});

test("discoverRoles scans Markdown role files and requires filename/name agreement", async () => {
  const directory = await mkdtemp(join(tmpdir(), "aix-roles-"));

  mkdirSync(join(directory, "project-dev"), { recursive: true });
  writeFileSync(join(directory, "project-dev/quality-engineer.md"), validRoleMarkdown(), "utf8");
  writeFileSync(join(directory, "notes.txt"), "ignored\n", "utf8");

  assert.deepEqual(discoverRoles(directory), [
    {
      path: "project-dev/quality-engineer.md",
      name: "quality-engineer",
      description: "Designs targeted verification and regression coverage for planned work."
    }
  ]);

  writeFileSync(join(directory, "project-dev/wrong.md"), validRoleMarkdown(), "utf8");

  assert.throws(
    () => parseRoleFileFromPath(join(directory, "project-dev/wrong.md")),
    /name quality-engineer must match filename wrong/
  );
});

test("assertNoActiveRoleNameCollision permits same role and rejects different source", () => {
  const lockfile = {
    roles: [
      {
        kind: "role",
        source: "fixture",
        sourceType: "git",
        sourcePath: "roles/quality-engineer.md",
        packagePath: ".agents/packages/roles/fixture/roles/quality-engineer.md",
        activationPath: ".agents/roles/quality-engineer.md",
        originalName: "quality-engineer",
        activeName: "quality-engineer",
        requested: true,
        packageFiles: [],
        activeFiles: []
      }
    ]
  };

  assert.doesNotThrow(() => assertNoActiveRoleNameCollision(lockfile, "quality-engineer", "fixture", "roles/quality-engineer.md"));
  assert.throws(
    () => assertNoActiveRoleNameCollision(lockfile, "quality-engineer", "other", "roles/quality-engineer.md"),
    /Active role name collision: quality-engineer/
  );
});

test("discoverRoles reports the bundled AIX development role pack", () => {
  const roles = discoverRoles("aix/roles");

  assert.deepEqual(
    roles.map((role) => role.name),
    [
      "aix-agent-instructions-auditor",
      "aix-package-safety-reviewer",
      "aix-release-readiness-specialist",
      "aix-skill-author",
      "aix-workflow-architect"
    ]
  );

  for (const role of roles) {
    assertRoleContract(parseRoleFileFromPath(join("aix/roles", role.path)));
  }
});

test("discoverRoles reports shipped workflow-owned project development roles", () => {
  const roles = discoverRoles("aix/workflows/design-plan-execute/roles/project-dev");

  assert.deepEqual(
    roles.map((role) => role.name),
    [
      "documentation-specialist",
      "implementation-engineer",
      "product-designer",
      "product-strategist",
      "quality-engineer",
      "requirements-engineer",
      "security-engineer",
      "technical-architect",
      "ux-writer"
    ]
  );

  for (const role of roles) {
    assertRoleContract(parseRoleFileFromPath(join("aix/workflows/design-plan-execute/roles/project-dev", role.path)));
  }
});

test("resolveRoleDelegation delegates to the shipped implementation engineer role", () => {
  const role = parseRoleFileFromPath("aix/workflows/design-plan-execute/roles/project-dev/implementation-engineer.md");
  const resolution = resolveRoleDelegation("use implementation-engineer to split this phase into tasks", [role]);
  const prompt = buildPromptOverlayDelegation(role, "Review task boundaries, changed files, docs impact, and verification handoff.");

  assert.equal(resolution.role.name, "implementation-engineer");
  assert.equal(resolution.mode, "prompt-overlay");
  assert.match(prompt, /Name: implementation-engineer/);
  assert.match(prompt, /Review accepted design intent, implementation phases, active tasks/);
  assert.match(prompt, /Treat `.agents\/engineering-best-practices\.md` as binding implementation/);
  assert.match(prompt, /If\s+`.agents\/coding-standards\.md` exists, treat it as binding local coding/);
  assert.match(prompt, /apply general best-practice standards for readability, naming/);
  assert.match(prompt, /Scoped implementation objective and the smallest coherent next slice/);
  assert.match(prompt, /Likely changed files, tests, fixtures, docs/);
  assert.match(prompt, /Coding-standard concerns, local convention mismatches/);
  assert.match(prompt, /Verification handoff with targeted checks/);
  assert.match(prompt, /Do not claim implementation readiness unless the task is scoped/);
  assert.match(prompt, /The parent context owns plan state, worktree safety, verification review, and final decisions/);
});

test("resolveRoleDelegation delegates to the shipped documentation specialist role", () => {
  const role = parseRoleFileFromPath("aix/workflows/design-plan-execute/roles/project-dev/documentation-specialist.md");
  const resolution = resolveRoleDelegation("delegate to documentation-specialist for docs impact", [role]);
  const prompt = buildPromptOverlayDelegation(role, "Review documentation impact, design promotion, and current-state accuracy.");

  assert.equal(resolution.role.name, "documentation-specialist");
  assert.equal(resolution.mode, "prompt-overlay");
  assert.match(prompt, /Name: documentation-specialist/);
  assert.match(prompt, /Review plans, knowledge-base docs, README text, workflow docs/);
  assert.match(prompt, /Suggested `_docs` placement, index-link changes/);
  assert.match(prompt, /Current-state accuracy risks, stale claims, missing knowledge-base truth/);
  assert.match(prompt, /Implementation-to-intent findings/);
  assert.match(prompt, /implementation that appears contrary to accepted current-state docs/);
  assert.match(prompt, /Consider `review-and-refresh-docs` when the main need is checking or fixing/);
  assert.match(prompt, /Do not claim documentation readiness unless current-state behavior/);
  assert.match(prompt, /The parent context owns plan state, worktree safety, verification review, and final decisions/);
});

test("resolveRoleDelegation delegates to the shipped product strategist role", () => {
  const role = parseRoleFileFromPath("aix/workflows/design-plan-execute/roles/project-dev/product-strategist.md");
  const resolution = resolveRoleDelegation("delegate to product-strategist for this feature idea", [role]);
  const prompt = buildPromptOverlayDelegation(role, "Review whether role lifecycle smoke tests should be in Phase 6.");

  assert.equal(resolution.role.name, "product-strategist");
  assert.equal(resolution.mode, "prompt-overlay");
  assert.match(prompt, /Name: product-strategist/);
  assert.match(prompt, /Generate and evaluate product ideas/);
  assert.match(prompt, /Candidate ideas when the task is pure brainstorming/);
  assert.match(prompt, /Product value and why it matters now/);
  assert.match(prompt, /The parent context owns plan state, worktree safety, verification review, and final decisions/);
});

test("resolveRoleDelegation delegates to the shipped product designer role", () => {
  const role = parseRoleFileFromPath("aix/workflows/design-plan-execute/roles/project-dev/product-designer.md");
  const resolution = resolveRoleDelegation("use product-designer to review this plan", [role]);
  const prompt = buildPromptOverlayDelegation(role, "Review the onboarding flow in this backlog plan.");

  assert.equal(resolution.role.name, "product-designer");
  assert.equal(resolution.mode, "prompt-overlay");
  assert.match(prompt, /Name: product-designer/);
  assert.match(prompt, /Review product-facing plans, workflows, screens, prompts, prototypes/);
  assert.match(prompt, /Primary user flow and whether it is complete enough to implement/);
  assert.match(prompt, /Accessibility and usability expectations/);
  assert.match(prompt, /The parent context owns plan state, worktree safety, verification review, and final decisions/);
});

test("resolveRoleDelegation delegates to the shipped technical architect role", () => {
  const role = parseRoleFileFromPath("aix/workflows/design-plan-execute/roles/project-dev/technical-architect.md");
  const resolution = resolveRoleDelegation("delegate to technical-architect for architecture review", [role]);
  const prompt = buildPromptOverlayDelegation(role, "Review whether the workflow install preview plan has clean module boundaries.");

  assert.equal(resolution.role.name, "technical-architect");
  assert.equal(resolution.mode, "prompt-overlay");
  assert.match(prompt, /Name: technical-architect/);
  assert.match(prompt, /Review technical plans, design intent, architecture notes/);
  assert.match(prompt, /Boundary assessment for modules, commands, files, persistence, and runtime/);
  assert.match(prompt, /Suggested implementation phase order and the smallest coherent next slices/);
  assert.match(prompt, /The parent context owns plan state, worktree safety, verification review, and final decisions/);
});

test("resolveRoleDelegation delegates to the shipped requirements engineer role", () => {
  const role = parseRoleFileFromPath("aix/workflows/design-plan-execute/roles/project-dev/requirements-engineer.md");
  const resolution = resolveRoleDelegation("use requirements-engineer to refine this Design Intent", [role]);
  const prompt = buildPromptOverlayDelegation(role, "Review whether requirements are ready before implementation phases are drafted.");

  assert.equal(resolution.role.name, "requirements-engineer");
  assert.equal(resolution.mode, "prompt-overlay");
  assert.match(prompt, /Name: requirements-engineer/);
  assert.match(prompt, /Review accepted product vision and turn it into implementation-ready/);
  assert.match(prompt, /Requirements brief with actors, workflows, inputs, outputs/);
  assert.match(prompt, /Non-goals and deferred work that prevent scope creep/);
  assert.match(prompt, /Do not claim implementation readiness unless the requirements/);
  assert.match(prompt, /The parent context owns plan state, worktree safety, verification review, and final decisions/);
});

test("resolveRoleDelegation delegates to the shipped security engineer role", () => {
  const role = parseRoleFileFromPath("aix/workflows/design-plan-execute/roles/project-dev/security-engineer.md");
  const resolution = resolveRoleDelegation("use security-engineer to review this plan", [role]);
  const prompt = buildPromptOverlayDelegation(role, "Review trust boundaries and no-write guarantees before closeout.");

  assert.equal(resolution.role.name, "security-engineer");
  assert.equal(resolution.mode, "prompt-overlay");
  assert.match(prompt, /Name: security-engineer/);
  assert.match(prompt, /Review plans, design intent, verification evidence, and completed phased work/);
  assert.match(prompt, /Trust-boundary and authorization assessment/);
  assert.match(prompt, /Blocking findings that should become normal plan tasks before closeout/);
  assert.match(prompt, /The parent context owns plan state, worktree safety, verification review, and final decisions/);
});

test("resolveRoleDelegation delegates to the shipped UX writer role", () => {
  const role = parseRoleFileFromPath("aix/workflows/design-plan-execute/roles/project-dev/ux-writer.md");
  const resolution = resolveRoleDelegation("use ux-writer to review this command output", [role]);
  const prompt = buildPromptOverlayDelegation(role, "Review the labels, errors, empty states, and README language in this plan.");

  assert.equal(resolution.role.name, "ux-writer");
  assert.equal(resolution.mode, "prompt-overlay");
  assert.match(prompt, /Name: ux-writer/);
  assert.match(prompt, /Review plans, design docs, workflow docs, README text/);
  assert.match(prompt, /Consider `design-promote` when completed work changed durable copy/);
  assert.match(prompt, /Consider `plan-complete` when closeout needs a final copy-readiness check/);
  assert.match(prompt, /Consider `unslop` when it is installed/);
  assert.match(prompt, /Target reader and task the copy must support/);
  assert.match(prompt, /Missing copy states, recovery guidance, or user actions/);
  assert.match(prompt, /The parent context owns plan state, worktree safety, verification review, and final decisions/);
});

test("resolveRoleDelegation delegates to the shipped quality engineer role", () => {
  const role = parseRoleFileFromPath("aix/workflows/design-plan-execute/roles/project-dev/quality-engineer.md");
  const resolution = resolveRoleDelegation("use quality-engineer to plan verification", [role]);
  const prompt = buildPromptOverlayDelegation(role, "Review targeted checks, regression risk, and validation gaps for this phase.");

  assert.equal(resolution.role.name, "quality-engineer");
  assert.equal(resolution.mode, "prompt-overlay");
  assert.match(prompt, /Name: quality-engineer/);
  assert.match(prompt, /Review plans, active phase work, changed behavior, verification evidence/);
  assert.match(prompt, /design intent is locked down by automated tests/);
  assert.match(prompt, /Targeted automated checks and why each check matches the changed behavior/);
  assert.match(prompt, /Repeatable unit, integration, and smoke tests that avoid developer-state/);
  assert.match(prompt, /Coverage metrics or missing coverage-tooling notes/);
  assert.match(prompt, /Skipped checks, reason, residual risk/);
  assert.match(prompt, /100% line coverage is not automatically useful/);
  assert.match(prompt, /developer approval before installing packages/);
  assert.match(prompt, /Do not claim quality readiness unless accepted Design Intent/);
  assert.match(prompt, /The parent context owns plan state, worktree safety, verification review, and final decisions/);
});

test("shipped project development roles can route existing-plan edits through plan-update", () => {
  const roleNames = [
    "documentation-specialist",
    "implementation-engineer",
    "product-designer",
    "product-strategist",
    "quality-engineer",
    "requirements-engineer",
    "security-engineer",
    "technical-architect",
    "ux-writer"
  ];

  for (const roleName of roleNames) {
    const rolePath = `aix/workflows/design-plan-execute/roles/project-dev/${roleName}.md`;
    const role = parseRoleFileFromPath(rolePath);
    const markdown = readFileSync(rolePath, "utf8");

    assert.ok(role.hints.skills.includes("plan-update"), `${roleName} should list plan-update as a skill hint`);
    assert.match(markdown, /Consider `plan-update`/, `${roleName} should explain when plan-update is useful`);
    assert.match(markdown, /without\s+changing lifecycle state/, `${roleName} should preserve plan-update lifecycle boundaries`);
  }
});

test("role CLI adds, lists, activates, reports, and deactivates standalone roles", async () => {
  const gitSource = await createRoleGitSource();
  const cacheRoot = await mkdtemp(join(tmpdir(), "aix-role-cache-"));
  const previousCache = process.env.AIX_CACHE_DIR;

  process.env.AIX_CACHE_DIR = cacheRoot;

  await withProject(async (projectRoot) => {
    const add = run(["roles", "add", gitSource.directory, "fixture"]);

    assert.equal(add.exitCode, 0);
    assert.match(add.stdout, /Added roles source fixture/);
    assert.match(add.stdout, /Discovered 1 roles/);
    assert.equal(existsSync(join(cacheRoot, "metadata/roles-fixture.json")), true);
    assert.equal(existsSync(join(projectRoot, ".agents/roles")), false);

    const list = run(["roles", "list", "fixture"]);
    const activate = run(["role", "activate", "fixture/roles/aix-dev/quality-engineer", "test-quality-engineer"]);
    const activatedManifest = JSON.parse(readFileSync(join(projectRoot, "aix.json"), "utf8"));
    const status = run(["status"]);

    assert.match(list.stdout, /Roles in fixture:/);
    assert.match(list.stdout, /roles\/aix-dev\/quality-engineer\.md/);
    assert.match(list.stdout, /aix role activate fixture\/roles\/aix-dev\/quality-engineer\.md/);

    assert.match(activate.stdout, /Activated role fixture\/roles\/aix-dev\/quality-engineer\.md as test-quality-engineer/);
    assert.deepEqual(activatedManifest.roles, [
      {
        source: "fixture",
        path: "roles/aix-dev/quality-engineer.md",
        alias: "test-quality-engineer"
      }
    ]);
    assert.equal(existsSync(join(projectRoot, ".agents/packages/roles/fixture/roles/aix-dev/quality-engineer.md")), true);
    assert.equal(existsSync(join(projectRoot, ".agents/roles/test-quality-engineer.md")), true);
    assert.match(status.stdout, /Role sources[\s\S]*fixture/);
    assert.match(status.stdout, /Active roles[\s\S]*test-quality-engineer/);

    const deactivate = run(["role", "deactivate", "test-quality-engineer"]);
    const manifest = JSON.parse(readFileSync(join(projectRoot, "aix.json"), "utf8"));
    const lockfile = JSON.parse(readFileSync(join(projectRoot, "aix.lock.json"), "utf8"));

    assert.match(deactivate.stdout, /Deactivated role test-quality-engineer/);
    assert.deepEqual(manifest.roles, []);
    assert.deepEqual(lockfile.roles, []);
    assert.equal(existsSync(join(projectRoot, ".agents/roles/test-quality-engineer.md")), false);

    const remove = run(["roles", "remove", "fixture"]);
    const removedManifest = JSON.parse(readFileSync(join(projectRoot, "aix.json"), "utf8"));

    assert.equal(remove.exitCode, 0, remove.stderr);
    assert.match(remove.stdout, /Removed roles source fixture/);
    assert.equal(removedManifest.sources.roles.fixture, undefined);
    assert.equal(existsSync(join(cacheRoot, "metadata/roles-fixture.json")), false);
  });

  if (previousCache === undefined) {
    delete process.env.AIX_CACHE_DIR;
  } else {
    process.env.AIX_CACHE_DIR = previousCache;
  }
});

test("role CLI diffs and updates standalone roles", async () => {
  const gitSource = await createRoleGitSource();
  const cacheRoot = await mkdtemp(join(tmpdir(), "aix-role-cache-"));
  const previousCache = process.env.AIX_CACHE_DIR;

  process.env.AIX_CACHE_DIR = cacheRoot;

  await withProject(async (projectRoot) => {
    run(["roles", "add", gitSource.directory, "fixture"]);
    run(["role", "activate", "fixture/roles/aix-dev/quality-engineer"]);

    writeFileSync(
      join(gitSource.directory, "roles/aix-dev/quality-engineer.md"),
      validRoleMarkdown().replace("Return commands, evidence, gaps, and risk.", "Return updated evidence and risk."),
      "utf8"
    );
    git(["add", "."], gitSource.directory);
    git(["commit", "-m", "update role"], gitSource.directory);

    const diff = run(["role", "diff", "quality-engineer"]);
    const update = run(["roles", "update"]);
    const lockfile = JSON.parse(readFileSync(join(projectRoot, "aix.lock.json"), "utf8"));

    assert.match(diff.stdout, /Diff for fixture\/roles\/aix-dev\/quality-engineer\.md as quality-engineer/);
    assert.match(diff.stdout, /Return updated evidence and risk/);
    assert.equal(update.exitCode, 0, update.stderr);
    assert.match(update.stdout, /Updated locked roles/);
    assert.match(readFileSync(join(projectRoot, ".agents/roles/quality-engineer.md"), "utf8"), /Return updated evidence and risk/);
    assert.equal(lockfile.roles[0].resolvedCommit, git(["rev-parse", "HEAD"], gitSource.directory));
  });

  if (previousCache === undefined) {
    delete process.env.AIX_CACHE_DIR;
  } else {
    process.env.AIX_CACHE_DIR = previousCache;
  }
});

test("role activation resolves aix/roles paths from local project source first", async () => {
  await withProject(async (projectRoot) => {
    mkdirSync(join(projectRoot, "aix/roles/local-pack"), { recursive: true });
    writeFileSync(join(projectRoot, "aix/roles/local-pack/quality-engineer.md"), validRoleMarkdown(), "utf8");
    writeFileSync(
      join(projectRoot, "aix.json"),
      JSON.stringify({ sources: { roles: {} }, skills: [], roles: [] }, null, 2) + "\n",
      "utf8"
    );

    const result = run(["role", "activate", "aix/roles/local-pack/quality-engineer"]);
    const lockfile = JSON.parse(readFileSync(join(projectRoot, "aix.lock.json"), "utf8"));

    assert.equal(result.exitCode, 0);
    assert.match(result.stdout, /Activated role aix\/roles\/local-pack\/quality-engineer\.md as quality-engineer/);
    assert.equal(lockfile.roles[0].sourceType, "local");
    assert.equal(lockfile.roles[0].sourcePath, "roles/local-pack/quality-engineer.md");
    assert.equal(existsSync(join(projectRoot, "aix/roles/local-pack/quality-engineer.md")), true);
  });
});

test("skill deactivation refuses role-owned skills", async () => {
  await withProject(async (projectRoot) => {
    mkdirSync(join(projectRoot, ".agents/packages/skills/fixture/skills/helper"), { recursive: true });
    mkdirSync(join(projectRoot, ".agents/skills/helper"), { recursive: true });
    writeFileSync(join(projectRoot, ".agents/packages/skills/fixture/skills/helper/SKILL.md"), "---\nname: helper\n---\n", "utf8");
    writeFileSync(join(projectRoot, ".agents/skills/helper/SKILL.md"), "---\nname: helper\n---\n", "utf8");
    writeFileSync(
      join(projectRoot, "aix.json"),
      JSON.stringify({ skills: [] }, null, 2) + "\n",
      "utf8"
    );
    writeFileSync(
      join(projectRoot, "aix.lock.json"),
      JSON.stringify(
        {
          lockfileVersion: 1,
          skills: [
            {
              kind: "skill",
              source: "fixture",
              sourceType: "git",
              sourcePath: "skills/helper",
              packagePath: ".agents/packages/skills/fixture/skills/helper",
              activationPath: ".agents/skills/helper",
              originalName: "helper",
              activeName: "helper",
              requested: false,
              owner: {
                kind: "role",
                name: "quality-engineer"
              },
              packageFiles: [],
              activeFiles: []
            }
          ],
          roles: [],
          workflows: []
        },
        null,
        2
      ) + "\n",
      "utf8"
    );

    const result = run(["skill", "deactivate", "helper"]);

    assert.equal(result.exitCode, 2);
    assert.match(result.stderr, /Cannot deactivate helper directly because it is owned by role quality-engineer/);
  });
});

test("activateRoleFromDefinitions materializes active role files and lockfile hashes", async () => {
  const gitSource = await createRoleGitSource();
  const cacheRoot = await mkdtemp(join(tmpdir(), "aix-role-cache-"));

  await withProject(async (projectRoot) => {
    const result = activateRoleFromDefinitions(
      "fixture/aix-dev/quality-engineer",
      undefined,
      {
        fixture: {
          type: "git",
          url: gitSource.directory,
          path: "roles",
          ref: "main"
        }
      },
      cacheRoot
    );
    const lockfile = JSON.parse(readFileSync(join(projectRoot, "aix.lock.json"), "utf8"));

    assert.equal(result.activeName, "quality-engineer");
    assert.equal(result.originalName, "quality-engineer");
    assert.equal(lockfile.roles.length, 1);
    assert.equal(lockfile.roles[0].kind, "role");
    assert.equal(lockfile.roles[0].source, "fixture");
    assert.equal(lockfile.roles[0].sourceUrl, gitSource.directory);
    assert.equal(lockfile.roles[0].resolvedCommit, gitSource.commit);
    assert.equal(lockfile.roles[0].sourcePath, "aix-dev/quality-engineer.md");
    assert.equal(lockfile.roles[0].packagePath, ".agents/packages/roles/fixture/aix-dev/quality-engineer.md");
    assert.equal(lockfile.roles[0].activationPath, ".agents/roles/quality-engineer.md");
    assert.equal(lockfile.roles[0].originalName, "quality-engineer");
    assert.equal(lockfile.roles[0].activeName, "quality-engineer");
    assert.equal(lockfile.roles[0].requested, true);
    assert.ok(lockfile.roles[0].packageFiles.some((file) => file.path === "quality-engineer.md"));
    assert.ok(lockfile.roles[0].activeFiles.some((file) => file.path === "quality-engineer.md"));
    assert.equal(existsSync(join(projectRoot, ".agents/packages/roles/fixture/aix-dev/quality-engineer.md")), true);
    assert.equal(existsSync(join(projectRoot, ".agents/roles/quality-engineer.md")), true);
  });
});

test("activateRoleFromDefinitions supports aliases without changing package role name", async () => {
  const gitSource = await createRoleGitSource();
  const cacheRoot = await mkdtemp(join(tmpdir(), "aix-role-cache-"));

  await withProject(async (projectRoot) => {
    activateRoleFromDefinitions(
      "fixture/aix-dev/quality-engineer.md",
      "test-quality-engineer",
      {
        fixture: {
          type: "git",
          url: gitSource.directory,
          path: "roles",
          ref: "main"
        }
      },
      cacheRoot
    );

    const packageRole = readFileSync(join(projectRoot, ".agents/packages/roles/fixture/aix-dev/quality-engineer.md"), "utf8");
    const activeRole = readFileSync(join(projectRoot, ".agents/roles/test-quality-engineer.md"), "utf8");
    const lockfile = JSON.parse(readFileSync(join(projectRoot, "aix.lock.json"), "utf8"));

    assert.match(packageRole, /^name: quality-engineer$/m);
    assert.match(activeRole, /^name: test-quality-engineer$/m);
    assert.equal(lockfile.roles[0].alias, "test-quality-engineer");
  });
});

test("activateRoleFromDefinitions refuses active-name collisions before package writes", async () => {
  const gitSource = await createRoleGitSource();
  const cacheRoot = await mkdtemp(join(tmpdir(), "aix-role-cache-"));

  await withProject(async (projectRoot) => {
    mkdirSync(join(projectRoot, ".agents/roles"), { recursive: true });
    writeFileSync(join(projectRoot, ".agents/roles/quality-engineer.md"), "local role\n", "utf8");

    assert.throws(
      () =>
        activateRoleFromDefinitions(
          "fixture/aix-dev/quality-engineer",
          undefined,
          {
            fixture: {
              type: "git",
              url: gitSource.directory,
              path: "roles",
              ref: "main"
            }
          },
          cacheRoot
        ),
      /Active role name collision: \.agents\/roles\/quality-engineer\.md/
    );

    assert.equal(existsSync(join(projectRoot, ".agents/packages/roles/fixture/aix-dev/quality-engineer.md")), false);
  });
});

test("deactivateRole removes user-owned role files and refuses workflow-owned roles", async () => {
  const gitSource = await createRoleGitSource();
  const cacheRoot = await mkdtemp(join(tmpdir(), "aix-role-cache-"));

  await withProject(async (projectRoot) => {
    activateRoleFromDefinitions(
      "fixture/aix-dev/quality-engineer",
      undefined,
      {
        fixture: {
          type: "git",
          url: gitSource.directory,
          path: "roles",
          ref: "main"
        }
      },
      cacheRoot
    );

    const result = deactivateRole("quality-engineer");
    const lockfile = JSON.parse(readFileSync(join(projectRoot, "aix.lock.json"), "utf8"));

    assert.equal(result.activeName, "quality-engineer");
    assert.deepEqual(lockfile.roles, []);
    assert.equal(existsSync(join(projectRoot, ".agents/roles/quality-engineer.md")), false);
    assert.equal(existsSync(join(projectRoot, ".agents/packages/roles/fixture/aix-dev/quality-engineer.md")), false);

    writeFileSync(
      join(projectRoot, "aix.lock.json"),
      JSON.stringify(
        {
          lockfileVersion: 1,
          skills: [],
          roles: [
            {
              kind: "role",
              source: "aix",
              sourceType: "git",
              sourcePath: "roles/project-dev/documentation-specialist.md",
              packagePath: ".agents/packages/workflows/aix/design-plan-execute/roles/project-dev/documentation-specialist.md",
              activationPath: ".agents/roles/documentation-specialist.md",
              originalName: "documentation-specialist",
              activeName: "documentation-specialist",
              requested: false,
              owner: {
                kind: "workflow",
                name: "design-plan-execute"
              },
              packageFiles: [],
              activeFiles: []
            }
          ],
          workflows: []
        },
        null,
        2
      ) + "\n",
      "utf8"
    );

    assert.throws(
      () => deactivateRole("documentation-specialist"),
      /Cannot deactivate documentation-specialist directly because it is owned by workflow design-plan-execute/
    );
  });
});

test("verifyRoles and status report active role state and drift", async () => {
  const gitSource = await createRoleGitSource();
  const cacheRoot = await mkdtemp(join(tmpdir(), "aix-role-cache-"));

  await withProject(async (projectRoot) => {
    activateRoleFromDefinitions(
      "fixture/aix-dev/quality-engineer",
      undefined,
      {
        fixture: {
          type: "git",
          url: gitSource.directory,
          path: "roles",
          ref: "main"
        }
      },
      cacheRoot
    );

    const status = collectWorkspaceStatus();

    assert.equal(verifyRoles().issues.length, 0);
    assert.equal(status.activeRoles.length, 1);
    assert.equal(status.activeRoles[0].activeName, "quality-engineer");

    writeFileSync(join(projectRoot, ".agents/roles/quality-engineer.md"), "edited\n", "utf8");

    assert.match(verifyRoles().issues.join("\n"), /Refusing to remove modified active role/);
  });
});
