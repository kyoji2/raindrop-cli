import ora, { type Ora } from "ora";

export function startSpinner(text: string): Ora {
  return ora(text).start();
}

export function stopSpinner(spinner: Ora | null, success?: boolean, text?: string): void {
  if (!spinner) return;

  if (success === true) {
    spinner.succeed(text);
  } else if (success === false) {
    spinner.fail(text);
  } else {
    spinner.stop();
  }
}

export function updateSpinner(spinner: Ora | null, text: string): void {
  if (spinner) {
    spinner.text = text;
  }
}

export async function withSpinner<T>(text: string, fn: () => Promise<T>, successText?: string): Promise<T> {
  const spinner = ora(text).start();
  try {
    const result = await fn();
    spinner.succeed(successText ?? text);
    return result;
  } catch (error) {
    spinner.fail();
    throw error;
  }
}
