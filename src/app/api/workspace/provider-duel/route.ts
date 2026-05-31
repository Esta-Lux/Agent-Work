import { NextResponse } from "next/server";
import { withWorkspaceAuth } from "@/lib/auth/with-workspace-auth";
import type { SourceFileInput } from "@/lib/intelligence/repo-intelligence";
import type { ProductBrainContext } from "@/lib/product-brain/product-brain-types";
import { enqueueJob } from "@/lib/jobs/enqueue";

export const runtime = "nodejs";

export async function POST(request: Request) {
  return withWorkspaceAuth(request, async (ctx, req) => {
    const body = (await req.json().catch(() => null)) as {
      task?: string;
      files?: SourceFileInput[];
      premiumAllowed?: boolean;
      productContext?: ProductBrainContext;
      projectId?: string;
      repositoryId?: string;
    } | null;
    if (!body?.task?.trim()) return NextResponse.json({ error: "task is required." }, { status: 400 });
    const queued = await enqueueJob({
      type: "provider.duel",
      orgId: ctx.orgId,
      userId: ctx.user.id,
      projectId: body.projectId?.trim() || body.repositoryId?.trim() || `duel_${Date.now()}`,
      repositoryId: body.repositoryId?.trim(),
      files: body.files ?? [],
      payload: {
        task: body.task,
        premiumAllowed: body.premiumAllowed,
        productContext: body.productContext
      }
    });
    return NextResponse.json({ product: "BootRise", jobId: queued.jobId, status: "queued" });
  });
}
