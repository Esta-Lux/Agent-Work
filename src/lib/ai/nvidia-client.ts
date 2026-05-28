import type { ChangePlan, RepoIntelligenceSnapshot, RiskLevel, WorkerDomain } from "@/lib/types/core";
import { BOOTRISE_SENIOR_ARCHITECT_CONTRACT } from "@/lib/ai/senior-architect";
import { classifyTaskIntent } from "@/lib/ai/task-intent";

const NVIDIA_CHAT_URL = "https://integrate.api.nvidia.com/v1/chat/completions";
/** Stronger default for code review, planning, and multi-file reasoning (NVIDIA API catalog). */
const DEFAULT_MODEL = "nvidia/llama-3.3-nemotron-super-49b-v1.5";
const DEFAULT_TIMEOUT_MS = 120_000;

interface PlannerJson {
  interpretedGoal?: string;
  businessImpact?: string;
  impactedFiles?: string[];
  impactedServices?: string[];
  impactedApis?: string[];
  impactedDatabaseSchemas?: string[];
  blastRadius?: string[];
  riskLevel?: RiskLevel;
  riskReasons?: string[];
  steps?: Array<{
    title?: string;
    domain?: WorkerDomain;
    summary?: string;
    targetFiles?: string[];
  }>;
  rollbackStrategy?: string;
}

export interface NvidiaPlannerResult {
  plan: ChangePlan;
  model: string;
  rawText: string;
}

export function getNvidiaModel(): string {
  return process.env.NVIDIA_MODEL?.trim() || DEFAULT_MODEL;
}

export function hasNvidiaKey(): boolean {
  return Boolean(process.env.NVIDIA_API_KEY?.trim());
}

export async function checkNvidiaConnection(): Promise<{
  connected: boolean;
  model: string;
  message: string;
  latencyMs?: number;
}> {
  if (!hasNvidiaKey()) {
    return {
      connected: false,
      model: getNvidiaModel(),
      message: "NVIDIA_API_KEY is not configured on the server."
    };
  }

  const startedAt = Date.now();
  try {
    const text = await callNvidiaChat({
      messages: [{ role: "user", content: "Reply with exactly: BootRise NVIDIA connection ready." }],
      maxTokens: 256
    });

    return {
      connected: /bootrise nvidia connection ready/i.test(text) || text.length > 0,
      model: getNvidiaModel(),
      message: text.slice(0, 200),
      latencyMs: Date.now() - startedAt
    };
  } catch (error) {
    return {
      connected: false,
      model: getNvidiaModel(),
      message: error instanceof Error ? error.message : "NVIDIA connection check failed.",
      latencyMs: Date.now() - startedAt
    };
  }
}

export async function createNvidiaChangePlan(
  request: string,
  repo: RepoIntelligenceSnapshot,
  fallbackPlan: ChangePlan
): Promise<NvidiaPlannerResult> {
  const prompt = buildPlannerPrompt(request, repo);
  const rawText = await callNvidiaChat({
    messages: [{ role: "user", content: prompt }],
    maxTokens: 2048
  });
  const parsed = parsePlannerJson(rawText);

  return {
    plan: mergePlannerJson(request, fallbackPlan, parsed),
    model: getNvidiaModel(),
    rawText
  };
}

export async function createNvidiaChatResponse({
  message,
  history,
  system
}: {
  message: string;
  history: Array<{ role: "user" | "assistant"; content: string }>;
  system?: string;
}): Promise<{ model: string; text: string }> {
  const messages: Array<{ role: "user" | "assistant" | "system"; content: string }> = [];
  if (system) messages.push({ role: "system", content: system });
  for (const item of history.slice(-6)) {
    messages.push({ role: item.role, content: item.content });
  }
  messages.push({ role: "user", content: message });

  const text = await callNvidiaChat({ messages, maxTokens: 4096 });
  return { model: getNvidiaModel(), text };
}

async function callNvidiaChat({
  messages,
  maxTokens
}: {
  messages: Array<{ role: "user" | "assistant" | "system"; content: string }>;
  maxTokens: number;
}): Promise<string> {
  const key = process.env.NVIDIA_API_KEY?.trim();
  if (!key) throw new Error("NVIDIA_API_KEY is not configured.");

  const controller = new AbortController();
  const timeoutMs = getLlmTimeoutMs();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  let response: Response;
  try {
    response = await fetch(NVIDIA_CHAT_URL, {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: getNvidiaModel(),
        messages,
        max_tokens: maxTokens,
        temperature: 0.2,
        top_p: 0.9
      })
    });
  } catch (error) {
    if (controller.signal.aborted) {
      throw new Error(`BootRise engine timed out after ${Math.round(timeoutMs / 1000)}s. Try Deep/Premium later or narrow the request.`);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }

  const data = (await response.json().catch(() => null)) as {
    error?: { message?: string };
    choices?: Array<{
      message?: { content?: string | null; reasoning?: string | null; reasoning_content?: string | null };
    }>;
  } | null;

  if (!response.ok) {
    throw new Error(data?.error?.message ?? `NVIDIA request failed with status ${response.status}.`);
  }

  const message = data?.choices?.[0]?.message;
  const text =
    message?.content?.trim() ||
    message?.reasoning_content?.trim() ||
    message?.reasoning?.trim() ||
    "";
  if (!text) throw new Error("NVIDIA returned no message content.");
  return text;
}

