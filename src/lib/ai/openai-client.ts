import type { ChangePlan, RepoIntelligenceSnapshot, RiskLevel, WorkerDomain } from "@/lib/types/core";
import { BOOTRISE_SENIOR_ARCHITECT_CONTRACT } from "@/lib/ai/senior-architect";
import { classifyTaskIntent } from "@/lib/ai/task-intent";

const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";
const DEFAULT_MODEL = "gpt-5.5";
const DEFAULT_TIMEOUT_MS = 120_000;

export interface OpenAIPlannerResult {
  plan: ChangePlan;
  model: string;
  rawText: string;
}

export interface OpenAIHealthResult {
  connected: boolean;
  model: string;
  message: string;
  latencyMs?: number;
}

export interface OpenAIChatResult {
  model: string;
  text: string;
}

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

export function getOpenAIModel(): string {
  return process.env.OPENAI_MODEL?.trim() || DEFAULT_MODEL;
}

export function hasOpenAIKey(): boolean {
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}

export async function checkOpenAIConnection(): Promise<OpenAIHealthResult> {
  if (!hasOpenAIKey()) {
    return {
      connected: false,
      model: getOpenAIModel(),
      message: "OPENAI_API_KEY is not configured on the server."
    };
  }

  const startedAt = Date.now();
  try {
    const text = await callOpenAIText({
      prompt: "Return exactly: BootRise OpenAI connection ready.",
      maxOutputTokens: 40
    });

    return {
      connected: /bootrise openai connection ready/i.test(text) || text.length > 0,
      model: getOpenAIModel(),
      message: text,
      latencyMs: Date.now() - startedAt
    };
  } catch (error) {
    return {
      connected: false,
      model: getOpenAIModel(),
      message: error instanceof Error ? error.message : "OpenAI connection check failed.",
      latencyMs: Date.now() - startedAt
    };
  }
}

export async function createOpenAIChangePlan(
  request: string,
  repo: RepoIntelligenceSnapshot,
  fallbackPlan: ChangePlan
): Promise<OpenAIPlannerResult> {
  const prompt = buildPlannerPrompt(request, repo);
  const rawText = await callOpenAIText({
    prompt,
    maxOutputTokens: 1800
  });
  const parsed = parsePlannerJson(rawText);

  return {
    plan: mergePlannerJson(request, fallbackPlan, parsed),
    model: getOpenAIModel(),
    rawText
  };
}

export async function createOpenAIChatResponse({
  message,
  history,
  maxOutputTokens
}: {
  message: string;
  history: Array<{ role: "user" | "assistant"; content: string }>;
  maxOutputTokens?: number;
}): Promise<OpenAIChatResult> {
  const prompt = `You are BootRise's senior product-engineering operator inside the admin console.
BootRise is the AI coding control layer for large codebases — it scopes tasks, governs context, blocks unsafe patches, and verifies changes before PR.
It is NOT a generic business website builder.

Current live capabilities:
- Deterministic BootRise planner and admin chat fallback.
- GPT-5.5 server-side chat and planning when OPENAI_API_KEY is configured.
- Mission Control admin UI.
- Admin unit economics and production readiness panels.
- Infrastructure control-plane records.

Current not-yet-live capabilities:
- Claude provider adapter.
- Codex-specific provider adapter.
- GitHub OAuth and pull request creation.
- Real remote streaming runtime.
- Real billing, auth tenancy, and quota enforcement.

Response rules:
- Keep the answer under 220 words.
- Stay specific to BootRise.
- Do not describe BootRise as a generic business presence tool.
- Lead with the operator diagnosis.
- Include exactly three next actions.
- Mention blockers honestly.

Conversation:
${history.map((item) => `${item.role.toUpperCase()}: ${item.content}`).join("\n")}
USER: ${message}

Return a practical admin-facing response.`;

  return {
    model: getOpenAIModel(),
    text: await callOpenAIText({ prompt, maxOutputTokens: maxOutputTokens ?? 900 })
  };
}

async function callOpenAIText({ prompt, maxOutputTokens }: { prompt: string; maxOutputTokens: number }): Promise<string> {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }

  const controller = new AbortController();
  const timeoutMs = getLlmTimeoutMs();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  let response: Response;
  try {
    response = await fetch(OPENAI_RESPONSES_URL, {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: getOpenAIModel(),
        input: prompt,
        max_output_tokens: maxOutputTokens
      })
    });
  } catch (error) {
    if (controller.signal.aborted) {
      throw new Error(`ChatGPT timed out after ${Math.round(timeoutMs / 1000)}s. Try a narrower request or switch engines.`);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const message = data?.error?.message ?? `OpenAI request failed with status ${response.status}.`;
    throw new Error(message);
  }

  const outputText = extractOutputText(data);
  if (!outputText) {
    throw new Error("OpenAI returned no output text.");
  }

  return outputText.trim();
}

function getLlmTimeoutMs(): number {
  const value = Number(process.env.BOOTRISE_LLM_TIMEOUT_MS);
  return Number.isFinite(value) && value > 0 ? value : DEFAULT_TIMEOUT_MS;
}

function extractOutputText(data: unknown): string {
  if (!data || typeof data !== "object") return "";
  const shaped = data as {
    output_text?: string;
    output?: Array<{
      content?: Array<{
        type?: string;
        text?: string;
      }>;
    }>;
  };

  if (typeof shaped.output_text === "string") return shaped.output_text;

  return (
    shaped.output
      ?.flatMap((item) => item.content ?? [])
      .map((content) => content.text)
      .filter(Boolean)
      .join("\n") ?? ""
  );
}

function buildPlannerPrompt(request: string, repo: RepoIntelligenceSnapshot): string {
  const intent = classifyTaskIntent(request);
  const repoContext = {
    files: repo.files.slice(0, 80),
    symbols: repo.symbols.slice(0, 120),
    dependencies: repo.dependencies.slice(0, 120),
    architectureMemory: repo.architectureMemory
  };

  return `${BOOTRISE_SENIOR_ARCHITECT_CONTRACT}

You are BootRise's principal engineering planner.
Return only strict JSON. No markdown.
Task framing: ${intent.summary}
Create a safe, approval-gated software change plan for this user request:
${request}

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
  "steps": [
    {
      "title": "string",
      "domain": "frontend" | "backend" | "database" | "infra" | "tests",
      "summary": "string",
      "targetFiles": ["string"]
    }
  ],
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
    id: `plan_ai_${Date.now()}`,
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
            id: `step_ai_${index + 1}`,
            title: step.title?.trim() || `AI planned step ${index + 1}`,
            domain: isWorkerDomain(step.domain) ? step.domain : "tests",
            summary: step.summary?.trim() || "Execute a bounded step from the approved plan.",
            targetFiles: normalizeStrings(step.targetFiles, files),
            dependsOn: index === 0 ? [] : [`step_ai_${index}`]
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
