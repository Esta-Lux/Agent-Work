import { NextResponse } from "next/server";
import type { SourceFileInput } from "@/lib/intelligence/repo-intelligence";
import { executeFixWorkflow } from "@/lib/workspace/workspace-fix.server";

export const runtime = "nodejs";

interface FixRequestBody {
  request?: string;
  files?: SourceFileInput[];
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as FixRequestBody | null;
  const userRequest = body?.request?.trim();
  const files = body?.files;

  if (!userRequest) {
    return NextResponse.json({ error: "A non-empty fix or change request is required." }, { status: 400 });
  }

  if (!files || !Array.isArray(files) || files.length === 0) {
    return NextResponse.json({ error: "Provide at least one file with path and content." }, { status: 400 });
  }

  const result = await executeFixWorkflow(files, userRequest);

  return NextResponse.json({
    product: "BootRise",
    plannerSource: result.plannerSource,
    repositoryId: result.repositoryId,
    repo: result.repo,
    health: result.health,
    report: result.report,
    nextAction: "Review fixed files and blast radius before exporting or pushing to GitHub."
  });
}
