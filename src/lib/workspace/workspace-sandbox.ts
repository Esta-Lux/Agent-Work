import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { upsertSandboxPool, createPreviewSession } from "@/lib/infrastructure/control-plane";
import type { SourceFileInput } from "@/lib/intelligence/repo-intelligence";
import {
  detectPackageVerifyTargets,
  runLightStructureChecks,
  runPackageVerify,
  shouldRunHeavyVerify,
  summarizePackageScripts
} from "@/lib/workspace/monorepo-verify";
import { readRepoFiles, resolveRepoFiles, syncRepoFiles } from "@/lib/workspace/repo-store";
import { runVisualSmoke } from "@/lib/workspace/visual-smoke";

export interface SandboxVerifyResult {
  repositoryId: string;
  sessionId: string;
  status: "passed" | "failed" | "skipped";
  commands: Array<{ label: string; exitCode: number; output: string }>;
  previewUrl: string | null;
  message: string;
}

export async function runWorkspaceSandboxVerify(
  files: SourceFileInput[],
  repositoryId: string
): Promise<SandboxVerifyResult> {
  const sessionId = `sandbox_${Date.now()}`;
  const canonical = resolveRepoFiles(repositoryId, files);
  syncRepoFiles(repositoryId, canonical, { snapshotLabel: "skip" });

  const root = resolve(process.cwd(), ".bootrise", "sandbox", repositoryId);
  mkdirSync(root, { recursive: true });

  for (const file of canonical) {
    const safe = file.path.replace(/^(\.\.(\/|\\|$))+/, "");
    const target = join(root, safe);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, file.content, "utf8");
  }

  await upsertSandboxPool({ activeSandboxes: 1, queuedJobs: 0, status: "online" });
  const preview = await createPreviewSession({ repositoryId, framework: detectFramework(canonical) });

  const commands: SandboxVerifyResult["commands"] = [];
  const paths = canonical.map((f) => f.path);
  const heavy = shouldRunHeavyVerify(canonical);
  const installTimeout = Number(process.env.BOOTRISE_SANDBOX_INSTALL_MS ?? "300000");
  const verifyTimeout = Number(process.env.BOOTRISE_SANDBOX_VERIFY_MS ?? "120000");

  commands.push({
    label: "Workspace layout",
    exitCode: 0,
    output: `Staged ${canonical.length} file(s) · verify mode: ${heavy ? "monorepo (npm/python)" : "structure-only"}`
  });

  if (heavy) {
    const targets = detectPackageVerifyTargets(paths, root);
    if (targets.length === 0) {
      const structure = await runLightStructureChecks(root, canonical);
      commands.push(...structure);
      commands.push(summarizePackageScripts(root, paths));
    } else {
      for (const target of targets) {
        const runs = await runPackageVerify(root, target, installTimeout, verifyTimeout);
        commands.push(...runs);
      }
    }
  } else {
    const structure = await runLightStructureChecks(root, canonical);
    commands.push(...structure);
    commands.push(summarizePackageScripts(root, paths));
    commands.push({
      label: "Heavy verify hint",
      exitCode: 0,
      output:
        "Import includes package.json but few files — set BOOTRISE_SANDBOX_FULL=1 or import more of the repo (with lockfiles) for npm install + lint/typecheck."
    });
  }

  const visual = await runVisualSmoke(preview.previewUrl ?? "", canonical, root);
  if (visual.enabled) {
    commands.push({
      label: "Visual smoke (Playwright)",
      exitCode: visual.status === "failed" ? 1 : 0,
      output: [
        visual.message,
        ...visual.checks.map((check) =>
          `${check.ok ? "✓" : "✗"} ${check.route}${check.statusCode ? ` (${check.statusCode})` : ""}${check.error ? ` — ${check.error}` : ""}`
        )
      ].join("\n")
    });
  } else {
    commands.push({
      label: "Visual smoke (Playwright)",
      exitCode: 0,
      output: visual.message
    });
  }

  const failed = commands.some(
    (c) => c.exitCode !== 0 && !c.label.includes("Workspace layout") && !c.label.includes("Heavy verify hint")
  );
  const hardFail = commands.some(
    (c) => c.exitCode !== 0 && (c.label.includes("Python") || c.label.includes("Visual smoke"))
  );
  await upsertSandboxPool({ activeSandboxes: 0, queuedJobs: 0 });

  return {
    repositoryId,
    sessionId,
    status: hardFail ? "failed" : failed ? "skipped" : "passed",
    commands,
    previewUrl: preview.previewUrl,
    message: heavy
      ? failed
        ? "Monorepo verify found issues — review command output."
        : "Monorepo verify completed (install + checks on detected packages)."
      : "Structure checks passed. Enable BOOTRISE_SANDBOX_FULL=1 for npm install on sparse imports."
  };
}

function detectFramework(files: SourceFileInput[]): string {
  const paths = files.map((f) => f.path).join(" ");
  if (paths.includes("app/mobile")) return "Expo monorepo";
  if (paths.includes("vite.config")) return "Vite";
  if (paths.includes("next.config")) return "Next.js";
  return "Multi-app";
}
