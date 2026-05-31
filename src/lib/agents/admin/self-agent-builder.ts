import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { getAdminBuildMission } from "@/lib/admin-build/admin-build-store";
import type { SelfAgentWorkUnit } from "@/lib/agents/admin/self-agent-architect";
import { generateSelfAgentPatch, isReviewOnlyMission } from "@/lib/agents/admin/self-agent-patch-generator";
import type { ProposedPatch } from "@/lib/workspace/workspace-types";

export interface SelfAgentPatchPreview {
  missionId: string;
  workUnits: SelfAgentWorkUnit[];
  patches: ProposedPatch[];
  warnings: string[];
}

export function runSelfAgentBuilder(input: {
  missionId: string;
  workUnits: SelfAgentWorkUnit[];
}): SelfAgentPatchPreview {
  const mission = getAdminBuildMission(input.missionId);
  if (!mission) {
    throw new Error("Mission not found.");
  }

  const patches: ProposedPatch[] = [];
  const warnings: string[] = [];
  const reviewOnly = isReviewOnlyMission(mission.objective);

  for (const unit of input.workUnits) {
    for (const path of unit.targetFiles.slice(0, 6)) {
      const absolute = resolve(process.cwd(), path);
      if (!existsSync(absolute)) {
        warnings.push(`Skipped ${path}: file not found in local workspace.`);
        continue;
      }
      const before = readFileSync(absolute, "utf8");
      const patch = generateSelfAgentPatch({
        missionTitle: mission.title,
        missionObjective: mission.objective,
        workUnit: unit,
        path,
        before
      });
      if (patch.after !== patch.before) {
        patches.push(patch);
      }
    }
  }

  if (patches.length === 0 && !reviewOnly) {
    throw new Error("Self-agent patch preview produced no code changes. No-op previews are invalid for this mission.");
  }
  if (patches.length === 0 && reviewOnly) {
    warnings.push("Review-only mission produced no code changes by design.");
  }

  return {
    missionId: mission.id,
    workUnits: input.workUnits,
    patches,
    warnings
  };
}
