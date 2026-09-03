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
  assert.equal(team.version, "2");
  assert.ok(team.requiredCapabilities.includes("native-worker-creation"));
  assert.ok(team.roles.some((role) => role.name === "implementation-engineer" && role.writeDomains.includes("src/")));
  assert.ok(team.roles.some((role) => role.name === "quality-engineer" && role.serialization === "shared-artifact"));
  assert.equal(team.roles.find((role) => role.name === "technical-architect")?.readOnly, true);
  assert.equal(team.roles.some((role) => role.name === "project-manager"), false);
  assert.ok(team.roles.every((role) => role.displayName && role.directory));
  assert.ok(team.roles.every((role) => existsSync(`${workflowRoot}/${role.directory}`) || role.name === "project-manager"));
  assert.equal(hash?.path, "team.md");
  assert.equal(hash?.version, "2");
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
  assert.throws(
    () => parseWorkflowTeam(markdown({ ...base, roles: [{ ...base.roles[0], serialization: "unknown" }] })),
    /serialization.*none/
  );
  assert.throws(
    () => parseWorkflowTeam(markdown({ ...base, roles: [{ ...base.roles[0], readOnly: "yes" }] })),
    /readOnly.*boolean/
  );
  assert.throws(
    () => parseWorkflowTeam(markdown({ ...base, roles: [{ ...base.roles[0], serialization: "shared-artifact", sharedArtifacts: [] }] })),
    /shared-artifact serialization requires sharedArtifacts/
  );
  assert.throws(
    () => parseWorkflowTeam(markdown({ ...base, roles: [{ ...base.roles[0], readOnly: true, deliveryModes: ["report-only", "isolated-change"] }] })),
    /readOnly roles may only support report-only/
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
    () => readWorkflowTeam({ ...workflow, team: { ...workflow.team, version: "1" } }, workflowRoot),
    /has version 2, expected 1/
  );
});

test("parseWorkflowTeam enforces the Phase 11 semantic roster", () => {
  const base = JSON.parse(readFileSync(`${workflowRoot}/team.md`, "utf8").match(/<!--\s*aix:team\s*\n([\s\S]*?)\n\s*-->/)[1]);
  const markdown = (metadata) => `# Team\n\n<!-- aix:team\n${JSON.stringify(metadata)}\n-->\n`;
  const without = (name) => base.roles.filter((role) => role.name !== name);
  const withRole = (name, role) => [...base.roles.filter((entry) => entry.name !== name), role];

  assert.throws(
    () => parseWorkflowTeam(markdown({ ...base, roles: without("product-owner") })),
    /exactly one product-owner/
  );
  assert.throws(
    () => parseWorkflowTeam(markdown({ ...base, roles: withRole("product-owner", { ...base.roles.find((role) => role.name === "product-owner"), name: "product-strategist" }) })),
    /product-owner|product-strategist/
  );
  assert.throws(
    () => parseWorkflowTeam(markdown({ ...base, roles: withRole("release-engineer", { ...base.roles.find((role) => role.name === "release-engineer"), name: "boss" }) })),
    /boss.*(roster role|delegatable)/i
  );
});

test("parseWorkflowTeam rejects release-engineer metadata outside its declared safety boundary", () => {
  const base = JSON.parse(readFileSync(`${workflowRoot}/team.md`, "utf8").match(/<!--\s*aix:team\s*\n([\s\S]*?)\n\s*-->/)[1]);
  const markdown = (metadata) => `# Team\n\n<!-- aix:team\n${JSON.stringify(metadata)}\n-->\n`;
  const replaceRole = (name, replacement) => base.roles.map((role) => role.name === name ? replacement : role);
  assert.throws(
    () => parseWorkflowTeam(markdown({ ...base, roles: replaceRole("release-engineer", { ...base.roles.find((role) => role.name === "release-engineer"), writeDomains: ["src/"], deniedAreas: [] }) })),
    /release-engineer.*write domains|denied areas/i
  );
});

test("the roster keeps release evidence and serialization metadata coherent", () => {
  const workflow = readWorkflowManifest(workflowRoot);
  const team = readWorkflowTeam(workflow, workflowRoot);
  const release = team.roles.find((role) => role.name === "release-engineer");
  const product = team.roles.find((role) => role.name === "product-owner");

  assert.ok(release);
  assert.ok(product);
  assert.deepEqual(release.deliveryModes, ["report-only", "isolated-change"]);
  assert.ok(release.deniedAreas.some((area) => /registry|global-install/.test(area)));
  assert.ok(release.requiredEvidence.length >= 4);
  assert.equal(release.serialization, "group");
  assert.equal(product.serialization, "none");
  assert.equal(workflow.team.version, team.version);
});
