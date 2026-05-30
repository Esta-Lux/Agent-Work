import { NextResponse } from "next/server";
import { withAdminAuth } from "@/lib/auth/with-admin-auth";
import { validateSelfAgentBoundary } from "@/lib/agents/admin/self-agent-boundary";

export const runtime = "nodejs";

export async function POST(request: Request) {
  return withAdminAuth(request, async () => {
    const body = (await request.json().catch(() => null)) as { missionId?: string; branchName?: string } | null;
    const boundary = validateSelfAgentBoundary({ missionId: body?.missionId, branchName: body?.branchName });

    if (!boundary.ok) {
      return NextResponse.json({ error: boundary.message }, { status: boundary.status });
    }

    return NextResponse.json({
      message: "Self-agent patch route is intentionally non-mutating until mission-scoped patch previews are fully wired.",
      mission: boundary.mission
    });
  });
}
