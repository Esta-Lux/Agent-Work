import type { ProposedPatch } from "@/lib/workspace/workspace-types";

export interface VagueOutputFinding {
  path?: string;
  phrase: string;
  message: string;
  severity: "warning" | "block";
}

export interface VagueOutputGuardResult {
  passed: boolean;
  blocked: boolean;
  summary: string;
  findings: VagueOutputFinding[];
}

const BLOCKED_PHRASES = [
  /TODO\b/i,
  /placeholder/i,
  /implement later/i,
  /wire this later/i,
  /\bexample only\b/i,
  /\bpseudo(code)?\b/i,
  /assume existing/i,
  /rest of file unchanged/i
];

function newlyIntroduces(text: string, previous: string, pattern: RegExp): boolean {
  return pattern.test(text) && !pattern.test(previous);
}

export function evaluateVagueOutputGuard(patches: ProposedPatch[]): VagueOutputGuardResult {
  const findings: VagueOutputFinding[] = [];

  for (const patch of patches) {
    for (const pattern of BLOCKED_PHRASES) {
      const phrase = pattern.source.replace(/\\b/g, "").replace(/\(\w+\)\?/g, "").replace(/\\/g, "");
      if (newlyIntroduces(patch.summary, "", pattern)) {
        findings.push({
          path: patch.path,
          phrase,
          severity: "block",
          message: `Patch summary for ${patch.path} is still vague (${phrase}).`
        });
      }
      if (newlyIntroduces(patch.after, patch.before, pattern)) {
        findings.push({
          path: patch.path,
          phrase,
          severity: "block",
          message: `Patch for ${patch.path} introduces vague or incomplete output (${phrase}).`
        });
      }
    }
  }

  return {
    passed: findings.length === 0,
    blocked: findings.some((finding) => finding.severity === "block"),
    summary: findings.length
      ? "Vague output guard found incomplete or placeholder language in the proposed patch."
      : "No vague output markers detected in the proposed patch.",
    findings
  };
}
