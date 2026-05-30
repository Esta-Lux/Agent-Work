import { getAdminBuildMission } from "@/lib/admin-build/admin-build-store";

const PROTECTED_BRANCHES = new Set(["main", "master"]);

export interface SelfAgentBoundaryInput {
  missionId?: string;
  branchName?: string;
}

export function validateSelfAgentBoundary(input: SelfAgentBoundaryInput): {
  ok: boolean;
  status: number;
  message: string;
  mission?: ReturnType<typeof getAdminBuildMission>;
} {
  const missionId = input.missionId?.trim();
  if (!missionId) {
    return {
      ok: false,
      status: 400,
      message: "missionId is required. Self-agent actions must run through Admin Build Missions."
    };
  }

  const mission = getAdminBuildMission(missionId);
  if (!mission) {
    return {
      ok: false,
      status: 404,
      message: `Admin Build Mission not found: ${missionId}`
    };
  }

  const targetBranch = input.branchName?.trim() || mission.branchName?.trim() || "";
  if (targetBranch && PROTECTED_BRANCHES.has(targetBranch.toLowerCase())) {
    return {
      ok: false,
      status: 400,
      message: "Direct main/master branch mutation is blocked. Use a feature branch and open a draft PR."
    };
  }

  return {
    ok: true,
    status: 200,
    message: "Self-agent boundary passed.",
    mission
  };
}
