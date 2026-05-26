import type { FileScanContext } from "@/lib/security/scan-context";

/** Heuristic dependency risk — full audit would use npm audit in CI. */
export function scanDependencies({ files, add }: FileScanContext): void {
  const pkg = files.find((f) => f.path.endsWith("package.json"));
  if (!pkg) return;
  try {
    const json = JSON.parse(pkg.content) as { dependencies?: Record<string, string> };
    const deps = { ...json.dependencies };
    if (deps["eval"] || deps["node-eval"]) {
      add({
        severity: "high",
        category: "dependency",
        file: pkg.path,
        title: "Risky eval dependency",
        whyItMatters: "Dynamic code execution increases attack surface.",
        recommendedFix: "Remove eval-based packages.",
        blocksDeployment: true,
        autoFixAvailable: false
      });
    }
  } catch {
    add({
      severity: "low",
      category: "dependency",
      file: pkg.path,
      title: "package.json could not be parsed",
      whyItMatters: "Dependency audit skipped.",
      recommendedFix: "Fix package.json syntax.",
      blocksDeployment: false,
      autoFixAvailable: false
    });
  }
}
