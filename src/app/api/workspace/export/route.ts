import { NextResponse } from "next/server";
import { withWorkspaceAuth } from "@/lib/auth/with-workspace-auth";
import { assertKillSwitchAllowed } from "@/lib/admin/kill-switches";
import type { SourceFileInput } from "@/lib/intelligence/repo-intelligence";
import { createExportBundle } from "@/lib/workspace/workspace-export";
import { pushFilesToGithub } from "@/lib/workspace/github-push";
import { buildPullRequestBody, createDraftPullRequest } from "@/lib/workspace/github-pr";
import type { RepoHealthSummary } from "@/lib/reporting/repo-health";
import type { ProjectBrief, WorkspaceFixReport } from "@/lib/workspace/workspace-types";
import type { ChangePlan } from "@/lib/types/core";
import { hasGithubApiCredentials } from "@/lib/github/github-config";

export const runtime = "nodejs";

interface ExportRequestBody {
  mode?: "download" | "github";
  createDraftPr?: boolean;
  projectBrief?: ProjectBrief;
  files?: SourceFileInput[];
  plan?: ChangePlan;
  report?: WorkspaceFixReport;
  repositoryId?: string;
  remoteUrl?: string;
  branch?: string;
  preferredProvider?: "bootrise" | "openai";
  repoHealth?: RepoHealthSummary | null;
}

export async function POST(request: Request) {
  return withWorkspaceAuth(request, async (_ctx, req) => {
  const body = (await req.json().catch(() => null)) as ExportRequestBody | null;

  if (!body?.files || body.files.length === 0) {
    return NextResponse.json({ error: "Provide files to export." }, { status: 400 });
  }

  if (!body.projectBrief?.productName) {
    return NextResponse.json({ error: "Provide a project brief with productName." }, { status: 400 });
  }

  const bundle = createExportBundle({
    projectBrief: body.projectBrief,
    files: body.files,
    plan: body.plan,
    report: body.report,
    preferredProvider: body.preferredProvider,
    repoHealth: body.repoHealth ?? null,
    githubUrl: body.remoteUrl ?? null,
    branch: body.branch ?? null
  });

  if (body.mode === "github") {
    const remoteUrl = body.remoteUrl?.trim();
    if (!remoteUrl) {
      return NextResponse.json({ error: "remoteUrl is required for GitHub export." }, { status: 400 });
    }

    const wantsPr = body.createDraftPr !== false;
    const patchedPaths = body.report?.patches?.map((p) => p.path) ?? body.report?.fixed.map((f) => f.path);

    if (!hasGithubApiCredentials()) {
      return NextResponse.json({
        product: "BootRise",
        mode: "github",
        bundle,
        status: "token-missing",
        error: "GitHub App or GITHUB_TOKEN is required for automated push and draft PR.",
        pushSteps: [
          "Configure GITHUB_APP_* in .env.local (docs/GITHUB_APP.md) or add GITHUB_TOKEN with repo scope.",
          "Re-run GitHub export with an approved fix report."
        ]
      }, { status: 400 });
    }

    if (!patchedPaths?.length) {
      return NextResponse.json({
        error: "Approve a fix plan before GitHub push — draft PR requires applied patch paths.",
        hint: "Run Fix → Approve → Export to GitHub."
      }, { status: 400 });
    }

    if (
      body.report?.approvalStatus === "pending_approval" &&
      body.report.controlLayer &&
      !body.report.controlLayer.canApprove
    ) {
      return NextResponse.json({
        error: "Control layer blocked this plan — resolve patch guard before opening a PR.",
        stopReason: body.report.controlLayer.stopReason
      }, { status: 400 });
    }

    try {
      assertKillSwitchAllowed("github_push");

      const push = await pushFilesToGithub({
        remoteUrl,
        baseBranch: body.branch ?? "main",
        files: body.files,
        onlyPaths: patchedPaths,
        commitMessage: `BootRise: ${body.report?.plan.intent.interpretedGoal.slice(0, 72) ?? "controlled change"}`
      });

      let draftPr = null;
      if (wantsPr && body.report) {
        draftPr = await createDraftPullRequest({
          remoteUrl,
          headBranch: push.branch,
          baseBranch: body.branch ?? "main",
          title: `BootRise: ${body.report.plan.intent.interpretedGoal.slice(0, 80)}`,
          body: buildPullRequestBody(body.report),
          draft: true
        });
      }

      return NextResponse.json({
        product: "BootRise",
        mode: "github",
        bundle,
        status: draftPr ? "draft-pr-opened" : "branch-pushed",
        push,
        draftPr,
        message: draftPr
          ? `Draft PR #${draftPr.prNumber} opened on branch ${push.branch}.`
          : `Branch ${push.branch} pushed — open PR from compare URL.`
      });
    } catch (error) {
      return NextResponse.json(
        {
          error: error instanceof Error ? error.message : "GitHub export failed."
        },
        { status: 502 }
      );
    }
  }

  const downloadName = `${body.projectBrief.productName.toLowerCase().replace(/\s+/g, "-")}-bootrise-bundle.json`;

  return NextResponse.json({
    product: "BootRise",
    mode: "download",
    bundle,
    downloadName,
    downloadPayload: JSON.stringify(bundle, null, 2)
  });
  });
}
