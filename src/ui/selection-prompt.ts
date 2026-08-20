import { createInterface } from "node:readline/promises";
import type { Readable, Writable } from "node:stream";
import { rawlist, Separator } from "@inquirer/prompts";
import color from "yoctocolors";
import { format } from "./format.js";

export interface SelectionMenuItem {
  label: string;
  detail?: string;
}

export interface SelectionOption<T> extends SelectionMenuItem {
  value: T;
}

export interface SelectionMenuSection {
  header: string;
  items: string[];
}

export interface RenderSelectionMenuOptions {
  color?: boolean;
  emptyMessage?: string;
}

export interface PromptForSelectionOptions {
  prompt?: string;
  emptyMessage?: string;
  invalidSelectionError?: (answer: string) => Error;
}

function isInteractive(input: Readable, output: Writable): boolean {
  return "isTTY" in input && input.isTTY === true && "isTTY" in output && output.isTTY === true;
}

export function renderSelectionMenu(
  title: string,
  items: SelectionMenuItem[],
  sections: SelectionMenuSection[] = [],
  options: RenderSelectionMenuOptions = {}
): string {
  const useColor = options.color === true;
  const lines = [format(title, color.bold, useColor)];

  if (items.length > 0) {
    lines.push(
      ...items.map((item, index) => {
        const number = format(`${index + 1}.`, color.cyan, useColor);
        const label = format(item.label, color.bold, useColor);
        const detail = item.detail ? `\t${format(item.detail, color.dim, useColor)}` : "";

        return `${number} ${label}${detail}`;
      })
    );
  } else {
    lines.push(options.emptyMessage || "No options are currently available.");
  }

  lines.push(format("q - Quit", color.cyan, useColor));

  for (const section of sections) {
    if (section.items.length === 0) {
      continue;
    }

    lines.push("", format(section.header, color.yellow, useColor));
    lines.push(...section.items.map((item) => `- ${item}`));
  }

  lines.push("");

  return lines.join("\n");
}

export function selectMenuItemIndex(itemCount: number, answer: string): number | undefined {
  const trimmedAnswer = answer.trim();

  if (trimmedAnswer.toLowerCase() === "q") {
    return undefined;
  }

  const selection = Number.parseInt(trimmedAnswer, 10);

  if (!Number.isInteger(selection) || selection < 1 || selection > itemCount) {
    return Number.NaN;
  }

  return selection - 1;
}

async function promptForInteractiveSelection<T>(
  title: string,
  options: SelectionOption<T>[],
  sections: SelectionMenuSection[],
  input: Readable,
  output: Writable
): Promise<T | undefined> {
  const quitIndex = -1;
  const choices: Array<{ name: string; value: number; key?: string } | Separator> = options.map((option, index) => ({
    value: index,
    name: option.detail ? `${option.label}  ${option.detail}` : option.label,
    key: String(index + 1)
  }));

  choices.push({ value: quitIndex, name: "Quit", key: "q" });

  for (const section of sections) {
    if (section.items.length === 0) {
      continue;
    }

    choices.push(new Separator(section.header));
    choices.push(...section.items.map((item) => new Separator(`- ${item}`)));
  }

  const selectedIndex = await rawlist(
    {
      message: title,
      choices,
      loop: false,
      theme: {
        keybindings: []
      }
    },
    { input, output }
  );

  return selectedIndex === quitIndex ? undefined : options[selectedIndex]?.value;
}

export async function promptForSelection<T>(
  title: string,
  options: SelectionOption<T>[],
  sections: SelectionMenuSection[],
  input: Readable,
  output: Writable,
  optionsConfig: PromptForSelectionOptions = {}
): Promise<T | undefined> {
  if (isInteractive(input, output)) {
    return promptForInteractiveSelection(title, options, sections, input, output);
  }

  const useColor = "isTTY" in output && output.isTTY === true;
  const prompt = optionsConfig.prompt || "Select option: ";

  output.write(`${renderSelectionMenu(title, options, sections, { color: useColor, emptyMessage: optionsConfig.emptyMessage })}\n`);

  const readline = createInterface({ input, output });

  try {
    const answer = await readline.question(prompt);
    const selectedIndex = selectMenuItemIndex(options.length, answer);

    if (selectedIndex === undefined) {
      return undefined;
    }

    if (Number.isNaN(selectedIndex)) {
      throw optionsConfig.invalidSelectionError
        ? optionsConfig.invalidSelectionError(answer)
        : new Error(`Invalid selection: ${answer}`);
    }

    return options[selectedIndex].value;
  } finally {
    readline.close();
  }
}
