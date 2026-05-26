import { NextResponse } from "next/server";
import { withWorkspaceAuth } from "@/lib/auth/with-workspace-auth";
import { listRuntimeEvents, recordRuntimeEvent } from "@/lib/runtime/runtime-events";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return withWorkspaceAuth(request, async (_ctx, req) => {
    const projectId = new URL(req.url).searchParams.get("projectId")?.trim();
    if (!projectId) return NextResponse.json({ error: "projectId required" }, { status: 400 });
    return NextResponse.json({ product: "BootRise", events: listRuntimeEvents(projectId) });
  });
}

export async function POST(request: Request) {
  return withWorkspaceAuth(request, async (_ctx, req) => {
    const body = (await req.json().catch(() => null)) as {
      projectId?: string;
      message?: string;
      likelyFiles?: string[];
    } | null;
    if (!body?.projectId?.trim() || !body.message?.trim()) {
      return NextResponse.json({ error: "projectId and message required" }, { status: 400 });
    }
    const event = recordRuntimeEvent({
      projectId: body.projectId.trim(),
      message: body.message.trim(),
      likelyFiles: body.likelyFiles
    });
    return NextResponse.json({ product: "BootRise", event });
  });
}
