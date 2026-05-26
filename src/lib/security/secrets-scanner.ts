import type { FileScanContext } from "@/lib/security/scan-context";

export function scanSecrets({ files, add }: FileScanContext): void {
  for (const { path, content } of files) {
    if (/service[_-]?role|SUPABASE_SERVICE_ROLE|sk_live_|AKIA[0-9A-Z]{16}|api[_-]?key\s*=\s*['"][^'"]+['"]/i.test(content)) {
      add({
        severity: "critical",
        category: "secret",
        file: path,
        title: "Possible exposed secret",
        whyItMatters: "Secrets in source can leak via repos and client bundles.",
        evidence: content.slice(0, 120),
        recommendedFix: "Move to environment variables and rotate the key.",
        blocksDeployment: true,
        autoFixAvailable: false
      });
    }
  }
}
