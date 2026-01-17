import { encode as encodeToon } from "@toon-format/toon";

export type OutputFormat = "json" | "toon";

export interface GlobalOptions {
  dryRun: boolean;
  format: OutputFormat;
}

export { encodeToon };

/**
 * CLI-specific error that should result in a non-zero exit code.
 * Thrown instead of calling process.exit() directly for testability.
 */
export class CLIError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public hint?: string,
  ) {
    super(message);
    this.name = "CLIError";
  }
}

export function output(data: unknown, format: OutputFormat): void {
  if (format === "toon") {
    console.log(encodeToon(data));
  } else {
    console.log(JSON.stringify(data, null, 2));
  }
}

export function outputError(error: string, statusCode: number, hint?: string, _format?: OutputFormat): never {
  throw new CLIError(error, statusCode, hint);
}

export type CommandHandler = (args: string[], options: GlobalOptions) => Promise<void>;

export function createCommandRunner(_format: OutputFormat) {
  return async function runCommand(handler: () => Promise<void>): Promise<void> {
    await handler();
  };
}
