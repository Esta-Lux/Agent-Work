import { getAdminBuildMission } from "@/lib/admin-build/admin-build-store";

export function runSelfAgentArchitect(input: { missionId: string }) {
  return getAdminBuildMission(input.missionId);
}
