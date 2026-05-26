import type { FileScanContext } from "@/lib/security/scan-context";

export function scanClientServerBoundary({ files, add }: FileScanContext): void {
  for (const { path, content } of files) {
    if (/createClient\([^)]*serviceRole|service_role/i.test(content) && /components|app\/(?!api)/.test(path)) {
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
