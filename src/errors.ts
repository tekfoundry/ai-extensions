export const EXIT_USAGE = 1;
export const EXIT_RUNTIME_ERROR = 2;

export class CliError extends Error {
  readonly exitCode: number;

  constructor(message: string, exitCode = EXIT_RUNTIME_ERROR) {
    super(message);
    this.name = "CliError";
    this.exitCode = exitCode;
  }
}

export function toCliError(error: unknown): CliError {
  if (error instanceof CliError) {
    return error;
  }

  if (error instanceof Error) {
    return new CliError(error.message);
  }

  return new CliError(String(error));
}
