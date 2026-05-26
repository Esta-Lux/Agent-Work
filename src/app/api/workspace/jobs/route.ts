import { NextResponse } from "next/server";
import { withWorkspaceAuth } from "@/lib/auth/with-workspace-auth";
import { enqueueJob } from "@/lib/jobs/enqueue";
import { getJob } from "@/lib/jobs/status-store";
import type { JobType } from "@/lib/jobs/job-types";
import type { SourceFileInput } from "@/lib/intelligence/repo-intelligence";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return withWorkspaceAuth(request, async (_ctx, req) => {
    const jobId = new URL(req.url).searchParams.get("jobId")?.trim();
    if (!jobId) return NextResponse.json({ error: "jobId required" }, { status: 400 });
    const job = getJob(jobId);
    if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });
    return NextResponse.json({ product: "BootRise", job });
  });
}

export async function POST(request: Request) {
  return withWorkspaceAuth(request, async (ctx, req) => {
    const body = (await req.json().catch(() => null)) as {
      type?: JobType;
      projectId?: string;
      files?: SourceFileInput[];
      repositoryId?: string;
    } | null;
    if (!body?.type || !body.projectId?.trim()) {
      return NextResponse.json({ error: "type and projectId required" }, { status: 400 });
    }
    const result = await enqueueJob({
      type: body.type,
      orgId: ctx.orgId,
      userId: ctx.user.id,
      projectId: body.projectId.trim(),
      files: body.files,
      repositoryId: body.repositoryId
    });
    return NextResponse.json({ product: "BootRise", ...result });
  });
}
