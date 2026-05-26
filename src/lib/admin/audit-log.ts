import { appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { DEFAULT_ORG_ID } from "@/lib/tenancy/org-context";
import { isCloudAuditReady, listCloudAudit, recordCloudAudit } from "@/lib/tenancy/supabase-audit";

export interface AuditEntry {
  id: string;
  actor: string;
  action: string;
  detail: string;
  metadata?: Record<string, string | number | boolean>;
  createdAt: string;
}

const logPath = resolve(process.cwd(), ".bootrise", "admin", "audit.jsonl");

function ensureLog() {
  mkdirSync(join(logPath, ".."), { recursive: true });
  if (!existsSync(logPath)) appendFileSync(logPath, "", "utf8");
}

function appendLocal(entry: Omit<AuditEntry, "id" | "createdAt">): AuditEntry {
  ensureLog();
  const row: AuditEntry = {
    id: `audit_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    createdAt: new Date().toISOString(),
    ...entry
  };
  appendFileSync(logPath, `${JSON.stringify(row)}\n`, "utf8");
  return row;
}

export async function recordAudit(
  entry: Omit<AuditEntry, "id" | "createdAt">,
  orgId: string = DEFAULT_ORG_ID
): Promise<AuditEntry> {
  const local = appendLocal(entry);

  if (await isCloudAuditReady()) {
    const cloud = await recordCloudAudit(orgId, entry);
    if (cloud) return cloud;
  }

  return local;
}

export async function listAuditEntries(limit = 50, orgId: string = DEFAULT_ORG_ID): Promise<AuditEntry[]> {
  if (await isCloudAuditReady()) {
    const cloud = await listCloudAudit(orgId, limit);
    if (cloud.length > 0) return cloud;
  }

  ensureLog();
  const raw = readFileSync(logPath, "utf8").trim();
  if (!raw) return [];
  return raw
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line) as AuditEntry)
    .reverse()
    .slice(0, limit);
}
