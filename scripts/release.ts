import { spawn } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

type ReleaseKind = "patch" | "minor" | "major";

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const packageJsonPath = resolve(rootDir, "package.json");
const versionPattern = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/;

function usage(): never {
  console.error("Usage: bun run release -- <patch|minor|major|x.y.z>");
  process.exit(1);
}

function bumpVersion(version: string, kind: ReleaseKind): string {
  const match = version.match(/^(\d+)\.(\d+)\.(\d+)(?:-.+)?$/);
  if (!match) {
    throw new Error(`Unsupported version format: ${version}`);
  }
  const major = Number(match[1]);
  const minor = Number(match[2]);
  const patch = Number(match[3]);

  if (kind === "major") return `${major + 1}.0.0`;
  if (kind === "minor") return `${major}.${minor + 1}.0`;
  return `${major}.${minor}.${patch + 1}`;
}

function runCommand(
  command: string,
  args: string[],
  options: { capture?: boolean } = {},
): Promise<{ stdout: string }> {
  return new Promise((resolvePromise, reject) => {
    const proc = spawn(command, args, {
      cwd: rootDir,
      stdio: options.capture ? ["ignore", "pipe", "pipe"] : "inherit",
    });

    let stdout = "";
    let stderr = "";

    if (options.capture) {
      proc.stdout?.on("data", (chunk) => {
        stdout += chunk.toString();
      });
      proc.stderr?.on("data", (chunk) => {
        stderr += chunk.toString();
      });
    }

    proc.on("error", reject);
    proc.on("close", (code) => {
      if (code === 0) {
        resolvePromise({ stdout });
        return;
      }
      const detail = options.capture && stderr.trim().length > 0 ? `\n${stderr.trim()}` : "";
      reject(new Error(`Command failed: ${command} ${args.join(" ")}${detail}`));
    });
  });
}

async function ensureCleanWorkingTree(): Promise<void> {
  const { stdout } = await runCommand("git", ["status", "--porcelain"], { capture: true });
  if (stdout.trim().length > 0) {
    throw new Error("Working tree is not clean. Commit or stash changes before releasing.");
  }
}

async function ensureTagAbsent(tag: string): Promise<void> {
  const { stdout } = await runCommand("git", ["tag", "-l", tag], { capture: true });
  if (stdout.trim().length > 0) {
    throw new Error(`Tag ${tag} already exists. Delete it or choose a new version.`);
  }
}

async function loadPackageJson(): Promise<{ data: Record<string, unknown>; version: string }> {
  const text = await readFile(packageJsonPath, "utf-8");
  const data = JSON.parse(text) as Record<string, unknown>;
  const version = typeof data.version === "string" ? data.version : "";
  if (!versionPattern.test(version)) {
    throw new Error(`Invalid version in package.json: ${version || "(missing)"}`);
  }
  return { data, version };
}

async function savePackageJson(data: Record<string, unknown>): Promise<void> {
  const text = `${JSON.stringify(data, null, 2)}\n`;
  await writeFile(packageJsonPath, text);
}

async function main(): Promise<void> {
  const arg = process.argv[2];
  if (!arg) usage();

  const kind = arg === "patch" || arg === "minor" || arg === "major" ? (arg as ReleaseKind) : null;
  const explicitVersion = kind ? null : arg;

  if (!kind && !versionPattern.test(explicitVersion)) {
    usage();
  }

  await ensureCleanWorkingTree();

  const { data, version: currentVersion } = await loadPackageJson();
  const nextVersion = kind ? bumpVersion(currentVersion, kind) : explicitVersion;
  const tag = `v${nextVersion}`;

  if (nextVersion === currentVersion) {
    throw new Error(`Version is already ${currentVersion}`);
  }

  await ensureTagAbsent(tag);

  data.version = nextVersion;
  await savePackageJson(data);

  await runCommand("bun", ["run", "lint"]);
  await runCommand("bun", ["test"]);

  await runCommand("git", ["add", "package.json"]);
  await runCommand("git", ["commit", "-m", `chore(release): bump version to ${nextVersion}`]);
  await runCommand("git", ["tag", "-a", tag, "-m", tag]);
  await runCommand("git", ["push", "origin", "HEAD"]);
  await runCommand("git", ["push", "origin", tag]);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
