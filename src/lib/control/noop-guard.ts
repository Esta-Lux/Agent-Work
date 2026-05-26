import type { SourceFileInput } from "@/lib/intelligence/repo-intelligence";
import type { ProposedPatch } from "@/lib/workspace/workspace-types";
import type { ControlFinding } from "@/lib/control/types";

export function runNoopGuard(
  patches: ProposedPatch[],
  request: string,
  corpus: SourceFileInput[]
): ControlFinding[] {
  const findings: ControlFinding[] = [];

  if (patches.length === 0) {
    findings.push({
      id: "noop-empty",
      severity: "block",
      category: "noop",
      message: "No patches were generated — task is not complete."
    });
    return findings;
  }

  const meaningful = patches.filter((p) => p.before.trim() !== p.after.trim());
  if (meaningful.length === 0) {
    findings.push({
      id: "noop-identical",
      severity: "block",
      category: "noop",
      message: "All proposed patches are identical to current files (no real change)."
    });
  }

  for (const patch of patches) {
    const componentName = patch.path.split("/").pop()?.replace(/\.\w+$/, "") ?? "";
    const isComponent = /^[A-Z]/.test(componentName);
    if (!isComponent || !patch.after.trim()) continue;

    const referencedElsewhere = corpus.some(
      (f) => f.path !== patch.path && f.content.includes(componentName)
    );
    const isNewFile = !patch.before.trim();

    if (isNewFile && !referencedElsewhere) {
      findings.push({
        id: `noop-unwired:${patch.path}`,
        severity: "block",
        category: "noop",
        message: `Patch added ${patch.path}, but no screen/route imports ${componentName}. This does not complete the requested workflow.`,
        path: patch.path
      });
    } else if (!referencedElsewhere) {
      findings.push({
        id: `noop-unwired:${patch.path}`,
        severity: "warning",
        category: "noop",
        message: `${patch.path} may not be wired into routes/screens — verify imports.`,
        path: patch.path
      });
    }
  }

  const reqTokens = request.toLowerCase().split(/\W+/).filter((t) => t.length > 4);
  const anyRelevant = patches.some((p) =>
    reqTokens.some((t) => p.path.toLowerCase().includes(t) || p.summary.toLowerCase().includes(t))
  );
  if (reqTokens.length > 0 && !anyRelevant && patches.length > 0) {
    findings.push({
      id: "noop-wrong-target",
      severity: "warning",
      category: "noop",
      message: "Patches may not address the stated request — review scope lock."
    });
  }

  return findings;
}
