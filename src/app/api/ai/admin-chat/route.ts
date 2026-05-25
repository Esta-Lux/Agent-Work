import { NextResponse } from "next/server";
import { createBootRiseChatResponse, createUserFacingWebsitePlan } from "@/lib/ai/bootrise-chat";
import { createOpenAIChatResponse, getOpenAIModel, hasOpenAIKey } from "@/lib/ai/openai-client";

export const runtime = "nodejs";

interface AdminChatRequest {
  message?: string;
  model?: "bootrise" | "openai";
  history?: Array<{ role: "user" | "assistant"; content: string }>;
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as AdminChatRequest | null;
  const message = body?.message?.trim();
  const selectedModel = body?.model ?? "bootrise";
  const history = body?.history ?? [];

  if (!message) {
    return NextResponse.json({ error: "A non-empty message is required." }, { status: 400 });
  }

  if (selectedModel === "openai" && hasOpenAIKey()) {
    try {
      const result = await createOpenAIChatResponse({ message, history });
      return NextResponse.json({
        product: "BootRise",
        model: result.model,
        provider: "openai",
        connected: true,
        reply: result.text,
        websitePlan: createUserFacingWebsitePlan(message),
        operatorPlan: createBootRiseChatResponse(message).operatorPlan
      });
    } catch (error) {
      const fallback = createBootRiseChatResponse(message);
      return NextResponse.json({
        product: "BootRise",
        model: fallback.model,
        provider: "bootrise",
        connected: false,
        reply: fallback.text,
        actions: fallback.actions,
        operatorPlan: fallback.operatorPlan,
        websitePlan: createUserFacingWebsitePlan(message),
        message: error instanceof Error ? error.message : "OpenAI chat failed; BootRise fallback responded."
      });
    }
  }

  const fallback = createBootRiseChatResponse(message);
  return NextResponse.json({
    product: "BootRise",
    model: selectedModel === "openai" ? getOpenAIModel() : fallback.model,
    provider: "bootrise",
    connected: selectedModel !== "openai",
    reply: fallback.text,
    actions: fallback.actions,
    operatorPlan: fallback.operatorPlan,
    websitePlan: createUserFacingWebsitePlan(message),
    message:
      selectedModel === "openai"
        ? "OPENAI_API_KEY is not configured; BootRise deterministic engine responded."
        : "BootRise deterministic engine responded."
  });
}
