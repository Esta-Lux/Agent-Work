import { createNvidiaChangePlan, createNvidiaChatResponse, checkNvidiaConnection, hasNvidiaKey } from "@/lib/ai/nvidia-client";
import {
  checkOpenAIConnection,
  createOpenAIChangePlan,
  createOpenAIChatResponse,
  hasOpenAIKey
} from "@/lib/ai/openai-client";
import type { LlmHealthResult, LlmProviderId, LlmChatResult } from "@/lib/ai/providers";
import type { ChangePlan, RepoIntelligenceSnapshot } from "@/lib/types/core";

export async function checkProviderHealth(provider: LlmProviderId): Promise<LlmHealthResult> {
  if (provider === "openai") {
    const result = await checkOpenAIConnection();
    return { provider: "openai", ...result };
  }

  const result = await checkNvidiaConnection();
  return { provider: "bootrise", ...result, model: result.model };
}

export async function checkAllProviderHealth(): Promise<LlmHealthResult[]> {
  return Promise.all([checkProviderHealth("bootrise"), checkProviderHealth("openai")]);
}

export function providerLabel(provider: LlmProviderId): string {
  return provider === "openai" ? "ChatGPT" : "BootRise";
}

export function isProviderConfigured(provider: LlmProviderId): boolean {
  return provider === "openai" ? hasOpenAIKey() : hasNvidiaKey();
}

export async function createProviderChangePlan(
  provider: LlmProviderId,
  request: string,
  repo: RepoIntelligenceSnapshot,
  scaffoldPlan: ChangePlan
): Promise<{ plan: ChangePlan; model: string; provider: LlmProviderId }> {
  if (provider === "openai") {
    if (!hasOpenAIKey()) throw new Error("ChatGPT is not configured on the server.");
    const result = await createOpenAIChangePlan(request, repo, scaffoldPlan);
    return { plan: result.plan, model: result.model, provider: "openai" };
  }

  if (!hasNvidiaKey()) throw new Error("BootRise is not configured on the server.");
  const result = await createNvidiaChangePlan(request, repo, scaffoldPlan);
  return { plan: result.plan, model: result.model, provider: "bootrise" };
}

export async function createProviderChatResponse(input: {
  provider: LlmProviderId;
  message: string;
  history: Array<{ role: "user" | "assistant"; content: string }>;
  system?: string;
  maxOutputTokens?: number;
}): Promise<LlmChatResult> {
  if (input.provider === "openai") {
    if (!hasOpenAIKey()) throw new Error("ChatGPT is not configured on the server.");
    const result = await createOpenAIChatResponse({
      message: input.system ? `${input.system}\n\n${input.message}` : input.message,
      history: input.history,
      maxOutputTokens: input.maxOutputTokens
    });
    return { provider: "openai", model: result.model, text: result.text };
  }

  if (!hasNvidiaKey()) throw new Error("BootRise is not configured on the server.");
  const result = await createNvidiaChatResponse({
    message: input.message,
    history: input.history,
    system: input.system,
    maxTokens: input.maxOutputTokens
  });
  return { provider: "bootrise", model: result.model, text: result.text };
}
