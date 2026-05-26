import { NextResponse } from "next/server";
import { createGitSync } from "@/lib/infrastructure/control-plane";
import type { SourceFileInput } from "@/lib/intelligence/repo-intelligence";
import { createExportBundle } from "@/lib/workspace/workspace-export";
import type { RepoHealthSummary } from "@/lib/reporting/repo-health";
import type { ProjectBrief, WorkspaceFixReport } from "@/lib/workspace/workspace-types";
import type { ChangePlan } from "@/lib/types/core";

export const runtime = "nodejs";

interface ExportRequestBody {
  mode?: "download" | "github";
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
  const body = (await request.json().catch(() => null)) as ExportRequestBody | null;

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

    const repositoryId = body.repositoryId ?? `repo_export_${Date.now()}`;
    const sync = await createGitSync({
      repositoryId,
      remoteUrl,
      defaultBranch: body.branch ?? "main"
    });

    return NextResponse.json({
      product: "BootRise",
      mode: "github",
      bundle,
      gitSync: sync,
      pushSteps: [
        `git init && git remote add origin ${remoteUrl}`,
        "Copy exported files from the BootRise bundle into the repository root.",
        "git add . && git commit -m \"BootRise export\"",
        `git push -u origin ${body.branch ?? "main"}`,
        "Configure GITHUB_TOKEN in BootRise for automated push in a later release."
      ],
      status: "ready-for-manual-push"
    });
  }

  const downloadName = `${body.projectBrief.productName.toLowerCase().replace(/\s+/g, "-")}-bootrise-bundle.json`;

  return NextResponse.json({
    product: "BootRise",
    mode: "download",
    bundle,
    downloadName,
    downloadPayload: JSON.stringify(bundle, null, 2)
  });
}
