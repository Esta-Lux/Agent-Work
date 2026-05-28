import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import {
  SELF_REPOSITORY_ID,
  getSelfRepoRoot,
  loadSelfRepoSnapshot
} from "@/lib/admin/self-repo";
import { analyzeTypeScriptAst } from "@/lib/intelligence/ast-analyzer";
import { buildSymbolGraph } from "@/lib/intelligence/symbol-graph";
import { buildRepoGraph } from "@/lib/intelligence/repo-graph";
import { recordAudit } from "@/lib/admin/audit-log";
import type { AuditEntry } from "@/lib/admin/audit-log";

export interface CodebaseRouteEntry {
  path: string;
  methods: string[];
  handlerFile: string;
}

export interface CodebaseEditEntry {
  path: string;
  touchedAt: string;
}

export interface CodebasePriorPlan {
  id: string;
  title: string;
  createdAt: string;
  status: string;
}

export interface CodebaseMemorySnapshot {
  generatedAt: string;
  repositoryId: string;
  fileCount: number;
  symbolCount: number;
  topHubs: string[];
  routeMap: CodebaseRouteEntry[];
  recentEdits: CodebaseEditEntry[];
  priorPlans: CodebasePriorPlan[];
}

const HTTP_METHODS = new Set(["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"]);
const ROUTE_FILE_REGEX = /^src\/app\/api\/.+\/route\.tsx?$/;
const DEFAULT_TTL_MS = 600_000;
const RECENT_EDIT_LIMIT = 50;
const PRIOR_PLAN_LIMIT = 12;

function memoryPath(): string {
  return resolve(process.cwd(), ".bootrise", "admin", "codebase-memory.json");
}

function auditLogPath(): string {
  return resolve(process.cwd(), ".bootrise", "admin", "audit.jsonl");
}

function getTtlMs(): number {
  const raw = process.env.BOOTRISE_ADMIN_MEMORY_TTL_MS;
  const parsed = raw ? Number(raw) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_TTL_MS;
}

function ensureCacheDir(): void {
  mkdirSync(join(memoryPath(), ".."), { recursive: true });
}

function routePathFromFile(filePath: string): string {
  const trimmed = filePath.replace(/^src\/app\/api\//, "").replace(/\/route\.tsx?$/, "");
  return `/api/${trimmed}`;
}

function buildRouteMap(files: ReturnType<typeof loadSelfRepoSnapshot>): CodebaseRouteEntry[] {
  const entries: CodebaseRouteEntry[] = [];
  for (const file of files) {
    if (!ROUTE_FILE_REGEX.test(file.path)) continue;
    const analysis = analyzeTypeScriptAst(file.path, file.content);
    const methods = analysis.symbols
      .filter((sym) => sym.exported && HTTP_METHODS.has(sym.name))
      .map((sym) => sym.name);
    if (methods.length === 0) continue;
    entries.push({ path: routePathFromFile(file.path), methods, handlerFile: file.path });
  }
  return entries.sort((a, b) => a.path.localeCompare(b.path));
}

export function recentlyEditedFiles(limit: number = RECENT_EDIT_LIMIT): CodebaseEditEntry[] {
  const root = getSelfRepoRoot();
  const files = loadSelfRepoSnapshot();
  const stamped: CodebaseEditEntry[] = [];
  for (const file of files) {
    try {
      const stat = statSync(join(root, file.path));
      stamped.push({ path: file.path, touchedAt: stat.mtime.toISOString() });
    } catch {
      continue;
    }
  }
  return stamped.sort((a, b) => b.touchedAt.localeCompare(a.touchedAt)).slice(0, limit);
}

function loadPriorPlans(): CodebasePriorPlan[] {
  const path = auditLogPath();
  if (!existsSync(path)) return [];
  let raw: string;
  try {
    raw = readFileSync(path, "utf8");
  } catch {
    return [];
  }
  const wanted = new Set(["admin_agent.plan", "admin_agent.fix"]);
  const rows: CodebasePriorPlan[] = [];
  for (const line of raw.split("\n").filter(Boolean).reverse()) {
    if (rows.length >= PRIOR_PLAN_LIMIT) break;
    try {
      const entry = JSON.parse(line) as AuditEntry;
      if (!wanted.has(entry.action)) continue;
      rows.push({
        id: entry.id,
        title: entry.detail.slice(0, 120),
        createdAt: entry.createdAt,
        status: entry.action === "admin_agent.fix" ? "fix" : "plan"
      });
    } catch {
      continue;
    }
  }
  return rows;
}

function buildSnapshot(): CodebaseMemorySnapshot {
  const files = loadSelfRepoSnapshot();
  const symbolGraph = buildSymbolGraph(SELF_REPOSITORY_ID, files);
  const repoGraph = buildRepoGraph(SELF_REPOSITORY_ID, files);
  return {
    generatedAt: new Date().toISOString(),
    repositoryId: SELF_REPOSITORY_ID,
    fileCount: files.length,
    symbolCount: symbolGraph.symbols.length,
    topHubs: repoGraph.hubFiles.slice(0, 12),
    routeMap: buildRouteMap(files),
    recentEdits: recentlyEditedFiles(),
    priorPlans: loadPriorPlans()
  };
}

function readCachedSnapshot(): CodebaseMemorySnapshot | null {
  const path = memoryPath();
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, "utf8")) as CodebaseMemorySnapshot;
  } catch {
    return null;
  }
}

function writeSnapshot(snapshot: CodebaseMemorySnapshot): void {
  ensureCacheDir();
  writeFileSync(memoryPath(), JSON.stringify(snapshot, null, 2), "utf8");
}

function isFresh(snapshot: CodebaseMemorySnapshot): boolean {
  const ts = Date.parse(snapshot.generatedAt);
  if (!Number.isFinite(ts)) return false;
  return Date.now() - ts < getTtlMs();
}

export async function loadCodebaseMemory(opts?: { refresh?: boolean }): Promise<CodebaseMemorySnapshot> {
  if (!opts?.refresh) {
    const cached = readCachedSnapshot();
    if (cached && isFresh(cached)) return cached;
  }
  return refreshCodebaseMemory();
}

export async function refreshCodebaseMemory(): Promise<CodebaseMemorySnapshot> {
  const snapshot = buildSnapshot();
  writeSnapshot(snapshot);
  void recordAudit({
    actor: "system",
    action: "admin_agent.memory_refresh",
    detail: `Rebuilt codebase memory · ${snapshot.fileCount} files · ${snapshot.symbolCount} symbols`,
    metadata: {
      fileCount: snapshot.fileCount,
      symbolCount: snapshot.symbolCount,
      routeCount: snapshot.routeMap.length
    }
  });
  return snapshot;
}

export function summarizeForPrompt(snapshot: CodebaseMemorySnapshot): string {
  const hubLine = snapshot.topHubs.length
    ? `Hub files: ${snapshot.topHubs.slice(0, 6).join(", ")}`
    : "Hub files: (none indexed)";
  const routeLine = snapshot.routeMap.length
    ? `Routes (${snapshot.routeMap.length}): ${snapshot.routeMap.slice(0, 6).map((r) => `${r.methods.join("/")} ${r.path}`).join(" · ")}`
    : "Routes: (none discovered)";
  const editLine = snapshot.recentEdits.length
    ? `Recent edits: ${snapshot.recentEdits.slice(0, 6).map((e) => e.path).join(", ")}`
    : "Recent edits: (none)";
  return [
    `Codebase memory @ ${snapshot.generatedAt} · ${snapshot.fileCount} files · ${snapshot.symbolCount} symbols`,
    hubLine,
    routeLine,
    editLine
  ].join("\n");
}
