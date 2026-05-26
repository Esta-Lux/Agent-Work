import { NextResponse } from "next/server";
import { listUsageEvents, summarizeUsage } from "@/lib/usage/usage-store";
import { resolveOrgId } from "@/lib/tenancy/org-context";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const orgId = resolveOrgId(request, url.searchParams.get("orgId"));
  const userId = url.searchParams.get("userId") ?? undefined;
  const projectId = url.searchParams.get("projectId") ?? undefined;
  const limit = Number(url.searchParams.get("limit") ?? 250);
  const events = await listUsageEvents({ orgId, userId, projectId, limit });

  return NextResponse.json({
    product: "BootRise",
    orgId,
    summary: summarizeUsage(events),
    events
  });
}
