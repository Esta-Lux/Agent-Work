import { NextResponse } from "next/server";
import { BootRiseOrchestrator } from "@/lib/engine/orchestrator";

export const runtime = "nodejs";

interface OrchestratorRequest {
  repositoryId?: string;
  planId?: string;
  repoPath?: string;
  filePath?: string;
  targetFilePatch?: string;
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as OrchestratorRequest | null;

  if (!body?.planId || !body.repoPath || !body.filePath || body.targetFilePatch === undefined) {
    return NextResponse.json(
      {
        error: "planId, repoPath, filePath, and targetFilePatch are required."
      },
      { status: 400 }
    );
  }

  const orchestrator = new BootRiseOrchestrator(body.repositoryId ?? "demo", body.repoPath);
  const result = await orchestrator.processChangePipeline(body.planId, body.filePath, body.targetFilePatch);

  return NextResponse.json({
    product: "BootRise",
    result
  });
}

