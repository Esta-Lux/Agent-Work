import { NextResponse } from "next/server";
import { withAdminAuth } from "@/lib/auth/with-admin-auth";
import { listAuditEntries } from "@/lib/admin/audit-log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return withAdminAuth(request, async (_user, req) => {
    const url = new URL(req.url);
    const limit = Number(url.searchParams.get("limit") ?? "50");
    const orgId = url.searchParams.get("orgId") ?? undefined;
    const entries = await listAuditEntries(Number.isFinite(limit) ? limit : 50, orgId);
    return NextResponse.json({
      product: "BootRise",
      orgId: orgId ?? "all",
      entries
    });
  });
}
