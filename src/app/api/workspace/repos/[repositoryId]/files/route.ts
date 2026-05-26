import { NextResponse } from "next/server";
import {
  getRepoManifest,
  listRepoSnapshots,
  readRepoFiles,
  repoExists
} from "@/lib/workspace/repo-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: { repositoryId: string } }) {
  const repositoryId = context.params.repositoryId?.trim();
  if (!repositoryId) {
    return NextResponse.json({ error: "repositoryId is required." }, { status: 400 });
  }

  if (!repoExists(repositoryId)) {
    return NextResponse.json({ error: `Repository ${repositoryId} not found on disk.` }, { status: 404 });
  }

  const manifest = getRepoManifest(repositoryId);
  const files = readRepoFiles(repositoryId);
  const snapshots = listRepoSnapshots(repositoryId);

  return NextResponse.json({
    product: "BootRise",
    repositoryId,
    manifest,
    fileCount: files.length,
    snapshots,
    files: files.map((file) => ({
      path: file.path,
      sizeBytes: file.sizeBytes ?? file.content.length
    }))
  });
}
