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
  assert.match(result.stdout, /^  init\s+Initialize AI Extensions/m);
  assert.match(result.stdout, /^  verify\s+Check installed AI Extension state/m);
  assert.match(result.stdout, /^  status\s+Show workspace, workflow, and skill status/m);
  assert.match(result.stdout, /workflow install \[url\] \[alias\]\s+Install an AI workflow/);
  assert.match(result.stdout, /workflow uninstall\s+Uninstall an AI workflow/);
  assert.match(result.stdout, /skills add <url> \[alias\]\s+Add a Git skill source/);
  assert.match(result.stdout, /skill activate \[source\/path\]\s+Activate a skill/);
  assert.doesNotMatch(result.stdout, /workspace init/);
  assert.doesNotMatch(result.stdout, /workspace verify/);
  assert.doesNotMatch(result.stdout, /install workflow/);
  assert.doesNotMatch(result.stdout, /add skills/);
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
    ["init", "verify", "status", "workflow", "templates", "skills", "skill"]
  );

  const result = run([]);

  for (const command of commands) {
    for (const splashLine of command.splash) {
      assert.equal(result.stdout.includes(splashLine.usage), true);
      assert.equal(result.stdout.includes(splashLine.summary), true);
    }
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

test("run skills list requires an interactive path when no source is provided", () => {
  const result = run(["skills", "list"]);

  assert.equal(result.exitCode, 1);
  assert.equal(result.stderr, "Usage: aix skills list <source>");
});

test("old verb-first command forms are unsupported", () => {
  const oldCommands = [
    ["install", "workflow"],
    ["uninstall", "workflow"],
    ["add", "skills"],
    ["remove", "skills"],
    ["list", "skills"],
    ["activate", "skill"],
    ["deactivate", "skill"],
    ["update"],
    ["update", "workflow"],
    ["diff"],
    ["diff", "workflow"],
    ["workspace", "init"],
    ["workspace", "verify"]
  ];

  for (const argv of oldCommands) {
    const result = run(argv);

    assert.equal(result.exitCode, 1);
    assert.match(result.stderr, new RegExp(`Unknown command: ${argv[0]}`));
  }
});

test("command modules are grouped by object", () => {
  for (const objectName of ["workspace", "workflow", "skills", "skill"]) {
    assert.equal(existsSync(join("src/cli/cmds", objectName, "index.ts")), true);
  }

  assert.equal(existsSync(join("src/cli/cmds/templates/index.ts")), true);

  for (const workspaceCommand of ["init", "verify", "status"]) {
    assert.equal(existsSync(join("src/cli/cmds/workspace", `${workspaceCommand}.ts`)), true);
    assert.equal(existsSync(join("src/cli/cmds", workspaceCommand, "index.ts")), false);
  }

  for (const oldModule of ["install", "uninstall", "add", "remove", "activate", "deactivate", "update", "diff", "list"]) {
    assert.equal(existsSync(join("src/cli/cmds", `${oldModule}.ts`)), false);
  }
});

test("package docs advertise only pragmatic command syntax", () => {
  const docs = [
    readFileSync("README.md", "utf8"),
    readFileSync("AGENTS.md", "utf8"),
    readFileSync("aix/workflows/design-plan-execute/AGENTS.append.md", "utf8"),
    readFileSync("aix/workflows/design-plan-execute/README.md", "utf8")
  ].join("\n");

  assert.doesNotMatch(
    docs,
    /aix (workspace (init|verify)|install workflow|uninstall workflow|remove workflow|add skills|remove skills|list skills|activate skill|deactivate skill|update workflow|diff workflow)\b/
  );
});

test("runInteractive skills remove prompts for a source when no source is provided", async () => {
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

    const result = await runInteractive(["skills", "remove"], input, output);
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

test("runInteractive skills remove shows blocked sources and supports quit", async () => {
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

    const result = await runInteractive(["skills", "remove"], input, output);
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

test("runInteractive skills list prompts for a source", async () => {
  const input = new PassThrough();
  const output = new PassThrough();
  let rendered = "";

  output.on("data", (chunk) => {
    rendered += chunk.toString("utf8");
  });

  input.end("q\n");

  const result = await runInteractive(["skills", "list"], input, output);

  assert.equal(result.exitCode, 0);
  assert.match(rendered, /Select a skills source to list:/);
  assert.match(rendered, /1\. aix/);
  assert.match(rendered, /q - Quit/);
  assert.equal(result.stdout, "No skills source selected.");
});
