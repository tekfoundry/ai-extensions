import {
  diffWorkflowTemplates,
  listWorkflowTemplates,
  publishWorkflowTemplates,
  resetAllWorkflowTemplates,
  resetWorkflowTemplate,
  type DiffWorkflowTemplatesResult,
  type ListWorkflowTemplatesResult,
  type PublishWorkflowTemplatesResult,
  type ResetAllWorkflowTemplatesResult,
  type ResetWorkflowTemplateResult
} from "../../../workflows/index.js";
import { renderTable } from "../../../ui/table.js";
import { CliError, EXIT_USAGE } from "../../errors.js";
import type { CliResult, Command } from "../../types.js";

function renderTemplateList(result: ListWorkflowTemplatesResult): string {
  if (result.templates.length === 0) {
    return `Workflow ${result.workflowName} has no templates.`;
  }

  return renderTable(
    [
      { header: "Name", value: (template) => template.name },
      { header: "Kind", value: (template) => template.kind },
      { header: "State", value: (template) => (template.published ? "published override" : "origin") },
      { header: "Path", value: (template) => (template.published ? template.publishedPath : template.originPath) }
    ],
    result.templates,
    { title: `Workflow templates for ${result.workflowName}` }
  );
}

function renderPublishResult(result: PublishWorkflowTemplatesResult): string {
  return [
    `Published workflow templates for ${result.workflowName}.`,
    `Published ${result.published.length} templates.`,
    `Left ${result.unchanged.length} matching templates unchanged.`
  ].join("\n");
}

function renderDiffResult(result: DiffWorkflowTemplatesResult): string {
  if (result.diffs.length === 0) {
    return `No published template changes for ${result.workflowName}.`;
  }

  return result.diffs
    .flatMap((template) => [
      `Diff for template ${template.name}:`,
      template.diff.trimEnd()
    ])
    .join("\n");
}

function renderResetResult(result: ResetWorkflowTemplateResult): string {
  return `Reset workflow template ${result.template.name} for ${result.workflowName}.`;
}

function renderResetAllResult(result: ResetAllWorkflowTemplatesResult): string {
  return [
    `Reset published workflow templates for ${result.workflowName}.`,
    `Reset ${result.reset.length} templates.`
  ].join("\n");
}

function runTemplatesList(argv: string[]): CliResult {
  if (argv.length > 2) {
    throw new CliError("Usage: aix templates list", EXIT_USAGE);
  }

  return { exitCode: 0, stdout: renderTemplateList(listWorkflowTemplates()) };
}

function runTemplatesPublish(argv: string[]): CliResult {
  if (argv.length > 3) {
    throw new CliError("Usage: aix templates publish", EXIT_USAGE);
  }

  if (argv[2]) {
    throw new CliError("Usage: aix templates publish\nPublishing exposes the complete active workflow template set.", EXIT_USAGE);
  }

  return { exitCode: 0, stdout: renderPublishResult(publishWorkflowTemplates()) };
}

function runTemplatesDiff(argv: string[]): CliResult {
  if (argv.length > 3) {
    throw new CliError("Usage: aix templates diff [template-name]", EXIT_USAGE);
  }

  return { exitCode: 0, stdout: renderDiffResult(diffWorkflowTemplates(argv[2])) };
}

function runTemplatesReset(argv: string[]): CliResult {
  if (argv.length !== 3) {
    throw new CliError("Usage: aix templates reset <template-name|--all>", EXIT_USAGE);
  }

  if (argv[2] === "--all") {
    return { exitCode: 0, stdout: renderResetAllResult(resetAllWorkflowTemplates()) };
  }

  return { exitCode: 0, stdout: renderResetResult(resetWorkflowTemplate(argv[2])) };
}

function runTemplatesCommand(argv: string[]): CliResult {
  switch (argv[1]) {
    case "list":
      return runTemplatesList(argv);
    case "publish":
      return runTemplatesPublish(argv);
    case "diff":
      return runTemplatesDiff(argv);
    case "reset":
      return runTemplatesReset(argv);
    default:
      throw new CliError("Usage: aix templates <list|publish|diff|reset>", EXIT_USAGE);
  }
}

export const templatesCommand: Command = {
  name: "templates",
  usage: "templates <list|publish|diff|reset>",
  summary: "Manage editable workflow templates",
  splash: [
    { usage: "templates list", summary: "List workflow templates" },
    { usage: "templates publish", summary: "Publish editable workflow templates" },
    { usage: "templates diff [name]", summary: "Compare published templates with origins" },
    { usage: "templates reset <name|--all>", summary: "Remove published template overrides" }
  ],
  run: runTemplatesCommand
};
