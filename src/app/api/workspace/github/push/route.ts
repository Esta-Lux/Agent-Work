import { NextResponse } from "next/server";
import type { SourceFileInput } from "@/lib/intelligence/repo-intelligence";
import { assertKillSwitchAllowed } from "@/lib/admin/kill-switches";
import { recordAudit } from "@/lib/admin/audit-log";
import { pushFilesToGithub } from "@/lib/workspace/github-push";

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

    return NextResponse.json({
      product: "BootRise",
      phase: 2,
      ...result
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "GitHub push failed." },
      { status: 502 }
    );
  }
}
