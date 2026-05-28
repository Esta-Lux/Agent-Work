import { NextResponse } from "next/server";
import { withAdminAuth } from "@/lib/auth/with-admin-auth";
import { cancelStream } from "@/lib/admin/agent-event-bus";
import { recordAudit } from "@/lib/admin/audit-log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface CancelBody {
  streamId?: string;
  orgId?: string;
}

export async function POST(request: Request) {
  return withAdminAuth(request, async (user, req) => {
    const body = (await req.json().catch(() => null)) as CancelBody | null;
    const streamId = body?.streamId?.trim();
    if (!streamId) {
      return NextResponse.json({ error: "streamId required" }, { status: 400 });
    }
    const cancelled = cancelStream(streamId);
    void recordAudit(
      {
        actor: user.id,
        action: "admin_agent.run_cancelled",
        detail: streamId,
        metadata: { found: cancelled }
      },
      body?.orgId
    );
    return NextResponse.json({ product: "BootRise", cancelled, streamId });
  });
}
