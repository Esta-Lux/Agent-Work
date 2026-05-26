import { NextResponse } from "next/server";
import { withWorkspaceAuth } from "@/lib/auth/with-workspace-auth";
import { rejectPendingFix } from "@/lib/workspace/workspace-fix.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  return withWorkspaceAuth(request, async (ctx, req) => {
    const body = (await req.json().catch(() => null)) as { pendingFixId?: string } | null;

    if (!body?.pendingFixId?.trim()) {
      return NextResponse.json({ error: "pendingFixId is required." }, { status: 400 });
    }

    try {
      await rejectPendingFix(body.pendingFixId.trim(), ctx.orgId);
      return NextResponse.json({ product: "BootRise", status: "rejected" });
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Reject failed." },
        { status: 502 }
      );
    }
  });
}
