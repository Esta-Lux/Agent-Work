export type LlmProviderId = "bootrise" | "openai";

export interface LlmHealthResult {
  provider: LlmProviderId;
  connected: boolean;
  model: string;
  message: string;
  latencyMs?: number;
}

export interface LlmChatResult {
  provider: LlmProviderId;
  model: string;
  text: string;
}

export function resolveUserProvider(selected?: string): LlmProviderId {
  if (selected === "openai") return "openai";
  return "bootrise";
}

export function resolveAdminProvider(selected?: string): LlmProviderId {
  if (selected === "bootrise") return "bootrise";
  return selected === "openai" ? "openai" : "bootrise";
}
