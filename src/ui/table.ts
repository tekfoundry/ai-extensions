import color from "yoctocolors";
import { format } from "./format.js";

export interface TableColumn<T> {
  header: string;
  value: (row: T) => string;
}

export interface RenderTableOptions {
  color?: boolean;
  title?: string;
}

export function renderTable<T>(columns: TableColumn<T>[], rows: T[], options: RenderTableOptions = {}): string {
  const useColor = options.color === true;
  const widths = columns.map((column) => column.header.length);

  for (const row of rows) {
    columns.forEach((column, index) => {
      widths[index] = Math.max(widths[index], column.value(row).length);
    });
  }

  const renderCells = (cells: string[]) => cells.map((cell, index) => cell.padEnd(widths[index])).join("  ").trimEnd();
  const header = renderCells(columns.map((column) => format(column.header, color.bold, useColor)));
  const divider = renderCells(widths.map((width) => "-".repeat(width)));
  const body = rows.map((row) => renderCells(columns.map((column) => column.value(row))));
  const lines = options.title ? [format(options.title, color.bold, useColor), "", header, divider, ...body] : [header, divider, ...body];

  return lines.join("\n");
}
