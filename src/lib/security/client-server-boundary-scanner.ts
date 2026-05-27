import type { FileScanContext } from "@/lib/security/scan-context";
import { isClientBundlePath, containsLikelySecretValue } from "@/lib/security/scan-path-utils";

export function scanClientServerBoundary({ files, add }: FileScanContext): void {
  for (const { path, content } of files) {
    if (!isClientBundlePath(path)) continue;

    const usesServiceRole =
      /createClient\([^)]*service[_-]?role/i.test(content) ||
      (/service[_-]?role/i.test(content) && /supabase/i.test(content) && containsLikelySecretValue(content));

    if (usesServiceRole) {
      add({
        severity: "critical",
        category: "secret",
        file: path,
        title: "Service role key may be used in client code",
        whyItMatters: "Service role bypasses RLS and must never ship to browsers.",
        recommendedFix: "Use anon key + RLS on the client; service role only on server.",
        blocksDeployment: true,
        autoFixAvailable: false
      });
    }
  }
}
