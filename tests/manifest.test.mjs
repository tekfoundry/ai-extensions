import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ManifestError, loadManifest, parseManifest } from "../dist/manifest.js";

test("parseManifest accepts git sources and compact skill requests", () => {
  assert.deepEqual(
    parseManifest({
      sources: {
        example: {
          type: "git",
          url: "https://example.com/skills.git",
          path: "skills",
          ref: "main"
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
