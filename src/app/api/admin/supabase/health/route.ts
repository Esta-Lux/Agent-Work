import { NextResponse } from "next/server";
import { withAdminAuth } from "@/lib/auth/with-admin-auth";
import { getSupabaseHealthReport } from "@/lib/db/supabase-health";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return withAdminAuth(request, async () => {
    const report = await getSupabaseHealthReport();

    return NextResponse.json({
      product: "BootRise",
      connected: report.schemaReady,
      configured: report.configured,
      schemaReady: report.schemaReady,
      projectRef: report.projectRef,
      dashboardUrl: report.dashboardUrl,
      publishableKeySet: report.publishableKeySet,
      tables: report.tables,
      message: report.message,
      setupHint: report.setupHint,
      reason: report.configured ? undefined : "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are not configured."
    });
  });
}
