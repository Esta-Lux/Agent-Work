import type { DiffPreview, GeneratedFile } from "@/lib/types/core";
import type { ProposedPatch } from "@/lib/workspace/workspace-types";

export function createDiffPreviewFromPatches(planId: string, patches: ProposedPatch[], riskNotes: string[]): DiffPreview {
  const files: GeneratedFile[] = patches.map((patch) => ({
    path: patch.path,
    before: patch.before,
    after: patch.after,
    language: inferLanguage(patch.path),
    summary: patch.summary
  }));

  return {
    planId,
    files,
    riskNotes
  };
}

function inferLanguage(path: string): string {
  if (/\.tsx?$/i.test(path)) return "typescript";
  if (/\.py$/i.test(path)) return "python";
  if (/\.md$/i.test(path)) return "markdown";
  if (/\.json$/i.test(path)) return "json";
  if (/\.css$/i.test(path)) return "css";
  if (/\.html?$/i.test(path)) return "html";
  return "text";
}
