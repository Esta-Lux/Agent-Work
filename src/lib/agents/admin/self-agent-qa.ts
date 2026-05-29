import { getAdminBuildMission } from "@/lib/admin-build/admin-build-store";

export function runSelfAgentQa(input: { missionId: string }) {
  return getAdminBuildMission(input.missionId);
}
