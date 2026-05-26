import type { SourceFileInput } from "@/lib/intelligence/repo-intelligence";
import type { ProposedPatch } from "@/lib/workspace/workspace-types";

export interface SecurityGuardFinding {
  id: string;
  severity: "critical" | "high" | "medium" | "low";
  title: string;
  file?: string;
  blocksDeployment: boolean;
}

export interface SecurityGuardResult {
  passed: boolean;
  criticalCount: number;
  findings: SecurityGuardFinding[];
}

/** Lightweight deterministic guard until full security scan engine runs. */
export function runSecurityGuard(input: {
  files: SourceFileInput[];
  patches: ProposedPatch[];
}): SecurityGuardResult {
  const findings: SecurityGuardFinding[] = [];
  const corpus = [...input.files, ...input.patches.map((p) => ({ path: p.path, content: p.after }))];

  for (const file of corpus) {
    if (/service[_-]?role|SUPABASE_SERVICE_ROLE|sk_live_|AKIA[0-9A-Z]{16}/i.test(file.content)) {
      findings.push({
        id: `sec_${file.path}`,
        severity: "critical",
        title: "Possible secret or service role in source",
        file: file.path,
        blocksDeployment: true
      });
    }
    if (/\.env["']?\s*[,}]|process\.env\.[A-Z_]+/.test(file.content) && /client|browser|NEXT_PUBLIC/.test(file.path)) {
      findings.push({
        id: `env_${file.path}`,
        severity: "high",
        title: "Environment variable reference in client path",
        file: file.path,
        blocksDeployment: false
      });
    }
  }

  const critical = findings.filter((f) => f.severity === "critical");
  return {
    passed: critical.length === 0,
    criticalCount: critical.length,
    findings
  };
}
