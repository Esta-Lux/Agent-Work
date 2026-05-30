import { NextResponse } from "next/server";
import { updateAdminBuildMission } from "@/lib/admin-build/admin-build-store";
import { withAdminAuth } from "@/lib/auth/with-admin-auth";
import { validateSelfAgentBoundary } from "@/lib/agents/admin/self-agent-boundary";
import { getSelfAgentPreview } from "@/lib/agents/admin/self-agent-preview-store";

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

    const preview = getSelfAgentPreview(mission.id);
    if (!preview) {
      return NextResponse.json({ error: "Patch preview not found for mission." }, { status: 400 });
    }

    const branch = body?.branchName?.trim() || mission.branchName?.trim() || preview.branchName;
    const title = body?.title?.trim() || `BootRise self-agent: ${mission.title}`;
    const prUrl = `https://github.com/Esta-Lux/Agent-Work/compare/main...${encodeURIComponent(branch)}?expand=1`;
    const updatedMission = updateAdminBuildMission(
      mission.id,
      {
        status: "pr_opened",
        branchName: branch,
        prUrl
      },
      user.id
    );

    return NextResponse.json({
      mission: updatedMission ?? mission,
      draftPr: {
        title,
        branch,
        remoteUrl: body?.remoteUrl?.trim() || "https://github.com/Esta-Lux/Agent-Work",
        prUrl
      }
    });
  });
}
