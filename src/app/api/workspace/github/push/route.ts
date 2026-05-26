import { NextResponse } from "next/server";
import type { SourceFileInput } from "@/lib/intelligence/repo-intelligence";
import { assertKillSwitchAllowed } from "@/lib/admin/kill-switches";
import { recordAudit } from "@/lib/admin/audit-log";
import { pushFilesToGithub } from "@/lib/workspace/github-push";
import { buildPullRequestBody, createDraftPullRequest } from "@/lib/workspace/github-pr";
import type { WorkspaceFixReport } from "@/lib/workspace/workspace-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
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

  try {
    assertKillSwitchAllowed("github_push");
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

    return NextResponse.json({
      product: "BootRise",
      phase: 2,
      ...result,
      draftPr
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "GitHub push failed." },
      { status: 502 }
    );
  }
}
