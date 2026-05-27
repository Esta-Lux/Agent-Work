import { NextResponse } from "next/server";
import { withWorkspaceAuth } from "@/lib/auth/with-workspace-auth";
import { buildRepoGraph } from "@/lib/intelligence/repo-graph";
import type { SourceFileInput } from "@/lib/intelligence/repo-intelligence";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  return withWorkspaceAuth(request, async (_ctx, req) => {
    const body = (await req.json().catch(() => null)) as {
      files?: SourceFileInput[];
      repositoryId?: string;
    } | null;
    if (!body?.files?.length) {
      return NextResponse.json({ error: "files required." }, { status: 400 });
    }
    const repositoryId = body.repositoryId?.trim() || "workspace";
    const graph = buildRepoGraph(repositoryId, body.files);
    return NextResponse.json({ product: "BootRise", graph });
  });
}
