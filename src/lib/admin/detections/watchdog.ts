import { existsSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { getKillSwitches } from "@/lib/admin/kill-switches";
import { recordAudit, listAuditEntries } from "@/lib/admin/audit-log";
import { listRuntimeEvents } from "@/lib/runtime/runtime-events";
import { listUsageEvents } from "@/lib/usage/usage-store";
import { recordDetection } from "@/lib/admin/detections/store";
import type { AdminDetection, DetectionDraft } from "@/lib/admin/detections/types";

interface WatchdogState {
  running: boolean;
  timer: ReturnType<typeof setInterval> | null;
  lastTickAt: string | null;
  lastDetections: number;
}

const state: WatchdogState = { running: false, timer: null, lastTickAt: null, lastDetections: 0 };

const RECENT_WINDOW_MS = 10 * 60 * 1000;
const CLUSTER_THRESHOLD = 3;
const FAILURE_SPIKE_THRESHOLD = 3;
const REJECT_WINDOW_MS = 30 * 60 * 1000;
const REJECT_THRESHOLD = 2;

function intervalMs(): number {
  const raw = process.env.BOOTRISE_ADMIN_WATCHDOG_INTERVAL_MS;
  const parsed = raw ? Number(raw) : NaN;
  return Number.isFinite(parsed) && parsed >= 1000 ? parsed : 60_000;
}

function activeProjectIds(): string[] {
  const dir = resolve(process.cwd(), ".bootrise", "runtime");
  if (!existsSync(dir)) return [];
  try {
    return readdirSync(dir)
      .filter((name) => name.endsWith(".json"))
      .map((name) => name.replace(/\.json$/, ""));
  } catch {
    return [];
  }
}

async function tickRuntimeClusters(): Promise<DetectionDraft[]> {
  const drafts: DetectionDraft[] = [];
  for (const projectId of activeProjectIds()) {
    const events = listRuntimeEvents(projectId).slice(0, 50);
    for (const event of events) {
      if (event.count < CLUSTER_THRESHOLD) continue;
      const lastMs = Date.parse(event.lastSeen);
      if (!Number.isFinite(lastMs) || Date.now() - lastMs > RECENT_WINDOW_MS) continue;
      drafts.push({
        kind: "runtime_failure_cluster",
        severity: "warning",
        title: `Runtime failure cluster in ${projectId}`,
        description: `Error "${event.normalizedKey.slice(0, 120)}" repeated ${event.count}× in last 10m.`,
        affectedPaths: event.likelyFiles?.slice(0, 4),
        evidence: { projectId, key: event.normalizedKey.slice(0, 240), count: event.count, lastSeen: event.lastSeen },
        suggestedAction: "Trace the offending handler and stabilise the error.",
        suggestedFixRequest: `Investigate runtime errors clustered under "${event.normalizedKey.slice(0, 120)}" in project ${projectId}.`,
        source: "watchdog"
      });
    }
  }
  return drafts;
}

async function tickUsageFailures(): Promise<DetectionDraft[]> {
  const events = await listUsageEvents({ limit: 100 });
  const cutoff = Date.now() - RECENT_WINDOW_MS;
  const recent = events.filter((event) => Date.parse(event.createdAt) >= cutoff && event.status === "failed");
  if (recent.length < FAILURE_SPIKE_THRESHOLD) return [];
  return [
    {
      kind: "usage_failure_spike",
      severity: "warning",
      title: `Usage failure spike`,
      description: `${recent.length} usage events with status=failed in the last 10 minutes.`,
      evidence: { failureCount: recent.length, sinceMin: 10 },
      suggestedAction: "Inspect provider health and recent model routing changes.",
      suggestedFixRequest: `Investigate usage failure spike: ${recent.length} failed events in 10 minutes.`,
      source: "watchdog"
    }
  ];
}

async function tickPendingFixFailures(): Promise<DetectionDraft[]> {
  const entries = await listAuditEntries(50);
  const cutoff = Date.now() - REJECT_WINDOW_MS;
  const matched = entries.filter((entry) => {
    if (Date.parse(entry.createdAt) < cutoff) return false;
    if (entry.action === "admin_agent.reject") return true;
    return /^admin_agent\.[a-z_]*_failed$/.test(entry.action);
  });
  if (matched.length < REJECT_THRESHOLD) return [];
  return [
    {
      kind: "pending_fix_failure",
      severity: "info",
      title: `Pending-fix failures clustering`,
      description: `${matched.length} fix failures or rejections in the last 30 minutes.`,
      evidence: { count: matched.length, sinceMin: 30 },
      suggestedAction: "Review the failing requests to identify a common cause.",
      source: "watchdog"
    }
  ];
}

export async function runWatchdogTickOnce(): Promise<{ emitted: number; detections: AdminDetection[] }> {
  if (getKillSwitches().disableDetectionsWatchdog) {
    return { emitted: 0, detections: [] };
  }
  const drafts = [
    ...(await tickRuntimeClusters()),
    ...(await tickUsageFailures()),
    ...(await tickPendingFixFailures())
  ];
  const detections: AdminDetection[] = [];
  for (const draft of drafts) detections.push(recordDetection(draft));
  state.lastTickAt = new Date().toISOString();
  state.lastDetections = detections.length;
  void recordAudit({
    actor: "system",
    action: "admin_agent.watchdog_tick",
    detail: `Watchdog tick · ${detections.length} emitted`,
    metadata: { emitted: detections.length }
  });
  return { emitted: detections.length, detections };
}

export function getWatchdogStatus(): { running: boolean; lastTickAt: string | null; lastDetections: number } {
  return { running: state.running, lastTickAt: state.lastTickAt, lastDetections: state.lastDetections };
}

export function startDetectionsWatchdog(opts?: { intervalMs?: number }): { stop(): void } {
  if (state.running) return { stop: stopDetectionsWatchdog };
  const ms = opts?.intervalMs ?? intervalMs();
  state.running = true;
  state.timer = setInterval(() => {
    void runWatchdogTickOnce();
  }, ms);
  if (state.timer && typeof (state.timer as { unref?: () => void }).unref === "function") {
    (state.timer as { unref: () => void }).unref();
  }
  void recordAudit({ actor: "system", action: "admin_agent.watchdog_start", detail: `interval=${ms}ms` });
  if (typeof process !== "undefined") {
    process.on("beforeExit", () => stopDetectionsWatchdog());
  }
  return { stop: stopDetectionsWatchdog };
}

export function stopDetectionsWatchdog(): void {
  if (!state.running) return;
  if (state.timer) clearInterval(state.timer);
  state.timer = null;
  state.running = false;
  void recordAudit({ actor: "system", action: "admin_agent.watchdog_stop", detail: "stop" });
}

export function startWatchdogOnBoot(): void {
  if (state.running) return;
  if (getKillSwitches().disableDetectionsWatchdog) return;
  startDetectionsWatchdog();
}
