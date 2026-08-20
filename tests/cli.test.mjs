import assert from "node:assert/strict";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PassThrough } from "node:stream";
import { test } from "node:test";
import { commands } from "../dist/cli/registry.js";
import { run, runInteractive } from "../dist/cli.js";

test("run renders a splash screen with a zero exit code", () => {
  const result = run([]);

  assert.equal(result.exitCode, 0);
  assert.match(result.stdout, /AI Extensions/);
  assert.match(result.stdout, /aix v0\.0\.0/);
  assert.match(result.stdout, /init\s+Initialize AI Extensions/);
  assert.match(result.stdout, /add skills <url> \[alias\]\s+Add a Git skill source/);
});

test("run renders help with a zero exit code", () => {
  const result = run(["--help"]);

  assert.equal(result.exitCode, 0);
  assert.match(result.stdout, /AI Extensions/);
  assert.match(result.stdout, /Commands:/);
});

test("command registry owns splash command metadata", () => {
  assert.deepEqual(
    commands.map((command) => command.name),
    ["init", "install", "add", "remove", "activate", "deactivate", "update", "diff", "verify", "list"]
  );

  const result = run([]);

  for (const command of commands) {
    assert.equal(result.stdout.includes(command.splash), true);
    assert.equal(result.stdout.includes(command.summary), true);
  }
});

test("run returns a usage failure for unknown commands", () => {
  const result = run(["wat"]);

  assert.equal(result.exitCode, 1);
  assert.match(result.stderr, /Unknown command: wat/);
});

test("run returns a usage failure for too many verify arguments", () => {
  const result = run(["verify", "extra"]);

  assert.equal(result.exitCode, 1);
  assert.equal(result.stderr, "Usage: aix verify");
});

test("run list requires an interactive path when no kind is provided", () => {
  const result = run(["list"]);

  assert.equal(result.exitCode, 1);
  assert.equal(result.stderr, "Usage: aix list skills <source>");
});

test("runInteractive remove skills prompts for a source when no source is provided", async () => {
  const projectRoot = await mkdtemp(join(tmpdir(), "aix-cli-remove-"));
  const input = new PassThrough();
  const output = new PassThrough();
  let rendered = "";

  output.on("data", (chunk) => {
    rendered += chunk.toString("utf8");
  });

  input.end("1\n");

  const previousCwd = process.cwd();
  process.chdir(projectRoot);

  try {
    writeFileSync(
      "aix.json",
      JSON.stringify(
        {
          sources: {
            skills: {
              fixture: {
                type: "git",
                url: "https://example.com/skills.git",
                path: "skills",
                ref: "main"
              }
            }
          },
          skills: []
        },
        null,
        2
      ) + "\n",
      "utf8"
    );

    const result = await runInteractive(["remove", "skills"], input, output);
    const manifest = JSON.parse(readFileSync(join(projectRoot, "aix.json"), "utf8"));

    assert.equal(result.exitCode, 0);
    assert.match(rendered, /Select a skills source to remove:/);
    assert.match(rendered, /1\. fixture/);
    assert.match(rendered, /q - Quit/);
    assert.match(rendered, /Select source number:/);
    assert.match(result.stdout, /Removed skills source fixture/);
    assert.deepEqual(manifest.sources.skills, {});
    assert.equal(existsSync(join(projectRoot, "aix.lock.json")), false);
  } finally {
    process.chdir(previousCwd);
  }
});

test("runInteractive remove skills shows blocked sources and supports quit", async () => {
  const projectRoot = await mkdtemp(join(tmpdir(), "aix-cli-remove-"));
  const input = new PassThrough();
  const output = new PassThrough();
  let rendered = "";

  output.on("data", (chunk) => {
    rendered += chunk.toString("utf8");
  });

  input.end("q\n");

  const previousCwd = process.cwd();
  process.chdir(projectRoot);

  try {
    writeFileSync(
      "aix.json",
      JSON.stringify(
        {
          sources: {
            skills: {
              blocked: {
                type: "git",
                url: "https://example.com/blocked.git",
                path: "skills",
                ref: "main"
              }
            }
          },
          skills: ["blocked:demo"]
        },
        null,
        2
      ) + "\n",
      "utf8"
    );

    const result = await runInteractive(["remove", "skills"], input, output);
    const manifest = JSON.parse(readFileSync(join(projectRoot, "aix.json"), "utf8"));

    assert.equal(result.exitCode, 0);
    assert.match(rendered, /No sources are currently removable/);
    assert.match(rendered, /To remove the following sources deactivate their skills first:/);
    assert.match(rendered, /- blocked/);
    assert.match(rendered, /q - Quit/);
    assert.ok(rendered.indexOf("q - Quit") < rendered.indexOf("To remove the following sources deactivate their skills first:"));
    assert.equal(result.stdout, "No source removed.");
    assert.deepEqual(Object.keys(manifest.sources.skills), ["blocked"]);
  } finally {
    process.chdir(previousCwd);
  }
});

test("runInteractive list shows a kind picker with skills and quit", async () => {
  const input = new PassThrough();
  const output = new PassThrough();
  let rendered = "";

  output.on("data", (chunk) => {
    rendered += chunk.toString("utf8");
  });

  input.end("q\n");

  const result = await runInteractive(["list"], input, output);

  assert.equal(result.exitCode, 0);
  assert.match(rendered, /What would you like to list:/);
  assert.match(rendered, /1\. Skills/);
  assert.match(rendered, /q - Quit/);
  assert.equal(result.stdout, "No list selected.");
});

test("runInteractive list skills prompts for a source", async () => {
  const input = new PassThrough();
  const output = new PassThrough();
  let rendered = "";

  output.on("data", (chunk) => {
    rendered += chunk.toString("utf8");
  });

  input.end("q\n");

  const result = await runInteractive(["list", "skills"], input, output);

  assert.equal(result.exitCode, 0);
  assert.match(rendered, /Select a skills source to list:/);
  assert.match(rendered, /1\. aix/);
  assert.match(rendered, /q - Quit/);
  assert.equal(result.stdout, "No skills source selected.");
});
