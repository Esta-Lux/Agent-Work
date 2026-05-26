import type { SourceFileInput } from "@/lib/intelligence/repo-intelligence";
import type { SecurityFinding } from "@/lib/security/types";

export type AddFinding = (partial: Omit<SecurityFinding, "id">) => void;

export function createFindingCollector() {
  let id = 0;
  const findings: SecurityFinding[] = [];
  const add: AddFinding = (partial) => {
    findings.push({ id: `finding_${++id}`, ...partial });
  };
  return { findings, add };
}

export type FileScanContext = {
  files: SourceFileInput[];
  add: AddFinding;
};
