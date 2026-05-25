import { createNvidiaChangePlan, createNvidiaChatResponse, checkNvidiaConnection, hasNvidiaKey, getNvidiaModel } from "@/lib/ai/nvidia-client";
import {
  checkOpenAIConnection,
  createOpenAIChangePlan,
  createOpenAIChatResponse,
  getOpenAIModel,
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
  return provider === "openai" ? `OpenAI ${getOpenAIModel()}` : `BootRise / NVIDIA ${getNvidiaModel()}`;
}

export function isProviderConfigured(provider: LlmProviderId): boolean {
  return provider === "openai" ? hasOpenAIKey() : hasNvidiaKey();
}

export async function createProviderChangePlan(
  provider: LlmProviderId,
  request: string,
  repo: RepoIntelligenceSnapshot,
  fallbackPlan: ChangePlan
): Promise<{ plan: ChangePlan; model: string; provider: LlmProviderId }> {
  if (provider === "openai") {
    if (!hasOpenAIKey()) throw new Error("OPENAI_API_KEY is not configured.");
    const result = await createOpenAIChangePlan(request, repo, fallbackPlan);
    return { plan: result.plan, model: result.model, provider: "openai" };
  }

  if (!hasNvidiaKey()) throw new Error("NVIDIA_API_KEY is not configured.");
  const result = await createNvidiaChangePlan(request, repo, fallbackPlan);
  return { plan: result.plan, model: result.model, provider: "bootrise" };
}

export async function createProviderChatResponse(input: {
  provider: LlmProviderId;
  message: string;
  history: Array<{ role: "user" | "assistant"; content: string }>;
  system?: string;
}): Promise<LlmChatResult> {
  if (input.provider === "openai") {
    if (!hasOpenAIKey()) throw new Error("OPENAI_API_KEY is not configured.");
    const result = await createOpenAIChatResponse({
      message: input.system ? `${input.system}\n\n${input.message}` : input.message,
      history: input.history
    });
    return { provider: "openai", model: result.model, text: result.text };
  }

  if (!hasNvidiaKey()) throw new Error("NVIDIA_API_KEY is not configured.");
  const result = await createNvidiaChatResponse({
    message: input.message,
    history: input.history,
    system: input.system
  });
  return { provider: "bootrise", model: result.model, text: result.text };
}
