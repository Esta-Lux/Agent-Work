import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { getAdminBuildMission } from "@/lib/admin-build/admin-build-store";
import type { SelfAgentWorkUnit } from "@/lib/agents/admin/self-agent-architect";
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

  for (const unit of input.workUnits) {
    for (const path of unit.targetFiles.slice(0, 6)) {
      const absolute = resolve(process.cwd(), path);
      if (!existsSync(absolute)) {
        warnings.push(`Skipped ${path}: file not found in local workspace.`);
        continue;
      }
      const before = readFileSync(absolute, "utf8");
      const summary = `Preview for ${unit.label} (${unit.domain}) under mission ${mission.title}.`;
      patches.push({ path, before, after: before, summary });
    }
  }

  if (patches.length === 0) {
    warnings.push("No editable files were available for patch preview.");
  }

  return {
    missionId: mission.id,
    workUnits: input.workUnits,
    patches,
    warnings
  };
}
