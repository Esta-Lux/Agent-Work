import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import type { PendingFixRecord } from "@/lib/workspace/pending-fix-store";

const PENDING_ROOT = resolve(process.cwd(), ".bootrise", "pending-fixes");
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

function recordDir(id: string) {
  return join(PENDING_ROOT, id);
}

export function ensurePendingStore() {
  mkdirSync(PENDING_ROOT, { recursive: true });
}

export function persistPendingFixRecord(record: PendingFixRecord): void {
  ensurePendingStore();
  const dir = recordDir(record.id);
  mkdirSync(dir, { recursive: true });

  const { filesSnapshot, patches, ...meta } = record;
  writeFileSync(join(dir, "meta.json"), JSON.stringify(meta), "utf8");
  writeFileSync(join(dir, "patches.json"), JSON.stringify(patches), "utf8");
  writeFileSync(join(dir, "files.json"), JSON.stringify(filesSnapshot), "utf8");
}

export function loadPendingFixRecord(id: string): PendingFixRecord | null {
  const dir = recordDir(id);
  const metaPath = join(dir, "meta.json");
  if (!existsSync(metaPath)) return null;

  try {
    const meta = JSON.parse(readFileSync(metaPath, "utf8")) as Omit<PendingFixRecord, "filesSnapshot" | "patches">;
    const patches = JSON.parse(readFileSync(join(dir, "patches.json"), "utf8")) as PendingFixRecord["patches"];
    const filesSnapshot = JSON.parse(readFileSync(join(dir, "files.json"), "utf8")) as PendingFixRecord["filesSnapshot"];
    return { ...meta, patches, filesSnapshot };
  } catch {
    return null;
  }
}

export function deletePendingFixRecord(id: string): void {
  const dir = recordDir(id);
  if (existsSync(dir)) rmSync(dir, { recursive: true, force: true });
}

export function pruneStalePendingFixes(): number {
  ensurePendingStore();
  const now = Date.now();
  let removed = 0;

  for (const id of readdirSync(PENDING_ROOT)) {
    const dir = join(PENDING_ROOT, id);
    try {
      const metaPath = join(dir, "meta.json");
      if (!existsSync(metaPath)) continue;
      const meta = JSON.parse(readFileSync(metaPath, "utf8")) as { createdAt?: string };
      const created = meta.createdAt ? Date.parse(meta.createdAt) : statSync(dir).mtimeMs;
      if (now - created > MAX_AGE_MS) {
        rmSync(dir, { recursive: true, force: true });
        removed += 1;
      }
    } catch {
      /* skip */
    }
  }

  return removed;
}
