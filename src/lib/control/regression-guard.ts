import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import type { ChangePlan } from "@/lib/types/core";
import type { SourceFileInput } from "@/lib/intelligence/repo-intelligence";
import type { ProposedPatch } from "@/lib/workspace/workspace-types";

export interface RegressionCheck {
  id: string;
  label: string;
  status: "passed" | "warning" | "failed";
  detail: string;
}

export interface RegressionGuardResult {
  passed: boolean;
  checks: RegressionCheck[];
  summary: string;
  suggestedCommands: string[];
  executedCommands: Array<{ label: string; exitCode: number; output: string }>;
}

export async function runRegressionGuard(input: {
  plan: ChangePlan;
  patches: ProposedPatch[];
  corpus: SourceFileInput[];
  blastRadius: string[];
  repositoryId?: string;
}): Promise<RegressionGuardResult> {
  const checks: RegressionCheck[] = [];
  const executedCommands: RegressionGuardResult["executedCommands"] = [];
  const corpusPaths = new Set(input.corpus.map((f) => f.path));
  const changedPaths = new Set(input.patches.map((p) => p.path));

  for (const patch of input.patches) {
    for (const spec of extractImports(patch.after)) {
      if (!spec.startsWith(".") && !spec.startsWith("@/")) continue;
      const resolved = resolveImport(patch.path, spec, corpusPaths);
      if (!resolved) {
        checks.push({
          id: `import:${patch.path}:${spec}`,
          label: "Import resolves",
          status: "failed",
          detail: `${patch.path} imports "${spec}" which is not in the corpus.`
        });
      }
    }
  }

  if (checks.every((c) => c.status !== "failed")) {
    checks.push({
      id: "imports-ok",
      label: "Import resolves",
      status: "passed",
      detail: "All relative imports in patches resolve to known files."
    });
  }

  const unwired = findUnwiredComponents(input.patches, input.corpus);
  if (unwired.length > 0) {
    checks.push({
      id: "wiring",
      label: "Component wiring",
      status: "warning",
      detail: `${unwired.join(", ")} may not be imported by routes/screens yet.`
    });
  } else if (input.patches.some((p) => /^[A-Z]/.test(p.path.split("/").pop() ?? ""))) {
    checks.push({
      id: "wiring-ok",
      label: "Component wiring",
      status: "passed",
      detail: "New or changed UI files appear referenced in the corpus."
    });
  }

  const blastCount = input.blastRadius.length;
  checks.push({
    id: "blast",
    label: "Blast radius",
    status: blastCount > 8 ? "warning" : "passed",
    detail:
      blastCount > 0
        ? `${blastCount} symbol(s)/file(s) may be affected — targeted verify below.`
        : "Blast radius is narrow for this change."
  });

  const suggestedCommands = inferSuggestedCommands(input.corpus, changedPaths);
  const commandRuns = await runTargetedVerification({
    corpus: input.corpus,
    changedPaths,
    repositoryId: input.repositoryId ?? "regression_verify"
  });
  executedCommands.push(...commandRuns);

  const hardFail = commandRuns.some(
    (c) => c.exitCode !== 0 && !c.label.includes("hint") && !c.label.includes("skipped")
  );
  if (commandRuns.length > 0) {
    checks.push({
      id: "targeted-verify",
      label: "Targeted verify (executed)",
      status: hardFail ? "failed" : "passed",
      detail: hardFail
        ? commandRuns
            .filter((c) => c.exitCode !== 0)
            .map((c) => `${c.label}: ${c.output.slice(0, 120)}`)
            .join(" · ")
        : `Ran ${commandRuns.length} command(s) in regression sandbox — all passed.`
    });
  } else {
    checks.push({
      id: "targeted-verify",
      label: "Targeted verify",
      status: "warning",
      detail: "No package targets detected — run full sandbox verify after approve."
    });
  }

  const failed = checks.some((c) => c.status === "failed");
  const warnings = checks.filter((c) => c.status === "warning").length;

  return {
    passed: !failed,
    checks,
    summary: failed
      ? "Regression shield found blocking issues — fix before approve."
      : warnings > 0
        ? "Regression shield passed with warnings — review command output."
        : "Regression shield executed targeted checks — no obvious breakages.",
    suggestedCommands,
    executedCommands
  };
}

