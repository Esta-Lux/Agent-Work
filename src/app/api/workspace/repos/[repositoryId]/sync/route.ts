import { NextResponse } from "next/server";
import { importGithubFiles } from "@/lib/workspace/github-repo-service";
import {
  getRepoManifest,
  listRepoSnapshots,
  readRepoFiles,
  restoreRepoSnapshot,
  syncRepoFiles
} from "@/lib/workspace/repo-store";
import { buildSymbolGraph } from "@/lib/intelligence/symbol-graph";
import { memoryStore, upsertRecord } from "@/lib/persistence/memory-store";
import type { SourceFileInput } from "@/lib/intelligence/repo-intelligence";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function POST(request: Request, context: { params: { repositoryId: string } }) {
  const repositoryId = context.params.repositoryId?.trim();
  if (!repositoryId) {
    return NextResponse.json({ error: "repositoryId is required." }, { status: 400 });
  }

  const body = (await request.json().catch(() => null)) as {
    remoteUrl?: string;
    branch?: string;
    mode?: "key" | "full";
    files?: SourceFileInput[];
    restoreSnapshotId?: string;
  } | null;

  try {
    if (body?.restoreSnapshotId) {
      const result = restoreRepoSnapshot(repositoryId, body.restoreSnapshotId);
      const files = readRepoFiles(repositoryId);
      const graph = buildSymbolGraph(repositoryId, files);
      for (const symbol of graph.symbols) {
        upsertRecord(memoryStore.livingLedgerSymbols, symbol);
      }
      return NextResponse.json({
        product: "BootRise",
        action: "restore",
        repositoryId,
        sync: result,
        symbolCount: graph.symbols.length,
        files
      });
    }

    let incoming: SourceFileInput[] = body?.files ?? [];
    let branch = body?.branch ?? null;
    let remoteUrl = body?.remoteUrl ?? null;

    if (body?.remoteUrl) {
      const imported = await importGithubFiles({
        remoteUrl: body.remoteUrl,
        branch: body.branch,
        mode: body.mode ?? "full"
      });
      incoming = imported.files;
      branch = imported.branch;
      remoteUrl = body.remoteUrl;
    }

    if (incoming.length === 0) {
      return NextResponse.json({ error: "Provide remoteUrl or files to sync." }, { status: 400 });
    }

    const sync = syncRepoFiles(repositoryId, incoming, {
      remoteUrl,
      branch,
      fullReplace: body?.mode === "full" || Boolean(body?.remoteUrl)
    });

    const files = readRepoFiles(repositoryId);
    const graph = buildSymbolGraph(repositoryId, files);
    for (const symbol of graph.symbols) {
      upsertRecord(memoryStore.livingLedgerSymbols, symbol);
    }

    const now = new Date().toISOString();
    upsertRecord(memoryStore.repositories, {
      id: repositoryId,
      name: remoteUrl?.split("/").pop() ?? repositoryId,
      source: remoteUrl ? "github" : "uploaded",
      createdAt: getRepoManifest(repositoryId)?.syncedAt ?? now,
      updatedAt: now
    });

    return NextResponse.json({
      product: "BootRise",
      action: "sync",
      repositoryId,
      sync,
      manifest: getRepoManifest(repositoryId),
      snapshots: listRepoSnapshots(repositoryId),
      symbolCount: graph.symbols.length,
      indexedFiles: graph.indexedFiles,
      files,
      nextAction: "Canonical repo is on disk — browser can load via GET /api/workspace/repos/{id}/files"
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Repo sync failed.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
