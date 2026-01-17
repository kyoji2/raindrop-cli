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

export function outputSuccess(data: unknown, format: OutputFormat): void {
  output(data, format);
}

export type CommandHandler = (args: string[], options: GlobalOptions) => Promise<void>;

export function createCommandRunner(format: OutputFormat) {
  return async function runCommand(handler: () => Promise<void>, errorContext?: string): Promise<void> {
    try {
      await handler();
    } catch (error) {
      if (error instanceof Error && "statusCode" in error) {
        const apiError = error as Error & { statusCode: number; hint?: string };
        let hint = apiError.hint;
        if (!hint) {
          if (apiError.statusCode === 404) {
            hint = "The requested resource was not found. Verify the ID is correct.";
          } else if (apiError.statusCode === 401) {
            hint = "Authentication failed. Try running 'raindrop login' again.";
          }
        }
        outputError(apiError.message, apiError.statusCode, hint, format);
      } else if (error instanceof SyntaxError) {
        outputError(
          "Invalid JSON input provided to command.",
          400,
          "Ensure your JSON data is valid and properly escaped for the shell.",
          format,
        );
      } else {
        const message = error instanceof Error ? error.message : String(error);
        const context = errorContext ? `${errorContext}: ${message}` : message;
        outputError(`Unexpected error: ${context}`, 500, "Check the CLI logs or report this issue.", format);
      }
    }
  };
}
