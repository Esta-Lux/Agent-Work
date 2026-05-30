import { NextResponse } from "next/server";
import { withWorkspaceAuth } from "@/lib/auth/with-workspace-auth";
import type { WorkUnitPlan } from "@/lib/workspace/work-unit-planner";
import { enqueueJob } from "@/lib/jobs/enqueue";

export const runtime = "nodejs";

interface MultiPassRequest {
  taskDescription?: string;
  workUnitPlan?: WorkUnitPlan;
  repoFiles?: Array<{ path: string; content: string }>;
  repositoryId?: string;
}

export async function POST(request: Request) {
  return withWorkspaceAuth(request, async (ctx, req) => {
    const body = (await req.json().catch(() => null)) as MultiPassRequest | null;
    const taskDescription = body?.taskDescription?.trim() ?? "";
    if (!taskDescription || !body?.workUnitPlan || !Array.isArray(body.repoFiles) || body.repoFiles.length === 0) {
      return NextResponse.json({ error: "taskDescription, workUnitPlan, and repoFiles are required." }, { status: 400 });
    }

    const queued = await enqueueJob({
      type: "multiPass.execute",
      orgId: ctx.orgId,
      userId: ctx.user.id,
      projectId: body.repositoryId ?? "workspace-default",
      repositoryId: body.repositoryId,
      payload: {
        taskDescription,
        workUnitPlan: body.workUnitPlan,
        repoFiles: body.repoFiles
      }
    });
    return NextResponse.json({ product: "BootRise", jobId: queued.jobId, status: "queued" });
  });
}
