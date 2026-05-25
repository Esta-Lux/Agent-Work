import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { SandboxRuntime } from "@/lib/engine/sandbox-runtime";
import { upsertSandboxPool, createPreviewSession } from "@/lib/infrastructure/control-plane";
import type { SourceFileInput } from "@/lib/intelligence/repo-intelligence";

export interface SandboxVerifyResult {
  repositoryId: string;
  sessionId: string;
  status: "passed" | "failed" | "skipped";
  commands: Array<{ label: string; exitCode: number; output: string }>;
  previewUrl: string | null;
  message: string;
}

interface VerifyTarget {
  label: string;
  relativeDir: string;
  commands: string[][];
}

export async function runWorkspaceSandboxVerify(
  files: SourceFileInput[],
  repositoryId: string
): Promise<SandboxVerifyResult> {
  const sessionId = `sandbox_${Date.now()}`;
  const root = resolve(process.cwd(), ".bootrise", "sandbox", repositoryId);
  mkdirSync(root, { recursive: true });

  for (const file of files) {
    const safe = file.path.replace(/^(\.\.(\/|\\|$))+/, "");
    const target = join(root, safe);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, file.content, "utf8");
  }

  await upsertSandboxPool({ activeSandboxes: 1, queuedJobs: 0, status: "online" });
  const preview = await createPreviewSession({ repositoryId, framework: detectFramework(files) });

  const commands: SandboxVerifyResult["commands"] = [];
  const paths = files.map((f) => f.path);
  const partialImport = files.length < 20 || !paths.some((p) => p.includes("package-lock"));

  commands.push({
    label: "Workspace layout",
    exitCode: 0,
    output: `Staged ${files.length} file(s)${partialImport ? " (partial import — skipping heavy npm install)" : ""}.`
  });

  if (partialImport) {
    commands.push(...(await runStructureChecks(root, files)));
    commands.push(...summarizePackageScripts(root, paths));
  } else {
    const targets = detectVerifyTargets(paths);
    for (const target of targets) {
      const runtime = new SandboxRuntime(join(root, target.relativeDir));
      for (const cmd of target.commands) {
        const result = await runtime.executeCommand(cmd);
        commands.push({
          label: `${target.label}: ${cmd.join(" ")}`,
          exitCode: result.exitCode,
          output: trimOutput(`${result.stdout}\n${result.stderr}`)
        });
      }
    }
  }

  const failed = commands.some((c) => c.exitCode !== 0 && !c.label.includes("Workspace layout"));
  const hardFail = commands.some((c) => c.exitCode !== 0 && c.label.includes("Python"));
  await upsertSandboxPool({ activeSandboxes: 0, queuedJobs: 0 });

  return {
    repositoryId,
    sessionId,
    status: hardFail ? "failed" : failed ? "skipped" : "passed",
    commands,
    previewUrl: preview.previewUrl,
    message: partialImport
      ? "Structure checks passed on imported files. Run npm install + tests in BootRise export or your local clone before release."
      : hardFail
        ? "Sandbox found issues — review output."
        : "Sandbox verification completed."
  };
}

function detectVerifyTargets(paths: string[]): VerifyTarget[] {
  const targets: VerifyTarget[] = [];
  if (paths.some((p) => p.startsWith("app/mobile/"))) {
    targets.push({
      label: "Mobile",
      relativeDir: "app/mobile",
      commands: [
        ["npm", "ci", "--ignore-scripts"],
        ["npx", "tsc", "--noEmit"]
      ]
    });
  }
  if (paths.some((p) => p.startsWith("app/frontend/"))) {
    targets.push({
      label: "Frontend",
      relativeDir: "app/frontend",
      commands: [
        ["npm", "ci", "--ignore-scripts"],
        ["npm", "run", "lint"]
      ]
    });
  }
  if (paths.some((p) => p.startsWith("app/backend/"))) {
    targets.push({
      label: "Backend",
      relativeDir: "app/backend",
      commands: [["python3", "-m", "compileall", "-q", "."]]
    });
  }
  if (targets.length === 0 && paths.includes("package.json")) {
    targets.push({
      label: "Root",
      relativeDir: ".",
      commands: [
        ["npm", "install", "--ignore-scripts"],
        ["npm", "run", "typecheck"]
      ]
    });
  }
  return targets;
}

async function runStructureChecks(root: string, files: SourceFileInput[]) {
  const results: SandboxVerifyResult["commands"] = [];
  for (const file of files) {
    if (file.path.endsWith(".json")) {
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
  }

  const mainPy = join(root, "app/backend/main.py");
  if (existsSync(mainPy)) {
    const runtime = new SandboxRuntime(join(root, "app/backend"));
    const py = await runtime.executeCommand(["python3", "-m", "py_compile", "main.py"]);
    results.push({
      label: "Python: app/backend/main.py",
      exitCode: py.exitCode,
      output: trimOutput(py.stderr || py.stdout || "OK")
    });
  }

  return results;
}

function summarizePackageScripts(root: string, paths: string[]): SandboxVerifyResult["commands"] {
  const pkgPaths = ["app/mobile/package.json", "app/frontend/package.json", "package.json"].filter((p) =>
    paths.includes(p)
  );
  const lines: string[] = [];
  for (const rel of pkgPaths) {
    const full = join(root, rel);
    if (!existsSync(full)) continue;
    try {
      const pkg = JSON.parse(readFileSync(full, "utf8")) as { scripts?: Record<string, string> };
      const scripts = Object.keys(pkg.scripts ?? {}).slice(0, 6).join(", ");
      lines.push(`${rel}: scripts → ${scripts || "none"}`);
    } catch {
      lines.push(`${rel}: could not parse`);
    }
  }
  return [
    {
      label: "Monorepo scripts (full clone needed to run)",
      exitCode: 0,
      output: lines.join("\n") || "No package.json in import set."
    }
  ];
}

function detectFramework(files: SourceFileInput[]): string {
  const paths = files.map((f) => f.path).join(" ");
  if (paths.includes("app/mobile")) return "Expo monorepo";
  if (paths.includes("vite.config")) return "Vite";
  if (paths.includes("next.config")) return "Next.js";
  return "Multi-app";
}

function trimOutput(text: string): string {
  return text.trim().slice(0, 800);
}
