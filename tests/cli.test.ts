import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import { describe, expect, test } from "bun:test";

const packageVersionPromise = (async () => {
  try {
    const text = await readFile(new URL("../package.json", import.meta.url), "utf-8");
    const pkg = JSON.parse(text) as { version?: unknown };

    if (pkg && typeof pkg === "object" && typeof pkg.version === "string" && pkg.version.trim().length > 0) {
      return pkg.version;
    }
  } catch {}

  return "0.0.0";
})();

describe("CLI Integration", () => {
  const cli = async (args: string) =>
    await new Promise<{ stdout: string; stderr: string; exitCode: number }>((resolve, reject) => {
      const argList = args.trim().length > 0 ? args.split(" ") : [];
      const proc = spawn("bun", ["run", "src/index.ts", ...argList], {
        stdio: ["ignore", "pipe", "pipe"],
      });

      let stdout = "";
      let stderr = "";

      proc.stdout?.on("data", (chunk) => {
        stdout += chunk.toString();
      });
      proc.stderr?.on("data", (chunk) => {
        stderr += chunk.toString();
      });

      proc.on("error", reject);
      proc.on("close", (code) => {
        resolve({ stdout, stderr, exitCode: code ?? 0 });
      });
    });

  describe("help and version", () => {
    test("--help shows usage", async () => {
      const { stdout } = await cli("--help");

      expect(stdout).toContain("Usage:");
      expect(stdout).toContain("raindrop");
      expect(stdout).toContain("Commands:");
    });

    test("--version shows version", async () => {
      const { stdout } = await cli("--version");
      const version = await packageVersionPromise;

      expect(stdout).toContain(version);
    });

    test("-h shows help", async () => {
      const { stdout } = await cli("-h");

      expect(stdout).toContain("Usage:");
    });

    test("-v shows version", async () => {
      const { stdout } = await cli("-v");
      const version = await packageVersionPromise;

      expect(stdout).toContain(version);
    });
  });

  describe("subcommand help", () => {
    test("collection --help shows subcommands", async () => {
      const { stdout } = await cli("collection --help");

      expect(stdout).toContain("create");
      expect(stdout).toContain("delete");
      expect(stdout).toContain("get");
      expect(stdout).toContain("update");
    });

    test("tag --help shows subcommands", async () => {
      const { stdout } = await cli("tag --help");

      expect(stdout).toContain("delete");
      expect(stdout).toContain("rename");
    });

    test("batch --help shows subcommands", async () => {
      const { stdout } = await cli("batch --help");

      expect(stdout).toContain("update");
      expect(stdout).toContain("delete");
    });

    test("search --help shows options", async () => {
      const { stdout } = await cli("search --help");

      expect(stdout).toContain("--collection");
      expect(stdout).toContain("--limit");
      expect(stdout).toContain("--pretty");
    });
  });

  describe("schema command", () => {
    test("schema outputs JSON", async () => {
      const { stdout } = await cli("schema");

      const parsed = JSON.parse(stdout);
      expect(parsed.schemas).toBeDefined();
      expect(parsed.schemas.Raindrop).toBeDefined();
      expect(parsed.schemas.Collection).toBeDefined();
      expect(parsed.usage_examples).toBeDefined();
    });
  });

  describe("error handling", () => {
    test("unknown command shows error", async () => {
      const { exitCode } = await cli("unknown-command");

      expect(exitCode).not.toBe(0);
    });

    test("missing required argument shows error", async () => {
      const { exitCode } = await cli("get");

      expect(exitCode).not.toBe(0);
    });
  });

  describe("dry-run mode", () => {
    test("--dry-run is accepted", async () => {
      const { exitCode } = await cli("--dry-run schema");

      expect(exitCode).toBe(0);
    });
  });

  describe("format option", () => {
    test("--format json is accepted", async () => {
      const { exitCode } = await cli("--format json schema");

      expect(exitCode).toBe(0);
    });

    test("-f toon is accepted", async () => {
      const { exitCode } = await cli("-f toon schema");

      expect(exitCode).toBe(0);
    });
  });
});
