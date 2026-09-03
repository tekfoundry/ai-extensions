import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  addressBoss,
  classifyFirstPmPrompt,
  createPmDecision,
  listOpenPmDecisions,
  normalizePmReference,
  openingForFirstPmPrompt,
  resolvePmDecision
} from "../dist/pm/index.js";

test("PM aliases normalize case and whitespace to the active PM", () => {
  for (const alias of ["pm", "PM", "Project Manager", "PROJECT-MANAGER", " manager "]) {
    assert.equal(normalizePmReference(alias), "project-manager");
  }
  assert.equal(normalizePmReference("product-owner"), undefined);
  assert.equal(normalizePmReference("project-managerial"), undefined);
});

test("PM selects a welcome only for a non-substantive first prompt", () => {
  assert.equal(classifyFirstPmPrompt("Are you ready to work?"), "conversational");
  assert.equal(openingForFirstPmPrompt("Are you ready to work?"), "Hey Boss! What are we working on?");
  assert.equal(classifyFirstPmPrompt("Please review the project for storage and routing risks."), "concrete");
  assert.equal(openingForFirstPmPrompt("Please review the project for storage and routing risks."), "Okay Boss! Let me delegate that work.");
});

test("direct PM responses address Boss once without altering already addressed text", () => {
  assert.equal(addressBoss("The review is complete."), "Boss, the review is complete.");
  assert.equal(addressBoss("The review is complete, Boss."), "The review is complete, Boss.");
  assert.equal(addressBoss("The review is complete, boss."), "The review is complete, Boss.");
});

test("open PM decisions persist and can be recovered and resolved", () => {
  const projectRoot = mkdtempSync(join(tmpdir(), "aix-pm-conversation-"));
  const created = createPmDecision({
    projectRoot,
    sessionId: "pm-session-test",
    question: "Should the PM apply the proposed migration?",
    options: ["apply", "defer"],
    recommendation: "defer",
    context: { taskIds: ["phase-12-task-4"] }
  });
  assert.equal(listOpenPmDecisions(projectRoot).length, 1);
  assert.equal(listOpenPmDecisions(projectRoot)[0].decisionId, created.decisionId);
  const resolved = resolvePmDecision(projectRoot, created.decisionId, "defer");
  assert.equal(resolved.state, "resolved");
  assert.equal(listOpenPmDecisions(projectRoot).length, 0);
});
