import { NextResponse } from "next/server";
import type { SourceFileInput } from "@/lib/intelligence/repo-intelligence";
import { resolveUserProvider } from "@/lib/ai/providers";
import { recordAdminTelemetry } from "@/lib/admin/telemetry";
import { executeFixWorkflow } from "@/lib/workspace/workspace-fix.server";

export const runtime = "nodejs";

interface FixRequestBody {
  request?: string;
  files?: SourceFileInput[];
  provider?: "bootrise" | "openai";
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as FixRequestBody | null;
  const userRequest = body?.request?.trim();
  const files = body?.files;

  if (!userRequest) {
    return NextResponse.json({ error: "A non-empty fix or change request is required." }, { status: 400 });
  }

  if (!files || !Array.isArray(files) || files.length === 0) {
    return NextResponse.json({ error: "Provide at least one file with path and content." }, { status: 400 });
  }

  const provider = resolveUserProvider(body?.provider);
  const startedAt = Date.now();
  const result = await executeFixWorkflow(files, userRequest, provider);
  const durationMs = Date.now() - startedAt;

  void recordAdminTelemetry({
    userId: "workspace-user",
    projectId: result.repositoryId,
    sessionId: crypto.randomUUID(),
    planningDurationMs: durationMs,
    executionDurationMs: 0,
    verificationDurationMs: 0,
    finalOutcome: "COMMITTED",
    tokenComputeCost: provider === "openai" ? 0.08 : 0.02
  });

  return NextResponse.json({
    product: "BootRise",
    provider,
    plannerSource: result.plannerSource,
    repositoryId: result.repositoryId,
    repo: result.repo,
    health: result.health,
    report: result.report,
    nextAction: "Review fixed files and blast radius before exporting or pushing to GitHub."
  });
}
