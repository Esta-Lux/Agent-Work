import { BOOTRISE_INSIGHT_SYSTEM, sanitizeUserFacingText } from "@/lib/ai/bootrise-voice";
import type { GithubRepoInsight } from "@/lib/workspace/github-inspector";
import type { WorkspaceChatResult } from "@/lib/workspace/workspace-types";

const MAX_REPLY_CHARS = 1800;
const MAX_LLM_INSIGHT_CHARS = 900;

export function shouldEnhanceWithLlm(result: WorkspaceChatResult): boolean {
  if (result.triggerFix) return false;
  if (result.phase === "export") return false;
  if (result.reply.includes("BootRise helps you bootstrap")) return false;
  if (result.reply.includes("Analyzing your question against loaded source")) return false;
  if (result.reply.includes("## Architectural read")) return false;
  if (result.reply.startsWith("GitHub review:")) return false;
  return result.phase === "planning" || result.phase === "building" || result.phase === "review";
}

export function buildLlmEnhancementPrompt(input: {
  message: string;
  result: WorkspaceChatResult;
  githubReview?: GithubRepoInsight;
}): string {
  const facts: string[] = [
    `User question: ${input.message}`,
    `Phase: ${input.result.phase}`,
    `Files loaded: ${input.result.fileActivity.length}`,
    `Suggested actions: ${input.result.suggestedActions.join(", ")}`
  ];

  if (input.githubReview && !input.githubReview.fetchError) {
    facts.push(
      `GitHub FACTS ONLY — ${input.githubReview.owner}/${input.githubReview.repo}`,
      `Description: ${input.githubReview.description ?? "none"}`,
      `Branch: ${input.githubReview.defaultBranch}`,
      `Stack: ${input.githubReview.stackHints.join(", ") || "unknown"}`,
      `Top-level: ${input.githubReview.topLevelEntries.join(", ")}`,
      input.githubReview.readmeExcerpt ? `README excerpt: ${input.githubReview.readmeExcerpt.slice(0, 400)}` : ""
    );
  }

  return [
    BOOTRISE_INSIGHT_SYSTEM,
    "Write the final answer for the user's current action. Do not give a generic feature list.",
    "Mention what BootRise is doing now, where the likely mismatch or risk is, and the next safe action.",
    "Keep it concise: 2-5 short paragraphs or up to 4 bullets. No markdown tables.",
    "",
    ...facts.filter(Boolean),
    "",
    `Base reply (extend, do not repeat verbatim): ${input.result.reply.slice(0, 500)}`
  ].join("\n");
}

export function mergeChatResponse(
  base: WorkspaceChatResult,
  llmInsight?: string | null,
  meta?: { provider?: string; model?: string }
): WorkspaceChatResult {
  const insight = sanitizeLlmInsight(llmInsight);
  let reply = base.reply;

  if (insight) {
    reply = `${base.reply}\n\n${insight}`;
  }

  reply = sanitizeUserFacingText(truncateReply(reply), MAX_REPLY_CHARS);

  const thinkingSteps = [...base.thinkingSteps];
  if (insight) {
    thinkingSteps.push({
      id: "llm",
      label: meta?.provider === "openai" ? "ChatGPT response" : "BootRise response",
      status: "done",
      detail: meta?.provider === "openai" ? "ChatGPT" : "BootRise"
    });
  }

  return { ...base, reply, thinkingSteps };
}

function sanitizeLlmInsight(raw?: string | null): string | null {
  if (!raw?.trim()) return null;
  let text = sanitizeUserFacingText(raw.trim(), MAX_LLM_INSIGHT_CHARS);
  text = text.replace(/^#+\s*/gm, "");
  text = text.replace(/\|[^|\n]+\|/g, "");
  return text;
}

function truncateReply(reply: string): string {
  if (reply.length <= MAX_REPLY_CHARS) return reply;
  return `${reply.slice(0, MAX_REPLY_CHARS).trim()}\n\n…(truncated — import more files or run Fix and report for full architectural detail)`;
}
