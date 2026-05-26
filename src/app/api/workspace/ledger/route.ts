import { NextResponse } from "next/server";
import { withWorkspaceAuth } from "@/lib/auth/with-workspace-auth";
import { appendLedgerEvent, listLedgerEvents } from "@/lib/workspace/living-ledger-timeline";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return withWorkspaceAuth(request, async (ctx, req) => {
    const projectId = new URL(req.url).searchParams.get("projectId")?.trim();
    if (!projectId) {
      return NextResponse.json({ error: "projectId is required." }, { status: 400 });
    }

    const events = await listLedgerEvents(projectId, 40, ctx.orgId);

    return NextResponse.json({
      product: "BootRise",
      orgId: ctx.orgId,
      storage: "hybrid",
      events
    });
  });
}

export async function POST(request: Request) {
  return withWorkspaceAuth(request, async (ctx, req) => {
    const body = (await req.json().catch(() => null)) as {
      projectId?: string;
      kind?: Parameters<typeof appendLedgerEvent>[1]["kind"];
      title?: string;
      narrative?: string;
      metadata?: Record<string, string | number | boolean>;
    } | null;

    if (!body?.projectId?.trim() || !body.kind || !body.title || !body.narrative) {
      return NextResponse.json({ error: "projectId, kind, title, and narrative are required." }, { status: 400 });
    }

    const event = await appendLedgerEvent(
      body.projectId.trim(),
      {
        kind: body.kind,
        title: body.title,
        narrative: body.narrative,
        metadata: body.metadata
      },
      ctx.orgId
    );

    return NextResponse.json({ product: "BootRise", orgId: ctx.orgId, event });
  });
}
