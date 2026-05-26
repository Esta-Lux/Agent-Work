import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { SandboxRuntime } from "@/lib/engine/sandbox-runtime";
import type { SourceFileInput } from "@/lib/intelligence/repo-intelligence";

export interface PackageVerifyTarget {
  label: string;
  relativeDir: string;
  hasLockfile: boolean;
  installCommand: string[];
  verifyCommands: string[][];
}

const LOCKFILES = ["package-lock.json", "pnpm-lock.yaml", "yarn.lock"] as const;

export function hasAnyLockfile(paths: string[]): boolean {
  return paths.some((p) => LOCKFILES.some((lock) => p.endsWith(`/${lock}`) || p === lock));
}

export function detectPackageVerifyTargets(paths: string[], root: string): PackageVerifyTarget[] {
  const pathSet = new Set(paths);
  const targets: PackageVerifyTarget[] = [];

  const packages: Array<{ prefix: string; label: string; preferredScripts: string[] }> = [
    { prefix: "app/mobile/", label: "Mobile", preferredScripts: ["typecheck", "lint"] },
    { prefix: "app/frontend/", label: "Frontend", preferredScripts: ["lint", "typecheck", "build"] },
    { prefix: "", label: "Root", preferredScripts: ["typecheck", "lint", "build"] }
  ];

  for (const pkg of packages) {
    const pkgJson = `${pkg.prefix}package.json`;
    if (!pathSet.has(pkgJson)) continue;

    const lock = LOCKFILES.find((name) => pathSet.has(`${pkg.prefix}${name}`));
    const hasLockfile = Boolean(lock);
    const verifyCommands = pickVerifyCommands(root, pkg.prefix, pkg.preferredScripts);

    targets.push({
      label: pkg.label,
      relativeDir: pkg.prefix || ".",
      hasLockfile,
      installCommand: hasLockfile
        ? ["npm", "ci", "--ignore-scripts", "--no-audit", "--no-fund"]
        : ["npm", "install", "--ignore-scripts", "--no-audit", "--no-fund", "--legacy-peer-deps"],
      verifyCommands
    });
  }

  if (pathSet.has("app/backend/main.py")) {
    targets.push({
      label: "Backend",
      relativeDir: "app/backend",
      hasLockfile: false,
      installCommand: [],
      verifyCommands: [["python3", "-m", "compileall", "-q", "."]]
    });
  }

  return targets;
}

export function shouldRunHeavyVerify(files: SourceFileInput[]): boolean {
  const paths = files.map((f) => f.path);
  const force = process.env.BOOTRISE_SANDBOX_FULL === "1";
  if (force) return true;
  if (paths.some((p) => p.endsWith("package.json"))) return true;
  return files.length >= 8 && hasAnyLockfile(paths);
}

export async function runPackageVerify(
  root: string,
  target: PackageVerifyTarget,
  installTimeoutMs: number,
  verifyTimeoutMs: number
): Promise<Array<{ label: string; exitCode: number; output: string }>> {
  const results: Array<{ label: string; exitCode: number; output: string }> = [];
  const runtime = new SandboxRuntime(join(root, target.relativeDir));

  if (target.installCommand.length > 0 && existsSync(join(root, target.relativeDir, "package.json"))) {
    const install = await runtime.executeCommand(target.installCommand, installTimeoutMs);
    results.push({
      label: `${target.label}: ${target.installCommand.join(" ")}`,
      exitCode: install.exitCode,
      output: trimOutput(`${install.stdout}\n${install.stderr}`)
    });
    if (install.exitCode !== 0) return results;
  }

  for (const cmd of target.verifyCommands) {
    const run = await runtime.executeCommand(cmd, verifyTimeoutMs);
    results.push({
      label: `${target.label}: ${cmd.join(" ")}`,
      exitCode: run.exitCode,
      output: trimOutput(`${run.stdout}\n${run.stderr}`)
    });
  }

  return results;
}

export async function runLightStructureChecks(root: string, files: SourceFileInput[]) {
  const results: Array<{ label: string; exitCode: number; output: string }> = [];

  for (const file of files) {
    if (!file.path.endsWith(".json")) continue;
    try {
      JSON.parse(file.content);
      results.push({ label: `Valid JSON: ${file.path}`, exitCode: 0, output: "OK" });
    } catch (error) {
      results.push({
        label: `Valid JSON: ${file.path}`,
        exitCode: 1,
        output: error instanceof Error ? error.message : "Invalid JSON"
      });
    }
  }

  const mainPy = join(root, "app/backend/main.py");
  if (existsSync(mainPy)) {
    const runtime = new SandboxRuntime(join(root, "app/backend"));
    const py = await runtime.executeCommand(["python3", "-m", "py_compile", "main.py"], 60_000);
    results.push({
      label: "Python: app/backend/main.py",
      exitCode: py.exitCode,
      output: trimOutput(py.stderr || py.stdout || "OK")
    });
  }

  return results;
}

export function summarizePackageScripts(root: string, paths: string[]) {
  const pkgPaths = ["app/mobile/package.json", "app/frontend/package.json", "package.json"].filter((p) =>
    paths.includes(p)
  );
  const lines: string[] = [];
  for (const rel of pkgPaths) {
    const full = join(root, rel);
    if (!existsSync(full)) continue;
    try {
      const pkg = JSON.parse(readFileSync(full, "utf8")) as { scripts?: Record<string, string> };
      const scripts = Object.keys(pkg.scripts ?? {}).slice(0, 8).join(", ");
      lines.push(`${rel}: scripts → ${scripts || "none"}`);
    } catch {
      lines.push(`${rel}: could not parse`);
    }
  }
  return {
    label: "Monorepo scripts",
    exitCode: 0,
    output: lines.join("\n") || "No package.json in import set."
  };
}

function pickVerifyCommands(root: string, prefix: string, preferredScripts: string[]): string[][] {
  const pkgPath = join(root, prefix, "package.json");
  if (!existsSync(pkgPath)) {
    return [["npx", "tsc", "--noEmit"]];
  }

  try {
    const pkg = JSON.parse(readFileSync(pkgPath, "utf8")) as { scripts?: Record<string, string> };
    const scripts = pkg.scripts ?? {};
    for (const name of preferredScripts) {
      if (scripts[name]) return [["npm", "run", name]];
    }
  } catch {
    /* fallback */
  }

  return [["npx", "tsc", "--noEmit"]];
}

function trimOutput(text: string): string {
  return text.trim().slice(0, 1200);
}
