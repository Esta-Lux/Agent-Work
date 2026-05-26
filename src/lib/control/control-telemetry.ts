import { appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { recordAudit } from "@/lib/admin/audit-log";
import type { ControlTelemetrySnapshot } from "@/lib/control/types";

export interface ControlEvent {
  action: string;
  detail: string;
  repositoryId?: string;
  severity?: string;
  metadata?: Record<string, string | number | boolean>;
  createdAt: string;
}

const logPath = resolve(process.cwd(), ".bootrise", "admin", "control-events.jsonl");

function ensureLog() {
  mkdirSync(join(logPath, ".."), { recursive: true });
  if (!existsSync(logPath)) appendFileSync(logPath, "", "utf8");
}

export async function recordControlEvent(
  input: Omit<ControlEvent, "createdAt"> & { createdAt?: string }
): Promise<void> {
  const row: ControlEvent = {
    createdAt: input.createdAt ?? new Date().toISOString(),
    action: input.action,
    detail: input.detail,
    repositoryId: input.repositoryId,
    severity: input.severity,
    metadata: input.metadata
  };

  ensureLog();
  appendFileSync(logPath, `${JSON.stringify(row)}\n`, "utf8");

  void recordAudit({
    actor: "control-layer",
    action: input.action,
    detail: input.detail.slice(0, 200),
    metadata: {
      repositoryId: input.repositoryId ?? "",
      severity: input.severity ?? "info",
      ...(input.metadata ?? {})
    }
  });
}

export function loadControlEvents(limit = 200): ControlEvent[] {
  ensureLog();
  const raw = readFileSync(logPath, "utf8").trim();
  if (!raw) return [];
  return raw
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line) as ControlEvent)
    .reverse()
    .slice(0, limit);
}

export function buildControlTelemetrySnapshot(): ControlTelemetrySnapshot {
  const events = loadControlEvents(500);
  const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
  const recent = events.filter((e) => new Date(e.createdAt).getTime() >= dayAgo);

  const blocks = recent.filter((e) => e.action.includes("block") || e.severity === "block");
  const approvals = recent.filter((e) => e.action === "fix_approved");
  const rejections = recent.filter((e) => e.action === "fix_rejected");

  const deepReads = recent
    .map((e) => (typeof e.metadata?.deepRead === "number" ? e.metadata.deepRead : 0))
    .filter((n) => n > 0);
  const tokens = recent
    .map((e) => (typeof e.metadata?.estimatedTokens === "number" ? e.metadata.estimatedTokens : 0))
    .filter((n) => n > 0);

  return {
    generatedAt: new Date().toISOString(),
    blocksLast24h: blocks.length,
    approvalsLast24h: approvals.length,
    rejectionsLast24h: rejections.length,
    patchBlocksLast24h: recent.filter((e) => e.action === "patch_blocked").length,
    avgFilesDeepRead: deepReads.length ? Math.round(deepReads.reduce((a, b) => a + b, 0) / deepReads.length) : 0,
    avgTokenEstimate: tokens.length ? Math.round(tokens.reduce((a, b) => a + b, 0) / tokens.length) : 0,
    recentEvents: events.slice(0, 15).map((e) => ({
      action: e.action,
      detail: e.detail,
      severity: e.severity,
      createdAt: e.createdAt
    }))
  };
}
