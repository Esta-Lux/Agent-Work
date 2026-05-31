import { NextResponse } from "next/server";
import { withAdminAuth } from "@/lib/auth/with-admin-auth";
import { validateSelfAgentBoundary } from "@/lib/agents/admin/self-agent-boundary";
import { enqueueJob } from "@/lib/jobs/enqueue";

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

    if (mission.status !== "approved" && mission.status !== "branch_pushed" && mission.status !== "pr_opened") {
      return NextResponse.json(
        { error: "Approve the mission before running verify.", missionStatus: mission.status },
        { status: 400 }
      );
    }

    const queued = await enqueueJob({
      type: "selfAgent.verify",
      orgId: "org_default",
      userId: user.id,
      projectId: mission.id,
      repositoryId: mission.id,
      payload: {
        missionId: mission.id,
        branchName: mission.branchName
      }
    });
    return NextResponse.json({ product: "BootRise", jobId: queued.jobId, status: "queued" });
  });
}
