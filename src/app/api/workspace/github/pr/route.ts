import { NextResponse } from "next/server";
import { withWorkspaceAuth } from "@/lib/auth/with-workspace-auth";
import { assertCreditsAvailable, chargeCredits } from "@/lib/usage/credit-store";
import { estimateCreditsForAction } from "@/lib/usage/credit-pricing";
import { getPendingFix } from "@/lib/workspace/pending-fix-store";
import { applyPatchesToFiles } from "@/lib/workspace/apply-patches";
import { pushFilesToGithub } from "@/lib/workspace/github-push";
import { createDraftPullRequest } from "@/lib/workspace/github-pr";
import { buildBootRisePrBodyFromPendingFix } from "@/lib/github/pr-body-builder";
import { buildWorkspacePrBody } from "@/lib/workspace/pr-body-builder";
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
      commitMessage?: string;
      prTitle?: string;
      prBody?: string;
      draft?: boolean;
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
    if (pending.patches.length === 0) {
      return NextResponse.json({ error: "Changed files are required before opening a draft PR." }, { status: 400 });
    }

    const commitMessage = body.commitMessage?.trim() || `BootRise: ${pending.request.slice(0, 62)}`;
    if (!commitMessage) {
      return NextResponse.json({ error: "Commit message is required." }, { status: 400 });
    }
    if (commitMessage.length > 72) {
      return NextResponse.json({ error: "Commit message must be 72 characters or fewer." }, { status: 400 });
    }

    const targetBranch = body.branch?.trim() || "main";
    if (/^(main|master)$/i.test(targetBranch)) {
      return NextResponse.json({ error: "Target branch cannot be main or master. Choose a protected integration branch." }, { status: 400 });
    }

    const allowedScope = new Set([
      ...(pending.controlLayer?.scopeContract.allowedEditFiles ?? []),
      ...(pending.plan.impact.files ?? [])
    ]);
    if (allowedScope.size > 0) {
      const outOfScope = pending.patches.map((patch) => patch.path).filter((path) => !allowedScope.has(path));
      if (outOfScope.length > 0) {
        return NextResponse.json({ error: `Patch includes files outside approved scope: ${outOfScope.join(", ")}` }, { status: 400 });
      }
    }

    const action = "draft_pr";
    const estimatedCredits = estimateCreditsForAction(action);
    await assertCreditsAvailable(ctx.orgId, action, estimatedCredits);

    const appliedPatches = pending.patches.map((p) => ({ ...p, applied: true }));
    const { files } = applyPatchesToFiles(pending.filesSnapshot, appliedPatches);
    const patchedPaths = pending.patches.map((p) => p.path);
    const prBody = body.prBody?.trim() || buildWorkspacePrBody({
      taskDescription: pending.request,
      changedFiles: pending.patches.map((patch) => ({
        path: patch.path,
        added: Math.max(0, patch.after.split("\n").length - patch.before.split("\n").length),
        removed: Math.max(0, patch.before.split("\n").length - patch.after.split("\n").length)
      })),
      blastRadiusSummary: pending.plan.impact.blastRadius.join("\n") || "Review BootRise workspace blast radius.",
      controlGateResult: {
        passed: pending.controlLayer?.canApprove !== false,
        summary: pending.controlLayer?.stopReason ?? pending.controlLayer?.agentCoordination.leadSummary ?? "Control layer did not report blockers."
      },
      securityScanStatus: "not_run",
      completionEvaluatorResult: {
        passed: pending.controlLayer?.taskCompletion.passed ?? true,
        summary: pending.controlLayer?.taskCompletion.summary ?? "Completion evaluator result was not persisted."
      },
      bootRiseVersion: "alpha"
    }) || buildBootRisePrBodyFromPendingFix(pending);
    const baseBranch = targetBranch;

    try {
      const push = await pushFilesToGithub({
        remoteUrl: body.remoteUrl.trim(),
        baseBranch,
        files,
        onlyPaths: patchedPaths,
        commitMessage
      });

      const pr = await createDraftPullRequest({
        remoteUrl: body.remoteUrl.trim(),
        headBranch: push.branch,
        baseBranch,
        title: body.prTitle?.trim() || `BootRise: ${pending.request.slice(0, 80)}`,
        body: prBody,
        draft: body.draft ?? true
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
          title: body.prTitle?.trim() || `BootRise: ${pending.request.slice(0, 80)}`,
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
