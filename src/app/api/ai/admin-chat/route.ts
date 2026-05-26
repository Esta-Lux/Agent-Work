import { NextResponse } from "next/server";
import { createBootRiseChatResponse, createUserFacingWebsitePlan } from "@/lib/ai/bootrise-chat";
import { createProviderChatResponse, isProviderConfigured } from "@/lib/ai/llm-router";
import { resolveAdminProvider } from "@/lib/ai/providers";
import { assertModelRouteAllowed, recordModelUsage } from "@/lib/ai/model-router";
import { assertKillSwitchAllowed } from "@/lib/admin/kill-switches";
import { resolveActorId, resolveOrgId } from "@/lib/tenancy/org-context";
import { getOpenAIModel } from "@/lib/ai/openai-client";
import { getNvidiaModel } from "@/lib/ai/nvidia-client";

export const runtime = "nodejs";

interface AdminChatRequest {
  message?: string;
  model?: "bootrise" | "openai";
  mode?: "fast" | "deep" | "security" | "premium";
  history?: Array<{ role: "user" | "assistant"; content: string }>;
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as AdminChatRequest | null;
  const message = body?.message?.trim();
  const provider = resolveAdminProvider(body?.model);
  const history = body?.history ?? [];

  if (!message) {
    return NextResponse.json({ error: "A non-empty message is required." }, { status: 400 });
  }

  try {
    assertKillSwitchAllowed("admin_chat");
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Admin chat blocked." },
      { status: 403 }
    );
  }

  const orgId = resolveOrgId(request);
  const userId = resolveActorId(request);
  let modelRoute: Awaited<ReturnType<typeof assertModelRouteAllowed>>;
  try {
    modelRoute = await assertModelRouteAllowed({
      requestedProvider: provider,
      requestedMode: body?.mode,
      taskType: "admin_chat",
      requestText: message,
      premiumApproved: provider === "openai" || body?.mode === "premium",
      orgId,
      userId,
      projectId: "admin-chat"
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Model route blocked.", provider },
      { status: 403 }
    );
  }

  const fallback = createBootRiseChatResponse(message);

  if (isProviderConfigured(provider)) {
    try {
      const result = await createProviderChatResponse({
        provider,
        message,
        history,
        system:
          "You are BootRise admin operator assistant. Answer with readiness, cost, infra, and launch blockers. Be concise and actionable."
      });
      void recordModelUsage(modelRoute, { orgId, userId, projectId: "admin-chat" }, "succeeded");

      return NextResponse.json({
        product: "BootRise",
        model: result.model,
        provider: result.provider,
        connected: true,
        reply: result.text,
        websitePlan: createUserFacingWebsitePlan(message),
        operatorPlan: fallback.operatorPlan
      });
    } catch (error) {
      void recordModelUsage(
        modelRoute,
        { orgId, userId, projectId: "admin-chat" },
        "failed",
        error instanceof Error ? error.message : "LLM chat failed."
      );
      return NextResponse.json({
        product: "BootRise",
        model: provider === "openai" ? getOpenAIModel() : getNvidiaModel(),
        provider: "bootrise",
        connected: false,
        reply: fallback.text,
        actions: fallback.actions,
        operatorPlan: fallback.operatorPlan,
        websitePlan: createUserFacingWebsitePlan(message),
        message: error instanceof Error ? error.message : "LLM chat failed; deterministic fallback responded."
      });
    }
  }

  return NextResponse.json({
    product: "BootRise",
    model: provider === "openai" ? getOpenAIModel() : fallback.model,
    provider: "bootrise",
    connected: false,
    reply: fallback.text,
    actions: fallback.actions,
    operatorPlan: fallback.operatorPlan,
    websitePlan: createUserFacingWebsitePlan(message),
    message:
      provider === "openai"
        ? "OPENAI_API_KEY is not configured; BootRise deterministic engine responded."
        : "NVIDIA_API_KEY is not configured; BootRise deterministic engine responded."
  });
}
