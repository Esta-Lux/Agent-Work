import { getAdminBuildMission } from "@/lib/admin-build/admin-build-store";

export function runSelfAgentSecurityReviewer(input: { missionId: string }) {
  return getAdminBuildMission(input.missionId);
}
