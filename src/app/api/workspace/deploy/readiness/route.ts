import { NextResponse } from "next/server";
import { withWorkspaceAuth } from "@/lib/auth/with-workspace-auth";
import { assertCreditsAvailable } from "@/lib/usage/credit-store";
import { estimateCreditsForAction } from "@/lib/usage/credit-pricing";
import type { SourceFileInput } from "@/lib/intelligence/repo-intelligence";
import { enqueueJob } from "@/lib/jobs/enqueue";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  return withWorkspaceAuth(request, async (ctx, req) => {
    const body = (await req.json().catch(() => null)) as { files?: SourceFileInput[]; projectId?: string } | null;
    if (!body?.files?.length) {
      return NextResponse.json({ error: "files required." }, { status: 400 });
    }
    const action = "deployment_readiness";
    const estimatedCredits = estimateCreditsForAction(action);
    await assertCreditsAvailable(ctx.orgId, action, estimatedCredits);
    const queued = await enqueueJob({
      type: "deployment.readiness",
      orgId: ctx.orgId,
      userId: ctx.user.id,
      projectId: body.projectId ?? `deploy_${Date.now()}`,
      repositoryId: body.projectId,
      files: body.files
    });
    return NextResponse.json({ product: "BootRise", jobId: queued.jobId, status: "queued", estimatedCredits });
  });
}
