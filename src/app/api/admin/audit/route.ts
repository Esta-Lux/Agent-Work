import { NextResponse } from "next/server";
import { listAuditEntries } from "@/lib/admin/audit-log";
import { resolveOrgId } from "@/lib/tenancy/org-context";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const limit = Number(new URL(request.url).searchParams.get("limit") ?? "50");
  const orgId = resolveOrgId(request);
  const entries = await listAuditEntries(Number.isFinite(limit) ? limit : 50, orgId);
  return NextResponse.json({
    product: "BootRise",
    orgId,
    entries
  });
}
