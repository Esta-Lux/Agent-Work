import { NextResponse } from "next/server";
import { withWorkspaceAuth } from "@/lib/auth/with-workspace-auth";
import { recordMemoryCorrection } from "@/lib/project-brain/memory-updater";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  return withWorkspaceAuth(request, async (ctx, req) => {
    const body = (await req.json().catch(() => null)) as {
      projectId?: string;
      memoryItemId?: string;
      newValue?: string;
    } | null;

    if (!body?.projectId?.trim() || !body.memoryItemId?.trim() || !body.newValue?.trim()) {
      return NextResponse.json({ error: "projectId, memoryItemId, and newValue are required." }, { status: 400 });
    }

    await recordMemoryCorrection({
      orgId: ctx.orgId,
      projectId: body.projectId.trim(),
      memoryItemId: body.memoryItemId.trim(),
      newValue: body.newValue.trim(),
      correctedBy: ctx.user.id
    });

    return NextResponse.json({ product: "BootRise", status: "corrected" });
  });
}
