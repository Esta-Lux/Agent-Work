import type { FileScanContext } from "@/lib/security/scan-context";

export function scanAuthz({ files, add }: FileScanContext): void {
  for (const { path, content } of files) {
    if (/x-bootrise-user-id|x-bootrise-org-id/.test(content) && !/hints only|do not trust|deprecated/i.test(content)) {
      add({
        severity: "high",
        category: "authorization",
        file: path,
        title: "Client-controlled org/user headers",
        whyItMatters: "Attackers can spoof tenant headers without session verification.",
        recommendedFix: "Derive org and user from Supabase session only.",
        blocksDeployment: true,
        autoFixAvailable: false
      });
    }
    if (/body\.(user_?id|org_?id)|req\.body\.userId/i.test(content) && path.includes("api/")) {
      add({
        severity: "high",
        category: "authorization",
        file: path,
        title: "Client-supplied user_id or org_id in API body",
        whyItMatters: "Tenant identity must come from the session, not the request body.",
        recommendedFix: "Use ctx.user.id and ctx.orgId from withWorkspaceAuth.",
        blocksDeployment: true,
        autoFixAvailable: false
      });
    }
  }
}
