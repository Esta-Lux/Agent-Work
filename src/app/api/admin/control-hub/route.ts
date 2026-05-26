import { NextResponse } from "next/server";
import { withAdminAuth } from "@/lib/auth/with-admin-auth";
import { buildControlTelemetrySnapshot } from "@/lib/control/control-telemetry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return withAdminAuth(request, async () => {
    const snapshot = buildControlTelemetrySnapshot();
    return NextResponse.json({
      product: "BootRise",
      snapshot
    });
  });
}
