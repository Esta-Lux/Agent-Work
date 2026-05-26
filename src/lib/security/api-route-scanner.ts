import type { FileScanContext } from "@/lib/security/scan-context";

export function scanApiRoutes({ files, add }: FileScanContext): void {
  for (const { path, content } of files) {
    if (/app\/admin/i.test(path) && /page\.tsx$/.test(path) && !/requireAdmin|withAdminAuth/i.test(content)) {
      add({
        severity: "high",
        category: "auth",
        file: path,
        title: "Admin page without visible server guard",
        whyItMatters: "Public admin surfaces allow unauthorized control plane access.",
        recommendedFix: "Call requireAdmin() on the admin page and guard layout.",
        blocksDeployment: true,
        autoFixAvailable: false
      });
    }
    if (/export async function (GET|POST|PUT|DELETE)/.test(content) && path.includes("api/") && !/requireUser|withWorkspaceAuth|withAdminAuth|getServerUser/i.test(content)) {
      add({
        severity: "high",
        category: "api",
        file: path,
        title: "API route may lack authentication",
        whyItMatters: "Unauthenticated APIs expose data and expensive actions.",
        recommendedFix: "Wrap handler with withWorkspaceAuth or requireUser.",
        blocksDeployment: true,
        autoFixAvailable: false
      });
    }
    if (/createProviderChatResponse|generateRealPatches|runAppBuilder/i.test(content) && path.includes("api/") && !/assertCreditsAvailable|assertModelRouteAllowed|withWorkspaceAuth|requireUserForLegacyRoute/i.test(content)) {
      add({
        severity: "medium",
        category: "api",
        file: path,
        title: "Potentially unbounded AI endpoint",
        whyItMatters: "AI routes without credits/auth can cause cost and abuse.",
        recommendedFix: "Require auth and credit checks before model calls.",
        blocksDeployment: false,
        autoFixAvailable: false
      });
    }
  }
}
