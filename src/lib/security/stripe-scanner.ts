import type { FileScanContext } from "@/lib/security/scan-context";
import { isDocumentationPath, isServerBackendPath } from "@/lib/security/scan-path-utils";

const WEBHOOK_VERIFY_PATTERNS =
  /constructEvent|construct_event|stripe\.webhooks\.construct|Webhook\.construct_event/i;

export function scanStripe({ files, add }: FileScanContext): void {
  for (const { path, content } of files) {
    if (isDocumentationPath(path)) continue;

    const mentionsWebhook = /stripe.*webhook|webhook.*stripe/i.test(content);
    if (!mentionsWebhook) continue;

    if (WEBHOOK_VERIFY_PATTERNS.test(content)) continue;

    const isHandler =
      isServerBackendPath(path) &&
      (/(^|\/)routes?\//i.test(path) || /webhooks?\.py$/i.test(path) || /@router\.(post|get).*webhook/i.test(content));

    if (!isHandler) continue;

    add({
      severity: "critical",
      category: "payment",
      file: path,
      title: "Stripe webhook without signature verification",
      whyItMatters: "Forged webhooks can grant access or credits.",
      recommendedFix: "Verify webhook signatures with Stripe SDK (Webhook.construct_event).",
      blocksDeployment: true,
      autoFixAvailable: false
    });
  }
}
