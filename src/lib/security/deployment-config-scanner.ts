import type { FileScanContext } from "@/lib/security/scan-context";

export function scanDeploymentConfig({ files, add }: FileScanContext): void {
  for (const { path, content } of files) {
    if (/Access-Control-Allow-Origin.*\*|cors.*origin.*\*/i.test(content) && /api|next\.config/i.test(path)) {
      add({
        severity: "high",
        category: "deployment",
        file: path,
        title: "CORS wildcard on sensitive surface",
        whyItMatters: "Any origin can call sensitive APIs from browsers.",
        recommendedFix: "Restrict CORS to known app origins.",
        blocksDeployment: true,
        autoFixAvailable: false
      });
    }
    if (/BOOTRISE_DEV_AUTH_BYPASS\s*=\s*1/i.test(content) && !/NODE_ENV.*production|never in production/i.test(content)) {
      add({
        severity: "critical",
        category: "deployment",
        file: path,
        title: "Dev auth bypass without production guard",
        whyItMatters: "Auth bypass in production exposes all tenant data.",
        recommendedFix: "Gate bypass on NODE_ENV !== production only.",
        blocksDeployment: true,
        autoFixAvailable: false
      });
    }
  }
}
