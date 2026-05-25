import { NextResponse } from "next/server";
import { createBootRiseChatResponse, createUserFacingWebsitePlan } from "@/lib/ai/bootrise-chat";
import { createProviderChatResponse, isProviderConfigured } from "@/lib/ai/llm-router";
import { resolveAdminProvider } from "@/lib/ai/providers";
import { getOpenAIModel } from "@/lib/ai/openai-client";
import { getNvidiaModel } from "@/lib/ai/nvidia-client";

export const runtime = "nodejs";

interface AdminChatRequest {
  message?: string;
  model?: "bootrise" | "openai";
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