function getLlmTimeoutMs(): number {
  const value = Number(process.env.BOOTRISE_LLM_TIMEOUT_MS);
  return Number.isFinite(value) && value > 0 ? value : DEFAULT_TIMEOUT_MS;
}

function buildPlannerPrompt(request: string, repo: RepoIntelligenceSnapshot): string {
  const intent = classifyTaskIntent(request);
  const repoContext = {
    files: repo.files.slice(0, 80),
    symbols: repo.symbols.slice(0, 120),
    dependencies: repo.dependencies.slice(0, 120)
  };

  return `${BOOTRISE_SENIOR_ARCHITECT_CONTRACT}

You are BootRise's principal engineering planner on NVIDIA NIM.
Return only strict JSON. No markdown.
Task framing: ${intent.summary}
Create a safe, approval-gated software change plan for: ${request}

Repository intelligence:
${JSON.stringify(repoContext, null, 2)}

JSON shape:
{
  "interpretedGoal": "string",
  "businessImpact": "string",
  "impactedFiles": ["string"],
  "impactedServices": ["string"],
  "impactedApis": ["string"],
  "impactedDatabaseSchemas": ["string"],
  "blastRadius": ["string"],
  "riskLevel": "low" | "medium" | "high",
  "riskReasons": ["string"],
  "steps": [{"title":"string","domain":"frontend"|"backend"|"database"|"infra"|"tests","summary":"string","targetFiles":["string"]}],
  "rollbackStrategy": "string"
}`;
}

function parsePlannerJson(rawText: string): PlannerJson {
  const normalized = rawText.trim().replace(/^```json\s*/i, "").replace(/```$/i, "");
  const start = normalized.indexOf("{");
  const end = normalized.lastIndexOf("}");
  const jsonText = start >= 0 && end >= start ? normalized.slice(start, end + 1) : normalized;
  return JSON.parse(jsonText) as PlannerJson;
}

function mergePlannerJson(request: string, fallbackPlan: ChangePlan, ai: PlannerJson): ChangePlan {
  const files = normalizeStrings(ai.impactedFiles, fallbackPlan.impact.files);
  const steps = Array.isArray(ai.steps) && ai.steps.length > 0 ? ai.steps : [];

  return {
    ...fallbackPlan,
    id: `plan_nvidia_${Date.now()}`,
    intent: {
      request,
      interpretedGoal: ai.interpretedGoal?.trim() || fallbackPlan.intent.interpretedGoal,
      businessImpact: ai.businessImpact?.trim() || fallbackPlan.intent.businessImpact
    },
    impact: {
      files,
      services: normalizeStrings(ai.impactedServices, fallbackPlan.impact.services),
      apis: normalizeStrings(ai.impactedApis, fallbackPlan.impact.apis),
      databaseSchemas: normalizeStrings(ai.impactedDatabaseSchemas, fallbackPlan.impact.databaseSchemas),
      blastRadius: normalizeStrings(ai.blastRadius, fallbackPlan.impact.blastRadius)
    },
    risk: {
      level: isRiskLevel(ai.riskLevel) ? ai.riskLevel : fallbackPlan.risk.level,
      reasons: normalizeStrings(ai.riskReasons, fallbackPlan.risk.reasons)
    },
    steps:
      steps.length > 0
        ? steps.map((step, index) => ({
            id: `step_nvidia_${index + 1}`,
            title: step.title?.trim() || `Planned step ${index + 1}`,
            domain: isWorkerDomain(step.domain) ? step.domain : "tests",
            summary: step.summary?.trim() || "Execute a bounded step from the approved plan.",
            targetFiles: normalizeStrings(step.targetFiles, files),
            dependsOn: index === 0 ? [] : [`step_nvidia_${index}`]
          }))
        : fallbackPlan.steps,
    rollbackStrategy: ai.rollbackStrategy?.trim() || fallbackPlan.rollbackStrategy
  };
}

function normalizeStrings(value: unknown, fallback: string[]): string[] {
  if (!Array.isArray(value)) return fallback;
  const strings = value.map((item) => (typeof item === "string" ? item.trim() : "")).filter(Boolean);
  return strings.length > 0 ? Array.from(new Set(strings)) : fallback;
}

function isRiskLevel(value: unknown): value is RiskLevel {
  return value === "low" || value === "medium" || value === "high";
}

function isWorkerDomain(value: unknown): value is WorkerDomain {
  return value === "frontend" || value === "backend" || value === "database" || value === "infra" || value === "tests";
}
