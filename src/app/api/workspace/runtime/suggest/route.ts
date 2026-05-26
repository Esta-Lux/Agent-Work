import { NextResponse } from "next/server";
import { withWorkspaceAuth } from "@/lib/auth/with-workspace-auth";
import { listRuntimeEvents } from "@/lib/runtime/runtime-events";
import { suggestRuntimeFix } from "@/lib/runtime/runtime-fix-suggester";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  return withWorkspaceAuth(request, async (ctx, req) => {
    const body = (await req.json().catch(() => null)) as { projectId?: string; eventId?: string } | null;
    if (!body?.projectId?.trim() || !body.eventId?.trim()) {
      return NextResponse.json({ error: "projectId and eventId required" }, { status: 400 });
    }
    const events = listRuntimeEvents(body.projectId.trim());
    const event = events.find((e) => e.id === body.eventId?.trim());
    if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });

    const suggestion = await suggestRuntimeFix({
      orgId: ctx.orgId,
      projectId: body.projectId.trim(),
      event
    });

    return NextResponse.json({
      product: "BootRise",
      suggestion,
      note: "Run Fix pipeline with suggestedRequest — patches require approval."
    });
  });
}
