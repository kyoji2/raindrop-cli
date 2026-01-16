import { describe, expect, test } from "bun:test";
import { spawn } from "bun";

describe("CLI Integration", () => {
  const cli = async (args: string) => {
    const proc = spawn({
      cmd: ["bun", "run", "src/index.ts", ...args.split(" ")],
      stdout: "pipe",
      stderr: "pipe",
    });
    const stdout = await new Response(proc.stdout).text();
    const stderr = await new Response(proc.stderr).text();
    const exitCode = await proc.exited;
    return { stdout, stderr, exitCode };
  };

  describe("help and version", () => {
    test("--help shows usage", async () => {
      const { stdout } = await cli("--help");

      expect(stdout).toContain("Usage:");
      expect(stdout).toContain("raindrop");
      expect(stdout).toContain("Commands:");
    });

    test("--version shows version", async () => {
      const { stdout } = await cli("--version");

      expect(stdout).toContain("0.1.0");
    });

    test("-h shows help", async () => {
      const { stdout } = await cli("-h");

      expect(stdout).toContain("Usage:");
    });

    test("-v shows version", async () => {
      const { stdout } = await cli("-v");

      expect(stdout).toContain("0.1.0");
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
