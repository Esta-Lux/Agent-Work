import { NextResponse } from "next/server";
import { getKillSwitches, updateKillSwitches } from "@/lib/admin/kill-switches";
import { recordAudit } from "@/lib/admin/audit-log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    product: "BootRise",
    switches: getKillSwitches()
  });
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as Partial<ReturnType<typeof getKillSwitches>> | null;
  if (!body) {
    return NextResponse.json({ error: "Invalid body." }, { status: 400 });
  }

  const switches = updateKillSwitches(body, "admin-console");
  void recordAudit({
    actor: "admin",
    action: "kill_switches_update",
    detail: "Admin updated platform kill switches",
    metadata: { ...body } as Record<string, string | number | boolean>
  });

  return NextResponse.json({ product: "BootRise", switches });
}
