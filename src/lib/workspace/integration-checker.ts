import type { WorkUnitPlan } from "@/lib/workspace/work-unit-planner";

export interface IntegrationCheckSummary {
  passed: boolean;
  warnings: string[];
  blockers: string[];
}

export function checkWorkUnitIntegration(plan: WorkUnitPlan): IntegrationCheckSummary {
  const blockers: string[] = [];
  const warnings = [...plan.crossFileDependencyWarnings];

  for (const unit of plan.units) {
    if (unit.targetFiles.length === 0) {
      blockers.push(`${unit.id} has no concrete target files.`);
    }
    for (const criterion of unit.acceptanceCriteria) {
      if (!unit.targetFiles.some((path) => criterion.includes(path))) {
        blockers.push(`${unit.id} has an acceptance criterion that does not mention a target file.`);
      }
    }
  }

  const allIds = new Set(plan.units.map((unit) => unit.id));
  for (const unit of plan.units) {
    for (const dependency of unit.dependsOn) {
      if (!allIds.has(dependency)) warnings.push(`${unit.id} depends on unknown work unit ${dependency}.`);
    }
  }

  return {
    passed: blockers.length === 0,
    warnings,
    blockers
  };
}
