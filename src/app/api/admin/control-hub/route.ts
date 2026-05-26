import { NextResponse } from "next/server";
import { buildControlTelemetrySnapshot } from "@/lib/control/control-telemetry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const snapshot = buildControlTelemetrySnapshot();
  return NextResponse.json({
    product: "BootRise",
    snapshot
  });
}
