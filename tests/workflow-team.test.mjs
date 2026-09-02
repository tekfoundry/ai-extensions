import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";
import {
  parseWorkflowTeam,
  readWorkflowManifest,
  readWorkflowTeam,
  workflowTeamHash
} from "../dist/workflows/index.js";

const workflowRoot = "aix/workflows/design-plan-execute";

test("bundled design-plan-execute workflow exposes a validated team roster", () => {
  const workflow = readWorkflowManifest(workflowRoot);
  const team = readWorkflowTeam(workflow, workflowRoot);
  const hash = workflowTeamHash(workflow, workflowRoot);

  assert.equal(team.workflow, "design-plan-execute");
  assert.equal(team.version, "1");
  assert.ok(team.requiredCapabilities.includes("native-worker-creation"));
  assert.ok(team.roles.some((role) => role.name === "project-manager"));
  assert.ok(team.roles.some((role) => role.name === "implementation-engineer" && role.writeDomains.includes("src/")));
  assert.equal(team.roles.find((role) => role.name === "project-manager")?.displayName, "Project Manager");
  assert.ok(team.roles.every((role) => role.displayName && role.directory));
  assert.ok(team.roles.every((role) => existsSync(`${workflowRoot}/${role.directory}`) || role.name === "project-manager"));
  assert.equal(hash?.path, "team.md");
  assert.equal(hash?.version, "1");
  assert.equal(hash?.sha256.length, 64);
});

test("parseWorkflowTeam rejects duplicate roles and unsupported modes", () => {
  const base = JSON.parse(readFileSync(`${workflowRoot}/team.md`, "utf8").match(/<!--\s*aix:team\s*\n([\s\S]*?)\n\s*-->/)[1]);
  const markdown = (metadata) => `# Team\n\n<!-- aix:team\n${JSON.stringify(metadata)}\n-->\n`;

  assert.throws(
    () => parseWorkflowTeam(markdown({ ...base, roles: [base.roles[0], base.roles[0]] })),
    /duplicates role/
  );
  assert.throws(
    () => parseWorkflowTeam(markdown({ ...base, roles: [{ ...base.roles[0], taskModes: ["unknown"] }] })),
    /taskModes.*scout/
  );
});

test("readWorkflowTeam rejects manifest and team identity mismatches", () => {
  const workflow = readWorkflowManifest(workflowRoot);
  const team = parseWorkflowTeam(readFileSync(`${workflowRoot}/team.md`, "utf8"));

  assert.equal(team.workflow, workflow.name);
  assert.throws(
    () => readWorkflowTeam({ ...workflow, name: "other-workflow" }, workflowRoot),
    /belongs to design-plan-execute, not other-workflow/
  );
  assert.throws(
    () => readWorkflowTeam({ ...workflow, team: { ...workflow.team, version: "2" } }, workflowRoot),
    /has version 1, expected 2/
  );
});
