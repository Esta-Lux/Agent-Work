import type { FileScanContext } from "@/lib/security/scan-context";

export function scanStripe({ files, add }: FileScanContext): void {
  for (const { path, content } of files) {
    if (/stripe.*webhook/i.test(content) && !/constructEvent|stripe\.webhooks/i.test(content)) {
      add({
        severity: "critical",
        category: "payment",
        file: path,
        title: "Stripe webhook without signature verification",
        whyItMatters: "Forged webhooks can grant access or credits.",
        recommendedFix: "Verify webhook signatures with Stripe SDK.",
        blocksDeployment: true,
        autoFixAvailable: false
      });
    }
  }
}
