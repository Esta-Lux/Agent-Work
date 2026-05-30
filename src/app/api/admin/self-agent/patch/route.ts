import { NextResponse } from "next/server";
import { withAdminAuth } from "@/lib/auth/with-admin-auth";
import { validateSelfAgentBoundary } from "@/lib/agents/admin/self-agent-boundary";
import type { SelfAgentPatchValidation } from "@/lib/agents/admin/self-agent-control-bridge";

export type { SelfAgentPatchValidation };

export const runtime = "nodejs";

export async function POST(request: Request) {
  return withAdminAuth(request, async () => {
    const body = (await request.json().catch(() => null)) as { missionId?: string; branchName?: string } | null;
    const boundary = validateSelfAgentBoundary({ missionId: body?.missionId, branchName: body?.branchName });

    if (!boundary.ok) {
      return NextResponse.json({ error: boundary.message }, { status: boundary.status });
    }

    return NextResponse.json({
      // Self-Agent patch execution must call validateSelfAgentPatch().
      // No bypass flags. No admin override. No direct push.
      message: "Self-agent patch route is intentionally non-mutating until mission-scoped patch previews are fully wired.",
      mission: boundary.mission
    });
  });
}
