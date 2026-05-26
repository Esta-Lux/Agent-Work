import type { RuntimeEvent } from "@/lib/runtime/runtime-events";
import { retrieveProjectBrainContext } from "@/lib/project-brain/memory-retriever";

export interface RuntimeFixSuggestion {
  summary: string;
  likelyFiles: string[];
  suggestedRequest: string;
  requiresApproval: true;
}

export async function suggestRuntimeFix(input: {
  orgId: string;
  projectId: string;
  event: RuntimeEvent;
}): Promise<RuntimeFixSuggestion> {
  const brain = await retrieveProjectBrainContext({
    orgId: input.orgId,
    projectId: input.projectId,
    request: { taskText: input.event.message, maxItems: 4 }
  });

  const files =
    input.event.likelyFiles.length > 0
      ? input.event.likelyFiles
      : brain.fileHints.map((f) => f.path).slice(0, 3);

  return {
    summary: `Runtime error (×${input.event.count}): ${input.event.message.slice(0, 160)}`,
    likelyFiles: files,
    suggestedRequest: `Fix runtime error without changing unrelated files: ${input.event.message.slice(0, 200)}. Focus on: ${files.join(", ") || "stack trace paths"}.`,
    requiresApproval: true
  };
}
