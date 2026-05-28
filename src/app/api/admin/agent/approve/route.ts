import { NextResponse } from "next/server";
import { withAdminAuth } from "@/lib/auth/with-admin-auth";
import { runAdminAgentApprove } from "@/lib/admin/admin-agent";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface ApproveBody {
  pendingFixId?: string;
  orgId?: string;
}

export async function POST(request: Request) {
  return withAdminAuth(request, async (user, req) => {
    const body = (await req.json().catch(() => null)) as ApproveBody | null;
    const pendingFixId = body?.pendingFixId?.trim();
    if (!pendingFixId) {
      return NextResponse.json({ error: "pendingFixId is required." }, { status: 400 });
    }
    try {
      const result = await runAdminAgentApprove({ pendingFixId, user, orgId: body?.orgId });
      return NextResponse.json({ product: "BootRise", ...result });
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Admin approve failed." },
        { status: 502 }
      );
    }
  });
}
