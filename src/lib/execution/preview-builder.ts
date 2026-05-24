import type { ChangePlan, PreviewProject } from "@/lib/types/core";
import { createDiffPreview } from "@/lib/execution/diff-preview";

export function buildPreviewProject(plan: ChangePlan): PreviewProject {
  const diff = createDiffPreview(plan);
  const html = diff.files.find((file) => file.path.endsWith("index.html"))?.after ?? "";
  const css = diff.files.find((file) => file.path.endsWith("styles.css"))?.after ?? "";
  const stitchedHtml = html.replace('<link rel="stylesheet" href="./styles.css" />', `<style>${css}</style>`);

  return {
    id: `preview_${plan.id}`,
    name: plan.intent.request,
    description: plan.intent.interpretedGoal,
    files: diff.files,
    html: stitchedHtml,
    createdAt: new Date().toISOString()
  };
}

