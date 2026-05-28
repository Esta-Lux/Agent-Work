import { NextResponse } from "next/server";
import { withAdminAuth } from "@/lib/auth/with-admin-auth";
import { listRuntimeClustersAdmin } from "@/lib/admin/workspace-state";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return withAdminAuth(request, async () => {
    const clusters = listRuntimeClustersAdmin();
    return NextResponse.json({ product: "BootRise", clusters });
  });
}
