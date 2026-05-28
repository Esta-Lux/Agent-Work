import { appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { recordAudit } from "@/lib/admin/audit-log";
import type {
  AdminDetection,
  DetectionDraft,
  DetectionKind,
  DetectionSeverity,
  DetectionStatus
} from "@/lib/admin/detections/types";

function storePath(): string {
  return resolve(process.cwd(), ".bootrise", "admin", "detections.jsonl");
}

function ensureLog(): void {
  mkdirSync(join(storePath(), ".."), { recursive: true });
  if (!existsSync(storePath())) appendFileSync(storePath(), "", "utf8");
}

function generateId(): string {
  return `det_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function readRows(): AdminDetection[] {
  if (!existsSync(storePath())) return [];
  const raw = readFileSync(storePath(), "utf8").trim();
  if (!raw) return [];
  const rows: AdminDetection[] = [];
  for (const line of raw.split("\n").filter(Boolean)) {
    try {
      rows.push(JSON.parse(line) as AdminDetection);
    } catch {
      continue;
    }
  }
  return rows;
}

function materialize(rows: AdminDetection[]): AdminDetection[] {
  const byId = new Map<string, AdminDetection>();
  for (const row of rows) {
    byId.set(row.id, row);
  }
  return [...byId.values()];
}

export function recordDetection(draft: DetectionDraft, orgId?: string): AdminDetection {
  ensureLog();
  const detection: AdminDetection = {
    id: generateId(),
    detectedAt: new Date().toISOString(),
    status: "new",
    ...draft
  };
  appendFileSync(storePath(), `${JSON.stringify(detection)}\n`, "utf8");
  void recordAudit(
    {
      actor: "system",
      action: "admin_agent.detection_recorded",
      detail: `${detection.kind} · ${detection.severity}`,
      metadata: {
        kind: detection.kind,
        severity: detection.severity,
        source: detection.source,
        paths: (detection.affectedPaths ?? []).slice(0, 4).join(",")
      }
    },
    orgId
  );
  return detection;
}

export interface ListDetectionsOptions {
  kind?: DetectionKind;
  severity?: DetectionSeverity;
  status?: DetectionStatus;
  limit?: number;
}

export function listDetections(options?: ListDetectionsOptions): AdminDetection[] {
  const all = materialize(readRows());
  const filtered = all.filter((entry) => {
    if (options?.kind && entry.kind !== options.kind) return false;
    if (options?.severity && entry.severity !== options.severity) return false;
    if (options?.status && entry.status !== options.status) return false;
    return true;
  });
  filtered.sort((a, b) => b.detectedAt.localeCompare(a.detectedAt));
  return filtered.slice(0, options?.limit ?? 200);
}

export function findDetectionById(id: string): AdminDetection | undefined {
  return materialize(readRows()).find((entry) => entry.id === id);
}

export function updateDetectionStatus(
  id: string,
  status: DetectionStatus,
  actor: string,
  orgId?: string
): AdminDetection | undefined {
  const current = findDetectionById(id);
  if (!current) return undefined;
  const updated: AdminDetection = { ...current, status };
  ensureLog();
  appendFileSync(storePath(), `${JSON.stringify(updated)}\n`, "utf8");
  void recordAudit(
    {
      actor,
      action: "admin_agent.detection_acknowledged",
      detail: `${current.kind} → ${status}`,
      metadata: { detectionId: id, status }
    },
    orgId
  );
  return updated;
}
