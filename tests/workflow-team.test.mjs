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
  assert.equal(team.triggerRouting.authorityBoundary.includes("routing selects work only"), true);
  assert.equal(team.delegationPacket.workerBoundary.includes("project-manager reconciles"), true);
});

test("Phase 3 routing maps canonical intents to narrow procedures and roles", () => {
  const team = readWorkflowTeam(readWorkflowManifest(workflowRoot), workflowRoot);
  const routes = team.triggerRouting.routes;
  const expected = new Map([
    ["brainstorm.explore", ["brainstorming-skill", "product-owner"]],
    ["vision.clarify", ["requirements-clarify", "product-owner"]],
    ["design.shape", ["design-intent", "requirements-engineer"]],
    ["plan.create", ["plan-create", "project-manager"]],
    ["plan.review", ["plan-review", "quality-engineer"]],
    ["plan.activate", ["plan-activate", "project-manager"]],
    ["phase.start", ["phase-execute", "project-manager"]],
    ["task.start", ["task-execute", "assigned-task-owner"]],
    ["work.verify", ["work-verify", "quality-engineer"]],
    ["docs.promote", ["design-promote", "documentation-specialist"]],
    ["plan.close", ["plan-complete", "project-manager"]]
  ]);
  assert.equal(routes.length, expected.size);
  for (const route of routes) {
    assert.deepEqual([route.procedure, route.role], expected.get(route.intent), route.intent);
    assert.ok(route.intent.includes("."));
    assert.ok(route.slash.startsWith("/"));
  }
});

test("Phase 3 routing accepts natural-language aliases and rejects ambiguous matches", () => {
  const team = readWorkflowTeam(readWorkflowManifest(workflowRoot), workflowRoot);
  const routes = team.triggerRouting.routes;
  assert.ok(routes.find((route) => route.intent === "plan.create").aliases.includes("break into tasks"));
  assert.ok(routes.find((route) => route.intent === "work.verify").aliases.includes("run the quality gate"));
  assert.match(team.triggerRouting.normalization, /conversational and slash/i);
  assert.match(team.triggerRouting.ambiguity, /clarification/i);
  assert.match(team.triggerRouting.ambiguity, /fail closed/i);
  assert.deepEqual(team.triggerRouting.precedence, [
    "explicit slash/object-verb",
    "exact canonical phrase",
    "exact alias",
    "unambiguous natural language"
  ]);
});

test("Phase 3 routing preserves plan, phase, task context and delegation evidence", () => {
  const team = readWorkflowTeam(readWorkflowManifest(workflowRoot), workflowRoot);
  assert.deepEqual(team.triggerRouting.contextFields, [
    "plan", "planRevision", "baseRevision", "workMode", "phase", "task",
    "sectionOwner", "acceptedDecisions", "constraints"
  ]);
  assert.ok(team.triggerRouting.routes.every((route) => route.intent && route.procedure && route.role));
  assert.ok(team.delegationPacket.requiredFields.includes("packetId"));
  assert.ok(team.delegationPacket.requiredFields.includes("phase"));
  assert.ok(team.delegationPacket.requiredFields.includes("task"));
  assert.ok(team.delegationPacket.requiredFields.includes("expectedOutput"));
  assert.ok(team.delegationPacket.requiredFields.includes("evidenceRequirements"));
  for (const evidence of ["status transition", "changed files or artifacts", "commands and results", "validation when applicable", "documentation impact", "residual risks", "conflict/base-revision reference"]) {
    assert.ok(team.delegationPacket.evidenceRequirements.includes(evidence), evidence);
  }
  assert.match(team.delegationPacket.workerBoundary, /only packet-scoped/i);
  assert.match(team.delegationPacket.workerBoundary, /project-manager reconciles/i);
});

test("Phase 3 routing metadata fails closed when authority or packet boundaries are weakened", () => {
  const base = JSON.parse(readFileSync(`${workflowRoot}/team.md`, "utf8").match(/<!--\s*aix:team\s*\n([\s\S]*?)\n\s*-->/)[1]);
  const markdown = (metadata) => `# Team\n\n<!-- aix:team\n${JSON.stringify(metadata)}\n-->\n`;

  assert.throws(
    () => parseWorkflowTeam(markdown({ ...base, triggerRouting: { ...base.triggerRouting, authorityBoundary: "routing may perform requested actions" } })),
    /authorityBoundary.*non-authoritative|activation, approval/i
  );
  assert.throws(
    () => parseWorkflowTeam(markdown({ ...base, delegationPacket: { ...base.delegationPacket, invalidPacket: "infer omitted fields" } })),
    /invalidPacket.*reject|never infer/i
  );
  assert.throws(
    () => parseWorkflowTeam(markdown({ ...base, triggerRouting: { ...base.triggerRouting, approvalIntents: base.triggerRouting.approvalIntents.filter((intent) => intent !== "plan.activate") } })),
    /approvalIntents.*plan.activate/
  );
});
