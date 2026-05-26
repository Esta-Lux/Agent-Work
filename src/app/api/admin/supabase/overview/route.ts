import { NextResponse } from "next/server";
import { withAdminAuth } from "@/lib/auth/with-admin-auth";
import { getSupabaseHealthReport } from "@/lib/db/supabase-health";
import { getSupabaseServiceClient } from "@/lib/db/supabase";
import { listAllProjectsAdmin } from "@/lib/workspace/project-store";
import { getAdminTelemetry, summarizeAdminTelemetry } from "@/lib/admin/telemetry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return withAdminAuth(request, async () => {
    const health = await getSupabaseHealthReport();
    const projects = await listAllProjectsAdmin();
    const storage = health.schemaReady ? "supabase" : "local";
    const telemetry = await getAdminTelemetry(50);

    let recentTelemetry: typeof telemetry = [];
    const supabase = getSupabaseServiceClient();

    if (health.schemaReady && supabase) {
      const { data } = await supabase
        .from("bootrise_admin_telemetry")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);

      if (data) {
        recentTelemetry = data.map((row) => ({
          id: row.id,
          userId: row.user_id,
          projectId: row.project_id,
          sessionId: row.session_id,
          planningDurationMs: row.planning_duration_ms,
          executionDurationMs: row.execution_duration_ms,
          verificationDurationMs: row.verification_duration_ms,
          selfHealingAttemptsCount: row.self_healing_attempts_count,
          finalOutcome: row.final_outcome,
          stallingErrorLogs: row.stalling_error_logs,
          tokenComputeCost: Number(row.token_compute_cost ?? 0),
          createdAt: row.created_at
        }));
      }
    } else {
      recentTelemetry = telemetry;
    }

    return NextResponse.json({
      product: "BootRise",
      health,
      projects: {
        count: projects.length,
        storage,
        recent: projects.slice(0, 10).map((p) => ({
          id: p.id,
          name: p.name,
          fileCount: p.files.length,
          provider: p.preferredProvider,
          updatedAt: p.updatedAt
        }))
      },
      telemetry: {
        summary: summarizeAdminTelemetry(recentTelemetry),
        recent: recentTelemetry.slice(0, 8)
      }
    });
  });
}
