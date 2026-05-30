import { NextResponse } from "next/server";
import { withWorkspaceAuth } from "@/lib/auth/with-workspace-auth";
import { runMultiPassExecutor } from "@/lib/workspace/multi-pass-executor";
import { createWorkUnitRun } from "@/lib/workspace/work-unit-run-store";
import { buildReportFromMultiPassExecution, saveMultiPassPendingFix } from "@/lib/workspace/multi-pass-report-builder";
import type { WorkUnitPlan } from "@/lib/workspace/work-unit-planner";

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

    const result = await runMultiPassExecutor({
      taskDescription,
      workUnitPlan: body.workUnitPlan,
      repoFiles: body.repoFiles,
      repositoryId: body.repositoryId,
      orgId: ctx.orgId,
      projectId: body.repositoryId,
      userId: ctx.user.id
    });

    const run = createWorkUnitRun({
      orgId: ctx.orgId,
      projectId: body.repositoryId ?? "workspace-default",
      repositoryId: body.repositoryId,
      taskDescription,
      workUnitPlan: body.workUnitPlan,
      repoFiles: body.repoFiles,
      result
    });

    const report = buildReportFromMultiPassExecution({
      execution: result,
      taskDescription,
      repositoryId: body.repositoryId,
      workUnitPlan: body.workUnitPlan
    });
    saveMultiPassPendingFix({
      report,
      execution: result,
      taskDescription,
      repoFiles: body.repoFiles,
      orgId: ctx.orgId,
      projectId: body.repositoryId
    });

    return NextResponse.json({ result, runId: run.id, report });
  });
}
