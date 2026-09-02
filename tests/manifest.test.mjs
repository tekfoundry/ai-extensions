import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ManifestError, loadManifest, parseManifest } from "../dist/manifest.js";
import { readWorkflowManifest } from "../dist/workflows/manifest.js";

test("parseManifest accepts git sources and compact skill requests", () => {
  assert.deepEqual(
    parseManifest({
      sources: {
        skills: {
          example: {
            type: "git",
            url: "https://example.com/skills.git",
            path: "skills",
            ref: "main"
          }
        }
      },
      skills: ["example:workflow/tdd"]
    }),
    {
      sources: {
        example: {
          type: "git",
          url: "https://example.com/skills.git",
          path: "skills",
          ref: "main"
        }
      },
      skills: [
        {
          source: "example",
          path: "workflow/tdd"
        }
      ]
    }
  );
});

test("parseManifest accepts GitHub tree source strings", () => {
  assert.deepEqual(
    parseManifest({
      sources: {
        skills: {
          "cursor-pstack": "https://github.com/cursor/plugins/tree/main/pstack/skills"
        }
      },
      skills: ["cursor-pstack:unslop"]
    }),
    {
      sources: {
        "cursor-pstack": {
          type: "git",
          url: "https://github.com/cursor/plugins.git",
          ref: "main",
          path: "pstack/skills"
        }
      },
      skills: [
        {
          source: "cursor-pstack",
          path: "unslop"
        }
      ]
    }
  );
});

test("parseManifest accepts role sources and compact role requests", () => {
  assert.deepEqual(
    parseManifest({
      sources: {
        roles: {
          team: "https://github.com/example/roles/tree/main/roles"
        }
      },
      skills: [],
      roles: [
        "team:quality-engineer.md",
        {
          source: "team",
          path: "documentation-specialist.md",
          alias: "docs-reviewer"
        }
      ]
    }),
    {
      roleSources: {
        team: {
          type: "git",
          url: "https://github.com/example/roles.git",
          ref: "main",
          path: "roles"
        }
      },
      skills: [],
      roles: [
        {
          source: "team",
          path: "quality-engineer.md"
        },
        {
          source: "team",
          path: "documentation-specialist.md",
          alias: "docs-reviewer"
        }
      ]
    }
  );
});

test("readWorkflowManifest accepts PM dependencies, team metadata, and capabilities", async () => {
  const directory = await mkdtemp(join(tmpdir(), "aix-workflow-manifest-"));
  await writeFile(
    join(directory, "workflow.json"),
    JSON.stringify({
      name: "design-plan-execute",
      docs: [],
      skillsDir: "skills",
      workflowOptions: "ignored",
      dependencies: {
        roles: [
          {
            source: "aix",
            path: "roles/project-manager",
            activeName: "project-manager"
          }
        ]
      },
      team: {
        path: "team.md",
        version: "1"
      },
      requiredCapabilities: ["native-worker-creation", "correlated-results"]
    }),
    "utf8"
  );

  assert.deepEqual(
    readWorkflowManifest(directory),
    {
      dependencies: {
        roles: [
          {
            source: "aix",
            path: "roles/project-manager",
            activeName: "project-manager"
          }
        ]
      },
      team: {
        path: "team.md",
        version: "1"
      },
      requiredCapabilities: ["native-worker-creation", "correlated-results"],
      name: "design-plan-execute",
      docs: [],
      skillsDir: "skills"
    }
  );
});

test("readWorkflowManifest rejects malformed workflow dependency metadata", async () => {
  const directory = await mkdtemp(join(tmpdir(), "aix-workflow-manifest-invalid-"));

  async function readManifest(manifest) {
    await writeFile(join(directory, "workflow.json"), JSON.stringify(manifest), "utf8");
    return readWorkflowManifest(directory);
  }

  assert.throws(
    () => readWorkflowManifest(directory),
    /Missing workflow manifest/
  );
  await assert.rejects(
    () => readManifest({ name: "fixture", docs: [], skillsDir: "skills", dependencies: { roles: [{ source: "aix" }] } }),
    (error) => error instanceof Error && error.message.includes("dependencies.roles[0].path")
  );
  await assert.rejects(
    () => readManifest({ name: "fixture", docs: [], skillsDir: "skills", team: { path: "team.md" } }),
    (error) => error instanceof Error && error.message.includes("team.version")
  );
  await assert.rejects(
    () => readManifest({ name: "fixture", docs: [], skillsDir: "skills", requiredCapabilities: ["native", ""] }),
    (error) => error instanceof Error && error.message.includes("requiredCapabilities")
  );
});

test("parseManifest accepts legacy flat skill sources", () => {
  assert.deepEqual(
    parseManifest({
      sources: {
        example: "https://github.com/example/skills/tree/main/skills"
      },
      skills: []
    }),
    {
      sources: {
        example: {
          type: "git",
          url: "https://github.com/example/skills.git",
          ref: "main",
          path: "skills"
        }
      },
      skills: []
    }
  );
});

test("parseManifest rejects unsupported source strings", () => {
  assert.throws(
    () =>
      parseManifest({
        sources: {
          skills: {
            example: "https://example.com/skills.git"
          }
        },
        skills: []
      }),
    (error) => error instanceof ManifestError && error.message === "sources.skills.example must be a GitHub tree URL or a source object."
  );
});

test("parseManifest accepts object skill requests when metadata is needed", () => {
  assert.deepEqual(
    parseManifest({
      skills: [
        {
          source: "example",
          path: "workflow/tdd",
          alias: "project-tdd"
        }
      ]
    }).skills,
    [
      {
        source: "example",
        path: "workflow/tdd",
        alias: "project-tdd"
      }
    ]
  );
});

test("parseManifest rejects malformed compact skill requests with path context", () => {
  assert.throws(
    () =>
      parseManifest({
        skills: ["missing-separator"]
      }),
    (error) => error instanceof ManifestError && error.message === 'skills[0] must use "source:path" format.'
  );
});

test("parseManifest rejects malformed skill entries with path context", () => {
  assert.throws(
    () =>
      parseManifest({
        skills: [
          {
            source: "example",
            path: ""
          }
        ]
      }),
    (error) => error instanceof ManifestError && error.message === "skills[0].path must be a non-empty string."
  );
});

test("loadManifest reports a missing manifest file", async () => {
  const directory = await mkdtemp(join(tmpdir(), "aix-manifest-"));

  await assert.rejects(
    () => loadManifest(join(directory, "aix.json")),
    (error) => error instanceof ManifestError && error.message.includes("Missing")
  );
});

test("loadManifest reports malformed JSON", async () => {
  const directory = await mkdtemp(join(tmpdir(), "aix-manifest-"));
  const filePath = join(directory, "aix.json");

  await writeFile(filePath, "{ nope", "utf8");

  await assert.rejects(
    () => loadManifest(filePath),
    (error) => error instanceof ManifestError && error.message.includes("Malformed JSON")
  );
});
