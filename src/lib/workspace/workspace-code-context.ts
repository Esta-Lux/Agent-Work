export type { LoadedFileSnippet, RepoArea, ReviewBatchPlan, RepoPathIndex } from "@/lib/workspace/file-ranking";
export {
  classifyRepoPath,
  isTestPath,
  selectRelevantFiles,
  selectReviewBatches,
  buildRepoPathIndex,
  formatRepoPathIndex,
  isBroadReviewMessage,
  isHudReviewMessage
} from "@/lib/workspace/file-ranking";

import type { LoadedFileSnippet } from "@/lib/workspace/file-ranking";

export function isProductCodeReviewQuestion(message: string): boolean {
  const n = message.toLowerCase();
  if (n.includes("what can you do") || n.includes("export bundle")) return false;
  return (
    n.includes("review") ||
    n.includes("issue") ||
    n.includes("problem") ||
    n.includes("bug") ||
    n.includes("audit") ||
    n.includes("list all") ||
    n.includes("turn card") ||
    n.includes("hud") ||
    n.includes("navigat") ||
    n.includes("snaproad") ||
    n.includes("what is") ||
    n.includes("what's wrong") ||
    n.includes("how does") ||
    n.includes("ux") ||
    n.includes("driver") ||
    n.includes("map screen") ||
    n.includes("gap") ||
    n.includes("risk")
  );
}

export function formatFilesThinkingDetail(files: LoadedFileSnippet[]): string {
  const unique = [...new Set(files.map((f) => f.path))];
  if (unique.length === 0) return "No files matched";
  const head = unique.slice(0, 10);
  const extra = unique.length - head.length;
  return `${unique.length} file(s): ${head.join(", ")}${extra > 0 ? ` (+${extra} more)` : ""}`;
}

export function buildCodeContextBlock(
  files: LoadedFileSnippet[],
  options: number | { maxCharsPerFile?: number; totalBudget?: number } = 8000
): string {
  const maxCharsPerFile = typeof options === "number" ? options : (options.maxCharsPerFile ?? 8000);
  const totalBudget = typeof options === "number" ? 64_000 : (options.totalBudget ?? 64_000);

  const parts: string[] = [];
  let total = 0;

  for (const file of files) {
    const chunk =
      file.content.length > maxCharsPerFile ? `${file.content.slice(0, maxCharsPerFile)}\n…(truncated)` : file.content;
    const block = `### ${file.path}\n\`\`\`\n${chunk}\n\`\`\``;
    if (total + block.length > totalBudget) break;
    parts.push(block);
    total += block.length;
  }

  return parts.join("\n\n");
}

export { buildCodeReviewSystemPrompt } from "@/lib/ai/bootrise-voice";
