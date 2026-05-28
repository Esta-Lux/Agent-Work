import { createProviderChatResponse } from "@/lib/ai/llm-router";
import type { LlmProviderId } from "@/lib/ai/providers";
import type { SourceFileInput } from "@/lib/intelligence/repo-intelligence";
import type { ChangePlan } from "@/lib/types/core";
import type { ProposedPatch } from "@/lib/workspace/workspace-types";
import { buildContextPlan } from "@/lib/control/context-governor";
import { classifyTaskIntent } from "@/lib/ai/task-intent";
import { applyUnifiedDiffFromLlm, UNIFIED_DIFF_INSTRUCTIONS } from "@/lib/workspace/unified-diff";

const MAX_FILES_IN_PROMPT = 10;
const MAX_CHARS_PER_FILE = 6000;

export async function generateRealPatches(input: {
  provider: LlmProviderId;
  request: string;
  files: SourceFileInput[];
  plan: ChangePlan;
  orgId?: string;
  projectId?: string;
  repositoryId?: string;
}): Promise<{ patches: ProposedPatch[]; source: string }> {
  const targets = await selectTargetFiles(input.files, input.plan, input.request, {
    orgId: input.orgId,
    projectId: input.projectId ?? input.repositoryId,
    repositoryId: input.repositoryId
  });

  if (targets.length === 0) {
    return { patches: [], source: "no-targets" };
  }

  const llmPatches = await generatePatchesWithLlm(input.provider, input.request, input.plan, targets);
  if (llmPatches.length > 0) {
    return { patches: llmPatches, source: input.provider === "openai" ? "chatgpt" : "bootrise" };
  }

  throw new Error("Selected engine did not return an approved patch JSON payload.");
}

async function selectTargetFiles(
  files: SourceFileInput[],
  plan: ChangePlan,
  request: string,
  scope?: { orgId?: string; projectId?: string; repositoryId?: string }
): Promise<SourceFileInput[]> {
  const byPath = new Map(files.map((f) => [f.path, f]));
  const planned = plan.impact.files.filter((p) => byPath.has(p)).map((p) => byPath.get(p)!);

  const taskIntent = classifyTaskIntent(request);
  const contextPlan = await buildContextPlan(request, files, {
    orgId: scope?.orgId,
    projectId: scope?.projectId,
    repositoryId: scope?.repositoryId,
    taskIntent
  });
  const deepRead = contextPlan.deepRead
    .map((entry) => byPath.get(entry.path))
    .filter((f): f is SourceFileInput => Boolean(f));

  const merged = [...planned, ...deepRead];
  const unique = new Map(merged.map((f) => [f.path, f]));
  if (unique.size > 0) return [...unique.values()].slice(0, MAX_FILES_IN_PROMPT);

  const n = request.toLowerCase();
  const hints = ["main.py", "mapscreen", "turn", "route", "auth", "middleware", "readme"];
  const matched = files.filter((f) => hints.some((h) => f.path.toLowerCase().includes(h)));
  return (matched.length ? matched : files.filter((f) => /\.(ts|tsx|py|md)$/i.test(f.path))).slice(0, MAX_FILES_IN_PROMPT);
}

async function generatePatchesWithLlm(
  provider: LlmProviderId,
  request: string,
  plan: ChangePlan,
  targets: SourceFileInput[]
): Promise<ProposedPatch[]> {
  const fileBlocks = targets
    .map((f) => {
      const content = f.content.length > MAX_CHARS_PER_FILE ? `${f.content.slice(0, MAX_CHARS_PER_FILE)}\n…` : f.content;
      return `### ${f.path}\n\`\`\`\n${content}\n\`\`\``;
    })
    .join("\n\n");

  const prompt = [
    "You are BootRise. Produce REAL file edits for an approved change plan.",
    "",
    UNIFIED_DIFF_INSTRUCTIONS,
    "",
    "Additional rules:",
    "- Only edit paths listed below (context governor deep-read + plan targets).",
    `- Max ${Math.min(8, plan.impact.files.length || 8)} files in the diff.`,
    "- Do not invent new file paths or npm packages not in package.json.",
    "- Do not touch auth, billing, .env, or migrations unless explicitly in scope.",
    "",
    `User request: ${request}`,
    `Plan goal: ${plan.intent.interpretedGoal}`,
    `Target files: ${plan.impact.files.join(", ") || "see below"}`,
    "",
    "Current file contents (read-only reference for building the diff):",
    fileBlocks
  ].join("\n");

  const result = await createProviderChatResponse({
    provider,
    message: prompt,
    history: [],
    system: "Output a single fenced ```diff block. No JSON, no prose outside the diff.",
    maxOutputTokens: 16000
  });

  return parsePatchOutput(result.text, targets);
}

function parsePatchOutput(raw: string, targets: SourceFileInput[]): ProposedPatch[] {
  const byPath = new Map(targets.map((f) => [f.path, f.content]));
  const diffResult = applyUnifiedDiffFromLlm(raw, { files: byPath }, {
    defaultSummary: "Updated per approved plan"
  });
  if (diffResult.patches.length > 0) {
    return diffResult.patches.filter((p) => byPath.has(p.path));
  }

  // Legacy JSON fallback for older provider responses.
  const normalized = raw.trim().replace(/^```json\s*/i, "").replace(/```$/i, "");
  const start = normalized.indexOf("{");
  const end = normalized.lastIndexOf("}");
  if (start < 0 || end <= start) return [];

  let parsed: { patches?: Array<{ path?: string; after?: string; summary?: string }> };
  try {
    parsed = JSON.parse(normalized.slice(start, end + 1));
  } catch {
    return [];
  }

  const patches: ProposedPatch[] = [];
  for (const item of parsed.patches ?? []) {
    const path = item.path?.trim();
    if (!path || !byPath.has(path) || !item.after) continue;
    patches.push({
      path,
      before: byPath.get(path)!,
      after: item.after,
      summary: item.summary?.trim() || "Updated per approved plan",
      applied: false
    });
  }
  return patches;
}
