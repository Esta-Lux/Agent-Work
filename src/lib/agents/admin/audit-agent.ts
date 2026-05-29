import { listAuditEntries } from "@/lib/admin/audit-log";

export async function runAuditAgent(input?: { limit?: number; orgId?: string }) {
  return listAuditEntries(input?.limit, input?.orgId);
}
