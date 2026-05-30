import { NextResponse } from "next/server";
import { withAdminAuth } from "@/lib/auth/with-admin-auth";
import { validateSelfAgentBoundary } from "@/lib/agents/admin/self-agent-boundary";
import { runSelfAgentPrAgent } from "@/lib/agents/admin/self-agent-pr-agent";

export const runtime = "nodejs";

export async function POST(request: Request) {
  return withAdminAuth(request, async (user) => {
    const body = (await request.json().catch(() => null)) as {
      missionId?: string;
      branchName?: string;
      remoteUrl?: string;
      title?: string;
    } | null;
    const boundary = validateSelfAgentBoundary({ missionId: body?.missionId, branchName: body?.branchName });

    if (!boundary.ok) {
      return NextResponse.json({ error: boundary.message }, { status: boundary.status });
    }

    const mission = boundary.mission;
    if (!mission) {
      return NextResponse.json({ error: "Mission not found." }, { status: 404 });
    }
    if (mission.status !== "branch_pushed" && mission.status !== "pr_opened") {
      return NextResponse.json(
        { error: "Run self-agent verify before opening a draft PR.", missionStatus: mission.status },
        { status: 400 }
      );
    }

    const branch = body?.branchName?.trim() || mission.branchName?.trim() || "bootrise/self-agent-draft";
    const title = body?.title?.trim() || `BootRise self-agent: ${mission.title}`;
    const remoteUrl = body?.remoteUrl?.trim() || process.env.BOOTRISE_GITHUB_REMOTE_URL?.trim() || "https://github.com/Esta-Lux/Agent-Work";
    const baseBranch =
      process.env.BOOTRISE_GITHUB_BASE_BRANCH?.trim() ||
      process.env.BOOTRISE_SELF_AGENT_BASE_BRANCH?.trim() ||
      "main";
    const result = await runSelfAgentPrAgent({
      mission,
      missionId: mission.id,
      branchName: branch,
      title,
      remoteUrl,
      baseBranch,
      userId: user.id
    });

    return NextResponse.json(result);
  });
}
