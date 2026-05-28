import { NextResponse } from "next/server";
import { withAdminAuth } from "@/lib/auth/with-admin-auth";
import { listAgentRuns } from "@/lib/admin/agent-graph";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return withAdminAuth(request, async (_user, req) => {
    const url = new URL(req.url);
    const pendingFixId = url.searchParams.get("pendingFixId") ?? undefined;
    const limitRaw = url.searchParams.get("limit");
    const limit = limitRaw ? Math.min(Math.max(Number(limitRaw), 1), 100) : 30;
    const runs = listAgentRuns({ pendingFixId, limit });
    return NextResponse.json({ product: "BootRise", runs });
  });
}
