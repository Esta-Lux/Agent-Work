import { listMemoryItems, upsertMemoryItem } from "@/lib/project-brain/project-brain-store";

export async function markStaleMemoryForChangedFiles(input: {
  orgId: string;
  projectId: string;
  changedPaths: string[];
}) {
  const items = await listMemoryItems(input.orgId, input.projectId);
  const changed = new Set(input.changedPaths);

  for (const item of items) {
    const touched = item.relatedPaths.some((p) => changed.has(p) || input.changedPaths.some((c) => c.startsWith(p)));
    if (!touched) continue;
    await upsertMemoryItem({
      ...item,
      status: "stale",
      updatedAt: new Date().toISOString()
    });
  }
}
