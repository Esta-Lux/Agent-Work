import { appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import type { SelfAgentPatchValidation } from "@/lib/agents/admin/self-agent-control-bridge";
import type { ProposedPatch } from "@/lib/workspace/workspace-types";

export interface SelfAgentPreviewRecord {
  missionId: string;
  branchName: string;
  patches: ProposedPatch[];
  blockers: string[];
  warnings: string[];
  validations: SelfAgentPatchValidation[];
  qaPassed: boolean;
  createdAt: string;
  updatedAt: string;
}

const STORE_ROOT = resolve(process.cwd(), ".bootrise", "admin", "self-agent");
const STORE_FILE = join(STORE_ROOT, "preview.jsonl");
const cache = new Map<string, SelfAgentPreviewRecord>();
let initialized = false;

function ensureStore(): void {
  mkdirSync(STORE_ROOT, { recursive: true });
  if (!existsSync(STORE_FILE)) appendFileSync(STORE_FILE, "", "utf8");
}

function initCache(): void {
  if (initialized) return;
  ensureStore();
  const raw = readFileSync(STORE_FILE, "utf8").trim();
  if (raw) {
    for (const line of raw.split("\n")) {
      if (!line.trim()) continue;
      try {
        const row = JSON.parse(line) as SelfAgentPreviewRecord;
        cache.set(row.missionId, row);
      } catch {
        continue;
      }
    }
  }
  initialized = true;
}

function appendRow(row: SelfAgentPreviewRecord): void {
  ensureStore();
  appendFileSync(STORE_FILE, `${JSON.stringify(row)}\n`, "utf8");
}

export function saveSelfAgentPreview(input: {
  missionId: string;
  branchName: string;
  patches: ProposedPatch[];
  blockers: string[];
  warnings: string[];
  validations: SelfAgentPatchValidation[];
  qaPassed: boolean;
}): SelfAgentPreviewRecord {
  initCache();
  const now = new Date().toISOString();
  const record: SelfAgentPreviewRecord = {
    missionId: input.missionId,
    branchName: input.branchName,
    patches: input.patches,
    blockers: input.blockers,
    warnings: input.warnings,
    validations: input.validations,
    qaPassed: input.qaPassed,
    createdAt: cache.get(input.missionId)?.createdAt ?? now,
    updatedAt: now
  };
  cache.set(record.missionId, record);
  appendRow(record);
  return record;
}

export function getSelfAgentPreview(missionId: string): SelfAgentPreviewRecord | null {
  initCache();
  return cache.get(missionId) ?? null;
}
