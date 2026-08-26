import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import {
  discoverWorkflowTemplates,
  parseWorkflowTemplateReferences,
  validateWorkflowTemplates,
  workflowTemplateHashes,
  workflowTemplateName
} from "../dist/workflows/index.js";

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

async function withTemplateWorkflow(callback) {
  const root = await mkdtemp(join(tmpdir(), "aix-template-workflow-"));
  mkdirSync(join(root, "templates/sections"), { recursive: true });

  const workflow = {
    name: "fixture-workflow",
    docs: [],
    templatesDir: "templates",
    skillsDir: "skills"
  };

  await callback(root, workflow);
}

function writeInstallableWorkflow(root) {
  mkdirSync(join(root, "skills/alpha"), { recursive: true });
  mkdirSync(join(root, "templates/sections"), { recursive: true });
  writeFileSync(
    join(root, "workflow.json"),
    JSON.stringify(
      {
        name: "fixture-workflow",
        docs: [],
        templatesDir: "templates",
        skillsDir: "skills"
      },
      null,
      2
    ) + "\n",
    "utf8"
  );
  writeFileSync(join(root, "skills/alpha/SKILL.md"), "---\nname: alpha\n---\n\n# Alpha\n", "utf8");
  writeFileSync(join(root, "templates/plan.md"), "{{ section:status }}\n{{ repeat:phases section:phase }}\n", "utf8");
  writeFileSync(join(root, "templates/sections/status.md"), "Backlog\n", "utf8");
  writeFileSync(join(root, "templates/sections/phase.md"), "{{ phase:title }}\n", "utf8");
}

async function createWorkflowRepo() {
  const root = await mkdtemp(join(tmpdir(), "aix-template-source-"));

  writeInstallableWorkflow(root);
  git(["init", "-b", "master"], root);
  git(["add", "."], root);
  git(["commit", "-m", "workflow"], root);

  return root;
}

async function withProject(callback) {
  const projectPath = await mkdtemp(join(tmpdir(), "aix-template-project-"));

  await callback(projectPath);
}

function runCli(cwd, args) {
  const result = spawnSync(process.execPath, [join(process.cwd(), "bin/aix.js"), ...args], {
    cwd,
    encoding: "utf8"
  });

  return {
    exitCode: result.status,
    stdout: result.stdout.trimEnd(),
    stderr: result.stderr.trimEnd()
  };
}

function stripAgentNotes(template) {
  return template.replace(/<!-- DO NOT INCLUDE IN OUTPUT[\s\S]*?-->\n?/g, "");
}

