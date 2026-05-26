import { NextResponse } from "next/server";
import { withAdminAuth } from "@/lib/auth/with-admin-auth";
import { listUsageEvents, summarizeUsage } from "@/lib/usage/usage-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return withAdminAuth(request, async (_user, req) => {
    const url = new URL(req.url);
    const orgId = url.searchParams.get("orgId") ?? undefined;
    const userId = url.searchParams.get("userId") ?? undefined;
    const projectId = url.searchParams.get("projectId") ?? undefined;
    const limit = Number(url.searchParams.get("limit") ?? 250);
    const events = await listUsageEvents({ orgId, userId, projectId, limit });

    return NextResponse.json({
      product: "BootRise",
      orgId: orgId ?? "all",
      summary: summarizeUsage(events),
      events
    });
  });
}
