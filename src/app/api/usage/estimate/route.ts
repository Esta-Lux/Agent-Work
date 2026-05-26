import { NextResponse } from "next/server";
import { withWorkspaceAuth } from "@/lib/auth/with-workspace-auth";
import { routeModel, recordModelUsage } from "@/lib/ai/model-router";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  return withWorkspaceAuth(request, async (ctx, req) => {
    const body = (await req.json().catch(() => null)) as {
      provider?: string;
      mode?: string;
      taskType?: string;
      requestText?: string;
      filePaths?: string[];
      fileCount?: number;
      changedFileCount?: number;
      projectId?: string;
      plan?: string;
    } | null;

    const decision = await routeModel({
      requestedProvider: body?.provider,
      requestedMode: body?.mode,
      taskType: body?.taskType ?? "usage_estimate",
      requestText: body?.requestText,
      filePaths: body?.filePaths,
      fileCount: body?.fileCount,
      changedFileCount: body?.changedFileCount,
      premiumApproved: body?.provider === "openai" || body?.mode === "premium",
      orgId: ctx.orgId,
      userId: ctx.user.id,
      projectId: body?.projectId?.trim() || "usage_estimate",
      plan: body?.plan
    });

    await recordModelUsage(
      decision,
      {
        orgId: ctx.orgId,
        userId: ctx.user.id,
        projectId: body?.projectId?.trim() || "usage_estimate"
      },
      "estimated",
      decision.blockReason
    );

    return NextResponse.json({ product: "BootRise", decision });
  });
}
