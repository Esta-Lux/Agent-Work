import { NextResponse } from "next/server";
import { getSupabaseHealthReport } from "@/lib/db/supabase-health";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
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
}
