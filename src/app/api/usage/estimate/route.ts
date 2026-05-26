import { NextResponse } from "next/server";
import { routeModel, recordModelUsage } from "@/lib/ai/model-router";
import { resolveActorId, resolveOrgId } from "@/lib/tenancy/org-context";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
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
    orgId: resolveOrgId(request),
    userId: resolveActorId(request),
    projectId: body?.projectId?.trim() || "usage_estimate",
    plan: body?.plan
  });

  await recordModelUsage(
    decision,
    {
      orgId: resolveOrgId(request),
      userId: resolveActorId(request),
      projectId: body?.projectId?.trim() || "usage_estimate"
    },
    "estimated",
    decision.blockReason
  );

  return NextResponse.json({ product: "BootRise", decision });
}
