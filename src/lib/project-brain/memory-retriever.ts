import type { ProjectBrainContext, ProjectBrainContextRequest } from "@/lib/project-brain/types";
import { createOrGetProjectBrain, listMemoryItems } from "@/lib/project-brain/project-brain-store";
import { listModules } from "@/lib/project-brain/module-indexer";
import { loadFileIndex } from "@/lib/project-brain/file-indexer";

export async function retrieveProjectBrainContext(input: {
  orgId: string;
  projectId: string;
  request?: ProjectBrainContextRequest;
}): Promise<ProjectBrainContext> {
  const brain = await createOrGetProjectBrain({
    orgId: input.orgId,
    projectId: input.projectId
  });
  const task = input.request?.taskText?.toLowerCase() ?? "";
  const maxItems = input.request?.maxItems ?? 12;
  let memoryItems = await listMemoryItems(input.orgId, input.projectId);
  memoryItems = memoryItems.filter((m) => m.status === "active");

  if (input.request?.types?.length) {
    memoryItems = memoryItems.filter((m) => input.request!.types!.includes(m.type));
  }

  if (task) {
    memoryItems = memoryItems
      .map((m) => ({
        item: m,
        score:
          (m.title.toLowerCase().includes(task) ? 2 : 0) +
          (m.content.toLowerCase().includes(task) ? 1 : 0) +
          m.confidence
      }))
      .sort((a, b) => b.score - a.score)
      .map((r) => r.item);
  }

  memoryItems = memoryItems.slice(0, maxItems);
  const modules = await listModules(input.orgId, input.projectId);
  const files = await loadFileIndex(input.orgId, input.projectId);
  const fileHints = task
    ? files.filter((f) => f.path.toLowerCase().includes(task) || (f.summary?.toLowerCase().includes(task) ?? false)).slice(0, 8)
    : files.filter((f) => f.riskLevel !== "normal").slice(0, 8);

  const rules = memoryItems.filter((m) => m.type === "rule").map((m) => m.content);
  const decisions = memoryItems.filter((m) => m.type === "decision").map((m) => `${m.title}: ${m.content}`);

  return {
    brain,
    memoryItems,
    modules,
    rules,
    decisions,
    fileHints,
    summary: `Brain: ${memoryItems.length} memory items, ${modules.length} modules, ${files.length} indexed files.`
  };
}
