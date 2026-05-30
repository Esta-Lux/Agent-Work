import { appendFileSync, existsSync, mkdirSync } from "node:fs";
import { join, resolve } from "node:path";

export interface AgentEventLogEntry {
  projectId: string;
  event: string;
  detail?: string;
  timestamp: string;
}

const STORE_ROOT = resolve(process.cwd(), ".bootrise", "workspace");
const STORE_FILE = join(STORE_ROOT, "agent-events.jsonl");

export function appendAgentEventLog(input: {
  projectId: string;
  event: string;
  detail?: string;
}): AgentEventLogEntry {
  mkdirSync(STORE_ROOT, { recursive: true });
  if (!existsSync(STORE_FILE)) appendFileSync(STORE_FILE, "", "utf8");
  const entry: AgentEventLogEntry = {
    projectId: input.projectId,
    event: input.event,
    detail: input.detail,
    timestamp: new Date().toISOString()
  };
  appendFileSync(STORE_FILE, `${JSON.stringify(entry)}\n`, "utf8");
  return entry;
}
