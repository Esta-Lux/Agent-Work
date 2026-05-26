import { NextResponse } from "next/server";
import { createGitSync } from "@/lib/infrastructure/control-plane";
import { buildSymbolGraph } from "@/lib/intelligence/symbol-graph";
import { memoryStore, upsertRecord } from "@/lib/persistence/memory-store";
import { importGithubFiles } from "@/lib/workspace/github-repo-service";
import { getRepoManifest, syncRepoFiles } from "@/lib/workspace/repo-store";

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
}
