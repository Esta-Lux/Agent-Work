import { buildRepoIntelligenceSnapshot, type SourceFileInput } from "@/lib/intelligence/repo-intelligence";
import { createRepoHealthSummary, type RepoHealthSummary } from "@/lib/reporting/repo-health";

export function analyzeWorkspaceFiles(files: SourceFileInput[]): {
  fileCount: number;
  sourceFileCount: number;
  health: RepoHealthSummary;
} {
  const repo = buildRepoIntelligenceSnapshot(files);
  const health = createRepoHealthSummary(repo);
  const sourceFileCount = repo.files.filter((f) => f.role === "source").length;

  return {
    fileCount: files.length,
    sourceFileCount,
    health
  };
}
