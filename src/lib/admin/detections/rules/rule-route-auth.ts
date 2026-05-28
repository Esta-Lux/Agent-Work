import type { SourceFileInput } from "@/lib/intelligence/repo-intelligence";
import type { DetectionDraft } from "@/lib/admin/detections/types";

const ROUTE_REGEX = /^src\/app\/api\/workspace\/.+\/route\.tsx?$/;
const AUTH_NEEDLES = ["withTenantAuth", "withAdminAuth"];

export function ruleRouteAuth(input: { files: SourceFileInput[] }): DetectionDraft[] {
  const out: DetectionDraft[] = [];
  for (const file of input.files) {
    if (!ROUTE_REGEX.test(file.path)) continue;
    const hasAuth = AUTH_NEEDLES.some((needle) => file.content.includes(needle));
    if (hasAuth) continue;
    out.push({
      kind: "auth_missing",
      severity: "critical",
      title: `Workspace API route missing auth wrapper`,
      description: `${file.path} does not import withTenantAuth or withAdminAuth.`,
      affectedPaths: [file.path],
      evidence: { route: file.path },
      suggestedAction: "Wrap the handler with withTenantAuth and re-verify org scoping.",
      suggestedFixRequest: `Wrap ${file.path} with withTenantAuth so the route enforces tenant scoping.`,
      source: "scanner"
    });
  }
  return out;
}
