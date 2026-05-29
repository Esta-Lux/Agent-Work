import { NextResponse } from "next/server";
import { withWorkspaceAuth } from "@/lib/auth/with-workspace-auth";
import type { SourceFileInput } from "@/lib/intelligence/repo-intelligence";
import type { ProjectBrief, WorkspaceFixReport } from "@/lib/workspace/workspace-types";
import { buildArchitectureRoadmap } from "@/lib/architecture/architecture-roadmap";

export const runtime = "nodejs";

export async function POST(request: Request) {
  return withWorkspaceAuth(request, async (_ctx, req) => {
    const body = (await req.json().catch(() => null)) as {
      files?: SourceFileInput[];
      brief?: Partial<ProjectBrief>;
      report?: Pick<WorkspaceFixReport, "approvalStatus" | "safeToPr" | "controlLayer"> | null;
    } | null;

    if (!body?.files?.length) {
      return NextResponse.json({ error: "files are required." }, { status: 400 });
    }

    const roadmap = buildArchitectureRoadmap({
      files: body.files,
      brief: body.brief,
      report: body.report ?? null
    });

    return NextResponse.json({ roadmap });
  });
}
