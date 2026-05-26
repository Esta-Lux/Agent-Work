import type { ProposedPatch } from "@/lib/workspace/workspace-types";
import type { SourceFileInput } from "@/lib/intelligence/repo-intelligence";
import type { ControlFinding } from "@/lib/control/types";

export function runDuplicateLogicGuard(
  patches: ProposedPatch[],
  corpus: SourceFileInput[]
): ControlFinding[] {
  const findings: ControlFinding[] = [];
  const corpusBodies = corpus.map((f) => ({
    path: f.path,
    normalized: normalizeForCompare(f.content)
  }));

  for (const patch of patches) {
    const patchNorm = normalizeForCompare(patch.after);
    if (patchNorm.length < 80) continue;

    for (const existing of corpusBodies) {
      if (existing.path === patch.path) continue;
      const overlap = longestCommonSubstringRatio(patchNorm, existing.normalized);
      if (overlap >= 0.72) {
        findings.push({
          id: `duplicate:${patch.path}:${existing.path}`,
          severity: "block",
          category: "hallucination",
          message: `Patch in ${patch.path} largely duplicates logic already in ${existing.path} (~${Math.round(overlap * 100)}% overlap). Reuse existing code instead.`,
          path: patch.path
        });
        break;
      }
    }
  }

  return findings;
}

function normalizeForCompare(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/.*$/gm, "")
    .replace(/\s+/g, "")
    .toLowerCase();
}

function longestCommonSubstringRatio(a: string, b: string): number {
  if (!a.length || !b.length) return 0;
  const maxLen = 4000;
  const sa = a.slice(0, maxLen);
  const sb = b.slice(0, maxLen);
  let best = 0;
  const dp = new Array<number>(sb.length + 1).fill(0);
  for (let i = 1; i <= sa.length; i++) {
    let prev = 0;
    for (let j = 1; j <= sb.length; j++) {
      const temp = dp[j];
      if (sa[i - 1] === sb[j - 1]) {
        dp[j] = prev + 1;
        best = Math.max(best, dp[j]);
      } else {
        dp[j] = 0;
      }
      prev = temp;
    }
  }
  return best / Math.min(sa.length, sb.length);
}
