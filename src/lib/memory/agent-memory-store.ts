import { appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

export interface AgentMemoryRecord {
  projectId: string;
  key: string;
  value: string;
  updatedAt: string;
}

const STORE_ROOT = resolve(process.cwd(), ".bootrise", "workspace");
const STORE_FILE = join(STORE_ROOT, "agent-memory.jsonl");
const cache = new Map<string, AgentMemoryRecord>();
let loaded = false;

function ensureLoaded(): void {
  if (loaded) return;
  mkdirSync(STORE_ROOT, { recursive: true });
  if (!existsSync(STORE_FILE)) appendFileSync(STORE_FILE, "", "utf8");
  const raw = readFileSync(STORE_FILE, "utf8").trim();
  if (raw) {
    for (const line of raw.split("\n")) {
      if (!line.trim()) continue;
      try {
        const entry = JSON.parse(line) as AgentMemoryRecord;
        cache.set(`${entry.projectId}:${entry.key}`, entry);
      } catch {
        continue;
      }
    }
  }
  loaded = true;
}

export function upsertAgentMemory(input: {
  projectId: string;
  key: string;
  value: string;
}): AgentMemoryRecord {
  ensureLoaded();
  const record: AgentMemoryRecord = {
    projectId: input.projectId,
    key: input.key,
    value: input.value,
    updatedAt: new Date().toISOString()
  };
  cache.set(`${record.projectId}:${record.key}`, record);
  appendFileSync(STORE_FILE, `${JSON.stringify(record)}\n`, "utf8");
  return record;
}

export function listAgentMemory(projectId: string): AgentMemoryRecord[] {
  ensureLoaded();
  return [...cache.values()].filter((item) => item.projectId === projectId);
}
