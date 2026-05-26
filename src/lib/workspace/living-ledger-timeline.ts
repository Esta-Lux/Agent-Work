import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { DEFAULT_ORG_ID } from "@/lib/tenancy/org-context";
import { appendCloudLedgerEvent, isCloudLedgerReady, listCloudLedgerEvents } from "@/lib/tenancy/supabase-ledger";

export type LedgerEventKind =
  | "import"
  | "analyze"
  | "fix_proposed"
  | "fix_approved"
  | "fix_rejected"
  | "sandbox"
  | "preview"
  | "export"
  | "github_push"
  | "chat"
  | "stream"
  | "security_scan";

export interface LedgerEvent {
  id: string;
  projectId: string;
  kind: LedgerEventKind;
  title: string;
  narrative: string;
  metadata?: Record<string, string | number | boolean>;
  createdAt: string;
}

const ledgerRoot = resolve(process.cwd(), ".bootrise", "ledger");

function ledgerPath(projectId: string) {
  return join(ledgerRoot, projectId);
}

function appendLocal(projectId: string, event: Omit<LedgerEvent, "id" | "projectId" | "createdAt">): LedgerEvent {
  mkdirSync(ledgerRoot, { recursive: true });
  const path = ledgerPath(projectId);
  const existing: LedgerEvent[] = existsSync(path) ? JSON.parse(readFileSync(path, "utf8")) : [];

  const row: LedgerEvent = {
    id: `ledger_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    projectId,
    createdAt: new Date().toISOString(),
    ...event
  };

  const next = [row, ...existing].slice(0, 200);
  writeFileSync(path, JSON.stringify(next, null, 2), "utf8");
  return row;
}

export async function appendLedgerEvent(
  projectId: string,
  event: Omit<LedgerEvent, "id" | "projectId" | "createdAt">,
  orgId: string = DEFAULT_ORG_ID
): Promise<LedgerEvent> {
  const local = appendLocal(projectId, event);

  if (await isCloudLedgerReady()) {
    const cloud = await appendCloudLedgerEvent(orgId, projectId, event);
    if (cloud) return cloud;
  }

  return local;
}

export async function listLedgerEvents(
  projectId: string,
  limit = 40,
  orgId: string = DEFAULT_ORG_ID
): Promise<LedgerEvent[]> {
  if (await isCloudLedgerReady()) {
    const cloud = await listCloudLedgerEvents(orgId, projectId, limit);
    if (cloud.length > 0) return cloud;
  }

  const path = ledgerPath(projectId);
  if (!existsSync(path)) return [];
  try {
    const rows = JSON.parse(readFileSync(path, "utf8")) as LedgerEvent[];
    return rows.slice(0, limit);
  } catch {
    return [];
  }
}
