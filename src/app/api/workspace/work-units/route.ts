import { NextResponse } from "next/server";
import { checkWorkUnitIntegration } from "@/lib/workspace/integration-checker";
import { createMultiPassSkeleton } from "@/lib/workspace/multi-pass-modifier";
import { planWorkUnits } from "@/lib/workspace/work-unit-planner";
import { withWorkspaceAuth } from "@/lib/auth/with-workspace-auth";

export const runtime = "nodejs";

interface WorkUnitsRequestBody {
  taskDescription?: string;
  scopedFiles?: string[];
  repoFiles?: Array<{ path: string; content: string }>;
  projectBrainContext?: string;
}

export async function POST(request: Request) {
  return withWorkspaceAuth(request, async (_ctx, req) => {
    const body = (await req.json().catch(() => null)) as WorkUnitsRequestBody | null;
    const taskDescription = body?.taskDescription?.trim() ?? "";
    const repoFiles = Array.isArray(body?.repoFiles) ? body.repoFiles : [];

    if (!taskDescription) {
      return NextResponse.json({ error: "taskDescription is required." }, { status: 400 });
    }
    if (repoFiles.length === 0) {
      return NextResponse.json({ error: "repoFiles are required for work unit planning." }, { status: 400 });
    }

    try {
      const workUnitPlan = planWorkUnits({
        taskDescription,
        scopedFiles: body?.scopedFiles ?? [],
        repoFiles,
        projectBrainContext: body?.projectBrainContext
      });
      const integration = checkWorkUnitIntegration(workUnitPlan);
      if (!integration.passed) {
        return NextResponse.json({ error: integration.blockers[0] ?? "Work unit plan failed integration checks.", integration }, { status: 400 });
      }

      return NextResponse.json({
        workUnitPlan,
        integration,
        multiPass: createMultiPassSkeleton(workUnitPlan)
      });
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Work unit planning failed." },
        { status: 400 }
      );
    }
  });
}
