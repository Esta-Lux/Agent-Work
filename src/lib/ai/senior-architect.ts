import type { SourceFileInput } from "@/lib/intelligence/repo-intelligence";
import type { ContextPlan } from "@/lib/control/types";
import type { ContextDepth, TaskIntent } from "@/lib/ai/task-intent";

/** Injected into every governed model call — BootRise is the supervisor, not a freestyle coder. */
export const BOOTRISE_SENIOR_ARCHITECT_CONTRACT = `You are the senior product architect for this codebase, operating inside BootRise's control layer.

Before suggesting code:
1. State what you understood (user goal, affected flows, data ownership).
2. Name tradeoffs (scope, risk, what NOT to change).
3. Only reference files and symbols that appear in the provided context — never invent paths.
4. Prefer the smallest change that completes the user story; split large work into phases.
5. Flag when auth, billing, database, or deployment need explicit human approval.

You do not apply patches yourself; you produce plans, reviews, and scoped recommendations BootRise can verify.

Output style (unless a downstream instruction explicitly asks for JSON or a unified diff):
- Reply in clear, plain English. Short paragraphs and simple labelled lines.
- Do NOT use Markdown formatting: no **bold**, no #/##/### headers, no * or - bullet glyphs, no backtick fences around prose.
- When you need a list, write each item on its own line prefixed with "• " (a bullet character and a space).
- When you need a section label, write it as a plain line like "Architectural read:" or "Suggested next steps:" — no asterisks, no hashes.
- Inline code or symbol names may appear as plain text (e.g. src/app/page.tsx, useState) without backticks.`;

export function buildSeniorArchitectBrief(input: {
  request: string;
  taskIntent: TaskIntent;
  productName?: string;
  brainRules?: string[];
  moduleNames?: string[];
  decisions?: string[];
  scopeLockMessage?: string;
}): string {
  const lines = [
    BOOTRISE_SENIOR_ARCHITECT_CONTRACT,
    "",
    `Task classification: ${input.taskIntent.summary}`,
    input.productName ? `Product: ${input.productName}` : null,
    input.scopeLockMessage ? `Scope lock: ${input.scopeLockMessage}` : null,
    input.moduleNames?.length ? `Relevant modules: ${input.moduleNames.slice(0, 6).join(", ")}` : null,
    input.brainRules?.length ? `Project Brain rules:\n${input.brainRules.slice(0, 6).map((r) => `- ${r}`).join("\n")}` : null,
    input.decisions?.length ? `Prior decisions:\n${input.decisions.slice(0, 4).map((d) => `- ${d}`).join("\n")}` : null,
    "",
    `User request: ${input.request.slice(0, 500)}`
  ];
  return lines.filter(Boolean).join("\n");
}

const DEPTH_BUDGETS: Record<
  ContextDepth,
  { maxCharsPerFile: number; totalBudget: number; maxDeepFiles: number }
> = {
  light: { maxCharsPerFile: 2_500, totalBudget: 36_000, maxDeepFiles: 28 },
  standard: { maxCharsPerFile: 3_500, totalBudget: 56_000, maxDeepFiles: 64 },
  deep: { maxCharsPerFile: 4_500, totalBudget: 88_000, maxDeepFiles: 120 }
};

/** Token-efficient excerpts: only deep-read paths, capped per depth tier. */
export function buildEfficientModelContext(
  files: SourceFileInput[],
  contextPlan: ContextPlan,
  depth: ContextDepth = "standard"
): { block: string; filesIncluded: number; charsUsed: number } {
  const budget = DEPTH_BUDGETS[depth];
  const byPath = new Map(files.map((f) => [f.path, f]));
  const ordered = contextPlan.deepRead.map((e) => e.path).slice(0, budget.maxDeepFiles);

  const parts: string[] = [];
  let total = 0;
  let filesIncluded = 0;

  for (const path of ordered) {
    const file = byPath.get(path);
    if (!file) continue;
    const chunk =
      file.content.length > budget.maxCharsPerFile
        ? `${file.content.slice(0, budget.maxCharsPerFile)}\n…(truncated)`
        : file.content;
    const block = `### ${path}\n\`\`\`\n${chunk}\n\`\`\``;
    if (total + block.length > budget.totalBudget) break;
    parts.push(block);
    total += block.length;
    filesIncluded += 1;
  }

  const indexLines = contextPlan.reference
    .slice(0, 40)
    .map((r) => `- ${r.path} (reference only)`);
  if (indexLines.length && total + indexLines.join("\n").length < budget.totalBudget) {
    parts.push(`### Reference paths (not fully loaded)\n${indexLines.join("\n")}`);
  }

  return { block: parts.join("\n\n"), filesIncluded, charsUsed: total };
}

export function getContextDepthBudget(depth: ContextDepth) {
  return DEPTH_BUDGETS[depth];
}
