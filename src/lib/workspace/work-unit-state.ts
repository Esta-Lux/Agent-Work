import type { ProposedPatch } from "@/lib/workspace/workspace-types";

export type WorkUnitStatus =
  | "planned"
  | "running"
  | "patched"
  | "blocked"
  | "passed"
  | "skipped";

export interface WorkUnitExecution {
  workUnitId: string;
  status: WorkUnitStatus;
  patches: ProposedPatch[];
  blockers: string[];
  warnings: string[];
  controlSummary?: string;
}

export interface MultiPassExecutionResult {
  taskId: string;
  status: "completed" | "blocked" | "partial";
  executions: WorkUnitExecution[];
  mergedPatches: ProposedPatch[];
  finalCompletionPassed: boolean;
  blockers: string[];
  warnings: string[];
}
