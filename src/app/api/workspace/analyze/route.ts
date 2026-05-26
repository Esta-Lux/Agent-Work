import { NextResponse } from "next/server";
import type { SourceFileInput } from "@/lib/intelligence/repo-intelligence";
import { analyzeWorkspaceFiles } from "@/lib/workspace/workspace-analyze";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { files?: SourceFileInput[] } | null;
  const files = body?.files;

  if (!files?.length) {
    return NextResponse.json({ error: "Provide at least one file to analyze." }, { status: 400 });
  }

  const result = analyzeWorkspaceFiles(files);

  return NextResponse.json({
    product: "BootRise",
    phase: "beta",
    ...result
  });
}
