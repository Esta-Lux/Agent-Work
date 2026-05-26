import { NextResponse } from "next/server";
import { withWorkspaceAuth } from "@/lib/auth/with-workspace-auth";
import type { SourceFileInput } from "@/lib/intelligence/repo-intelligence";
import { createWorkspacePreviewSession } from "@/lib/workspace/workspace-preview";
import type { ProposedPatch } from "@/lib/workspace/workspace-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  return withWorkspaceAuth(request, async (_ctx, req) => {
  const body = (await req.json().catch(() => null)) as {
    files?: SourceFileInput[];
    patches?: ProposedPatch[];
    repositoryId?: string;
  } | null;

  if (!body?.files?.length) {
    return NextResponse.json({ error: "files are required." }, { status: 400 });
  }

  const session = createWorkspacePreviewSession({
    files: body.files,
    patches: body.patches,
    repositoryId: body.repositoryId
  });

  return NextResponse.json({
    product: "BootRise",
    phase: 2,
    session
  });
  });
}
