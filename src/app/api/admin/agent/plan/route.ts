import { NextResponse } from "next/server";
import { withAdminAuth } from "@/lib/auth/with-admin-auth";
import { runAdminAgentPlan } from "@/lib/admin/admin-agent";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface PlanBody {
  request?: string;
  provider?: string;
  orgId?: string;
}

export async function POST(request: Request) {
  return withAdminAuth(request, async (user, req) => {
    const body = (await req.json().catch(() => null)) as PlanBody | null;
    const text = body?.request?.trim();
    if (!text) {
      return NextResponse.json({ error: "A non-empty request is required." }, { status: 400 });
    }
    try {
      const result = await runAdminAgentPlan({
        user,
        orgId: body?.orgId,
        request: text,
        provider: body?.provider
      });
      return NextResponse.json({ product: "BootRise", ...result });
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Admin plan failed." },
        { status: 502 }
      );
    }
  });
}
