import { NextResponse } from "next/server";
import { withAdminAuth } from "@/lib/auth/with-admin-auth";
import { getKillSwitches, updateKillSwitches } from "@/lib/admin/kill-switches";
import { recordAudit } from "@/lib/admin/audit-log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return withAdminAuth(request, async () => {
    return NextResponse.json({
      product: "BootRise",
      switches: getKillSwitches()
    });
  });
}

export async function POST(request: Request) {
  return withAdminAuth(request, async (user, req) => {
    const body = (await req.json().catch(() => null)) as Partial<ReturnType<typeof getKillSwitches>> | null;
    if (!body) {
      return NextResponse.json({ error: "Invalid body." }, { status: 400 });
    }

    const switches = updateKillSwitches(body, user.id);
    void recordAudit({
      actor: user.id,
      action: "kill_switches_update",
      detail: "Admin updated platform kill switches",
      metadata: { ...body } as Record<string, string | number | boolean>
    });

    return NextResponse.json({ product: "BootRise", switches });
  });
}
