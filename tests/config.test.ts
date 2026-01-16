import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { existsSync, rmSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { getToken } from "../src/utils/config";

const TEST_CONFIG_DIR = join(homedir(), ".config", "raindrop-cli-test");
const _TEST_CONFIG_FILE = join(TEST_CONFIG_DIR, "config.json");

describe("config utilities", () => {
  beforeEach(async () => {
    if (existsSync(TEST_CONFIG_DIR)) {
      rmSync(TEST_CONFIG_DIR, { recursive: true });
    }
  });

  afterEach(async () => {
    if (existsSync(TEST_CONFIG_DIR)) {
      rmSync(TEST_CONFIG_DIR, { recursive: true });
    }
  });

  test("getToken returns env variable if set (overrides config)", () => {
    const originalEnv = process.env.RAINDROP_TOKEN;
    process.env.RAINDROP_TOKEN = "test-token-from-env";

    const token = getToken();
    expect(token).toBe("test-token-from-env");

    if (originalEnv) {
      process.env.RAINDROP_TOKEN = originalEnv;
    } else {
      delete process.env.RAINDROP_TOKEN;
    }
  });
});