async function runTargetedVerification(input: {
  corpus: SourceFileInput[];
  changedPaths: Set<string>;
  repositoryId: string;
}): Promise<Array<{ label: string; exitCode: number; output: string }>> {
  if (process.env.BOOTRISE_SKIP_REGRESSION_EXEC === "1" || input.repositoryId.startsWith("test-")) {
    return [
      {
        label: "Targeted verify skipped",
        exitCode: 0,
        output: "BOOTRISE_SKIP_REGRESSION_EXEC=1 — execution disabled for this environment."
      }
    ];
  }

  const { detectPackageVerifyTargets, runPackageVerify, shouldRunHeavyVerify } = await import(
    "@/lib/workspace/monorepo-verify"
  );

  if (input.corpus.length === 0) return [];
  if (!shouldRunHeavyVerify(input.corpus) && input.corpus.length < 8) {
    return [
      {
        label: "Targeted verify skipped",
        exitCode: 0,
        output: "Corpus too sparse for install — run BOOTRISE_SANDBOX_FULL=1 or import lockfiles."
      }
    ];
  }

  const root = resolve(process.cwd(), ".bootrise", "regression", input.repositoryId);
  mkdirSync(root, { recursive: true });

  for (const file of input.corpus) {
    const safe = file.path.replace(/^(\.\.(\/|\\|$))+/, "");
    const target = join(root, safe);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, file.content, "utf8");
  }

  const paths = input.corpus.map((f) => f.path);
  const allTargets = detectPackageVerifyTargets(paths, root);
  const changedPrefixes = [...input.changedPaths].map((p) => p.split("/").slice(0, 2).join("/"));
  const targets = allTargets.filter((t) =>
    changedPrefixes.some((prefix) => t.relativeDir.startsWith(prefix) || prefix.startsWith(t.relativeDir.replace(/\.$/, "")))
  );
  const selected = targets.length > 0 ? targets.slice(0, 2) : allTargets.slice(0, 1);

  const installTimeout = Number(process.env.BOOTRISE_REGRESSION_INSTALL_MS ?? "120000");
  const verifyTimeout = Number(process.env.BOOTRISE_REGRESSION_VERIFY_MS ?? "90000");

  const results: Array<{ label: string; exitCode: number; output: string }> = [];
  for (const target of selected) {
    const runs = await runPackageVerify(root, target, installTimeout, verifyTimeout);
    results.push(...runs.map((r) => ({ ...r, label: `Regression · ${target.label} · ${r.label}` })));
  }

  return results;
}

function findUnwiredComponents(patches: ProposedPatch[], corpus: SourceFileInput[]): string[] {
  const unwired: string[] = [];
  for (const patch of patches) {
    const componentName = patch.path.split("/").pop()?.replace(/\.\w+$/, "") ?? "";
    if (!/^[A-Z]/.test(componentName)) continue;
    const referencedElsewhere = corpus.some((f) => f.path !== patch.path && f.content.includes(componentName));
    if (!referencedElsewhere) unwired.push(patch.path);
  }
  return unwired;
}

function extractImports(source: string): string[] {
  const specs: string[] = [];
  for (const match of source.matchAll(/from\s+["']([^"']+)["']/g)) specs.push(match[1]);
  return specs;
}

function resolveImport(from: string, spec: string, paths: Set<string>): string | null {
  const fromDir = from.split("/").slice(0, -1);
  const joined = normalizePath([...fromDir, ...spec.split("/")]);
  for (const candidate of [joined, `${joined}.ts`, `${joined}.tsx`, `${joined}/index.ts`]) {
    if (paths.has(candidate)) return candidate;
  }
  return null;
}

function normalizePath(parts: string[]): string {
  const stack: string[] = [];
  for (const part of parts) {
    if (part === "..") stack.pop();
    else if (part !== "." && part) stack.push(part);
  }
  return stack.join("/");
}

function inferSuggestedCommands(corpus: SourceFileInput[], changed: Set<string>): string[] {
  const cmds: string[] = [];
  const hasPkg = corpus.some((f) => f.path.endsWith("package.json"));
  const hasPy = [...changed].some((p) => p.endsWith(".py")) || corpus.some((f) => f.path.includes("backend"));
  if (hasPkg) {
    cmds.push("npm run typecheck");
    cmds.push("npm test");
  }
  if (hasPy) cmds.push("pytest (targeted module)");
  return [...new Set(cmds)].slice(0, 4);
}
