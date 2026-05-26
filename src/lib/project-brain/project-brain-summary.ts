import type { ProjectBrainSummary } from "@/lib/project-brain/types";
import { getProjectBrain, listMemoryItems } from "@/lib/project-brain/project-brain-store";
import { listModules } from "@/lib/project-brain/module-indexer";
import { loadFileIndex } from "@/lib/project-brain/file-indexer";

export async function buildProjectBrainSummary(orgId: string, projectId: string): Promise<ProjectBrainSummary | null> {
  const brain = await getProjectBrain(orgId, projectId);
  if (!brain) return null;

  const memory = await listMemoryItems(orgId, projectId);
  const modules = await listModules(orgId, projectId);
  const files = await loadFileIndex(orgId, projectId);
  const active = memory.filter((m) => m.status === "active");
  const staleCount = memory.filter((m) => m.status === "stale").length;
  const avgConfidence =
    active.length > 0 ? active.reduce((sum, m) => sum + m.confidence, 0) / active.length : 0;

  return {
    brain,
    memoryCount: memory.length,
    staleCount,
    moduleCount: modules.length,
    fileCount: files.length,
    avgConfidence,
    recentLearning: memory.slice(0, 6)
  };
}
