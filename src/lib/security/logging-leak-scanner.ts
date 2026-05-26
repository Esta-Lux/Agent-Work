import type { FileScanContext } from "@/lib/security/scan-context";

export function scanLoggingLeaks({ files, add }: FileScanContext): void {
  for (const { path, content } of files) {
    if (/stack|error\.message|err\.stack/i.test(content) && /NextResponse\.json|res\.json/i.test(content)) {
      add({
        severity: "medium",
        category: "logging",
        file: path,
        title: "Raw error may leak to client",
        whyItMatters: "Stack traces reveal internals to attackers.",
        recommendedFix: "Return safe error messages; log details server-side only.",
        blocksDeployment: false,
        autoFixAvailable: false
      });
    }
  }
}
