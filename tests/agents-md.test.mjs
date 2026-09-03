import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import {
  composeAppendLifecycleBlocks,
  assertManagedAppendBlockSafe,
  composeManagedAppendBlocks,
  installManagedAppendBlock,
  lockfileAppendBlock,
  removeManagedAppendBlock,
  renderManagedAppendBlock
} from "../dist/agents-md.js";

function sha256(contents) {
  return createHash("sha256").update(contents).digest("hex");
}

function block(owner, name, sourcePath, contents = `${name} instructions.`) {
  return {
    owner: { kind: owner, name },
    source: "aix",
    sourcePath,
    marker: `aix:${owner} ${name}`,
    contents
  };
}

test("lockfile append block records owner, source, source hash, rendered hash, and installed hash", () => {
  const definition = block("role", "project-manager", "roles/project-manager", "Use project-manager.");
  const rendered = renderManagedAppendBlock(definition.marker, definition.contents);

  assert.deepEqual(lockfileAppendBlock(definition), {
    owner: {
      kind: "role",
      name: "project-manager"
    },
    source: "aix",
    sourcePath: "roles/project-manager",
    marker: "aix:role project-manager",
    path: "AGENTS.md",
    sourceSha256: sha256("Use project-manager."),
    renderedSha256: sha256(rendered),
    installedSha256: sha256(rendered)
  });
});

test("project-manager AGENTS append defines conditional fresh-session Boss openings", () => {
  const source = readFileSync("aix/roles/project-manager/AGENTS.append.md", "utf8");
  const active = readFileSync("AGENTS.md", "utf8");

  for (const text of [source, active]) {
    assert.match(text, /At the beginning of a fresh project-manager session/);
    assert.match(text, /Hey Boss! What are we working on\?/);
    assert.match(text, /concrete project request/);
    assert.match(text, /Okay Boss! Let me delegate that work\./);
    assert.match(text, /Do not use a canned Boss greeting\s+for follow-ups/);
  }
});

test("managed append blocks compose in workflow, role, then skill order", () => {
  const updated = composeManagedAppendBlocks("# Project Rules\n", [
    block("skill", "get-guidance", "skills/get-guidance"),
    block("workflow", "design-plan-execute", "workflows/design-plan-execute"),
    block("role", "project-manager", "roles/project-manager"),
    block("role", "implementation-engineer", "roles/implementation-engineer")
  ]);

  assert.equal(
    updated,
    [
      "# Project Rules",
      "",
      "<!-- aix:workflow design-plan-execute start -->",
      "design-plan-execute instructions.",
      "<!-- aix:workflow design-plan-execute end -->",
      "",
      "<!-- aix:role implementation-engineer start -->",
      "implementation-engineer instructions.",
      "<!-- aix:role implementation-engineer end -->",
      "",
      "<!-- aix:role project-manager start -->",
      "project-manager instructions.",
      "<!-- aix:role project-manager end -->",
      "",
      "<!-- aix:skill get-guidance start -->",
      "get-guidance instructions.",
      "<!-- aix:skill get-guidance end -->",
      ""
    ].join("\n")
  );
});

