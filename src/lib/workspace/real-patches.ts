import { createProviderChatResponse } from "@/lib/ai/llm-router";
import type { LlmProviderId } from "@/lib/ai/providers";
import type { SourceFileInput } from "@/lib/intelligence/repo-intelligence";
import type { ChangePlan } from "@/lib/types/core";
import type { ProposedPatch } from "@/lib/workspace/workspace-types";

const MAX_FILES_IN_PROMPT = 10;
const MAX_CHARS_PER_FILE = 6000;

export async function generateRealPatches(input: {
  provider: LlmProviderId;
  request: string;
  files: SourceFileInput[];
  plan: ChangePlan;
}): Promise<{ patches: ProposedPatch[]; source: string }> {
  const targets = selectTargetFiles(input.files, input.plan, input.request);

  if (targets.length === 0) {
    return { patches: [], source: "no-targets" };
  }

  try {
    const llmPatches = await generatePatchesWithLlm(input.provider, input.request, input.plan, targets);
    if (llmPatches.length > 0) {
      return { patches: llmPatches, source: "llm" };
    }
  } catch {
    /* fallback below */
  }

  return { patches: deterministicFallbackPatches(input.request, targets), source: "deterministic-fallback" };
}

function selectTargetFiles(files: SourceFileInput[], plan: ChangePlan, request: string): SourceFileInput[] {
  const byPath = new Map(files.map((f) => [f.path, f]));
  const planned = plan.impact.files.filter((p) => byPath.has(p)).map((p) => byPath.get(p)!);

  if (planned.length > 0) return planned.slice(0, MAX_FILES_IN_PROMPT);

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
    "Return ONLY valid JSON (no markdown):",
    '{ "patches": [ { "path": "exact/path/from/input", "after": "complete new file content", "summary": "one line" } ] }',
    "Rules:",
    "- Only edit paths listed below.",
    "- `after` must be the FULL file content after the change.",
    "- Max 8 patches.",
    "- Do not invent new file paths.",
    "",
    `User request: ${request}`,
    `Plan goal: ${plan.intent.interpretedGoal}`,
    `Target files: ${plan.impact.files.join(", ") || "see below"}`,
    "",
    fileBlocks
  ].join("\n");

  const result = await createProviderChatResponse({
    provider,
    message: prompt,
    history: [],
    system: "Output strict JSON only."
  });

  return parsePatchJson(result.text, targets);
}

function parsePatchJson(raw: string, targets: SourceFileInput[]): ProposedPatch[] {
  const normalized = raw.trim().replace(/^```json\s*/i, "").replace(/```$/i, "");
  const start = normalized.indexOf("{");
  const end = normalized.lastIndexOf("}");
  if (start < 0 || end <= start) return [];

  const parsed = JSON.parse(normalized.slice(start, end + 1)) as {
    patches?: Array<{ path?: string; after?: string; summary?: string }>;
  };

  const byPath = new Map(targets.map((f) => [f.path, f.content]));
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

function deterministicFallbackPatches(request: string, targets: SourceFileInput[]): ProposedPatch[] {
  const primary = targets[0];
  if (!primary) return [];

  const banner = [
    "",
    "/* --- BootRise planned change (approve to apply via pipeline) ---",
    `   Request: ${request.replace(/\*\//g, "")}`,
    "   Replace this banner block with the real implementation.",
    "*/",
    ""
  ].join("\n");

  const after =
    primary.path.endsWith(".py") || primary.path.endsWith(".md")
      ? `${banner}${primary.content}`
      : `${banner}\n${primary.content}`;

  return [
    {
      path: primary.path,
      before: primary.content,
      after,
      summary: `Marked ${primary.path} for planned change (LLM unavailable — edit after approve).`,
      applied: false
    }
  ];
}
