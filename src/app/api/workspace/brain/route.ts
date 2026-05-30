import { NextResponse } from "next/server";
import { withWorkspaceAuth } from "@/lib/auth/with-workspace-auth";
import { buildProjectBrainSummary } from "@/lib/project-brain/project-brain-summary";
import { listMemoryItems } from "@/lib/project-brain/project-brain-store";
import { listModules } from "@/lib/project-brain/module-indexer";
import { loadFileIndex } from "@/lib/project-brain/file-indexer";
import { buildProjectBrainV2 } from "@/lib/project-brain/project-brain-v2";
import type { SourceFileInput } from "@/lib/intelligence/repo-intelligence";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return withWorkspaceAuth(request, async (ctx, req) => {
    const projectId = new URL(req.url).searchParams.get("projectId")?.trim();
    if (!projectId) {
      return NextResponse.json({ error: "projectId is required." }, { status: 400 });
    }

    const summary = await buildProjectBrainSummary(ctx.orgId, projectId);
    const memoryItems = await listMemoryItems(ctx.orgId, projectId);
    const modules = await listModules(ctx.orgId, projectId);
    const files = await loadFileIndex(ctx.orgId, projectId);

    return NextResponse.json({
      product: "BootRise",
      summary,
      memoryItems,
      modules,
      riskyFiles: files.filter((f) => f.riskLevel !== "normal").slice(0, 30)
    });
  });
}

export async function POST(request: Request) {
  return withWorkspaceAuth(request, async (_ctx, req) => {
    const body = (await req.json().catch(() => null)) as {
      repositoryId?: string;
      files?: SourceFileInput[];
      envExampleContent?: string;
    } | null;

    if (!body?.files?.length) {
      return NextResponse.json({ error: "files are required to build Project Brain v2." }, { status: 400 });
    }

    return NextResponse.json({
      product: "BootRise",
      brainV2: buildProjectBrainV2({
        repositoryId: body.repositoryId?.trim() || `repo_${Date.now()}`,
        files: body.files,
        envExampleContent: body.envExampleContent
      })
    });
  });
}
