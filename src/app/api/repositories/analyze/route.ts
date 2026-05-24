import { NextResponse } from "next/server";
import { demoRepo } from "@/lib/demo/demo-repo";
import { buildRepoIntelligenceSnapshot, type SourceFileInput } from "@/lib/intelligence/repo-intelligence";
import { createRepoHealthSummary } from "@/lib/reporting/repo-health";

interface AnalyzeRequestBody {
  files?: SourceFileInput[];
}

export async function GET() {
  const health = createRepoHealthSummary(demoRepo);

  return NextResponse.json({
    product: "VerityOS",
    mode: "demo",
    repo: demoRepo,
    health
  });
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as AnalyzeRequestBody | null;
  const files = body?.files;

  if (!files || !Array.isArray(files) || files.length === 0) {
    return NextResponse.json(
      {
        error: "Provide at least one file with path and content."
      },
      { status: 400 }
    );
  }

  const repo = buildRepoIntelligenceSnapshot(files);
  const health = createRepoHealthSummary(repo);

  return NextResponse.json({
    product: "VerityOS",
    mode: "uploaded-files",
    repo,
    health
  });
}

