import { NextResponse } from "next/server";
import { withWorkspaceAuth } from "@/lib/auth/with-workspace-auth";
import { buildRepoIntelligenceSnapshot, type SourceFileInput } from "@/lib/intelligence/repo-intelligence";
import { buildArchitectureMap } from "@/lib/workspace/architecture-map";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  return withWorkspaceAuth(request, async (_ctx, req) => {
  const body = (await req.json().catch(() => null)) as {
    files?: SourceFileInput[];
    repositoryId?: string;
    blastRootSymbol?: string;
  } | null;

  if (!body?.files?.length) {
    return NextResponse.json({ error: "files array is required." }, { status: 400 });
  }

  const repo = buildRepoIntelligenceSnapshot(body.files);
  const map = await buildArchitectureMap({
    repo,
    repositoryId: body.repositoryId,
    blastRootSymbol: body.blastRootSymbol
  });

  return NextResponse.json({
    product: "BootRise",
    phase: 3,
    repo,
    map
  });
  });
}
