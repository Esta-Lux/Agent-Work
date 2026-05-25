import { NextResponse } from "next/server";
import type { SourceFileInput } from "@/lib/intelligence/repo-intelligence";
import { recordAdminTelemetry } from "@/lib/admin/telemetry";
import { runWorkspaceSandboxVerify } from "@/lib/workspace/workspace-sandbox";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    files?: SourceFileInput[];
    repositoryId?: string;
  } | null;

  if (!body?.files?.length) {
    return NextResponse.json({ error: "Provide files to verify in sandbox." }, { status: 400 });
  }

  const repositoryId = body.repositoryId ?? `repo_${Date.now()}`;
  const startedAt = Date.now();
  const result = await runWorkspaceSandboxVerify(body.files, repositoryId);

  void recordAdminTelemetry({
    userId: "workspace-user",
    projectId: repositoryId,
    sessionId: result.sessionId,
    planningDurationMs: 0,
    executionDurationMs: Date.now() - startedAt,
    verificationDurationMs: Date.now() - startedAt,
    finalOutcome: result.status === "passed" ? "COMMITTED" : result.status === "failed" ? "HARD_CRASH" : "ABANDONED",
    tokenComputeCost: 0.01
  });

  return NextResponse.json({ product: "BootRise", ...result });
}
