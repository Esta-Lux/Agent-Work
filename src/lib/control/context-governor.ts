import type { SourceFileInput } from "@/lib/intelligence/repo-intelligence";
import {
  classifyRepoPath,
  isTestPath,
  selectRelevantFiles,
  selectReviewBatches
} from "@/lib/workspace/file-ranking";
import { getReviewConfig, shouldUseMultiPassReview } from "@/lib/workspace/review-config";
import { classifyTaskIntent, type TaskIntent } from "@/lib/ai/task-intent";
import { getContextDepthBudget } from "@/lib/ai/senior-architect";
import { buildInjectedContextRules } from "@/lib/control/context-rules";
import type { ContextPlan, ContextFileEntry } from "@/lib/control/types";
import { buildRepoGraph, expandPathsWithRepoGraph } from "@/lib/intelligence/repo-graph";

const CHARS_PER_TOKEN = 4;
const graphCache = new Map<string, ReturnType<typeof buildRepoGraph>>();

export async function buildContextPlan(
  request: string,
  files: SourceFileInput[],
  options?: {
    projectId?: string;
    repositoryId?: string;
    orgId?: string;
    taskIntent?: TaskIntent;
    mode?: string;
  }
): Promise<ContextPlan> {
  const config = getReviewConfig();
  let taskIntent = options?.taskIntent ?? classifyTaskIntent(request, { mode: options?.mode });
  const depthBudget = getContextDepthBudget(taskIntent.depth);
  const useMulti =
    taskIntent.preferMultiPass && shouldUseMultiPassReview(files.length, request, config);

  let deepPaths = new Set<string>();
  const referencePaths = new Set<string>();

  if (useMulti) {
    const plan = selectReviewBatches(request, files, config.batchSize, config.maxBatches);
    for (const batch of plan.batches) {
      for (const file of batch) deepPaths.add(file.path);
    }
  } else {
    const maxDeep = Math.min(depthBudget.maxDeepFiles, config.singleMaxFiles);
    for (const file of selectRelevantFiles(request, files, maxDeep)) {
      deepPaths.add(file.path);
    }
  }

  const ranked = selectRelevantFiles(request, files, Math.min(80, files.length));
  for (const file of ranked) {
    if (!deepPaths.has(file.path)) referencePaths.add(file.path);
  }

  let repoGraphSummary: string | undefined;
  const repoId = options?.repositoryId ?? options?.projectId;
  if (repoId && files.length >= 24 && deepPaths.size > 0) {
    const cacheKey = `${repoId}:${files.length}`;
    let graph = graphCache.get(cacheKey);
    if (!graph) {
      graph = buildRepoGraph(repoId, files);
      graphCache.set(cacheKey, graph);
    }
    repoGraphSummary = graph.summary;
    const allPathSet = new Set(files.map((f) => f.path));
    for (const extra of expandPathsWithRepoGraph(deepPaths, graph, allPathSet, 12)) {
      if (!deepPaths.has(extra)) referencePaths.add(extra);
    }
    if (graph.hubFiles.length) {
      const hubNote = `Graph hubs: ${graph.hubFiles.slice(0, 3).join(", ")}`;
      if (!taskIntent.summary.includes("Graph hubs")) {
        taskIntent = { ...taskIntent, summary: `${taskIntent.summary} · ${hubNote}` };
      }
    }
  }

  const rules = await buildInjectedContextRules({
    files,
    projectId: options?.projectId ?? options?.repositoryId
  });

  if (options?.orgId && options?.projectId) {
    try {
      const { retrieveProjectBrainContext } = await import("@/lib/project-brain/memory-retriever");
      const brain = await retrieveProjectBrainContext({
        orgId: options.orgId,
        projectId: options.projectId,
        request: { taskText: request, maxItems: 8 }
      });
      if (brain.rules.length) {
        const brainBlock = `## Project Brain rules\n${brain.rules.join("\n")}`;
        rules.combinedBlock = `${brainBlock}\n\n${rules.combinedBlock}`.trim();
        rules.charEstimate += brainBlock.length;
      }
      for (const path of brain.fileHints.map((f) => f.path)) {
        deepPaths.add(path);
      }
    } catch {
      /* brain optional */
    }
  }

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
      continue;
    }
    if (referencePaths.has(file.path)) {
      reference.push({
        path: file.path,
        mode: "reference",
        reason: "Dependency / module context — path indexed, light or no excerpt"
      });
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

  const referenceCharEstimate = reference.length * 400;
  const cappedDeepEstimate = Math.min(
    deepRead.reduce((sum, entry) => {
      const file = files.find((f) => f.path === entry.path);
      return sum + Math.min(file?.content.length ?? 0, depthBudget.maxCharsPerFile);
    }, 0),
    depthBudget.totalBudget
  );
  estimatedChars = rules.charEstimate + cappedDeepEstimate + referenceCharEstimate;

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
    taskIntent.seniorArchitectMode ? "Senior architect mode: tradeoffs and scope before code." : null,
    useMulti ? "Multi-pass selection for large repo." : `Depth tier: ${taskIntent.depth}.`
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
    summary,
    repoGraphSummary
  };
}

export function buildRulesPromptBlock(rulesBlock: string): string {
  if (!rulesBlock.trim()) return "";
  return `\n\n${rulesBlock}\n`;
}
