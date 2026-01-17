import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

export interface Config {
  token: string;
}

export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConfigError";
  }
}

const CONFIG_DIR = join(homedir(), ".config", "raindrop-cli");
const CONFIG_FILE = join(CONFIG_DIR, "config.json");

function isValidConfig(data: unknown): data is Config {
  if (typeof data !== "object" || data === null) return false;
  const obj = data as Record<string, unknown>;
  return typeof obj.token === "string" && obj.token.length > 0;
}

export async function loadConfig(): Promise<Config | null> {
  try {
    const file = Bun.file(CONFIG_FILE);
    const exists = await file.exists();
    if (!exists) return null;

    const text = await file.text();
    if (!text.trim()) return null;

    let data: unknown;
    try {
      data = JSON.parse(text);
    } catch {
      throw new ConfigError(
        `Invalid JSON in config file: ${CONFIG_FILE}. Delete the file and run 'raindrop login' again.`,
      );
    }

    if (!isValidConfig(data)) {
      throw new ConfigError(
        `Invalid config format in ${CONFIG_FILE}. Expected { "token": "..." }. Delete the file and run 'raindrop login' again.`,
      );
    }

    return data;
  } catch (error) {
    if (error instanceof ConfigError) throw error;
    return null;
  }
}

export function loadConfigSync(): Config | null {
  try {
    if (!existsSync(CONFIG_FILE)) return null;

    const text = readFileSync(CONFIG_FILE, "utf-8");
    if (!text.trim()) return null;

    const data = JSON.parse(text);
    if (!isValidConfig(data)) return null;

    return data;
  } catch {
    return null;
  }
}

export async function saveConfig(config: Config): Promise<void> {
  if (!config.token || typeof config.token !== "string") {
    throw new ConfigError("Invalid token: token must be a non-empty string");
  }

  await Bun.$`mkdir -p ${CONFIG_DIR}`;
  await Bun.write(CONFIG_FILE, JSON.stringify(config, null, 2));
}

export async function deleteConfig(): Promise<void> {
  try {
    const file = Bun.file(CONFIG_FILE);
    if (await file.exists()) {
      await Bun.$`rm -f ${CONFIG_FILE}`;
    }
  } catch {}
}

export function getToken(): string | null {
  const envToken = process.env.RAINDROP_TOKEN;
  if (envToken) {
    if (envToken.trim().length === 0) {
      return null;
    }
    return envToken.trim();
  }

  const config = loadConfigSync();
  return config?.token || null;
}

export async function getTokenAsync(): Promise<string | null> {
  const envToken = process.env.RAINDROP_TOKEN;
  if (envToken) {
    if (envToken.trim().length === 0) {
      return null;
    }
    return envToken.trim();
  }

  const config = await loadConfig();
  return config?.token || null;
}
