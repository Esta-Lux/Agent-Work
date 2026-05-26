import { NextResponse } from "next/server";
import { assertKillSwitchAllowed } from "@/lib/admin/kill-switches";
import { assertModelRouteAllowed, recordModelUsage } from "@/lib/ai/model-router";
import { createGitSync } from "@/lib/infrastructure/control-plane";
import { buildSymbolGraph } from "@/lib/intelligence/symbol-graph";
import { memoryStore, upsertRecord } from "@/lib/persistence/memory-store";
import { importGithubFiles } from "@/lib/workspace/github-repo-service";
import { getRepoManifest, syncRepoFiles } from "@/lib/workspace/repo-store";
import { withWorkspaceAuth } from "@/lib/auth/with-workspace-auth";
import { createOrGetProjectBrain } from "@/lib/project-brain/project-brain-store";
import { indexProjectFiles } from "@/lib/project-brain/file-indexer";
import { buildModuleIndex } from "@/lib/project-brain/module-indexer";
import { addArchitectureMemory } from "@/lib/project-brain/memory-updater";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function POST(request: Request) {
  return withWorkspaceAuth(request, async (ctx, req) => {
  const body = (await req.json().catch(() => null)) as {
    remoteUrl?: string;
    branch?: string;
    paths?: string[];
    repositoryId?: string;
    projectId?: string;
    mode?: "key" | "full";
  } | null;

  const remoteUrl = body?.remoteUrl?.trim();
  if (!remoteUrl) {
    return NextResponse.json({ error: "remoteUrl is required." }, { status: 400 });
  }

  try {
    assertKillSwitchAllowed("github_import");
    const result = await importGithubFiles({
      remoteUrl,
      branch: body?.branch,
      paths: body?.paths,
      mode: body?.mode
    });

    const repositoryId = body?.repositoryId ?? `repo_${Date.now()}`;
    const orgId = ctx.orgId;
    const userId = ctx.user.id;
    const usageRoute = await assertModelRouteAllowed({
      requestedProvider: "bootrise",
      requestedMode: "fast",
      taskType: "github_import",
      requestText: remoteUrl,
      fileCount: result.files.length,
      orgId,
      userId,
      projectId: repositoryId
    });
    void recordModelUsage(usageRoute, { orgId, userId, projectId: repositoryId }, "succeeded");

    const sync = syncRepoFiles(repositoryId, result.files, {
      remoteUrl,
      branch: result.branch,
      fullReplace: result.mode === "full"
    });

    const graph = buildSymbolGraph(repositoryId, result.files);
    for (const symbol of graph.symbols) {
      upsertRecord(memoryStore.livingLedgerSymbols, symbol);
    }

    const now = new Date().toISOString();
    upsertRecord(memoryStore.repositories, {
      id: repositoryId,
      name: remoteUrl.split("/").filter(Boolean).pop() ?? repositoryId,
      source: "github",
      createdAt: getRepoManifest(repositoryId)?.syncedAt ?? now,
      updatedAt: now
    });

    const gitSync = await createGitSync({
      repositoryId,
      remoteUrl,
      defaultBranch: result.branch
    });

    const brainProjectId = body?.projectId?.trim() ?? repositoryId;
    await createOrGetProjectBrain({
      orgId,
      projectId: brainProjectId,
      name: remoteUrl.split("/").filter(Boolean).pop() ?? brainProjectId
    });
    const fileIndex = await indexProjectFiles({
      orgId,
      projectId: brainProjectId,
      repositoryId,
      files: result.files
    });
    const modules = await buildModuleIndex({ orgId, projectId: brainProjectId, files: result.files });
    await addArchitectureMemory({
      orgId,
      projectId: brainProjectId,
      title: "Repository import",
      content: `Imported ${result.files.length} files from ${remoteUrl} on branch ${result.branch}. ${modules.length} modules detected.`,
      relatedPaths: sync.written.slice(0, 20)
    });

    return NextResponse.json({
      product: "BootRise",
      repositoryId,
      files: result.files,
      branch: result.branch,
      imported: result.imported,
      skipped: result.skipped,
      mode: result.mode,
      source: result.source ?? "zipball",
      gitSync,
      canonicalStore: {
        path: `.bootrise/repos/${repositoryId}`,
        manifest: sync.manifest,
        written: sync.written.length,
        unchanged: sync.unchanged.length,
        removed: sync.removed.length,
        totalFiles: sync.totalFiles
      },
      symbolIndex: {
        symbols: graph.symbols.length,
        indexedFiles: graph.indexedFiles
      },
      projectBrain: {
        projectId: brainProjectId,
        filesIndexed: fileIndex.indexed,
        filesSkipped: fileIndex.skipped,
        modules: modules.length
      },
      nextAction:
        sync.unchanged.length > 0 && sync.written.length === 0
          ? "Repo unchanged on disk — load from GET /api/workspace/repos/{repositoryId}/files"
          : "Files persisted to canonical repo store — re-import only writes changed paths."
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "GitHub import failed.";
    const status = /rate limit/i.test(message) ? 429 : 502;
    return NextResponse.json({ error: message }, { status });
  }
  });
}
