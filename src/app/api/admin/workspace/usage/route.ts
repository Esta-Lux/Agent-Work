import { NextResponse } from "next/server";
import { withAdminAuth } from "@/lib/auth/with-admin-auth";
import { listUsageBreakdownAdmin } from "@/lib/admin/workspace-state";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return withAdminAuth(request, async (_user, req) => {
    const url = new URL(req.url);
    const orgId = url.searchParams.get("orgId") ?? undefined;
    const projectId = url.searchParams.get("projectId") ?? undefined;
    const limit = Math.max(1, Math.min(5000, Number(url.searchParams.get("limit") ?? "1000") || 1000));
    const breakdown = await listUsageBreakdownAdmin({ orgId, projectId, limit });
    return NextResponse.json({ product: "BootRise", ...breakdown });
  });
}