test("managed append parser treats unknown blocks as user-owned content and refuses unsafe known blocks", () => {
  const definition = block("workflow", "design-plan-execute", "workflows/design-plan-execute");
  const rendered = renderManagedAppendBlock(definition.marker, definition.contents);

  assert.equal(
    composeManagedAppendBlocks(`${rendered}\n\n${rendered}\n`, [definition]),
    `${rendered}\n`
  );
  assert.throws(
    () => composeManagedAppendBlocks("<!-- aix:workflow design-plan-execute end -->\n", [definition]),
    /orphan AGENTS\.md block marker/
  );
  assert.throws(
    () =>
      composeManagedAppendBlocks(
        [
          "<!-- aix:workflow design-plan-execute start -->",
          "<!-- aix:role project-manager start -->",
          "nested",
          "<!-- aix:role project-manager end -->",
          "<!-- aix:workflow design-plan-execute end -->",
          ""
        ].join("\n"),
        [definition]
      ),
    /nested AGENTS\.md block/
  );
  assert.throws(
    () =>
      composeManagedAppendBlocks(
        [
          "<!-- aix:workflow design-plan-execute start -->",
          "first",
          "<!-- aix:workflow design-plan-execute end -->",
          "",
          "<!-- aix:workflow design-plan-execute start -->",
          "second",
          "<!-- aix:workflow design-plan-execute end -->",
          ""
        ].join("\n"),
        [definition]
      ),
    /duplicate AGENTS\.md block marker with different content/
  );
  assert.equal(
    composeManagedAppendBlocks(renderManagedAppendBlock("aix:role project-manager", "role"), [definition]),
    [
      "<!-- aix:role project-manager start -->",
      "role",
      "<!-- aix:role project-manager end -->",
      "",
      rendered,
      ""
    ].join("\n")
  );
});

test("managed append composition preserves user-owned text between known blocks and moves known blocks to the end", () => {
  assert.equal(
    composeManagedAppendBlocks(
      [
        renderManagedAppendBlock("aix:workflow design-plan-execute", "old workflow"),
        "local note",
        renderManagedAppendBlock("aix:role project-manager", "old role"),
        ""
      ].join("\n"),
      [
        block("workflow", "design-plan-execute", "workflows/design-plan-execute", "workflow"),
        block("role", "project-manager", "roles/project-manager", "role")
      ]
    ),
    [
      "local note",
      "",
      renderManagedAppendBlock("aix:workflow design-plan-execute", "workflow"),
      "",
      renderManagedAppendBlock("aix:role project-manager", "role"),
      ""
    ].join("\n")
  );
});

test("append lifecycle removes old known blocks and keeps unknown blocks user-owned", () => {
  const previous = lockfileAppendBlock(block("skill", "old-skill", "skills/old-skill", "old"));
  const next = lockfileAppendBlock(block("role", "project-manager", "roles/project-manager", "role"));
  const unknown = renderManagedAppendBlock("aix:skill unknown", "unknown");
  const contents = [
    "# Project Rules",
    "",
    unknown,
    "",
    renderManagedAppendBlock("aix:skill old-skill", "old"),
    ""
  ].join("\n");

  assert.equal(
    composeAppendLifecycleBlocks(contents, [previous], [next], [block("role", "project-manager", "roles/project-manager", "role")]),
    [
      "# Project Rules",
      "",
      unknown,
      "",
      renderManagedAppendBlock("aix:role project-manager", "role"),
      ""
    ].join("\n")
  );
});

test("managed append drift checks refuse changed installed blocks", async () => {
  const directory = await mkdtemp(join(tmpdir(), "aix-agents-md-"));
  const targetPath = join(directory, "AGENTS.md");
  const definition = {
    ...block("workflow", "fixture", "workflows/fixture", "Original instructions."),
    targetPath
  };
  const lockfileBlock = installManagedAppendBlock(definition);

  assert.ok(lockfileBlock);
  writeFileSync(targetPath, readFileSync(targetPath, "utf8").replace("Original", "Edited"), "utf8");

  assert.throws(
    () => assertManagedAppendBlockSafe({ ...definition, contents: "Updated instructions." }, lockfileBlock),
    /Refusing to update modified workflow block/
  );
});

test("missing optional append definitions are no-ops", () => {
  assert.equal(installManagedAppendBlock(undefined), undefined);
  assert.doesNotThrow(() => assertManagedAppendBlockSafe(undefined));
});

test("managed append removal preserves surrounding bytes", () => {
  const before = "alpha\nbeta";
  const after = "gamma\n\n";
  const contents = `${before}\n\n${renderManagedAppendBlock("aix:role project-manager", "role")}\n${after}`;

  assert.equal(removeManagedAppendBlock(contents, "aix:role project-manager"), `${before}\n${after}`);
});
