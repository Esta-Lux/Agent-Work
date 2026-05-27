export type TaskIntentKind =
  | "explain"
  | "review"
  | "fix"
  | "architecture"
  | "deep_dive"
  | "security"
  | "general";

export type ContextDepth = "light" | "standard" | "deep";

export interface TaskIntent {
  kind: TaskIntentKind;
  depth: ContextDepth;
  /** Senior architect framing — ask product tradeoffs, not just code dumps */
  seniorArchitectMode: boolean;
  /** Prefer multi-pass / wider file selection */
  preferMultiPass: boolean;
  summary: string;
  suggestedMode: "fast" | "deep" | "security" | "premium";
}

import { isRepoOverviewQuestion } from "@/lib/workspace/repo-overview";

export function classifyTaskIntent(request: string, options?: { mode?: string }): TaskIntent {
  const n = request.toLowerCase().trim();
  const mode = options?.mode?.toLowerCase();

  if (isRepoOverviewQuestion(request)) {
    return {
      kind: "explain",
      depth: "deep",
      seniorArchitectMode: true,
      preferMultiPass: false,
      summary: "Task: repo overview · Context depth: deep · Senior architect mode: product + system tradeoffs before code",
      suggestedMode: "fast"
    };
  }

  let kind: TaskIntentKind = "general";
  if (/\b(review|audit|list all|issues?|risks?|gaps?|whole codebase|entire (repo|codebase))\b/.test(n)) {
    kind = "review";
  } else if (/\b(architect|architecture|system design|tradeoff|should we|better approach|split into|prd|product)\b/.test(n)) {
    kind = "architecture";
  } else if (/\b(deep dive|deep-dive|root cause|investigate|trace|blast radius|end-to-end|cross.?cutting)\b/.test(n)) {
    kind = "deep_dive";
  } else if (/\b(fix|bug|broken|error|patch|implement|add|change|refactor|wire|connect)\b/.test(n)) {
    kind = "fix";
  } else if (/\b(security|auth|rls|secret|vulnerability|deploy|production)\b/.test(n)) {
    kind = "security";
  } else if (/\b(how does|what is|explain|why does|where is)\b/.test(n)) {
    kind = "explain";
  }

  if (mode === "security" || kind === "security") kind = "security";
  if (mode === "deep" && kind === "general") kind = "deep_dive";

  const seniorArchitectMode =
    kind === "architecture" ||
    kind === "deep_dive" ||
    kind === "security" ||
    (kind === "review" && n.length > 60) ||
    mode === "deep";

  const preferMultiPass =
    seniorArchitectMode ||
    kind === "review" ||
    /\b(entire|whole|all modules|monorepo|backend and mobile|frontend and backend)\b/.test(n);

  let depth: ContextDepth = "standard";
  if (kind === "explain" && n.length < 80) depth = "light";
  else if (seniorArchitectMode || preferMultiPass) depth = "deep";

  const suggestedMode: TaskIntent["suggestedMode"] =
    kind === "security"
      ? "security"
      : depth === "deep"
        ? "deep"
        : kind === "fix" && /\b(auth|billing|payment|database|migration)\b/.test(n)
          ? "security"
          : "fast";

  const summary = [
    `Task: ${kind.replace(/_/g, " ")}`,
    `Context depth: ${depth}`,
    seniorArchitectMode ? "Senior architect mode: product + system tradeoffs before code" : null,
    preferMultiPass ? "Wide repo scan: multi-pass file selection when corpus is large" : null
  ]
    .filter(Boolean)
    .join(" · ");

  return { kind, depth, seniorArchitectMode, preferMultiPass, summary, suggestedMode };
}
