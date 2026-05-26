import { NextResponse } from "next/server";
import { withWorkspaceAuth } from "@/lib/auth/with-workspace-auth";
import { assertCreditsAvailable, chargeCredits } from "@/lib/usage/credit-store";
import { getPendingFix } from "@/lib/workspace/pending-fix-store";
import { pushFilesToGithub } from "@/lib/workspace/github-push";
import { createDraftPullRequest } from "@/lib/workspace/github-pr";
import { buildBootRisePrBody } from "@/lib/github/pr-body-builder";
import { getSupabaseServiceClient } from "@/lib/db/supabase";
import { appendLedgerEvent } from "@/lib/workspace/living-ledger-timeline";
import type { SourceFileInput } from "@/lib/intelligence/repo-intelligence";
import type { WorkspaceFixReport } from "@/lib/workspace/workspace-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function POST(request: Request) {
  return withWorkspaceAuth(request, async (ctx, req) => {
    const body = (await req.json().catch(() => null)) as {
      pendingFixId?: string;
      remoteUrl?: string;
      branch?: string;
      files?: SourceFileInput[];
      projectId?: string;
      report?: WorkspaceFixReport;
    } | null;

    if (!body?.pendingFixId?.trim() || !body.remoteUrl?.trim() || !body.files?.length) {
      return NextResponse.json({ error: "pendingFixId, remoteUrl, and files are required." }, { status: 400 });
    }

    const pending = await getPendingFix(body.pendingFixId.trim(), ctx.orgId);
    if (!pending) return NextResponse.json({ error: "Pending fix not found." }, { status: 404 });
    if (pending.status !== "approved") {
      return NextResponse.json({ error: "Approve the fix before opening a draft PR." }, { status: 400 });
    }
    if (pending.controlLayer && !pending.controlLayer.canApprove) {
      return NextResponse.json(
        { error: "Control layer blocked this plan.", stopReason: pending.controlLayer.stopReason },
        { status: 400 }
      );
    }

    await assertCreditsAvailable(ctx.orgId, "draft_pr");

    const patchedPaths = pending.patches.map((p) => p.path);
    try {
      const push = await pushFilesToGithub({
        remoteUrl: body.remoteUrl.trim(),
        baseBranch: body.branch ?? "main",
        files: body.files,
        onlyPaths: patchedPaths,
        commitMessage: `BootRise: ${pending.request.slice(0, 72)}`
      });

      if (!body.report) {
        return NextResponse.json({ error: "report is required for PR body." }, { status: 400 });
      }
      const report = body.report;

      const pr = await createDraftPullRequest({
        remoteUrl: body.remoteUrl.trim(),
        headBranch: push.branch,
        baseBranch: body.branch ?? "main",
        title: `BootRise: ${pending.request.slice(0, 80)}`,
        body: buildBootRisePrBody(report, pending.request),
        draft: true
      });

      void chargeCredits({ orgId: ctx.orgId, userId: ctx.user.id, action: "draft_pr" });

      const supabase = getSupabaseServiceClient();
      if (supabase) {
        const prBody = buildBootRisePrBody(report, pending.request);
        await supabase.from("bootrise_github_pull_requests").upsert({
          id: `pr_${pr.prNumber}_${Date.now()}`,
          org_id: ctx.orgId,
          project_id: body.projectId ?? pending.repositoryId,
          repository_id: pending.repositoryId,
          provider: "github",
          remote_url: body.remoteUrl.trim(),
          base_branch: body.branch ?? "main",
          head_branch: push.branch,
          pr_number: pr.prNumber,
          pr_url: pr.prUrl,
          title: `BootRise: ${pending.request.slice(0, 80)}`,
          body: prBody,
          status: "created"
        });
      }

      void appendLedgerEvent(
        body.projectId ?? pending.repositoryId,
        { kind: "github_push", title: "Draft PR opened", narrative: pr.prUrl },
        ctx.orgId
      );

      return NextResponse.json({ product: "BootRise", push, draftPr: pr });
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "PR creation failed." },
        { status: 502 }
      );
    }
  });
}
