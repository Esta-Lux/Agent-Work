import { NextResponse } from "next/server";
import { withAdminAuth } from "@/lib/auth/with-admin-auth";
import { runAdminAgentReject } from "@/lib/admin/admin-agent";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface RejectBody {
  pendingFixId?: string;
  reason?: string;
  orgId?: string;
}

export async function POST(request: Request) {
  return withAdminAuth(request, async (user, req) => {
    const body = (await req.json().catch(() => null)) as RejectBody | null;
    const pendingFixId = body?.pendingFixId?.trim();
    if (!pendingFixId) {
      return NextResponse.json({ error: "pendingFixId is required." }, { status: 400 });
    }
    try {
      const result = await runAdminAgentReject({
        pendingFixId,
        reason: body?.reason,
        user,
        orgId: body?.orgId
      });
      return NextResponse.json({ product: "BootRise", ...result });
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Admin reject failed." },
        { status: 502 }
      );
    }
  });
}
