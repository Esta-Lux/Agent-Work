import { NextResponse } from "next/server";
import { withAdminAuth } from "@/lib/auth/with-admin-auth";
import { listSandboxRunsAdmin } from "@/lib/admin/workspace-state";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return withAdminAuth(request, async (_user, req) => {
    const url = new URL(req.url);
    const limit = Math.max(1, Math.min(200, Number(url.searchParams.get("limit") ?? "50") || 50));
    const runs = listSandboxRunsAdmin(limit);
    return NextResponse.json({ product: "BootRise", runs });
  });
}
