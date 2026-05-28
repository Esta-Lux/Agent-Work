import { NextResponse } from "next/server";
import { withAdminAuth } from "@/lib/auth/with-admin-auth";
import { assertKillSwitchAllowed } from "@/lib/admin/kill-switches";
import {
  getWatchdogStatus,
  startDetectionsWatchdog,
  stopDetectionsWatchdog
} from "@/lib/admin/detections/watchdog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Body {
  action?: "start" | "stop";
}

export async function GET(request: Request) {
  return withAdminAuth(request, async () => {
    return NextResponse.json({ product: "BootRise", ...getWatchdogStatus() });
  });
}

export async function POST(request: Request) {
  return withAdminAuth(request, async (_user, req) => {
    const body = (await req.json().catch(() => null)) as Body | null;
    const action = body?.action;
    if (action === "start") {
      try {
        assertKillSwitchAllowed("detections_watchdog");
        startDetectionsWatchdog();
        return NextResponse.json({ product: "BootRise", ...getWatchdogStatus() });
      } catch (error) {
        return NextResponse.json(
          { error: error instanceof Error ? error.message : "Watchdog start failed." },
          { status: 400 }
        );
      }
    }
    if (action === "stop") {
      stopDetectionsWatchdog();
      return NextResponse.json({ product: "BootRise", ...getWatchdogStatus() });
    }
    return NextResponse.json({ error: "action must be 'start' or 'stop'." }, { status: 400 });
  });
}
