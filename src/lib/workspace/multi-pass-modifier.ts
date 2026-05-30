import type { WorkUnit, WorkUnitPlan } from "@/lib/workspace/work-unit-planner";

export interface MultiPassExecutionSkeleton {
  enabled: boolean;
  passes: Array<{
    id: string;
    workUnitIds: string[];
    targetFiles: string[];
    status: "planned";
  }>;
  note: string;
}

export function createMultiPassSkeleton(plan: WorkUnitPlan): MultiPassExecutionSkeleton {
  return {
    enabled: plan.requiresMultiPass,
    passes: plan.executionOrder.map((workUnitIds, index) => ({
      id: `pass_${index + 1}`,
      workUnitIds,
      targetFiles: collectTargetFiles(plan.units, workUnitIds),
      status: "planned"
    })),
    note: "Multi-pass execution is planned only. Patch execution remains behind the existing Fix approval flow."
  };
}

function collectTargetFiles(units: WorkUnit[], ids: string[]): string[] {
  const idSet = new Set(ids);
  return [...new Set(units.filter((unit) => idSet.has(unit.id)).flatMap((unit) => unit.targetFiles))];
}