function normalizeRenderedMarkdown(markdown) {
  return markdown
    .replace(/[ \t]+$/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trimEnd() + "\n";
}

function valueAtPath(context, path) {
  return path.split(".").reduce((value, segment) => value?.[segment], context);
}

function renderBundledTemplate(relativePath, context) {
  const root = join(process.cwd(), "aix/workflows/design-plan-execute/templates");
  const source = stripAgentNotes(readFileSync(join(root, relativePath), "utf8"));

  const withSections = source.replace(/\{\{\s*section:([a-zA-Z0-9._-]+)\s*\}\}/g, (_match, sectionName) =>
    renderBundledTemplate(join("sections", `${sectionName}.md`), context)
  );

  const withRepeats = withSections.replace(
    /\{\{\s*repeat:([a-zA-Z0-9._-]+(?:\.[a-zA-Z0-9._-]+)*)\s+section:([a-zA-Z0-9._-]+)\s*\}\}/g,
    (_match, collectionPath, sectionName) => {
      const collection = valueAtPath(context, collectionPath);

      assert.equal(Array.isArray(collection), true, `${collectionPath} must be an array`);

      return collection
        .map((item) => renderBundledTemplate(join("sections", `${sectionName}.md`), { ...context, ...item }).trimEnd())
        .join("\n");
    }
  );

  return withRepeats.replace(/\{\{\s*([a-zA-Z0-9._-]+:[a-zA-Z0-9._-]+)\s*\}\}/g, (_match, placeholder) => {
    const [scope, key] = placeholder.split(":");
    const value = valueAtPath(context, `${scope}.${key}`);

    assert.notEqual(value, undefined, `Missing placeholder value for ${placeholder}`);

    return String(value);
  });
}

test("bundled plan template renders expected Markdown without agent notes", () => {
  const rendered = normalizeRenderedMarkdown(renderBundledTemplate("plan.md", {
    plan: {
      title: "Workflow Template Publishing",
      status: "🟨 Active"
    },
    goal: {
      status: "accepted"
    },
    design: {
      status: "accepted"
    },
    non_goal: {
      item: "No arbitrary template scripting."
    },
    invariant: {
      item: "Published templates must not overwrite local edits."
    },
    decision: {
      item: "None."
    },
    docs_impact: {
      product: "None.",
      requirements: "None.",
      architecture: "Template resolution behavior.",
      security: "Local edit safety.",
      quality: "Template verification coverage.",
      operations: "Template publish/reset commands.",
      decisions: "Template ownership boundary.",
      glossary: "None."
    },
    readiness: {
      category: "internal-use-ready",
      evidence: "Template commands render and verify locally."
    },
    closeout: {
      changed: "Workflow templates can be published and reset.",
      boundaries: "Published overrides remain project-owned.",
      data: "Template Markdown files only.",
      failure_modes: "Missing sections or stale placeholders fail verification.",
      evidence: "`node --test tests/templates.test.mjs` passed.",
      unverified: "Manual workflow update review.",
      manual: "Developer review before archive."
    },
    risk: {
      item: "Template drift must be visible during review."
    },
    security_review: {
      status: "completed",
      scope: "Template publishing and local override safety.",
      findings: "No blocking findings.",
      blockers: "None.",
      residual_risk: "Published templates may drift and need review."
    },
    lesson: {
      item: "Shared workflow artifacts are the right template boundary."
    },
    promotion: {
      path: "_docs/kb/03-architecture/workflow-lifecycle.md"
    },
    phases: [
      {
        phase: {
          number: "1",
          title: "Origin Templates",
          status: "completed",
          goal: "Define workflow-owned artifact templates.",
          verification: "`npm run build` passed.",
          docs_impact: "Architecture and decisions docs may need template coverage.",
          tasks: [
            {
              task: {
                status: "✅",
                title: "Create the initial `plan.md` origin template."
              }
            },
            {
              task: {
                status: "✅",
                title: "Create reusable section templates."
              }
            }
          ],
          execution_notes: [
            {
              note: {
                date: "2026-08-23",
                summary: "Added document and section templates.",
                verification: "`npm run build` passed."
              }
            }
          ]
        }
      },
      {
        phase: {
          number: "2",
          title: "Template Commands",
          status: "completed",
          goal: "Expose editable workflow templates.",
          verification: "`node --test tests/templates.test.mjs` passed.",
          docs_impact: "Operations docs should mention template commands.",
          tasks: [
            {
              task: {
                status: "✅",
                title: "Add CLI routing for `aix templates list`."
              }
            },
            {
              task: {
                status: "⬜️",
                title: "Review published template docs."
              }
            }
          ],
          execution_notes: [
            {
              note: {
                date: "2026-08-23",
                summary: "Added list, publish, diff, and reset commands.",
                verification: "`npm test` passed."
              }
            }
          ]
        }
      }
    ]
  }));
  const outputPath = join(process.cwd(), "tests/artifacts/templates/plan.md");

  mkdirSync(join(process.cwd(), "tests/artifacts/templates"), { recursive: true });
  writeFileSync(outputPath, rendered, "utf8");

  const expected = readFileSync("tests/fixtures/templates/expected-plan.md", "utf8");
  assert.equal(rendered, expected);
  assert.doesNotMatch(rendered, /DO NOT INCLUDE IN OUTPUT/);
  assert.doesNotMatch(rendered, /Agent note/);
  assert.doesNotMatch(rendered, /not started -/);
  assert.match(rendered, /### Phase 1: Origin Templates \(status: completed\)/);
  assert.match(rendered, /### Phase 2: Template Commands \(status: completed\)/);
  assert.match(rendered, /- ✅ Create the initial `plan\.md` origin template\.\n- ✅ Create reusable section templates\./);
  assert.match(rendered, /- ✅ Add CLI routing/);
  assert.match(rendered, /- ⬜️ Review published template docs/);
  assert.match(rendered, /## Completion Checklist/);
  assert.match(rendered, /- ⬜️ Human validation: developer evaluated the completed phased work and accepted it, or explicitly waived manual validation with a recorded reason\./);
  assert.match(rendered, /- ⬜️ Complete Security Review after all implementation phases; record findings, convert blocking findings into normal plan tasks, and document residual risk\./);
  assert.match(rendered, /- ⬜️ Review the codebase using `\$code-review-refactor`; refactor or record follow-up work if needed\./);
  assert.match(rendered, /- ⬜️ Promote accepted durable behavior into `_docs\/kb` using `\$design-promote`\./);
  assert.match(rendered, /- ⬜️ Review documentation structure, formatting, and links using `\$review-and-refresh-docs`; fix issues or record follow-up work\./);
  assert.doesNotMatch(rendered, /## Promotion To Design/);
});

test("bundled plan template includes gated planning agent notes", () => {
  const template = readFileSync("aix/workflows/design-plan-execute/templates/plan.md", "utf8");

  assert.match(template, /this is the vision gate/);
  assert.match(template, /Do not mark it\s+accepted until the developer agrees the vision is clear enough/);
  assert.match(template, /this is the design-intent gate/);
  assert.match(template, /Do not draft implementation phases or task lists\s+until this section is accepted/);
  assert.match(template, /Not drafted until Design Intent is accepted/);
});

test("discovers document and section workflow templates", async () => {
  await withTemplateWorkflow(async (root, workflow) => {
    writeFileSync(join(root, "templates/plan.md"), "{{ section:status }}\n{{ repeat:phases section:phase }}\n", "utf8");
    writeFileSync(join(root, "templates/sections/status.md"), "Backlog\n", "utf8");
    writeFileSync(join(root, "templates/sections/phase.md"), "{{ phase:title }}\n", "utf8");

    const templates = discoverWorkflowTemplates(workflow, root);

    assert.deepEqual(templates.documents.map(workflowTemplateName), ["plan"]);
    assert.deepEqual(templates.sections.map(workflowTemplateName), ["sections/phase", "sections/status"]);
    assert.equal(workflowTemplateHashes(templates).length, 3);
    assert.doesNotThrow(() => validateWorkflowTemplates(templates));
  });
});

test("parses section includes, constrained repeats, and inert placeholders", async () => {
  await withTemplateWorkflow(async (root, workflow) => {
    writeFileSync(join(root, "templates/plan.md"), "{{ section:status }}\n{{ repeat:phases section:phase }}\n{{ plan:title }}\n", "utf8");
    writeFileSync(join(root, "templates/sections/status.md"), "Backlog\n", "utf8");
    writeFileSync(join(root, "templates/sections/phase.md"), "{{ repeat:phase.tasks section:task }}\n", "utf8");
    writeFileSync(join(root, "templates/sections/task.md"), "{{ task:title }}\n", "utf8");

    const templates = discoverWorkflowTemplates(workflow, root);
    const references = parseWorkflowTemplateReferences(templates.documents[0]);

    assert.deepEqual(
      references.map((reference) => reference.kind),
      ["section", "repeat", "placeholder"]
    );
    assert.doesNotThrow(() => validateWorkflowTemplates(templates));
  });
});

test("rejects missing section references", async () => {
  await withTemplateWorkflow(async (root, workflow) => {
    writeFileSync(join(root, "templates/plan.md"), "{{ section:missing }}\n", "utf8");

    const templates = discoverWorkflowTemplates(workflow, root);

    assert.throws(() => validateWorkflowTemplates(templates), /references missing section: missing/);
  });
});

test("rejects unsupported template syntax", async () => {
  await withTemplateWorkflow(async (root, workflow) => {
    writeFileSync(join(root, "templates/plan.md"), "{{ for phase in phases }}\n", "utf8");

    const templates = discoverWorkflowTemplates(workflow, root);

    assert.throws(() => validateWorkflowTemplates(templates), /Unsupported template syntax/);
  });
});

test("templates list and publish expose workflow origin templates", async () => {
  const source = await createWorkflowRepo();

  await withProject(async (projectPath) => {
    assert.equal(runCli(projectPath, ["workflow", "install", source, "fixture"]).exitCode, 0);

    const listBefore = runCli(projectPath, ["templates", "list"]);
    assert.equal(listBefore.exitCode, 0);
    assert.match(listBefore.stdout, /Workflow templates for fixture-workflow/);
    assert.match(listBefore.stdout, /plan\s+document\s+origin/);
    assert.match(listBefore.stdout, /sections\/phase\s+section\s+origin/);

    const publish = runCli(projectPath, ["templates", "publish"]);
    assert.equal(publish.exitCode, 0);
    assert.match(publish.stdout, /Published 3 templates/);
    assert.equal(existsSync(join(projectPath, ".agents/templates/plan.md")), true);
    assert.equal(existsSync(join(projectPath, ".agents/templates/sections/phase.md")), true);

    const listAfter = runCli(projectPath, ["templates", "list"]);
    assert.match(listAfter.stdout, /plan\s+document\s+published override/);
  });
});

test("published bundled templates preserve output guardrails", async () => {
  const projectPath = await mkdtemp(join(tmpdir(), "aix-bundled-template-project-"));
  const sourceRoot = await mkdtemp(join(tmpdir(), "aix-bundled-template-source-"));

  cpSync(join(process.cwd(), "aix/workflows/design-plan-execute"), sourceRoot, { recursive: true });
  git(["init", "-b", "master"], sourceRoot);
  git(["add", "."], sourceRoot);
  git(["commit", "-m", "workflow"], sourceRoot);

  const install = runCli(projectPath, ["workflow", "install", sourceRoot, "aix"]);
  assert.equal(install.exitCode, 0, install.stderr);

  const publish = runCli(projectPath, ["templates", "publish"]);
  assert.equal(publish.exitCode, 0);
  assert.match(publish.stdout, /Published 22 templates/);

  const planTemplate = readFileSync(join(projectPath, ".agents/templates/plan.md"), "utf8");
  const taskTemplate = readFileSync(join(projectPath, ".agents/templates/sections/task.md"), "utf8");

  assert.match(planTemplate, /DO NOT INCLUDE IN OUTPUT/);
  assert.match(taskTemplate, /task:status must render as exactly one marker/);
  assert.equal(stripAgentNotes(planTemplate).includes("Agent note"), false);
  assert.equal(stripAgentNotes(taskTemplate).includes("Agent note"), false);
});

test("templates publish refuses targeted publishing and local edits", async () => {
  const source = await createWorkflowRepo();

  await withProject(async (projectPath) => {
    assert.equal(runCli(projectPath, ["workflow", "install", source, "fixture"]).exitCode, 0);

    const targeted = runCli(projectPath, ["templates", "publish", "plan"]);
    assert.equal(targeted.exitCode, 1);
    assert.match(targeted.stderr, /Publishing exposes the complete active workflow template set/);

    assert.equal(runCli(projectPath, ["templates", "publish"]).exitCode, 0);
    writeFileSync(join(projectPath, ".agents/templates/plan.md"), "local edit\n", "utf8");

    const republish = runCli(projectPath, ["templates", "publish"]);
    assert.equal(republish.exitCode, 2);
    assert.match(republish.stderr, /Refusing to overwrite locally edited published template/);
  });
});

test("templates diff and reset work for document and section names", async () => {
  const source = await createWorkflowRepo();

  await withProject(async (projectPath) => {
    assert.equal(runCli(projectPath, ["workflow", "install", source, "fixture"]).exitCode, 0);
    assert.equal(runCli(projectPath, ["templates", "publish"]).exitCode, 0);
    writeFileSync(join(projectPath, ".agents/templates/plan.md"), "{{ section:status }}\nLocal plan edit.\n", "utf8");
    writeFileSync(join(projectPath, ".agents/templates/sections/phase.md"), "Local phase edit.\n", "utf8");

    const allDiff = runCli(projectPath, ["templates", "diff"]);
    assert.equal(allDiff.exitCode, 0);
    assert.match(allDiff.stdout, /Diff for template plan/);
    assert.match(allDiff.stdout, /Local plan edit/);
    assert.match(allDiff.stdout, /Diff for template sections\/phase/);

    const oneDiff = runCli(projectPath, ["templates", "diff", "sections/phase"]);
    assert.equal(oneDiff.exitCode, 0);
    assert.match(oneDiff.stdout, /Local phase edit/);
    assert.doesNotMatch(oneDiff.stdout, /Local plan edit/);

    const reset = runCli(projectPath, ["templates", "reset", "sections/phase"]);
    assert.equal(reset.exitCode, 0);
    assert.match(reset.stdout, /Reset workflow template sections\/phase/);
    assert.equal(existsSync(join(projectPath, ".agents/templates/sections/phase.md")), false);
    assert.equal(readFileSync(join(projectPath, ".agents/packages/workflows/fixture/fixture-workflow/templates/sections/phase.md"), "utf8"), "{{ phase:title }}\n");
  });
});

test("templates reset --all removes published overrides and preserves unrelated files", async () => {
  const source = await createWorkflowRepo();

  await withProject(async (projectPath) => {
    assert.equal(runCli(projectPath, ["workflow", "install", source, "fixture"]).exitCode, 0);
    assert.equal(runCli(projectPath, ["templates", "publish"]).exitCode, 0);
    writeFileSync(join(projectPath, ".agents/templates/plan.md"), "Local plan edit.\n", "utf8");
    writeFileSync(join(projectPath, ".agents/templates/sections/phase.md"), "Local phase edit.\n", "utf8");
    writeFileSync(join(projectPath, ".agents/templates/local-note.md"), "Project-owned note.\n", "utf8");

    const reset = runCli(projectPath, ["templates", "reset", "--all"]);
    assert.equal(reset.exitCode, 0);
    assert.match(reset.stdout, /Reset published workflow templates for fixture-workflow/);
    assert.match(reset.stdout, /Reset 3 templates/);
    assert.equal(existsSync(join(projectPath, ".agents/templates/plan.md")), false);
    assert.equal(existsSync(join(projectPath, ".agents/templates/sections/status.md")), false);
    assert.equal(existsSync(join(projectPath, ".agents/templates/sections/phase.md")), false);
    assert.equal(readFileSync(join(projectPath, ".agents/templates/local-note.md"), "utf8"), "Project-owned note.\n");

    const diff = runCli(projectPath, ["templates", "diff"]);
    assert.equal(diff.exitCode, 0);
    assert.match(diff.stdout, /No published template changes/);
  });
});

test("templates reset --all removes empty template directories", async () => {
  const source = await createWorkflowRepo();

  await withProject(async (projectPath) => {
    assert.equal(runCli(projectPath, ["workflow", "install", source, "fixture"]).exitCode, 0);
    assert.equal(runCli(projectPath, ["templates", "publish"]).exitCode, 0);

    const reset = runCli(projectPath, ["templates", "reset", "--all"]);
    assert.equal(reset.exitCode, 0);
    assert.match(reset.stdout, /Reset 3 templates/);
    assert.equal(existsSync(join(projectPath, ".agents/templates/sections")), false);
    assert.equal(existsSync(join(projectPath, ".agents/templates")), false);
  });
});

test("templates commands report missing workflow and unknown names", async () => {
  await withProject(async (projectPath) => {
    const missing = runCli(projectPath, ["templates", "list"]);
    assert.equal(missing.exitCode, 2);
    assert.match(missing.stderr, /No active workflow is installed/);
  });

  const source = await createWorkflowRepo();

  await withProject(async (projectPath) => {
    assert.equal(runCli(projectPath, ["workflow", "install", source, "fixture"]).exitCode, 0);

    const unknown = runCli(projectPath, ["templates", "diff", "missing"]);
    assert.equal(unknown.exitCode, 2);
    assert.match(unknown.stderr, /Unknown workflow template: missing/);
  });
});
