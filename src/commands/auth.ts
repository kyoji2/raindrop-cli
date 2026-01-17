import { RaindropAPI } from "../api";
import { deleteConfig, getToken, saveConfig } from "../utils/config";
import { type GlobalOptions, output, outputError } from "../utils/output";
import { withSpinner } from "../utils/spinner";

export interface LoginOptions extends GlobalOptions {
  token?: string;
}

export async function cmdLogin(options: LoginOptions): Promise<void> {
  let token = options.token ?? "";

  if (!token) {
    process.stdout.write("Enter your Raindrop.io API Token: ");
    const prompt = await import("node:readline");
    const rl = prompt.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    token = await new Promise((resolve) => {
      rl.question("", (answer) => {
        rl.close();
        resolve(answer);
      });
    });
  }

  if (!token) {
    outputError("Token is required", 400);
  }

  const api = new RaindropAPI(token);
  const user = await withSpinner("Verifying token...", () => api.getUser(), `Logged in as ${token.slice(0, 8)}...`);

  await saveConfig({ token });
  console.log(`Welcome, ${user.fullName}!`);
}

export async function cmdLogout(_options: GlobalOptions): Promise<void> {
  await deleteConfig();
  console.log("Logged out. Credentials removed.");
}

export async function cmdWhoami(options: GlobalOptions): Promise<void> {
  const api = getAuthenticatedAPI(options);
  const user = await withSpinner("Fetching user info...", () => api.getUser());
  output(user, options.format);
}

function getAuthenticatedAPI(options: GlobalOptions): RaindropAPI {
  const token = getToken();
  if (!token) {
    outputError("Not logged in. Run `raindrop login` first.", 401);
  }
  return new RaindropAPI(token, options.dryRun);
}

export { getAuthenticatedAPI };
