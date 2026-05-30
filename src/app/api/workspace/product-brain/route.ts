import { NextResponse } from "next/server";
import { withWorkspaceAuth } from "@/lib/auth/with-workspace-auth";
import { getProductBrain } from "@/lib/product-brain/product-brain-store";
import type { ProjectBrief } from "@/lib/workspace/workspace-types";
import { enqueueJob } from "@/lib/jobs/enqueue";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return withWorkspaceAuth(request, async (_ctx, req) => {
    const projectId = new URL(req.url).searchParams.get("projectId")?.trim();
    if (!projectId) {
      return NextResponse.json({ error: "projectId is required." }, { status: 400 });
    }
    return NextResponse.json({ productBrain: getProductBrain(projectId) });
  });
}

export async function POST(request: Request) {
  return withWorkspaceAuth(request, async (ctx, req) => {
    const body = (await req.json().catch(() => null)) as {
      projectId?: string;
      brief?: Partial<ProjectBrief>;
      files?: Array<{ path: string; content: string }>;
      correction?: string;
    } | null;
    const projectId = body?.projectId?.trim();
    if (!projectId) {
      return NextResponse.json({ error: "projectId is required." }, { status: 400 });
    }
    const queued = await enqueueJob({
      type: "productBrain.build",
      orgId: ctx.orgId,
      userId: ctx.user.id,
      projectId,
      repositoryId: projectId,
      files: body?.files,
      payload: {
        brief: body?.brief,
        correction: body?.correction
      }
    });
    return NextResponse.json({ product: "BootRise", jobId: queued.jobId, status: "queued" });
  });
}
