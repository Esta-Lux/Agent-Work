import { NextResponse } from "next/server";
import { withWorkspaceAuth } from "@/lib/auth/with-workspace-auth";
import { assertCreditsAvailable, chargeCredits } from "@/lib/usage/credit-store";
import { estimateCreditsForAction } from "@/lib/usage/credit-pricing";
import { getPendingFix } from "@/lib/workspace/pending-fix-store";
import { applyPatchesToFiles } from "@/lib/workspace/apply-patches";
import { pushFilesToGithub } from "@/lib/workspace/github-push";
import { createDraftPullRequest } from "@/lib/workspace/github-pr";
import { buildBootRisePrBodyFromPendingFix } from "@/lib/github/pr-body-builder";
import { getSupabaseServiceClient } from "@/lib/db/supabase";
import { appendLedgerEvent } from "@/lib/workspace/living-ledger-timeline";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function POST(request: Request) {
  return withWorkspaceAuth(request, async (ctx, req) => {
    const body = (await req.json().catch(() => null)) as {
      pendingFixId?: string;
      remoteUrl?: string;
      branch?: string;
      projectId?: string;
    } | null;

    if (!body?.pendingFixId?.trim() || !body.remoteUrl?.trim()) {
      return NextResponse.json({ error: "pendingFixId and remoteUrl are required." }, { status: 400 });
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

    const action = "draft_pr";
    const estimatedCredits = estimateCreditsForAction(action);
    await assertCreditsAvailable(ctx.orgId, action, estimatedCredits);

    const appliedPatches = pending.patches.map((p) => ({ ...p, applied: true }));
    const { files } = applyPatchesToFiles(pending.filesSnapshot, appliedPatches);
    const patchedPaths = pending.patches.map((p) => p.path);
    const prBody = buildBootRisePrBodyFromPendingFix(pending);
    const baseBranch = body.branch?.trim() || "main";

    try {
      const push = await pushFilesToGithub({
        remoteUrl: body.remoteUrl.trim(),
        baseBranch,
        files,
        onlyPaths: patchedPaths,
        commitMessage: `BootRise: ${pending.request.slice(0, 72)}`
      });

      const pr = await createDraftPullRequest({
        remoteUrl: body.remoteUrl.trim(),
        headBranch: push.branch,
        baseBranch,
        title: `BootRise: ${pending.request.slice(0, 80)}`,
        body: prBody,
        draft: true
      });

      void chargeCredits({
        orgId: ctx.orgId,
        userId: ctx.user.id,
        action,
        credits: estimatedCredits,
        metadata: { taskType: action, projectId: body.projectId ?? pending.repositoryId }
      });

      const supabase = getSupabaseServiceClient();
      if (supabase) {
        await supabase.from("bootrise_github_pull_requests").upsert({
          id: `pr_${pr.prNumber}_${Date.now()}`,
          org_id: ctx.orgId,
          project_id: body.projectId ?? pending.repositoryId,
          repository_id: pending.repositoryId,
          provider: "github",
          remote_url: body.remoteUrl.trim(),
          base_branch: baseBranch,
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

      return NextResponse.json({ product: "BootRise", push, draftPr: pr, estimatedCredits });
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "PR creation failed." },
        { status: 502 }
      );
    }
  });
}
