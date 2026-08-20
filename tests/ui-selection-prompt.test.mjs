import assert from "node:assert/strict";
import { PassThrough } from "node:stream";
import { test } from "node:test";
import { promptForSelection, renderSelectionMenu } from "../dist/ui/selection-prompt.js";
import { renderTable } from "../dist/ui/table.js";

test("renderSelectionMenu renders options and quit before sections", () => {
  const rendered = renderSelectionMenu(
    "Pick one:",
    [{ label: "alpha", detail: "first" }],
    [{ header: "Blocked:", items: ["beta"] }]
  );

  assert.match(rendered, /1\. alpha\tfirst/);
  assert.match(rendered, /q - Quit/);
  assert.match(rendered, /Blocked:/);
  assert.ok(rendered.indexOf("q - Quit") < rendered.indexOf("Blocked:"));
});

test("promptForSelection returns the selected option value", async () => {
  const input = new PassThrough();
  const output = new PassThrough();

  input.end("2\n");

  const selected = await promptForSelection(
    "Pick one:",
    [
      { value: "a", label: "alpha" },
      { value: "b", label: "bravo" }
    ],
    [],
    input,
    output
  );

  assert.equal(selected, "b");
});

test("promptForSelection returns undefined when the user quits", async () => {
  const input = new PassThrough();
  const output = new PassThrough();

  input.end("q\n");

  const selected = await promptForSelection("Pick one:", [{ value: "a", label: "alpha" }], [], input, output);

  assert.equal(selected, undefined);
});

test("renderTable renders padded headers and rows", () => {
  const rendered = renderTable(
    [
      { header: "Path", value: (row) => row.path },
      { header: "Name", value: (row) => row.name }
    ],
    [
      { path: "engineering/code-review", name: "code-review" },
      { path: "tdd", name: "tdd" }
    ],
    { title: "Skills in example:" }
  );

  assert.match(rendered, /Skills in example:/);
  assert.match(rendered, /Path\s+Name/);
  assert.match(rendered, /engineering\/code-review\s+code-review/);
  assert.match(rendered, /tdd\s+tdd/);
});
