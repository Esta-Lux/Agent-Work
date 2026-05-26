import type { SourceFileInput } from "@/lib/intelligence/repo-intelligence";
import {
  classifyRepoPath,
  isTestPath,
  selectRelevantFiles,
  selectReviewBatches
} from "@/lib/workspace/file-ranking";
import { getReviewConfig, shouldUseMultiPassReview } from "@/lib/workspace/review-config";
import { buildInjectedContextRules } from "@/lib/control/context-rules";
import type { ContextPlan, ContextFileEntry } from "@/lib/control/types";

const CHARS_PER_TOKEN = 4;

export async function buildContextPlan(
  request: string,
  files: SourceFileInput[],
  options?: { projectId?: string; repositoryId?: string }
): Promise<ContextPlan> {
  const config = getReviewConfig();
  const useMulti = shouldUseMultiPassReview(files.length, request, config);

  let deepPaths = new Set<string>();
  const referencePaths = new Set<string>();

  if (useMulti) {
    const plan = selectReviewBatches(request, files, config.batchSize, config.maxBatches);
    for (const batch of plan.batches) {
      for (const file of batch) deepPaths.add(file.path);
    }
  } else {
    for (const file of selectRelevantFiles(request, files, config.singleMaxFiles)) {
      deepPaths.add(file.path);
    }
  }

  const ranked = selectRelevantFiles(request, files, Math.min(80, files.length));
  for (const file of ranked) {
    if (!deepPaths.has(file.path)) referencePaths.add(file.path);
  }

  const rules = await buildInjectedContextRules({
    files,
    projectId: options?.projectId ?? options?.repositoryId
  });

  const excluded: ContextFileEntry[] = [];
  const deepRead: ContextFileEntry[] = [];
  const reference: ContextFileEntry[] = [];
  let estimatedChars = rules.charEstimate;

  for (const file of files) {
    if (deepPaths.has(file.path)) {
      deepRead.push({
        path: file.path,
        mode: "deep_read",
        reason: "Task-relevant — full excerpt sent to model"
      });
      estimatedChars += Math.min(file.content.length, config.charsPerFile);
      continue;
    }
    if (referencePaths.has(file.path)) {
      reference.push({
        path: file.path,
        mode: "reference",
        reason: "Dependency / module context — path indexed, light or no excerpt"
      });
      estimatedChars += 400;
      continue;
    }
    const area = classifyRepoPath(file.path);
    excluded.push({
      path: file.path,
      mode: "excluded",
      reason: isTestPath(file.path)
        ? "Test asset — excluded unless you asked for test audit"
        : `Outside scope (${area}) — saves tokens`
    });
  }

  const estimatedTokens = Math.round(estimatedChars / CHARS_PER_TOKEN);
  const confidence = deepRead.length >= 3 ? 0.85 : deepRead.length >= 1 ? 0.65 : 0.4;

  const injectedRules = [
    ...rules.projectRules.map((r) => r.path),
    ...(rules.ledgerDecisions.length > 0 ? ["living-ledger"] : [])
  ];

  const summary = [
    `Context used: ${deepRead.length + reference.length} of ${files.length} files in corpus.`,
    `Deep read: ${deepRead.length} · Reference: ${reference.length} · Excluded: ${excluded.length}.`,
    rules.projectRules.length > 0 ? `Injected ${rules.projectRules.length} rules file(s).` : null,
    rules.ledgerDecisions.length > 0 ? `Injected ${rules.ledgerDecisions.length} ledger decision(s).` : null,
    `Token estimate: ~${(estimatedTokens / 1000).toFixed(1)}k · Confidence: ${Math.round(confidence * 100)}%.`,
    useMulti ? "Multi-pass review enabled for large repo." : "Single-pass context selection."
  ]
    .filter(Boolean)
    .join(" ");

  return {
    totalFilesInCorpus: files.length,
    deepRead,
    reference,
    excluded,
    injectedRules,
    estimatedChars,
    estimatedTokens,
    confidence,
    summary
  };
}

export function buildRulesPromptBlock(rulesBlock: string): string {
  if (!rulesBlock.trim()) return "";
  return `\n\n${rulesBlock}\n`;
}
