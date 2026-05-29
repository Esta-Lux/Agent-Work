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

const BLOCKED_PHRASES: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /TODO\b/i, label: "TODO" },
  { pattern: /placeholder/i, label: "placeholder" },
  { pattern: /implement later/i, label: "implement later" },
  { pattern: /wire this later/i, label: "wire this later" },
  { pattern: /\bexample only\b/i, label: "example only" },
  { pattern: /\bpseudo(code)?\b/i, label: "pseudocode" },
  { pattern: /assume existing/i, label: "assume existing" },
  { pattern: /rest of file unchanged/i, label: "rest of file unchanged" }
];

function newlyIntroduces(text: string, previous: string, pattern: RegExp): boolean {
  return pattern.test(text) && !pattern.test(previous);
}

export function evaluateVagueOutputGuard(patches: ProposedPatch[]): VagueOutputGuardResult {
  const findings: VagueOutputFinding[] = [];

  for (const patch of patches) {
    for (const blocked of BLOCKED_PHRASES) {
      if (newlyIntroduces(patch.summary, "", blocked.pattern)) {
        findings.push({
          path: patch.path,
          phrase: blocked.label,
          severity: "block",
          message: `Patch summary for ${patch.path} is still vague (${blocked.label}).`
        });
      }
      if (newlyIntroduces(patch.after, patch.before, blocked.pattern)) {
        findings.push({
          path: patch.path,
          phrase: blocked.label,
          severity: "block",
          message: `Patch for ${patch.path} introduces vague or incomplete output (${blocked.label}).`
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
