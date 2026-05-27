import { NextResponse } from "next/server";
import type { SourceFileInput } from "@/lib/intelligence/repo-intelligence";
import { withWorkspaceAuth } from "@/lib/auth/with-workspace-auth";
import { analyzeWorkspaceFiles } from "@/lib/workspace/workspace-analyze";
import { readRepoFiles, repoExists } from "@/lib/workspace/repo-store";
import { createOrGetProjectBrain } from "@/lib/project-brain/project-brain-store";
import { indexProjectFiles } from "@/lib/project-brain/file-indexer";
import { buildModuleIndex } from "@/lib/project-brain/module-indexer";
import { addArchitectureMemory } from "@/lib/project-brain/memory-updater";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  return withWorkspaceAuth(request, async (ctx, req) => {
    const body = (await req.json().catch(() => null)) as {
      files?: SourceFileInput[];
      repositoryId?: string | null;
      projectId?: string | null;
    } | null;
    const repositoryId = body?.repositoryId?.trim() || undefined;
    const files =
      repositoryId && repoExists(repositoryId) && readRepoFiles(repositoryId).length > 0
        ? readRepoFiles(repositoryId)
        : body?.files;

    if (!files?.length) {
      return NextResponse.json({ error: "Provide at least one file to analyze." }, { status: 400 });
    }

    const result = analyzeWorkspaceFiles(files);
    const projectId = body?.projectId?.trim() || repositoryId || `proj_analysis_${Date.now()}`;
    await createOrGetProjectBrain({
      orgId: ctx.orgId,
      projectId,
      name: repositoryId ?? "Workspace project"
    });
    const fileIndex = await indexProjectFiles({
      orgId: ctx.orgId,
      projectId,
      repositoryId,
      files
    });
    const modules = await buildModuleIndex({ orgId: ctx.orgId, projectId, files });
    await addArchitectureMemory({
      orgId: ctx.orgId,
      projectId,
      title: "Workspace analysis",
      content: `Analyzed ${files.length} files. ${modules.length} modules mapped. Architecture health ${result.health.score}.`,
      relatedPaths: files.slice(0, 20).map((file) => file.path)
    });

    return NextResponse.json({
      product: "BootRise",
      phase: "beta",
      projectBrain: {
        projectId,
        filesIndexed: fileIndex.entries.length,
        modules: modules.length
      },
      ...result
    });
  });
}
