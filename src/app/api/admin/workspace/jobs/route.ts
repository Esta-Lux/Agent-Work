import { NextResponse } from "next/server";
import { withAdminAuth } from "@/lib/auth/with-admin-auth";
import { listJobsAdmin } from "@/lib/admin/workspace-state";
import { getJob } from "@/lib/jobs/status-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return withAdminAuth(request, async (_user, req) => {
    const url = new URL(req.url);
    const jobId = url.searchParams.get("jobId")?.trim();
    if (jobId) {
      const job = getJob(jobId);
      if (!job) return NextResponse.json({ error: "Job not found." }, { status: 404 });
      return NextResponse.json({ product: "BootRise", job });
    }
    const limit = Math.max(1, Math.min(500, Number(url.searchParams.get("limit") ?? "100") || 100));
    const status = url.searchParams.get("status") ?? undefined;
    let jobs = listJobsAdmin(limit);
    if (status) jobs = jobs.filter((j) => j.status === status);
    return NextResponse.json({ product: "BootRise", jobs });
  });
}
