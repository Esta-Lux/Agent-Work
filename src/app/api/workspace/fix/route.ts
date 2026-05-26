import { NextResponse } from "next/server";
import type { SourceFileInput } from "@/lib/intelligence/repo-intelligence";
import { resolveUserProvider } from "@/lib/ai/providers";
import { assertModelRouteAllowed, recordModelUsage } from "@/lib/ai/model-router";
import { recordAdminTelemetry } from "@/lib/admin/telemetry";
import { assertKillSwitchAllowed, assertWorkspaceFileLimit } from "@/lib/admin/kill-switches";
import { recordAudit } from "@/lib/admin/audit-log";
import { createPendingFixPlan } from "@/lib/workspace/workspace-fix.server";
import { withWorkspaceAuth } from "@/lib/auth/with-workspace-auth";

export const runtime = "nodejs";

interface FixRequestBody {
  request?: string;
  files?: SourceFileInput[];
  provider?: "bootrise" | "openai";
  mode?: "fast" | "deep" | "security" | "premium";
  projectId?: string;
  plan?: string;
}

export async function POST(request: Request) {
  return withWorkspaceAuth(request, async (ctx, req) => {
    const body = (await req.json().catch(() => null)) as FixRequestBody | null;
    const userRequest = body?.request?.trim();
    const files = body?.files;

    if (!userRequest) {
      return NextResponse.json({ error: "A non-empty fix or change request is required." }, { status: 400 });
    }

    if (!files || !Array.isArray(files) || files.length === 0) {
      return NextResponse.json({ error: "Provide at least one file with path and content." }, { status: 400 });
    }

    try {
      assertKillSwitchAllowed("fix");
      assertKillSwitchAllowed("expensive_model");
      assertWorkspaceFileLimit(files.length);
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Fix blocked." },
        { status: 403 }
      );
    }

    const provider = resolveUserProvider(body?.provider);
    const orgId = ctx.orgId;
    const userId = ctx.user.id;
    const projectId = body?.projectId?.trim() || "workspace-fix";
    let modelRoute: Awaited<ReturnType<typeof assertModelRouteAllowed>>;
    try {
      modelRoute = await assertModelRouteAllowed({
        requestedProvider: provider,
        requestedMode: body?.mode,
        taskType: "fix",
        requestText: userRequest,
        filePaths: files.map((file) => file.path),
        fileCount: files.length,
        premiumApproved: provider === "openai" || body?.mode === "premium",
        orgId,
        userId,
        projectId,
        plan: body?.plan
      });
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Model route blocked.", provider, connected: false },
        { status: 403 }
      );
    }

    const startedAt = Date.now();
    let result: Awaited<ReturnType<typeof createPendingFixPlan>>;
    try {
      result = await createPendingFixPlan(files, userRequest, modelRoute.provider, {
        orgId,
        projectId,
        userId
      });
      void recordModelUsage(modelRoute, { orgId, userId, projectId: result.repositoryId }, "succeeded");
    } catch (error) {
      void recordModelUsage(modelRoute, { orgId, userId, projectId }, "failed", error instanceof Error ? error.message : "Fix workflow failed.");
      return NextResponse.json(
        {
          error: error instanceof Error ? error.message : "Fix workflow failed.",
          provider,
          connected: false,
          nextAction:
            provider === "openai"
              ? "Configure ChatGPT or choose BootRise if it is available."
              : "Configure BootRise or choose ChatGPT if it is available."
        },
        { status: 502 }
      );
    }
    void recordAudit({ actor: userId, action: "fix_proposed", detail: userRequest.slice(0, 120) });
    const durationMs = Date.now() - startedAt;

    void recordAdminTelemetry({
      userId,
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
      pendingFixId: result.pendingFixId,
      modelRoute,
      nextAction: "Review proposed patches, then Approve or Reject before changes apply to your workspace."
    });
  });
}
