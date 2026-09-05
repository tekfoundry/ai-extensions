import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import {
  activateRoleFromDefinitions,
  assertNoActiveRoleNameCollision,
  assertBundledRoleGuidance,
  assertRoleContract,
  buildPromptOverlayDelegation,
  deactivateRole,
  discoverRoles,
  parseRoleFile,
  parseRoleFileFromPath,
  parseRoleGuidanceFile,
  resolveRoleDelegation,
  roleContractIssues,
  verifyRoles
} from "../dist/roles.js";
import { activeRolePath, bundledAixRolePackPath, packageRolePath, workflowRoleSourcePath } from "../dist/paths/agents.js";
import { collectWorkspaceStatus } from "../dist/status/index.js";
import { run } from "../dist/cli.js";

const roleEntry = "ROLE.md";
const guidanceEntry = "GUIDANCE.md";
const repoRoot = process.cwd();

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

function validRoleGuidanceMarkdown(body = "Use focused verification guidance.") {
  return `---
uses_guidance:
  - activities/verification
  - activities/review
---

# Quality Engineer Guidance

${body}
`;
}

function companionGuidanceMarkdown(body = "Use companion project-manager guidance.") {
  return `---
applies_to:
  roles:
    - project-manager
---

# Companion guidance

${body}
`;
}

async function createRoleGitSource(options = {}) {
  const directory = await mkdtemp(join(tmpdir(), "aix-role-source-"));

  mkdirSync(join(directory, "roles/aix-dev/quality-engineer"), { recursive: true });
  writeFileSync(join(directory, "roles/aix-dev/quality-engineer/ROLE.md"), validRoleMarkdown(), "utf8");
  if (options.guidance) {
    writeFileSync(join(directory, "roles/aix-dev/quality-engineer/GUIDANCE.md"), validRoleGuidanceMarkdown(), "utf8");
  }
  if (options.companionGuidance) {
    writeFileSync(join(directory, "roles/aix-dev/quality-engineer/workflow.GUIDANCE.md"), companionGuidanceMarkdown(), "utf8");
  }
  if (options.append) {
    writeFileSync(join(directory, "roles/aix-dev/quality-engineer/AGENTS.append.md"), "Use quality role append guidance.\n", "utf8");
  }
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
  assert.equal(packageRolePath("fixture", "roles/quality-engineer"), ".agents/packages/roles/fixture/roles/quality-engineer");
  assert.equal(activeRolePath("quality-engineer"), ".agents/roles/quality-engineer");
  assert.equal(workflowRoleSourcePath("project-dev", "quality-engineer"), "roles/project-dev/quality-engineer");
  assert.equal(bundledAixRolePackPath("aix-dev"), "aix/roles/aix-dev");
});

test("bundled roles declare Pi-compatible child tool names", () => {
  const rolePaths = [
    "aix/roles/project-manager/ROLE.md",
    "aix/roles/aix-dev/aix-agent-instructions-auditor/ROLE.md",
    "aix/roles/aix-dev/aix-package-safety-reviewer/ROLE.md",
    "aix/roles/aix-dev/aix-workflow-architect/ROLE.md",
    "aix/roles/aix-dev/aix-release-readiness-specialist/ROLE.md",
    "aix/roles/aix-dev/aix-skill-author/ROLE.md",
    "aix/workflows/design-plan-execute/roles/project-dev/security-engineer/ROLE.md",
    "aix/workflows/design-plan-execute/roles/project-dev/quality-engineer/ROLE.md",
    "aix/workflows/design-plan-execute/roles/project-dev/requirements-engineer/ROLE.md",
    "aix/workflows/design-plan-execute/roles/project-dev/ux-writer/ROLE.md",
    "aix/workflows/design-plan-execute/roles/project-dev/implementation-engineer/ROLE.md",
    "aix/workflows/design-plan-execute/roles/project-dev/technical-architect/ROLE.md",
    "aix/workflows/design-plan-execute/roles/project-dev/product-owner/ROLE.md",
    "aix/workflows/design-plan-execute/roles/project-dev/documentation-specialist/ROLE.md",
    "aix/workflows/design-plan-execute/roles/project-dev/product-designer/ROLE.md"
  ];

  for (const rolePath of rolePaths) {
    const role = parseRoleFileFromPath(rolePath);
    const expectedTools = rolePath.includes("aix/workflows/design-plan-execute/roles/project-dev/")
      ? "read, grep, find, ls, bash, edit, write, contact_supervisor"
      : undefined;
    if (expectedTools) {
      assert.equal(role.hints.tools, expectedTools, rolePath);
    } else {
      assert.match(role.hints.tools, /^(read, grep, find, ls|read, grep, find, ls, bash)$/u, rolePath);
    }
  }
});

