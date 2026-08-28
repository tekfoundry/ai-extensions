import { createInterface } from "node:readline/promises";
import type { Readable, Writable } from "node:stream";
import {
  diffGuidance,
  diffGuidanceCommands,
  listGuidance,
  previewResetAllGuidance,
  publishGuidance,
  resetAllGuidance,
  resetGuidance,
  type ActiveGuidanceDocument,
  type DiffGuidanceCommandsResult,
  type DiffGuidanceResult,
  type ListGuidanceResult,
  type PublishGuidanceResult,
  type ResetAllGuidancePreviewResult,
  type ResetAllGuidanceResult,
  type ResetGuidanceResult
} from "../../../workflows/index.js";
import { renderTable } from "../../../ui/table.js";
import { CliError, EXIT_USAGE } from "../../errors.js";
import type { CliResult, Command } from "../../types.js";

function renderGuidanceTable(title: string, guidance: ActiveGuidanceDocument[]): string {
  return renderTable(
    [
      { header: "Name", value: (item) => item.name },
      { header: "Kind", value: (item) => item.kind },
      { header: "Origin", value: (item) => item.origin },
      { header: "Status", value: (item) => item.status },
      { header: "Metadata", value: (item) => item.metadata }
    ],
    guidance,
    { title }
  );
}

function renderGuidanceList(result: ListGuidanceResult): string {
  if (result.guidance.length === 0) {
    return `Workflow ${result.workflowName} has no guidance.`;
  }

  return renderGuidanceTable(`Guidance for ${result.workflowName}`, result.guidance);
}

function renderPublishResult(result: PublishGuidanceResult): string {
  return [
    `Published guidance for ${result.workflowName}.`,
    `Published ${result.published.length} workflow guidance documents.`,
    `Left ${result.unchanged.length} matching workflow guidance overrides unchanged.`,
    `Found ${result.alreadyEditableRoles.length} active role guidance documents already editable.`
  ].join("\n");
}

function renderDiffCommands(result: DiffGuidanceCommandsResult): string {
  if (result.commands.length === 0) {
    return `No guidance documents can be diffed for ${result.workflowName}.`;
  }

  return [
    `Guidance diff targets for ${result.workflowName}:`,
    ...result.commands.map((command) => `- ${command}`)
  ].join("\n");
}

function renderDiffResult(result: DiffGuidanceResult): string {
  if (result.diff.trim() === "") {
    return `No guidance changes for ${result.name}.`;
  }

  return [
    `Diff for guidance ${result.name}:`,
    result.diff.trimEnd()
  ].join("\n");
}

function renderResetResult(result: ResetGuidanceResult): string {
  return `Reset guidance ${result.guidance.name} for ${result.workflowName}.`;
}

function renderResetAllPreview(result: ResetAllGuidancePreviewResult): string {
  if (result.guidance.length === 0) {
    return `No guidance customizations to reset for ${result.workflowName}.`;
  }

  return [
    renderGuidanceTable(`Guidance customizations to reset for ${result.workflowName}`, result.guidance),
    "",
    "This will remove workflow guidance overrides and restore modified or missing role guidance.",
    "Type reset guidance to continue."
  ].join("\n");
}

function renderResetAllResult(result: ResetAllGuidanceResult): string {
  return [
    `Reset guidance customizations for ${result.workflowName}.`,
    `Reset ${result.reset.length} guidance documents.`
  ].join("\n");
}

function runGuidanceList(argv: string[]): CliResult {
  if (argv.length > 2) {
    throw new CliError("Usage: aix guidance list", EXIT_USAGE);
  }

  return { exitCode: 0, stdout: renderGuidanceList(listGuidance()) };
}

function runGuidancePublish(argv: string[]): CliResult {
  if (argv.length > 3) {
    throw new CliError("Usage: aix guidance publish", EXIT_USAGE);
  }

  if (argv[2]) {
    throw new CliError("Usage: aix guidance publish\nPublishing exposes the complete active guidance set.", EXIT_USAGE);
  }

  return { exitCode: 0, stdout: renderPublishResult(publishGuidance()) };
}

function runGuidanceDiff(argv: string[]): CliResult {
  if (argv.length > 3) {
    throw new CliError("Usage: aix guidance diff [guidance-name]", EXIT_USAGE);
  }

  return {
    exitCode: 0,
    stdout: argv[2] ? renderDiffResult(diffGuidance(argv[2])) : renderDiffCommands(diffGuidanceCommands())
  };
}

function runGuidanceReset(argv: string[]): CliResult {
  if (argv.length !== 3) {
    throw new CliError("Usage: aix guidance reset <guidance-name|--all>", EXIT_USAGE);
  }

  if (argv[2] === "--all") {
    throw new CliError("Use interactive `aix guidance reset --all` to review and confirm all guidance resets.", EXIT_USAGE);
  }

  return { exitCode: 0, stdout: renderResetResult(resetGuidance(argv[2])) };
}

function runGuidanceCommand(argv: string[]): CliResult {
  switch (argv[1]) {
    case "list":
      return runGuidanceList(argv);
    case "publish":
      return runGuidancePublish(argv);
    case "diff":
      return runGuidanceDiff(argv);
    case "reset":
      return runGuidanceReset(argv);
    default:
      throw new CliError("Usage: aix guidance <list|publish|diff|reset>", EXIT_USAGE);
  }
}

async function confirmResetAll(input: Readable, output: Writable): Promise<CliResult> {
  const preview = previewResetAllGuidance();
  const previewText = renderResetAllPreview(preview);

  if (preview.guidance.length === 0) {
    return { exitCode: 0, stdout: previewText };
  }

  output.write(`${previewText}\n`);

  const readline = createInterface({ input, output });

  try {
    const answer = await readline.question("Confirm reset: ");

    if (answer.trim() !== "reset guidance") {
      return { exitCode: 0, stdout: "Guidance reset cancelled." };
    }
  } finally {
    readline.close();
  }

  return { exitCode: 0, stdout: renderResetAllResult(resetAllGuidance()) };
}

export const guidanceCommand: Command = {
  name: "guidance",
  usage: "guidance <list|publish|diff|reset>",
  summary: "Manage editable guidance",
  splash: [
    { usage: "guidance list", summary: "List workflow and role guidance" },
    { usage: "guidance publish", summary: "Publish editable workflow guidance" },
    { usage: "guidance diff [name]", summary: "Compare guidance with origins" },
    { usage: "guidance reset <name|--all>", summary: "Reset guidance customizations" }
  ],
  run: runGuidanceCommand,
  async runInteractive(argv, context) {
    if (argv[1] === "reset" && argv[2] === "--all" && argv.length === 3) {
      return confirmResetAll(context.input, context.output);
    }

    return runGuidanceCommand(argv);
  }
};
