import { homedir } from 'os';
import { join } from 'path';

export interface Config {
  token: string;
}

const CONFIG_DIR = join(homedir(), '.config', 'raindrop-cli');
const CONFIG_FILE = join(CONFIG_DIR, 'config.json');

export function loadConfig(): Config | null {
  try {
    const file = Bun.file(CONFIG_FILE);
    if (!file.size) return null;
    const content = require(CONFIG_FILE);
    return content as Config;
  } catch {
    return null;
  }
}

export async function saveConfig(config: Config): Promise<void> {
  await Bun.$`mkdir -p ${CONFIG_DIR}`;
  await Bun.write(CONFIG_FILE, JSON.stringify(config, null, 2));
}

export async function deleteConfig(): Promise<void> {
  try {
    await Bun.$`rm -f ${CONFIG_FILE}`;
  } catch {}
}

export function getToken(): string | null {
  const envToken = process.env.RAINDROP_TOKEN;
  if (envToken) return envToken;

  const config = loadConfig();
  return config?.token || null;
}
