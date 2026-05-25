import { NextResponse } from "next/server";
import { createGitSync } from "@/lib/infrastructure/control-plane";
import { importGithubFiles } from "@/lib/workspace/github-repo-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    remoteUrl?: string;
    branch?: string;
    paths?: string[];
    repositoryId?: string;
    mode?: "key" | "full";
  } | null;

  const remoteUrl = body?.remoteUrl?.trim();
  if (!remoteUrl) {
    return NextResponse.json({ error: "remoteUrl is required." }, { status: 400 });
  }

  try {
    const result = await importGithubFiles({
      remoteUrl,
      branch: body?.branch,
      paths: body?.paths,
      mode: body?.mode
    });

    const repositoryId = body?.repositoryId ?? `repo_${Date.now()}`;
    const gitSync = await createGitSync({
      repositoryId,
      remoteUrl,
      defaultBranch: result.branch
    });

    return NextResponse.json({
      product: "BootRise",
      files: result.files,
      branch: result.branch,
      imported: result.imported,
      skipped: result.skipped,
      mode: result.mode,
      source: result.source ?? "zipball",
      gitSync,
      nextAction: "Files are ready in Code intake — ask BootRise to fix or run Fix and report."
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "GitHub import failed.";
    const status = /rate limit/i.test(message) ? 429 : 502;
    return NextResponse.json({ error: message }, { status });
  }
}
