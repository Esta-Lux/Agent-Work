import { getAdminBuildMission } from "@/lib/admin-build/admin-build-store";

export function runSelfAgentBuilder(input: { missionId: string }) {
  return getAdminBuildMission(input.missionId);
}
