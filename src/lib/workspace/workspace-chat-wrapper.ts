import type { GithubRepoInsight } from "@/lib/workspace/github-inspector";
import type { WorkspaceChatResult } from "@/lib/workspace/workspace-types";

const MAX_REPLY_CHARS = 1400;
const MAX_LLM_INSIGHT_CHARS = 320;

export function shouldEnhanceWithLlm(result: WorkspaceChatResult): boolean {
  if (result.triggerFix) return false;
  if (result.phase === "export") return false;
  if (result.reply.includes("BootRise helps you bootstrap")) return false;
  if (result.reply.includes("Analyzing your question against loaded source")) return false;
  if (result.reply.includes("## Answer")) return false;
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
    "You are BootRise. Add ONE short paragraph (max 3 sentences) of builder insight.",
    "Use ONLY the facts below. Do NOT invent file paths, features, or tech that are not listed.",
    "No markdown tables. No bullet lists longer than 3 items.",
    "",
    ...facts.filter(Boolean),
    "",
    `Base reply to extend (do not repeat verbatim): ${input.result.reply.slice(0, 500)}`
  ].join("\n");
}

export function mergeChatResponse(
  base: WorkspaceChatResult,
  llmInsight?: string | null,
  meta?: { provider?: string; model?: string }
): WorkspaceChatResult {
  const insight = sanitizeLlmInsight(llmInsight);
  let reply = base.reply;

  if (insight && shouldEnhanceWithLlm(base)) {
    reply = `${base.reply}\n\n**Insight** (${meta?.provider === "openai" ? "OpenAI" : "BootRise"})\n${insight}`;
  }

  reply = truncateReply(reply);

  const thinkingSteps = [...base.thinkingSteps];
  if (insight) {
    thinkingSteps.push({
      id: "llm",
      label: meta?.provider === "openai" ? "OpenAI polish" : "NVIDIA polish",
      status: "done",
      detail: meta?.model ?? "LLM"
    });
  }

  return { ...base, reply, thinkingSteps };
}

function sanitizeLlmInsight(raw?: string | null): string | null {
  if (!raw?.trim()) return null;
  let text = raw.trim();
  text = text.replace(/^#+\s*/gm, "");
  text = text.replace(/\|[^|\n]+\|/g, "");
  if (text.length > MAX_LLM_INSIGHT_CHARS) {
    text = `${text.slice(0, MAX_LLM_INSIGHT_CHARS).trim()}…`;
  }
  return text;
}

function truncateReply(reply: string): string {
  if (reply.length <= MAX_REPLY_CHARS) return reply;
  return `${reply.slice(0, MAX_REPLY_CHARS).trim()}\n\n…(truncated — run Fix and report or load repo files for full detail)`;
}
