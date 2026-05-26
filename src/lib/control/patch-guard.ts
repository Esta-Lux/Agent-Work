import type { ProposedPatch } from "@/lib/workspace/workspace-types";
import type { ScopeContract, PatchGuardResult, ControlFinding } from "@/lib/control/types";
import { runHallucinationGuard } from "@/lib/control/hallucination-guard";
import type { SourceFileInput } from "@/lib/intelligence/repo-intelligence";
import { runNoopGuard } from "@/lib/control/noop-guard";
import { isFormatOnlyChange, matchesPattern } from "@/lib/control/patch-guard-utils";

export function runPatchGuard(input: {
  patches: ProposedPatch[];
  contract: ScopeContract;
  corpus: SourceFileInput[];
  request: string;
}): PatchGuardResult {
  const findings: ControlFinding[] = [];
  const changedPaths = input.patches.map((p) => p.path);
  const allowed = new Set(input.contract.allowedEditFiles);
  const installedPackages = extractInstalledPackages(input.corpus);

  let linesChanged = 0;
  let newFiles = 0;
  let newDependencies = 0;
  let formatOnlyCount = 0;

  for (const patch of input.patches) {
    const beforeLines = patch.before.split("\n").length;
    const afterLines = patch.after.split("\n").length;
    linesChanged += Math.abs(afterLines - beforeLines) + Math.min(beforeLines, afterLines) * 0.1;

    if (!patch.before.trim() && patch.after.trim()) newFiles += 1;
    if (isFormatOnlyChange(patch.before, patch.after)) formatOnlyCount += 1;

    if (!allowed.has(patch.path)) {
      findings.push({
        id: `scope:${patch.path}`,
        severity: "block",
        category: "scope",
        message: `${patch.path} is outside the allowed edit contract.`,
        path: patch.path
      });
    }

    for (const pattern of input.contract.forbiddenPatterns) {
      if (matchesPattern(patch.path, pattern)) {
        findings.push({
          id: `forbidden:${patch.path}`,
          severity: "block",
          category: "forbidden",
          message: `${patch.path} matches forbidden zone ${pattern}. Approve scope expansion first.`,
          path: patch.path
        });
      }
    }

    for (const pkg of extractNewNpmImports(patch.before, patch.after)) {
      if (!installedPackages.has(pkg)) {
        newDependencies += 1;
        findings.push({
          id: `dep:${patch.path}:${pkg}`,
          severity: "block",
          category: "diff_budget",
          message: `New npm dependency "${pkg}" is not in package.json — blocked unless scope allows new deps.`,
          path: patch.path
        });
      }
    }
  }

  if (formatOnlyCount > 0 && formatOnlyCount === input.patches.length) {
    findings.push({
      id: "format-only",
      severity: "block",
      category: "diff_budget",
      message:
        "Blocked: patches are formatting-only with no behavioral change. Re-run with an explicit functional fix or approve formatting scope."
    });
  }

  if (
    input.contract.taskType !== "refactor" &&
    !/\b(refactor|restructure|rewrite)\b/i.test(input.request) &&
    changedPaths.length >= 6
  ) {
    findings.push({
      id: "refactor-scope",
      severity: "warning",
      category: "scope",
      message: "Wide multi-file change without refactor scope — consider narrowing the request."
    });
  }

  if (changedPaths.length > input.contract.maxFilesChanged) {
    findings.push({
      id: "diff-files",
      severity: "block",
      category: "diff_budget",
      message: `Blocked: proposed patch changed ${changedPaths.length} files. Exceeds budget of ${input.contract.maxFilesChanged}. Split into a smaller plan or approve expanded scope.`
    });
  }

  if (Math.round(linesChanged) > input.contract.maxLinesChanged) {
    findings.push({
      id: "diff-lines",
      severity: "block",
      category: "diff_budget",
      message: `Estimated ~${Math.round(linesChanged)} line changes exceeds budget of ${input.contract.maxLinesChanged}.`
    });
  }

  if (newFiles > input.contract.maxNewFiles) {
    findings.push({
      id: "diff-new-files",
      severity: "warning",
      category: "diff_budget",
      message: `${newFiles} new files proposed (budget ${input.contract.maxNewFiles}).`
    });
  }

  if (newDependencies > input.contract.maxNewDependencies) {
    findings.push({
      id: "diff-new-deps",
      severity: "block",
      category: "diff_budget",
      message: `${newDependencies} new npm dependencies exceed budget of ${input.contract.maxNewDependencies}.`
    });
  }

  findings.push(...runHallucinationGuard(input.patches, input.corpus));
  findings.push(...runNoopGuard(input.patches, input.request, input.corpus));

  const blocked = findings.some((f) => f.severity === "block");
  const outOfScopeFiles = changedPaths.filter((p) => !allowed.has(p));
  const forbiddenTouched = changedPaths.filter((p) =>
    input.contract.forbiddenPatterns.some((pat) => matchesPattern(p, pat))
  );

  return {
    passed: !blocked,
    blocked,
    filesChanged: changedPaths.length,
    linesChanged: Math.round(linesChanged),
    newFiles,
    forbiddenTouched,
    outOfScopeFiles,
    findings
  };
}

function extractInstalledPackages(corpus: SourceFileInput[]): Set<string> {
  const packages = new Set<string>();
  for (const file of corpus) {
    if (!file.path.endsWith("package.json")) continue;
    try {
      const pkg = JSON.parse(file.content) as {
        dependencies?: Record<string, string>;
        devDependencies?: Record<string, string>;
      };
      for (const name of Object.keys(pkg.dependencies ?? {})) packages.add(name);
      for (const name of Object.keys(pkg.devDependencies ?? {})) packages.add(name);
    } catch {
      /* ignore */
    }
  }
  return packages;
}

function extractNewNpmImports(before: string, after: string): string[] {
  const beforeSpecs = new Set(extractExternalImports(before));
  const added: string[] = [];
  for (const spec of extractExternalImports(after)) {
    if (!beforeSpecs.has(spec) && !spec.startsWith(".") && !spec.startsWith("@/")) added.push(spec);
  }
  return added;
}

function extractExternalImports(source: string): string[] {
  const specs: string[] = [];
  for (const match of source.matchAll(/from\s+["']([^"']+)["']/g)) specs.push(match[1]);
  for (const match of source.matchAll(/require\(["']([^"']+)["']\)/g)) specs.push(match[1]);
  return specs.map((s) => (s.startsWith("@") ? s.split("/").slice(0, 2).join("/") : s.split("/")[0]));
}
