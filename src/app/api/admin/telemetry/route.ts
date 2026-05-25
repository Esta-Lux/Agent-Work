import { NextResponse } from "next/server";
import { getAdminTelemetry, recordAdminTelemetry, summarizeAdminTelemetry } from "@/lib/admin/telemetry";

export async function GET() {
  const records = await getAdminTelemetry();
  return NextResponse.json({
    product: "BootRise",
    records,
    summary: summarizeAdminTelemetry(records)
  });
}

export async function POST(request: Request) {
  const body = await request.json();
  const record = await recordAdminTelemetry({
    userId: body.userId,
    projectId: body.projectId,
    sessionId: body.sessionId,
    planningDurationMs: Number(body.planningDurationMs ?? 0),
    executionDurationMs: Number(body.executionDurationMs ?? 0),
    verificationDurationMs: Number(body.verificationDurationMs ?? 0),
    selfHealingAttemptsCount: Number(body.selfHealingAttemptsCount ?? 0),
    finalOutcome: body.finalOutcome,
    stallingErrorLogs: body.stallingErrorLogs ?? null,
    tokenComputeCost: Number(body.tokenComputeCost ?? 0)
  });

  return NextResponse.json({
    product: "BootRise",
    record
  });
}
