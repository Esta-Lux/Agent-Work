import type { FileScanContext } from "@/lib/security/scan-context";

export function scanSupabaseRls({ files, add }: FileScanContext): void {
  for (const { path, content } of files) {
    if (!/\.sql$/i.test(path) || !/create table/i.test(content)) continue;
    if (!/enable row level security|alter table.*enable row level security/i.test(content)) {
      add({
        severity: "medium",
        category: "database",
        file: path,
        title: "Table migration without visible RLS",
        whyItMatters: "Tables without RLS may expose rows across tenants.",
        recommendedFix: "Enable RLS and add org-scoped policies.",
        blocksDeployment: false,
        autoFixAvailable: false
      });
    }
    if (/using\s*\(\s*true\s*\)|with check\s*\(\s*true\s*\)/i.test(content)) {
      add({
        severity: "high",
        category: "database",
        file: path,
        title: "Overly permissive RLS policy",
        whyItMatters: "Policies that always pass do not isolate tenants.",
        recommendedFix: "Scope policies to bootrise_user_org_ids() or org_id.",
        blocksDeployment: true,
        autoFixAvailable: false
      });
    }
  }
}
