import type { BootrisePersonaId } from "@/lib/ai/bootrise-voice";
import { buildCodeReviewSystemPrompt } from "@/lib/ai/bootrise-voice";
import { createProviderChatResponse } from "@/lib/ai/llm-router";
import type { LlmProviderId } from "@/lib/ai/providers";
import {
  buildRepoPathIndex,
  formatRepoPathIndex,
  selectReviewBatches,
  type LoadedFileSnippet
} from "@/lib/workspace/file-ranking";
import { getReviewConfig, reviewCoverageSummary } from "@/lib/workspace/review-config";
import { buildCodeContextBlock, formatFilesThinkingDetail } from "@/lib/workspace/workspace-code-context";

const BATCH_SYSTEM = `You are a BootRise batch code reviewer. Analyze ONLY the file excerpts in this batch.

Output PLAIN TEXT ONLY with this exact structure:

FINDINGS:
(Numbered list. Each item MUST cite an exact file path from this batch. Max 10 items. Focus on bugs, risks, gaps, HUD/navigation UX issues, coupling, and missing error handling. Skip generic advice.)

If nothing significant in this batch, write: FINDINGS: (none significant in this batch)`;

export interface MultiPassReviewResult {
  reply: string;
  model: string;
  deepReadFiles: LoadedFileSnippet[];
  batchCount: number;
  thinkingSteps: Array<{ id: string; label: string; status: "done"; detail?: string }>;
  coverageSummary: string;
}

export async function runMultiPassCodeReview(input: {
  message: string;
  files: LoadedFileSnippet[];
  productName?: string;
  provider: LlmProviderId;
  persona: BootrisePersonaId;
  rulesBlock?: string;
}): Promise<MultiPassReviewResult> {
  const config = getReviewConfig();
  const plan = selectReviewBatches(input.message, input.files, config.batchSize, config.maxBatches);

  if (plan.batches.length === 0) {
    throw new Error("No reviewable source files matched your question.");
  }

  const deepReadPaths = new Set<string>();
  const batchFindings: string[] = [];
  const thinkingSteps: MultiPassReviewResult["thinkingSteps"] = [
    {
      id: "intent",
      label: "Understand request",
      status: "done",
      detail: input.message.slice(0, 72)
    },
    {
      id: "plan",
      label: "Plan multi-pass review",
      status: "done",
      detail: `${plan.batches.length} batches · up to ${plan.deepReadCap} files · ${input.files.length} in corpus`
    }
  ];

  let lastModel = "";

  for (let i = 0; i < plan.batches.length; i++) {
    const batch = plan.batches[i];
    for (const file of batch) deepReadPaths.add(file.path);

    const contextBlock = buildCodeContextBlock(batch, {
      maxCharsPerFile: config.charsPerFile,
      totalBudget: config.batchCharBudget
    });

    const batchPrompt = [
      `User question (for context): ${input.message}`,
      `Batch ${i + 1} of ${plan.batches.length} — ${batch.length} files:`,
      contextBlock || "(empty batch)",
      "",
      "List FINDINGS for this batch only."
    ].join("\n");

    const result = await createProviderChatResponse({
      provider: input.provider,
      message: batchPrompt,
      history: [],
      system: BATCH_SYSTEM
    });

    lastModel = result.model;
    batchFindings.push(`--- Batch ${i + 1}/${plan.batches.length} (${batch.length} files) ---\n${result.text.trim()}`);

    thinkingSteps.push({
      id: `batch-${i + 1}`,
      label: `Review batch ${i + 1}/${plan.batches.length}`,
      status: "done",
      detail: formatFilesThinkingDetail(batch)
    });
  }

  const deepReadFiles = input.files.filter((f) => deepReadPaths.has(f.path));
  const pathIndex = buildRepoPathIndex(input.files, deepReadPaths);
  const synthesisSystem = buildCodeReviewSystemPrompt(input.productName, input.persona) + (input.rulesBlock ?? "");

  const synthesisPrompt = [
    `User question: ${input.message}`,
    "",
    formatRepoPathIndex(pathIndex),
    "",
    `Batch findings from ${plan.batches.length} passes covering ${deepReadFiles.length} files:`,
    batchFindings.join("\n\n"),
    "",
    "Synthesize ONE cohesive answer. Merge duplicate themes. Prioritize cross-cutting risks.",
    "Use PLAIN TEXT section labels: ARCHITECTURAL READ, ANSWER, PLAIN ENGLISH, SUGGESTED NEXT STEPS.",
    "Cite file paths from the batch findings. Note any major areas only indexed path-only if relevant."
  ].join("\n");

  const synthesis = await createProviderChatResponse({
    provider: input.provider,
    message: synthesisPrompt,
    history: [],
    system: synthesisSystem
  });

  lastModel = synthesis.model;
  thinkingSteps.push({
    id: "synthesis",
    label: "Synthesize findings",
    status: "done",
    detail: `${deepReadFiles.length} files → final answer`
  });
  thinkingSteps.push({
    id: "llm",
    label: input.provider === "openai" ? "OpenAI code review" : "NVIDIA code review",
    status: "done",
    detail: lastModel
  });

  return {
    reply: synthesis.text,
    model: lastModel,
    deepReadFiles,
    batchCount: plan.batches.length,
    thinkingSteps,
    coverageSummary: reviewCoverageSummary(deepReadFiles.length, input.files.length, plan.batches.length)
  };
}