test("parseRoleFile preserves front matter hints and body", () => {
  const role = parseRoleFile(validRoleMarkdown("routing: explicit\n"), "quality-engineer/ROLE.md");

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

test("parseRoleGuidanceFile preserves optional uses_guidance metadata", () => {
  const guidance = parseRoleGuidanceFile(validRoleGuidanceMarkdown(), "quality-engineer/GUIDANCE.md");

  assert.deepEqual(guidance.usesGuidance, ["activities/verification", "activities/review"]);
  assert.match(guidance.body, /Use focused verification guidance/);
});

test("resolveRoleDelegation resolves explicit role prompts and builds prompt-overlay fallback", () => {
  const role = parseRoleFile(validRoleMarkdown(), "quality-engineer/ROLE.md");
  const resolution = resolveRoleDelegation("use quality-engineer to plan verification", [role]);

  assert.equal(resolution.mode, "prompt-overlay");
  assert.equal(resolution.role.name, "quality-engineer");

  const prompt = buildPromptOverlayDelegation(role, "Plan verification for the role workflow changes.");

  assert.match(prompt, /Mode: prompt-overlay fallback/);
  assert.match(prompt, /Name: quality-engineer/);
  assert.match(prompt, /The parent context owns plan state, worktree safety, verification review, and final decisions/);
  assert.match(prompt, /parent context may route, preserve worktree safety, review returned evidence, and report results only/);
  assert.match(prompt, /must not run lifecycle skills, implementation, verification, lifecycle-state changes, or repo-changing work outside delegated roles/);
  assert.match(prompt, /Plan verification for the role workflow changes/);
  assert.match(prompt, /# Purpose/);
  assert.match(prompt, /Return findings, recommended next actions/);
});

test("resolveRoleDelegation stops on missing and ambiguous role prompts", () => {
  const qualityEngineer = parseRoleFile(validRoleMarkdown(), "quality-engineer/ROLE.md");
  const documentationSpecialist = parseRoleFile(
    validRoleMarkdown().replaceAll("quality-engineer", "documentation-specialist"),
    "documentation-specialist/ROLE.md"
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
  const role = parseRoleFile(validRoleMarkdown(), "quality-engineer/ROLE.md");

  assert.equal(resolveRoleDelegation("please review the verification plan", [role]), undefined);
});

test("prompt-overlay delegation does not write host-native agent files", async () => {
  const projectRoot = await mkdtemp(join(tmpdir(), "aix-role-host-compat-"));
  const originalCwd = process.cwd();
  const role = parseRoleFile(validRoleMarkdown(), "quality-engineer/ROLE.md");

  try {
    process.chdir(projectRoot);

    const prompt = buildPromptOverlayDelegation(role, "Review verification without exposing host-native agents.");

    assert.match(prompt, /Mode: prompt-overlay fallback/);
    assert.equal(existsSync(join(projectRoot, ".claude/agents/quality-engineer/ROLE.md")), false);
    assert.equal(existsSync(join(projectRoot, ".codex/agents/quality-engineer/ROLE.md")), false);
    assert.equal(existsSync(join(projectRoot, ".agents/agents/quality-engineer/ROLE.md")), false);
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
  const role = parseRoleFile(validRoleMarkdown().replace("work-verify", "missing-but-well-formed"), "quality-engineer/ROLE.md");

  assert.deepEqual(role.hints.skills, ["missing-but-well-formed"]);
});

test("parseRoleFile rejects invalid skill reference shape", () => {
  assert.throws(
    () => parseRoleFile(validRoleMarkdown().replace("work-verify", "bad:skill"), "quality-engineer/ROLE.md"),
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
`, "quality-engineer/ROLE.md");

  assert.deepEqual(roleContractIssues(role), [
    "Role quality-engineer is missing required section: when to use.",
    "Role quality-engineer is missing required section: context to inspect.",
    "Role quality-engineer is missing required section: skills to consider.",
    "Role quality-engineer is missing required section: stop conditions.",
    "Role quality-engineer is missing required section: expected output."
  ]);
  assert.throws(() => assertRoleContract(role), /missing required section: when to use/);
});

test("discoverRoles scans role bundles and requires bundle/name agreement", async () => {
  const directory = await mkdtemp(join(tmpdir(), "aix-roles-"));

  mkdirSync(join(directory, "project-dev/quality-engineer"), { recursive: true });
  writeFileSync(join(directory, "project-dev/quality-engineer/ROLE.md"), validRoleMarkdown(), "utf8");
  writeFileSync(join(directory, "project-dev/legacy.md"), validRoleMarkdown(), "utf8");
  writeFileSync(join(directory, "notes.txt"), "ignored\n", "utf8");

  assert.deepEqual(discoverRoles(directory), [
    {
      path: "project-dev/quality-engineer",
      name: "quality-engineer",
      description: "Designs targeted verification and regression coverage for planned work."
    }
  ]);

  mkdirSync(join(directory, "project-dev/wrong"), { recursive: true });
  writeFileSync(join(directory, "project-dev/wrong/ROLE.md"), validRoleMarkdown(), "utf8");

  assert.throws(
    () => parseRoleFileFromPath(join(directory, "project-dev/wrong/ROLE.md")),
    /name quality-engineer must match role bundle name wrong/
  );
});

test("assertNoActiveRoleNameCollision permits same role and rejects different source", () => {
  const lockfile = {
    roles: [
      {
        kind: "role",
        source: "fixture",
        sourceType: "git",
        sourcePath: "roles/quality-engineer",
        packagePath: ".agents/packages/roles/fixture/roles/quality-engineer",
        activationPath: ".agents/roles/quality-engineer",
        originalName: "quality-engineer",
        activeName: "quality-engineer",
        requested: true,
        packageFiles: [],
        activeFiles: []
      }
    ]
  };

  assert.doesNotThrow(() => assertNoActiveRoleNameCollision(lockfile, "quality-engineer", "fixture", "roles/quality-engineer"));
  assert.throws(
    () => assertNoActiveRoleNameCollision(lockfile, "quality-engineer", "other", "roles/quality-engineer"),
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
      "aix-workflow-architect",
      "project-manager"
    ]
  );

  for (const role of roles) {
    assertRoleContract(parseRoleFileFromPath(join("aix/roles", role.path, roleEntry)));
  }
});

test("bundled project-manager role has activation-owned append and companion guidance", async () => {
  await withProject(async (projectRoot) => {
    mkdirSync(join(projectRoot, "aix/roles"), { recursive: true });
    cpSync(join(repoRoot, "aix/roles/project-manager"), join(projectRoot, "aix/roles/project-manager"), { recursive: true });

    const activate = run(["role", "activate", "aix/roles/project-manager"]);
    const lockfile = JSON.parse(readFileSync(join(projectRoot, "aix.lock.json"), "utf8"));
    const agents = readFileSync(join(projectRoot, "AGENTS.md"), "utf8");

    assert.equal(activate.exitCode, 0, activate.stderr);
    assert.match(activate.stdout, /Activated role aix\/roles\/project-manager as project-manager/);
    assert.equal(lockfile.roles[0].source, "aix");
    assert.equal(lockfile.roles[0].sourceType, "local");
    assert.equal(lockfile.roles[0].sourcePath, "roles/project-manager");
    assert.equal(lockfile.roles[0].agentsMd.marker, "aix:role project-manager");
    assert.ok(lockfile.roles[0].packageFiles.some((file) => file.path === "workflow.GUIDANCE.md"));
    assert.deepEqual(lockfile.roles[0].activeFiles.map((file) => file.path), [roleEntry]);
    assert.equal(existsSync(join(projectRoot, ".agents/roles/project-manager/GUIDANCE.md")), true);
    assert.equal(existsSync(join(projectRoot, ".agents/roles/project-manager/workflow.GUIDANCE.md")), true);
    assert.match(agents, /<!-- aix:role project-manager start -->/);
    assert.match(agents, /adjacent\s+`\*\.GUIDANCE\.md` files/);

    const deactivate = run(["role", "deactivate", "project-manager"]);
    const updatedAgents = readFileSync(join(projectRoot, "AGENTS.md"), "utf8");

    assert.equal(deactivate.exitCode, 0, deactivate.stderr);
    assert.doesNotMatch(updatedAgents, /aix:role project-manager/);
    assert.equal(existsSync(join(projectRoot, ".agents/roles/project-manager")), false);
  });
});

function projectManagerGuidance() {
  return readFileSync(join(repoRoot, "aix/roles/project-manager/GUIDANCE.md"), "utf8");
}

function projectManagerRole() {
  return readFileSync(join(repoRoot, "aix/roles/project-manager/ROLE.md"), "utf8");
}

function projectManagerAppend() {
  return readFileSync(join(repoRoot, "aix/roles/project-manager/AGENTS.append.md"), "utf8");
}

function projectManagerWorkflowGuidance() {
  return readFileSync(join(repoRoot, "aix/roles/project-manager/workflow.GUIDANCE.md"), "utf8");
}

function routingProbeBlock(guidance, heading) {
  const pattern = new RegExp(`### ${heading}\\n\\n\`\`\`yaml\\n([\\s\\S]*?)\\n\`\`\``);
  const match = guidance.match(pattern);

  assert.ok(match, `Missing ${heading} routing probe`);

  return match[1];
}

function listAfter(block, key) {
  const match = block.match(new RegExp(`^  ${key}:\\n((?:    - .+\\n)*)`, "m"));

  if (!match) {
    return [];
  }

  return match[1]
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((line) => line.trim().replace(/^- /, ""));
}

test("bundled project-manager guidance defines PM Review mode", () => {
  const guidance = projectManagerGuidance();

  assert.match(guidance, /## PM Review Mode/);
  assert.match(guidance, /starts with `pm review`, ignoring case/);
  assert.match(guidance, /Accept the prefix with a colon, a hyphen, a spaced hyphen, or plain whitespace/);
  assert.match(guidance, /return a missing-prompt response/);
  assert.match(guidance, /mode: pm_review/);
  assert.match(guidance, /original_prompt: <prompt after prefix>/);
  assert.match(guidance, /guidance_plan:/);
  assert.match(guidance, /requesting_role: <role name>/);
  assert.match(guidance, /requesting_skill: none \| <skill name>/);
  assert.match(guidance, /PM Review runs startup classification only/);
  assert.match(guidance, /stop before delegation, file\s+edits, command execution, lifecycle changes, verification, or plan state\s+changes/);
  assert.match(guidance, /PM Review: complete Phase 4/);
  assert.match(guidance, /PM review - complete Phase 4/);
  assert.match(guidance, /pm review- complete Phase 4/);
  assert.match(guidance, /pm review complete Phase 4/);
});

test("bundled project-manager append enforces role-first entry routing", () => {
  const append = projectManagerAppend();

  assert.match(append, /the current parent session\s+acts as the project-manager/);
  assert.match(append, /Do not spawn `project-manager` as a child for ordinary\s+user prompts/);
  assert.match(append, /Delegate only to specialist roles in the active workflow team/);
  assert.match(append, /do not spawn lifecycle skills such as `task-execute` as child agents/);
  assert.match(append, /Allowed bypasses are narrow/);
  assert.match(append, /PM Review/);
  assert.match(append, /tiny informational answers that require\s+no file reads, commands, lifecycle state, specialist judgment, or\s+safety-sensitive decisions/);
  assert.match(append, /bootstrapping before project-manager is active/);
  assert.match(append, /already-routed requests carrying PM routing context or a PM Context Packet/);
  assert.match(append, /explicit developer override/);
});

test("bundled project-manager guidance defines entry routing enforcement", () => {
  const guidance = projectManagerGuidance();

  assert.match(guidance, /## Entry Routing Enforcement/);
  assert.match(guidance, /repo-changing,\s+project-mutating, lifecycle-state, planning, verification, documentation, and\s+other meaningful AIX project requests start through it before specialist roles,\s+lifecycle skills, or file work/);
  assert.match(guidance, /Lifecycle skills are role-owned procedures\s+selected by the project-manager or delegated roles/);
  assert.match(guidance, /Allowed bypasses are narrow:/);
  assert.match(guidance, /PM Review mode/);
  assert.match(guidance, /tiny informational or conversational answers that require no file reads,\s+commands, lifecycle state, specialist judgment, or safety-sensitive decisions/);
  assert.match(guidance, /bootstrapping before `project-manager` is active/);
  assert.match(guidance, /requests already carrying PM routing context or a PM Context Packet/);
  assert.match(guidance, /explicit developer override/);
  assert.match(guidance, /stop and route through\s+`project-manager` first/);
});

test("bundled project-manager guidance defines delegation-cycle parent constraints", () => {
  const role = projectManagerRole();
  const guidance = projectManagerGuidance();
  const workflowGuidance = projectManagerWorkflowGuidance();

  assert.match(role, /repo-changing, project-mutating, lifecycle-state, planning, verification,\s+documentation, or other meaningful AIX project work, the current parent\s+session acts as project-manager/);
  assert.match(role, /The parent context must not\s+run lifecycle skills directly or\s+perform repo-changing work outside delegated roles/);

  assert.match(guidance, /## Delegation Cycle/);
  assert.match(guidance, /The parent session acting as `project-manager` classifies the request/);
  assert.match(guidance, /do not spawn the PM as a child/);
  assert.match(guidance, /The parent session acting as `project-manager` classifies the request,\s+chooses the smallest adequate\s+role sequence per request from available active roles, prepares\s+role-specific PM Context Packets, and delegates bounded work or review to\s+selected roles/);
  assert.match(guidance, /Delegated roles own the implementation, verification, documentation, review,\s+or lifecycle-skill procedure named in their assignment/);
  assert.match(guidance, /The parent context may preserve worktree safety, review returned\s+evidence, ask\s+blocking questions, and report results/);
  assert.match(guidance, /It must not implement,\s+verify, run\s+lifecycle skills directly, change lifecycle state, edit repository files, or\s+perform other repo-changing work outside delegated roles/);
  assert.match(guidance, /Parent review is minimal and exception-driven/);
  assert.match(guidance, /Trust delegated role evidence unless a role reports uncertainty, changed files\s+are out of scope, tests fail, evidence is incomplete, safety-sensitive behavior\s+changed, or another role needs exact file content/);
  assert.match(guidance, /Re-read delegated files only\s+for those concrete exceptions/);
  assert.match(guidance, /Only roles listed in the active workflow `team\.md` are eligible child agents/);
  assert.match(guidance, /Lifecycle skills, including `task-execute`, are procedures used by an assigned\s+role and are never child-agent targets/);
  assert.match(guidance, /`project-manager` stays a thin router/);
  assert.match(guidance, /should not become the executor for\s+implementation, verification, documentation refreshes, lifecycle-skill work, or\s+repo changes/);
  assert.match(guidance, /Choose roles dynamically per request from available active roles/);
  assert.match(guidance, /zero roles with\s+handback when no team role fits, one role when one role can own the work, or\s+multiple roles in dependency order/);

  assert.match(workflowGuidance, /Skills are role-owned procedures/);
  assert.match(workflowGuidance, /delegated role\s+may use the lifecycle skill named by the assignment/);
  assert.match(workflowGuidance, /calling parent context\s+must not run lifecycle skills directly to implement, verify, change lifecycle\s+state, or perform repo-changing work outside delegated roles/);
  assert.match(workflowGuidance, /Parent review should trust delegated role evidence and stay exception-driven/);
  assert.match(workflowGuidance, /Re-read delegated files only when a role\s+reports uncertainty, changed files are out of scope, tests fail, evidence is\s+incomplete, safety-sensitive behavior changed, or another role needs exact file\s+content/);
  assert.match(workflowGuidance, /project-manager chooses the smallest adequate role sequence per\s+request/);
});

test("bundled project-manager guidance has exact PM Review routing probes", () => {
  const guidance = projectManagerGuidance();
  const cases = [
    {
      heading: "Small Informational Request",
      roles: [],
      activities: []
    },
    {
      heading: "Implementation Request",
      roles: ["implementation-engineer", "quality-engineer"],
      activities: ["implementation", "verification"]
    },
    {
      heading: "Documentation Request",
      roles: ["documentation-specialist", "quality-engineer"],
      activities: ["documentation", "verification"]
    },
    {
      heading: "Security-Sensitive Request",
      roles: ["security-engineer", "technical-architect", "implementation-engineer", "quality-engineer"],
      activities: ["review", "implementation", "verification"]
    },
    {
      heading: "Mixed Architecture Plus Implementation Request",
      roles: ["technical-architect", "implementation-engineer", "quality-engineer"],
      activities: ["review", "implementation", "verification"]
    },
    {
      heading: "Out-Of-Team Request",
      roles: [],
      activities: []
    }
  ];

  for (const probe of cases) {
    const block = routingProbeBlock(guidance, probe.heading);

    assert.deepEqual(listAfter(block, "roles"), probe.roles, probe.heading);
    assert.deepEqual(listAfter(block, "activities"), probe.activities, probe.heading);
    assert.match(block, /mode: pm_review/);
    assert.match(block, /task_context:/);
    assert.match(block, /sequencing_notes:/);
    assert.match(block, /abort_before:\n    - delegation\n    - file edits\n    - command execution\n    - lifecycle changes\n    - verification\n    - plan state changes/);
  }
});

test("PM Review routing probes avoid broad role fan-out and document guidance planning", () => {
  const guidance = projectManagerGuidance();
  const allRoleNames = [
    "requirements-engineer",
    "technical-architect",
    "security-engineer",
    "implementation-engineer",
    "quality-engineer",
    "documentation-specialist",
    "product-designer",
    "product-owner",
    "release-engineer",
    "ux-writer"
  ];

  for (const heading of [
    "Implementation Request",
    "Documentation Request",
    "Security-Sensitive Request",
    "Mixed Architecture Plus Implementation Request"
  ]) {
    const block = routingProbeBlock(guidance, heading);
    const roles = listAfter(block, "roles");

    assert.ok(roles.length > 0, heading);
    assert.ok(roles.length < allRoleNames.length, heading);
    assert.match(block, /guidance_plan:/);
    for (const role of roles) {
      assert.match(block, new RegExp(`role: ${role}[\\s\\S]*requesting_role: ${role}`), `${heading} missing ${role} guidance plan`);
    }
  }

  assert.match(routingProbeBlock(guidance, "Out-Of-Team Request"), /handback:/);
});

test("bundled project-manager guidance defines PM Context Packets", () => {
  const guidance = projectManagerGuidance();

  assert.match(guidance, /pm_context_packet:/);
  assert.match(guidance, /work_mode: active-plan \| backlog \| micro-fix \| informational \| handback \| unknown/);
  assert.match(guidance, /active_plan: none \| <plan path>/);
  assert.match(guidance, /selected_phase: none \| <phase name>/);
  assert.match(guidance, /selected_task: none \| <task name>/);
  assert.match(guidance, /accepted_decisions:/);
  assert.match(guidance, /known_constraints:/);
  assert.match(guidance, /relevant_files:/);
  assert.match(guidance, /required_reads:/);
  assert.match(guidance, /optional_reads:/);
  assert.match(guidance, /stop_conditions:/);
  assert.match(guidance, /guidance_plan:/);
  assert.match(guidance, /return_requirements:/);
  assert.match(guidance, /accepted_context:/);
  assert.match(guidance, /re_read_context:/);
  assert.match(guidance, /delegated role may accept low-risk orientation facts from it/);
  assert.match(guidance, /must still re-read files it will edit, verify, judge for\s+safety, or cite as evidence/);
  assert.match(guidance, /If no PM Context Packet is provided, the role should use its normal orientation\s+flow/);
  assert.match(guidance, /Do not pass a full running transcript/);
});

test("bundled project-manager guidance keeps parent review evidence-first", () => {
  const role = projectManagerRole();
  const guidance = projectManagerGuidance();

  assert.match(role, /Parent review should be minimal and\s+exception-driven/);
  assert.match(role, /trust delegated role evidence unless uncertainty,\s+out-of-scope changes, failed tests, incomplete evidence, safety-sensitive\s+changes, or another role's need for exact file content gives a concrete reason\s+to re-read files/);
  assert.match(guidance, /The parent may inspect status,\s+summaries, returned evidence, and command or diff metadata to route next steps/);
  assert.match(guidance, /Trust delegated role evidence unless a role reports uncertainty/);
  assert.doesNotMatch(guidance, /must re-read delegated files/i);
  assert.doesNotMatch(guidance, /always re-read delegated files/i);
});

test("project-manager defines direct Boss address and restrained language", () => {
  const role = projectManagerRole();
  const guidance = projectManagerGuidance();
  const workflowGuidance = readFileSync(join(repoRoot, "aix/roles/project-manager/workflow.GUIDANCE.md"), "utf8");

  for (const text of [role, guidance, workflowGuidance]) {
    assert.match(text, /Boss/);
    assert.match(text, /every direct|once per response|respectful and restrained/);
    assert.match(text, /warm and\s+respectful|respectful and restrained/);
    assert.match(text, /worker prompts|durable (?:operational )?records/);
  }
  assert.match(role, /acknowledgments, progress updates,\s+recommendations, completion reports/);
  assert.match(guidance, /decision requests/);
  assert.match(guidance, /exception\s+handbacks/);
});

test("shipped workflow roles support conditional PM Context Packet orientation", () => {
  const roleFiles = [
    "documentation-specialist",
    "implementation-engineer",
    "product-designer",
    "product-owner",
    "quality-engineer",
    "release-engineer",
    "requirements-engineer",
    "security-engineer",
    "technical-architect",
    "ux-writer"
  ].map((roleName) => join(repoRoot, `aix/workflows/design-plan-execute/roles/project-dev/${roleName}/ROLE.md`));

  for (const rolePath of roleFiles) {
    const role = readFileSync(rolePath, "utf8");

    assert.match(role, /If the project-manager provided a PM Context Packet/);
    assert.match(role, /Accept low-risk orientation facts from it/);
    assert.match(role, /Re-read the authority files this role will edit, verify, judge for safety, or cite as evidence/);
    assert.match(role, /use normal orientation instead/);
    assert.match(role, /When no PM Context Packet is provided/);
    assert.match(role, /accepted packet context when provided/);
    assert.match(role, /context re-read for authority/);
    assert.match(role, /handoff notes/);
  }
});

test("product-owner preserves strategist responsibilities and adds the PO loop", () => {
  const role = readFileSync("aix/workflows/design-plan-execute/roles/project-dev/product-owner/ROLE.md", "utf8");
  const guidance = readFileSync("aix/workflows/design-plan-execute/roles/project-dev/product-owner/GUIDANCE.md", "utf8");

  for (const phrase of [
    "idea generation", "audience fit", "user value", "scope", "tradeoffs", "prioritization", "sequencing",
    "backlog", "acceptance criteria", "refinement", "planning", "delivery-time", "product-level evaluation"
  ]) {
    assert.match(`${role}\n${guidance}`, new RegExp(phrase, "i"), phrase);
  }
  assert.match(guidance, /implementation, architecture, security,[\s\n]+quality, and release decisions/i);
  assert.match(guidance, /Boss retains final authority/i);
});

test("release-engineer declares DevOps scope, boundaries, and evidence in both files", () => {
  const role = readFileSync("aix/workflows/design-plan-execute/roles/project-dev/release-engineer/ROLE.md", "utf8");
  const guidance = readFileSync("aix/workflows/design-plan-execute/roles/project-dev/release-engineer/GUIDANCE.md", "utf8");

  for (const phrase of ["CI", "build", "package", "artifact", "supported-host", "cross-platform", "diagnostic", "rollback", "evidence"]) {
    assert.match(`${role}\n${guidance}`, new RegExp(phrase, "i"), phrase);
  }
  for (const phrase of ["publishing", "raw credential", "registry", "global-install", "unrestricted external", "Boss retains final release authority"]) {
    assert.match(`${role}\n${guidance}`, new RegExp(phrase.replace("-", "[- ]"), "i"), phrase);
  }
});

test("stale product-strategist requests are rejected by the shipped role set", () => {
  const roles = discoverRoles("aix/workflows/design-plan-execute/roles/project-dev")
    .map((entry) => parseRoleFileFromPath(`aix/workflows/design-plan-execute/roles/project-dev/${entry.path}/ROLE.md`));
  assert.equal(roles.some((role) => role.name === "product-strategist"), false);
  assert.throws(
    () => resolveRoleDelegation("use product-strategist to prioritize this idea", roles),
    /Unknown role for delegation: product-strategist/
  );
});

test("discoverRoles reports shipped workflow-owned project development roles", () => {
  const roles = discoverRoles("aix/workflows/design-plan-execute/roles/project-dev");

  assert.deepEqual(
    roles.map((role) => role.name),
    [
      "documentation-specialist",
      "implementation-engineer",
      "product-designer",
      "product-owner",
      "quality-engineer",
      "release-engineer",
      "requirements-engineer",
      "security-engineer",
      "technical-architect",
      "ux-writer"
    ]
  );

  for (const role of roles) {
    assertRoleContract(parseRoleFileFromPath(join("aix/workflows/design-plan-execute/roles/project-dev", role.path, roleEntry)));
  }
});

test("resolveRoleDelegation delegates to the shipped implementation engineer role", () => {
  const role = parseRoleFileFromPath("aix/workflows/design-plan-execute/roles/project-dev/implementation-engineer/ROLE.md");
  const resolution = resolveRoleDelegation("use implementation-engineer to split this phase into tasks", [role]);
  const prompt = buildPromptOverlayDelegation(role, "Review task boundaries, changed files, docs impact, and verification handoff.");

  assert.equal(resolution.role.name, "implementation-engineer");
  assert.equal(resolution.mode, "prompt-overlay");
  assert.match(prompt, /Name: implementation-engineer/);
  assert.match(prompt, /# Purpose/);
  assert.match(prompt, /GUIDANCE\.md/);
  assert.match(prompt, /Consider `task-execute`/);
  assert.match(prompt, /The parent context owns plan state, worktree safety, verification review, and final decisions/);
  assert.match(prompt, /Parent review is minimal and exception-driven/);
  assert.match(prompt, /trust delegated role evidence unless uncertainty, out-of-scope changes, failed tests, incomplete evidence, safety-sensitive changes, or another role's need for exact file content gives a concrete reason to re-read files/);
  assert.match(prompt, /must not run lifecycle skills, implementation, verification, lifecycle-state changes, or repo-changing work outside delegated roles/);
});

test("resolveRoleDelegation delegates to the shipped documentation specialist role", () => {
  const role = parseRoleFileFromPath("aix/workflows/design-plan-execute/roles/project-dev/documentation-specialist/ROLE.md");
  const resolution = resolveRoleDelegation("delegate to documentation-specialist for docs impact", [role]);
  const prompt = buildPromptOverlayDelegation(role, "Review documentation impact, design promotion, and current-state accuracy.");

  assert.equal(resolution.role.name, "documentation-specialist");
  assert.equal(resolution.mode, "prompt-overlay");
  assert.match(prompt, /Name: documentation-specialist/);
  assert.match(prompt, /# Purpose/);
  assert.match(prompt, /GUIDANCE\.md/);
  assert.match(prompt, /Consider `review-and-refresh-docs`/);
  assert.match(prompt, /The parent context owns plan state, worktree safety, verification review, and final decisions/);
});

test("resolveRoleDelegation delegates to the shipped product owner role", () => {
  const role = parseRoleFileFromPath("aix/workflows/design-plan-execute/roles/project-dev/product-owner/ROLE.md");
  const resolution = resolveRoleDelegation("delegate to product-owner for this feature idea", [role]);
  const prompt = buildPromptOverlayDelegation(role, "Review whether role lifecycle smoke tests should be in Phase 6.");

  assert.equal(resolution.role.name, "product-owner");
  assert.equal(resolution.mode, "prompt-overlay");
  assert.match(prompt, /Name: product-owner/);
  assert.match(prompt, /# Purpose/);
  assert.match(prompt, /GUIDANCE\.md/);
  assert.match(prompt, /Consider `brainstorming-skill`/);
  assert.match(prompt, /The parent context owns plan state, worktree safety, verification review, and final decisions/);
});

test("resolveRoleDelegation delegates to the shipped release engineer role", () => {
  const role = parseRoleFileFromPath("aix/workflows/design-plan-execute/roles/project-dev/release-engineer/ROLE.md");
  const resolution = resolveRoleDelegation("use release-engineer to review release readiness", [role]);
  const prompt = buildPromptOverlayDelegation(role, "Review package contents and supported-host release risks.");

  assert.equal(resolution.role.name, "release-engineer");
  assert.equal(resolution.mode, "prompt-overlay");
  assert.match(prompt, /Name: release-engineer/);
  assert.match(prompt, /# Purpose/);
  assert.match(prompt, /GUIDANCE\.md/);
  assert.match(prompt, /Consider `work-verify`/);
  assert.match(prompt, /The parent context owns plan state, worktree safety, verification review, and final decisions/);
});

test("resolveRoleDelegation delegates to the shipped product designer role", () => {
  const role = parseRoleFileFromPath("aix/workflows/design-plan-execute/roles/project-dev/product-designer/ROLE.md");
  const resolution = resolveRoleDelegation("use product-designer to review this plan", [role]);
  const prompt = buildPromptOverlayDelegation(role, "Review the onboarding flow in this backlog plan.");

  assert.equal(resolution.role.name, "product-designer");
  assert.equal(resolution.mode, "prompt-overlay");
  assert.match(prompt, /Name: product-designer/);
  assert.match(prompt, /# Purpose/);
  assert.match(prompt, /GUIDANCE\.md/);
  assert.match(prompt, /Consider `plan-create`/);
  assert.match(prompt, /The parent context owns plan state, worktree safety, verification review, and final decisions/);
});

test("resolveRoleDelegation delegates to the shipped technical architect role", () => {
  const role = parseRoleFileFromPath("aix/workflows/design-plan-execute/roles/project-dev/technical-architect/ROLE.md");
  const resolution = resolveRoleDelegation("delegate to technical-architect for architecture review", [role]);
  const prompt = buildPromptOverlayDelegation(role, "Review whether the workflow install preview plan has clean module boundaries.");

  assert.equal(resolution.role.name, "technical-architect");
  assert.equal(resolution.mode, "prompt-overlay");
  assert.match(prompt, /Name: technical-architect/);
  assert.match(prompt, /# Purpose/);
  assert.match(prompt, /GUIDANCE\.md/);
  assert.match(prompt, /Consider `plan-update`/);
  assert.match(prompt, /The parent context owns plan state, worktree safety, verification review, and final decisions/);
});

test("resolveRoleDelegation delegates to the shipped requirements engineer role", () => {
  const role = parseRoleFileFromPath("aix/workflows/design-plan-execute/roles/project-dev/requirements-engineer/ROLE.md");
  const resolution = resolveRoleDelegation("use requirements-engineer to refine this Design Intent", [role]);
  const prompt = buildPromptOverlayDelegation(role, "Review whether requirements are ready before implementation phases are drafted.");

  assert.equal(resolution.role.name, "requirements-engineer");
  assert.equal(resolution.mode, "prompt-overlay");
  assert.match(prompt, /Name: requirements-engineer/);
  assert.match(prompt, /# Purpose/);
  assert.match(prompt, /GUIDANCE\.md/);
  assert.match(prompt, /Consider `plan-create`/);
  assert.match(prompt, /The parent context owns plan state, worktree safety, verification review, and final decisions/);
});

test("resolveRoleDelegation delegates to the shipped security engineer role", () => {
  const role = parseRoleFileFromPath("aix/workflows/design-plan-execute/roles/project-dev/security-engineer/ROLE.md");
  const resolution = resolveRoleDelegation("use security-engineer to review this plan", [role]);
  const prompt = buildPromptOverlayDelegation(role, "Review trust boundaries and no-write guarantees before closeout.");

  assert.equal(resolution.role.name, "security-engineer");
  assert.equal(resolution.mode, "prompt-overlay");
  assert.match(prompt, /Name: security-engineer/);
  assert.match(prompt, /# Purpose/);
  assert.match(prompt, /GUIDANCE\.md/);
  assert.match(prompt, /Consider `work-verify`/);
  assert.match(prompt, /The parent context owns plan state, worktree safety, verification review, and final decisions/);
});

test("resolveRoleDelegation delegates to the shipped UX writer role", () => {
  const role = parseRoleFileFromPath("aix/workflows/design-plan-execute/roles/project-dev/ux-writer/ROLE.md");
  const resolution = resolveRoleDelegation("use ux-writer to review this command output", [role]);
  const prompt = buildPromptOverlayDelegation(role, "Review the labels, errors, empty states, and README language in this plan.");

  assert.equal(resolution.role.name, "ux-writer");
  assert.equal(resolution.mode, "prompt-overlay");
  assert.match(prompt, /Name: ux-writer/);
  assert.match(prompt, /# Purpose/);
  assert.match(prompt, /GUIDANCE\.md/);
  assert.match(prompt, /Consider `unslop`/);
  assert.match(prompt, /The parent context owns plan state, worktree safety, verification review, and final decisions/);
});

test("resolveRoleDelegation delegates to the shipped quality engineer role", () => {
  const role = parseRoleFileFromPath("aix/workflows/design-plan-execute/roles/project-dev/quality-engineer/ROLE.md");
  const resolution = resolveRoleDelegation("use quality-engineer to plan verification", [role]);
  const prompt = buildPromptOverlayDelegation(role, "Review targeted checks, regression risk, and validation gaps for this phase.");

  assert.equal(resolution.role.name, "quality-engineer");
  assert.equal(resolution.mode, "prompt-overlay");
  assert.match(prompt, /Name: quality-engineer/);
  assert.match(prompt, /# Purpose/);
  assert.match(prompt, /GUIDANCE\.md/);
  assert.match(prompt, /Consider `work-verify`/);
  assert.match(prompt, /The parent context owns plan state, worktree safety, verification review, and final decisions/);
});

test("shipped project development roles can route existing-plan edits through plan-update", () => {
  const roleNames = [
    "documentation-specialist",
    "implementation-engineer",
    "product-designer",
    "product-owner",
    "release-engineer",
    "quality-engineer",
    "requirements-engineer",
    "security-engineer",
    "technical-architect",
    "ux-writer"
  ];

  for (const roleName of roleNames) {
    const rolePath = `aix/workflows/design-plan-execute/roles/project-dev/${roleName}/ROLE.md`;
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
    assert.match(list.stdout, /roles\/aix-dev\/quality-engineer/);
    assert.match(list.stdout, /aix role activate fixture\/roles\/aix-dev\/quality-engineer/);

    assert.match(activate.stdout, /Activated role fixture\/roles\/aix-dev\/quality-engineer as test-quality-engineer/);
    assert.deepEqual(activatedManifest.roles, [
      {
        source: "fixture",
        path: "roles/aix-dev/quality-engineer",
        alias: "test-quality-engineer"
      }
    ]);
    assert.equal(existsSync(join(projectRoot, ".agents/packages/roles/fixture/roles/aix-dev/quality-engineer")), true);
    assert.equal(existsSync(join(projectRoot, ".agents/roles/test-quality-engineer")), true);
    assert.match(status.stdout, /Role sources[\s\S]*fixture/);
    assert.match(status.stdout, /Active roles[\s\S]*test-quality-engineer/);

    const deactivate = run(["role", "deactivate", "test-quality-engineer"]);
    const manifest = JSON.parse(readFileSync(join(projectRoot, "aix.json"), "utf8"));
    const lockfile = JSON.parse(readFileSync(join(projectRoot, "aix.lock.json"), "utf8"));

    assert.match(deactivate.stdout, /Deactivated role test-quality-engineer/);
    assert.deepEqual(manifest.roles, []);
    assert.deepEqual(lockfile.roles, []);
    assert.equal(existsSync(join(projectRoot, ".agents/roles/test-quality-engineer")), false);

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

test("role CLI ignores legacy single-file role sources and fails clearly on activation", async () => {
  const directory = await mkdtemp(join(tmpdir(), "aix-legacy-role-source-"));
  const cacheRoot = await mkdtemp(join(tmpdir(), "aix-role-cache-"));
  const previousCache = process.env.AIX_CACHE_DIR;

  mkdirSync(join(directory, "roles/aix-dev"), { recursive: true });
  writeFileSync(join(directory, "roles/aix-dev/quality-engineer.md"), validRoleMarkdown(), "utf8");
  git(["init", "-b", "main"], directory);
  git(["add", "."], directory);
  git(["commit", "-m", "legacy role"], directory);

  process.env.AIX_CACHE_DIR = cacheRoot;

  await withProject(async () => {
    const add = run(["roles", "add", directory, "fixture"]);
    const list = run(["roles", "list", "fixture"]);
    const activate = run(["role", "activate", "fixture/roles/aix-dev/quality-engineer"]);

    assert.equal(add.exitCode, 0);
    assert.match(add.stdout, /Discovered 0 roles/);
    assert.match(list.stdout, /No roles found in source: fixture/);
    assert.equal(activate.exitCode, 2);
    assert.match(activate.stderr, /Missing role file: .*roles\/aix-dev\/quality-engineer\/ROLE\.md/);
  });

  if (previousCache === undefined) {
    delete process.env.AIX_CACHE_DIR;
  } else {
    process.env.AIX_CACHE_DIR = previousCache;
  }
});

test("bundled role guidance is required and external role guidance remains optional", async () => {
  const directory = await mkdtemp(join(tmpdir(), "aix-role-guidance-"));

  mkdirSync(join(directory, "quality-engineer"), { recursive: true });
  writeFileSync(join(directory, "quality-engineer/ROLE.md"), validRoleMarkdown(), "utf8");

  assert.throws(
    () => assertBundledRoleGuidance(join(directory, "quality-engineer")),
    /Missing role guidance file:/
  );

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

    assert.equal(existsSync(join(projectRoot, ".agents/roles/quality-engineer/GUIDANCE.md")), false);
  });
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
      join(gitSource.directory, "roles/aix-dev/quality-engineer/ROLE.md"),
      validRoleMarkdown().replace("Return commands, evidence, gaps, and risk.", "Return updated evidence and risk."),
      "utf8"
    );
    git(["add", "."], gitSource.directory);
    git(["commit", "-m", "update role"], gitSource.directory);

    const diff = run(["role", "diff", "quality-engineer"]);
    const update = run(["roles", "update"]);
    const lockfile = JSON.parse(readFileSync(join(projectRoot, "aix.lock.json"), "utf8"));

    assert.match(diff.stdout, /Diff for fixture\/roles\/aix-dev\/quality-engineer as quality-engineer/);
    assert.match(diff.stdout, /Return updated evidence and risk/);
    assert.equal(update.exitCode, 0, update.stderr);
    assert.match(update.stdout, /Updated locked roles/);
    assert.match(readFileSync(join(projectRoot, ".agents/roles/quality-engineer/ROLE.md"), "utf8"), /Return updated evidence and risk/);
    assert.equal(lockfile.roles[0].resolvedCommit, git(["rev-parse", "HEAD"], gitSource.directory));
  });

  if (previousCache === undefined) {
    delete process.env.AIX_CACHE_DIR;
  } else {
    process.env.AIX_CACHE_DIR = previousCache;
  }
});

test("role guidance is editable, diffable, preserved on update, and resettable", async () => {
  const gitSource = await createRoleGitSource({ guidance: true });
  const cacheRoot = await mkdtemp(join(tmpdir(), "aix-role-cache-"));
  const previousCache = process.env.AIX_CACHE_DIR;

  process.env.AIX_CACHE_DIR = cacheRoot;

  await withProject(async (projectRoot) => {
    run(["roles", "add", gitSource.directory, "fixture"]);
    run(["role", "activate", "fixture/roles/aix-dev/quality-engineer"]);

    let lockfile = JSON.parse(readFileSync(join(projectRoot, "aix.lock.json"), "utf8"));

    assert.ok(lockfile.roles[0].packageFiles.some((file) => file.path === guidanceEntry));
    assert.deepEqual(lockfile.roles[0].activeFiles.map((file) => file.path), [roleEntry]);
    assert.match(readFileSync(join(projectRoot, ".agents/roles/quality-engineer/GUIDANCE.md"), "utf8"), /Use focused verification/);

    writeFileSync(
      join(gitSource.directory, "roles/aix-dev/quality-engineer/GUIDANCE.md"),
      validRoleGuidanceMarkdown("Use updated upstream verification guidance."),
      "utf8"
    );
    git(["add", "."], gitSource.directory);
    git(["commit", "-m", "update guidance"], gitSource.directory);

    const diff = run(["role", "diff", "quality-engineer"]);

    assert.equal(diff.exitCode, 0, diff.stderr);
    assert.match(diff.stdout, /GUIDANCE.md/);
    assert.match(diff.stdout, /updated upstream verification/);

    writeFileSync(join(projectRoot, ".agents/roles/quality-engineer/GUIDANCE.md"), "project-edited guidance\n", "utf8");

    const update = run(["role", "update", "quality-engineer"]);

    assert.equal(update.exitCode, 0, update.stderr);
    assert.equal(readFileSync(join(projectRoot, ".agents/roles/quality-engineer/GUIDANCE.md"), "utf8"), "project-edited guidance\n");
    assert.match(readFileSync(join(projectRoot, ".agents/packages/roles/fixture/roles/aix-dev/quality-engineer/GUIDANCE.md"), "utf8"), /updated upstream/);
    assert.equal(verifyRoles().issues.length, 0);

    const reset = run(["role", "guidance", "reset", "quality-engineer"]);
    assert.equal(reset.exitCode, 0, reset.stderr);
    assert.match(reset.stdout, /Reset role guidance for quality-engineer/);

    lockfile = JSON.parse(readFileSync(join(projectRoot, "aix.lock.json"), "utf8"));

    assert.deepEqual(lockfile.roles[0].activeFiles.map((file) => file.path), [roleEntry]);
    assert.match(readFileSync(join(projectRoot, ".agents/roles/quality-engineer/GUIDANCE.md"), "utf8"), /updated upstream/);
  });

  if (previousCache === undefined) {
    delete process.env.AIX_CACHE_DIR;
  } else {
    process.env.AIX_CACHE_DIR = previousCache;
  }
});

test("role companion guidance is activated beside GUIDANCE.md and preserves local edits on update", async () => {
  const gitSource = await createRoleGitSource({ guidance: true, companionGuidance: true });
  const cacheRoot = await mkdtemp(join(tmpdir(), "aix-role-cache-"));
  const previousCache = process.env.AIX_CACHE_DIR;

  process.env.AIX_CACHE_DIR = cacheRoot;

  await withProject(async (projectRoot) => {
    run(["roles", "add", gitSource.directory, "fixture"]);
    run(["role", "activate", "fixture/roles/aix-dev/quality-engineer"]);

    let lockfile = JSON.parse(readFileSync(join(projectRoot, "aix.lock.json"), "utf8"));

    assert.ok(lockfile.roles[0].packageFiles.some((file) => file.path === "workflow.GUIDANCE.md"));
    assert.deepEqual(lockfile.roles[0].activeFiles.map((file) => file.path), [roleEntry]);
    assert.match(readFileSync(join(projectRoot, ".agents/roles/quality-engineer/workflow.GUIDANCE.md"), "utf8"), /companion project-manager/);

    writeFileSync(
      join(gitSource.directory, "roles/aix-dev/quality-engineer/workflow.GUIDANCE.md"),
      companionGuidanceMarkdown("Use updated companion guidance."),
      "utf8"
    );
    git(["add", "."], gitSource.directory);
    git(["commit", "-m", "update companion guidance"], gitSource.directory);

    const updateUnedited = run(["role", "update", "quality-engineer"]);

    assert.equal(updateUnedited.exitCode, 0, updateUnedited.stderr);
    assert.match(readFileSync(join(projectRoot, ".agents/roles/quality-engineer/workflow.GUIDANCE.md"), "utf8"), /updated companion/);

    writeFileSync(join(projectRoot, ".agents/roles/quality-engineer/workflow.GUIDANCE.md"), "project companion edit\n", "utf8");
    writeFileSync(
      join(gitSource.directory, "roles/aix-dev/quality-engineer/workflow.GUIDANCE.md"),
      companionGuidanceMarkdown("Use second upstream companion guidance."),
      "utf8"
    );
    git(["add", "."], gitSource.directory);
    git(["commit", "-m", "second companion guidance update"], gitSource.directory);

    const updateEdited = run(["role", "update", "quality-engineer"]);

    assert.equal(updateEdited.exitCode, 0, updateEdited.stderr);
    assert.equal(readFileSync(join(projectRoot, ".agents/roles/quality-engineer/workflow.GUIDANCE.md"), "utf8"), "project companion edit\n");
    assert.match(
      readFileSync(join(projectRoot, ".agents/packages/roles/fixture/roles/aix-dev/quality-engineer/workflow.GUIDANCE.md"), "utf8"),
      /second upstream companion/
    );
    assert.equal(verifyRoles().issues.length, 0);

    lockfile = JSON.parse(readFileSync(join(projectRoot, "aix.lock.json"), "utf8"));
    assert.ok(lockfile.roles[0].packageFiles.some((file) => file.path === "workflow.GUIDANCE.md"));
  });

  if (previousCache === undefined) {
    delete process.env.AIX_CACHE_DIR;
  } else {
    process.env.AIX_CACHE_DIR = previousCache;
  }
});

test("role activation resolves aix/roles paths from local project source first", async () => {
  await withProject(async (projectRoot) => {
    mkdirSync(join(projectRoot, "aix/roles/local-pack/quality-engineer"), { recursive: true });
    writeFileSync(join(projectRoot, "aix/roles/local-pack/quality-engineer/ROLE.md"), validRoleMarkdown(), "utf8");
    writeFileSync(join(projectRoot, "aix/roles/local-pack/quality-engineer/GUIDANCE.md"), validRoleGuidanceMarkdown(), "utf8");
    writeFileSync(
      join(projectRoot, "aix.json"),
      JSON.stringify({ sources: { roles: {} }, skills: [], roles: [] }, null, 2) + "\n",
      "utf8"
    );

    const result = run(["role", "activate", "aix/roles/local-pack/quality-engineer"]);
    const lockfile = JSON.parse(readFileSync(join(projectRoot, "aix.lock.json"), "utf8"));

    assert.equal(result.exitCode, 0);
    assert.match(result.stdout, /Activated role aix\/roles\/local-pack\/quality-engineer as quality-engineer/);
    assert.equal(lockfile.roles[0].sourceType, "local");
    assert.equal(lockfile.roles[0].sourcePath, "roles/local-pack/quality-engineer");
    assert.equal(existsSync(join(projectRoot, "aix/roles/local-pack/quality-engineer/ROLE.md")), true);
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
    assert.equal(lockfile.roles[0].sourcePath, "aix-dev/quality-engineer");
    assert.equal(lockfile.roles[0].packagePath, ".agents/packages/roles/fixture/aix-dev/quality-engineer");
    assert.equal(lockfile.roles[0].activationPath, ".agents/roles/quality-engineer");
    assert.equal(lockfile.roles[0].originalName, "quality-engineer");
    assert.equal(lockfile.roles[0].activeName, "quality-engineer");
    assert.equal(lockfile.roles[0].requested, true);
    assert.ok(lockfile.roles[0].packageFiles.some((file) => file.path === "ROLE.md"));
    assert.ok(lockfile.roles[0].activeFiles.some((file) => file.path === "ROLE.md"));
    assert.equal(existsSync(join(projectRoot, ".agents/packages/roles/fixture/aix-dev/quality-engineer")), true);
    assert.equal(existsSync(join(projectRoot, ".agents/roles/quality-engineer")), true);
  });
});

test("activateRoleFromDefinitions supports aliases without changing package role name", async () => {
  const gitSource = await createRoleGitSource();
  const cacheRoot = await mkdtemp(join(tmpdir(), "aix-role-cache-"));

  await withProject(async (projectRoot) => {
    activateRoleFromDefinitions(
      "fixture/aix-dev/quality-engineer/ROLE.md",
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

    const packageRole = readFileSync(join(projectRoot, ".agents/packages/roles/fixture/aix-dev/quality-engineer/ROLE.md"), "utf8");
    const activeRole = readFileSync(join(projectRoot, ".agents/roles/test-quality-engineer/ROLE.md"), "utf8");
    const lockfile = JSON.parse(readFileSync(join(projectRoot, "aix.lock.json"), "utf8"));

    assert.match(packageRole, /^name: quality-engineer$/m);
    assert.match(activeRole, /^name: test-quality-engineer$/m);
    assert.equal(lockfile.roles[0].alias, "test-quality-engineer");
  });
});

test("role append content uses active-name markers and deactivation removes only the owned block", async () => {
  const gitSource = await createRoleGitSource({ append: true });
  const cacheRoot = await mkdtemp(join(tmpdir(), "aix-role-cache-"));

  await withProject(async (projectRoot) => {
    writeFileSync(
      join(projectRoot, "AGENTS.md"),
      [
        "# Project Rules",
        "",
        "<!-- aix:role copied-user-block start -->",
        "User-owned copied block.",
        ""
      ].join("\n"),
      "utf8"
    );

    activateRoleFromDefinitions(
      "fixture/aix-dev/quality-engineer/ROLE.md",
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

    const lockfile = JSON.parse(readFileSync(join(projectRoot, "aix.lock.json"), "utf8"));
    const agents = readFileSync(join(projectRoot, "AGENTS.md"), "utf8");

    assert.equal(lockfile.roles[0].agentsMd.marker, "aix:role test-quality-engineer");
    assert.match(agents, /copied-user-block start/);
    assert.match(agents, /<!-- aix:role test-quality-engineer start -->/);
    assert.ok(agents.indexOf("copied-user-block start") < agents.indexOf("aix:role test-quality-engineer start"));

    const deactivate = deactivateRole("test-quality-engineer");
    const updatedLockfile = JSON.parse(readFileSync(join(projectRoot, "aix.lock.json"), "utf8"));
    const updatedAgents = readFileSync(join(projectRoot, "AGENTS.md"), "utf8");

    assert.equal(deactivate.activeName, "test-quality-engineer");
    assert.deepEqual(updatedLockfile.roles, []);
    assert.doesNotMatch(updatedAgents, /aix:role test-quality-engineer/);
    assert.match(updatedAgents, /copied-user-block start/);
  });
});

test("activateRoleFromDefinitions refuses active-name collisions before package writes", async () => {
  const gitSource = await createRoleGitSource();
  const cacheRoot = await mkdtemp(join(tmpdir(), "aix-role-cache-"));

  await withProject(async (projectRoot) => {
    mkdirSync(join(projectRoot, ".agents/roles"), { recursive: true });
    writeFileSync(join(projectRoot, ".agents/roles/quality-engineer"), "local role\n", "utf8");

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
      /Active role name collision: \.agents\/roles\/quality-engineer/
    );

    assert.equal(existsSync(join(projectRoot, ".agents/packages/roles/fixture/aix-dev/quality-engineer")), false);
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
    assert.equal(existsSync(join(projectRoot, ".agents/roles/quality-engineer")), false);
    assert.equal(existsSync(join(projectRoot, ".agents/packages/roles/fixture/aix-dev/quality-engineer")), false);

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
              sourcePath: "roles/project-dev/documentation-specialist",
              packagePath: ".agents/packages/workflows/aix/design-plan-execute/roles/project-dev/documentation-specialist",
              activationPath: ".agents/roles/documentation-specialist",
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

    writeFileSync(join(projectRoot, ".agents/roles/quality-engineer/ROLE.md"), "edited\n", "utf8");

    assert.match(verifyRoles().issues.join("\n"), /Refusing to remove modified active role/);
  });
});
