import { NextResponse } from "next/server";
import type { SourceFileInput } from "@/lib/intelligence/repo-intelligence";
import { assertKillSwitchAllowed } from "@/lib/admin/kill-switches";
import { recordAudit } from "@/lib/admin/audit-log";
import { recordAdminTelemetry } from "@/lib/admin/telemetry";
import { assertModelRouteAllowed, recordModelUsage } from "@/lib/ai/model-router";
import { resolveActorId, resolveOrgId } from "@/lib/tenancy/org-context";
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

  try {
    assertKillSwitchAllowed("sandbox");
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Sandbox blocked." },
      { status: 403 }
    );
  }

  const repositoryId = body.repositoryId ?? `repo_${Date.now()}`;
  const orgId = resolveOrgId(request);
  const userId = resolveActorId(request);
  let route;
  try {
    route = await assertModelRouteAllowed({
      requestedProvider: "bootrise",
      requestedMode: "fast",
      taskType: "sandbox",
      fileCount: body.files.length,
      sandboxMinutes: Number(process.env.BOOTRISE_SANDBOX_VERIFY_MS ?? 120000) / 60_000,
      orgId,
      userId,
      projectId: repositoryId
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Sandbox quota blocked." },
      { status: 403 }
    );
  }
  const startedAt = Date.now();
  const result = await runWorkspaceSandboxVerify(body.files, repositoryId);
  void recordModelUsage(route, { orgId, userId, projectId: repositoryId }, result.status === "passed" ? "succeeded" : "failed", result.status);
  void recordAudit({ actor: "workspace-user", action: "sandbox_verify", detail: result.status });

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
