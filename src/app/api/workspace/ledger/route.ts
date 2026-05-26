import { NextResponse } from "next/server";
import { resolveOrgId } from "@/lib/tenancy/org-context";
import { appendLedgerEvent, listLedgerEvents } from "@/lib/workspace/living-ledger-timeline";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const projectId = new URL(request.url).searchParams.get("projectId")?.trim();
  if (!projectId) {
    return NextResponse.json({ error: "projectId is required." }, { status: 400 });
  }

  const orgId = resolveOrgId(request);
  const events = await listLedgerEvents(projectId, 40, orgId);

  return NextResponse.json({
    product: "BootRise",
    orgId,
    storage: "hybrid",
    events
  });
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    projectId?: string;
    kind?: Parameters<typeof appendLedgerEvent>[1]["kind"];
    title?: string;
    narrative?: string;
    metadata?: Record<string, string | number | boolean>;
  } | null;

  if (!body?.projectId?.trim() || !body.kind || !body.title || !body.narrative) {
    return NextResponse.json({ error: "projectId, kind, title, and narrative are required." }, { status: 400 });
  }

  const orgId = resolveOrgId(request);
  const event = await appendLedgerEvent(
    body.projectId.trim(),
    {
      kind: body.kind,
      title: body.title,
      narrative: body.narrative,
      metadata: body.metadata
    },
    orgId
  );

  return NextResponse.json({ product: "BootRise", orgId, event });
}
