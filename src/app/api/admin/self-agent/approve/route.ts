import { NextResponse } from "next/server";
import { updateAdminBuildMission } from "@/lib/admin-build/admin-build-store";
import { withAdminAuth } from "@/lib/auth/with-admin-auth";
import { validateSelfAgentBoundary } from "@/lib/agents/admin/self-agent-boundary";
import { getSelfAgentPreview } from "@/lib/agents/admin/self-agent-preview-store";

export const runtime = "nodejs";

export async function POST(request: Request) {
  return withAdminAuth(request, async (user) => {
    const body = (await request.json().catch(() => null)) as { missionId?: string; branchName?: string } | null;
    const boundary = validateSelfAgentBoundary({ missionId: body?.missionId, branchName: body?.branchName });
    if (!boundary.ok) {
      return NextResponse.json({ error: boundary.message }, { status: boundary.status });
    }
    const mission = boundary.mission;
    if (!mission) {
      return NextResponse.json({ error: "Mission not found." }, { status: 404 });
    }

    const preview = getSelfAgentPreview(mission.id);
    if (!preview) {
      return NextResponse.json({ error: "Generate patch preview before approval." }, { status: 400 });
    }
    if (!preview.qaPassed) {
      return NextResponse.json(
        { error: "Self-agent guard checks failed. Resolve blockers before approval.", blockers: preview.blockers },
        { status: 400 }
      );
    }

    const updatedMission = updateAdminBuildMission(
      mission.id,
      {
        status: "approved",
        branchName: preview.branchName
      },
      user.id
    );
    if (!updatedMission) {
      return NextResponse.json({ error: "Mission approval failed." }, { status: 500 });
    }

    return NextResponse.json({
      mission: updatedMission,
      message: "Self-agent patch preview approved."
    });
  });
}
