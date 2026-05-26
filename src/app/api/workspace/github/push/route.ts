import { NextResponse } from "next/server";
import type { SourceFileInput } from "@/lib/intelligence/repo-intelligence";
import { assertKillSwitchAllowed } from "@/lib/admin/kill-switches";
import { recordAudit } from "@/lib/admin/audit-log";
import { assertModelRouteAllowed, recordModelUsage } from "@/lib/ai/model-router";
import { withWorkspaceAuth } from "@/lib/auth/with-workspace-auth";
import { pushFilesToGithub } from "@/lib/workspace/github-push";
import { buildPullRequestBody, createDraftPullRequest } from "@/lib/workspace/github-pr";
import type { WorkspaceFixReport } from "@/lib/workspace/workspace-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function POST(request: Request) {
  return withWorkspaceAuth(request, async (ctx, req) => {
  const body = (await req.json().catch(() => null)) as {
    remoteUrl?: string;
    branch?: string;
    files?: SourceFileInput[];
    onlyPaths?: string[];
    commitMessage?: string;
    report?: WorkspaceFixReport;
    createDraftPr?: boolean;
  } | null;

  const remoteUrl = body?.remoteUrl?.trim();
  if (!remoteUrl) {
    return NextResponse.json({ error: "remoteUrl is required." }, { status: 400 });
  }

  if (!body?.files?.length) {
    return NextResponse.json({ error: "files are required." }, { status: 400 });
  }

  const orgId = ctx.orgId;
  const userId = ctx.user.id;
  const projectId = body.report?.repositoryId ?? "github-push";
  const changedFileCount = body.onlyPaths?.length ?? body.files.length;
  let pushRoute: Awaited<ReturnType<typeof assertModelRouteAllowed>> | null = null;
  try {
    assertKillSwitchAllowed("github_push");
    pushRoute = await assertModelRouteAllowed({
      requestedProvider: "bootrise",
      requestedMode: "fast",
      taskType: "draft_pr",
      requestText: body.report?.plan.intent.interpretedGoal ?? body.commitMessage,
      fileCount: body.files.length,
      changedFileCount,
      orgId,
      userId,
      projectId
    });
    if (body.createDraftPr !== false) {
      assertKillSwitchAllowed("draft_pr");
      if (!body.report) throw new Error("A BootRise report is required before creating a draft PR.");
      if (body.report.approvalStatus !== "approved") {
        throw new Error("Draft PR creation requires an approved BootRise plan.");
      }
      if (!body.report.verificationSummary) {
        throw new Error("Draft PR creation requires captured validation evidence.");
      }
      if (body.report.controlLayer && !body.report.controlLayer.canApprove) {
        throw new Error(body.report.controlLayer.stopReason ?? "Control layer blocked draft PR creation.");
      }
    }
    const result = await pushFilesToGithub({
      remoteUrl,
      baseBranch: body.branch ?? "main",
      files: body.files,
      onlyPaths: body.onlyPaths,
      commitMessage: body.commitMessage ?? "BootRise: apply approved patches"
    });

    void recordAudit({
      actor: "workspace-user",
      action: "github_push",
      detail: result.branch,
      metadata: { pushed: result.pushed.length }
    });

    let draftPr = null;
    if (body.createDraftPr !== false && body.report) {
      draftPr = await createDraftPullRequest({
        remoteUrl,
        headBranch: result.branch,
        baseBranch: body.branch ?? "main",
        title: `BootRise: ${body.report.plan.intent.interpretedGoal.slice(0, 80)}`,
        body: buildPullRequestBody(body.report),
        draft: true
      });
    }
    void recordModelUsage(pushRoute, { orgId, userId, projectId }, "succeeded");

    return NextResponse.json({
      product: "BootRise",
      phase: 2,
      ...result,
      draftPr
    });
  } catch (error) {
    if (pushRoute) {
      void recordModelUsage(
        pushRoute,
        { orgId, userId, projectId },
        "failed",
        error instanceof Error ? error.message : "GitHub push failed."
      );
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "GitHub push failed." },
      { status: 502 }
    );
  }
  });
}
