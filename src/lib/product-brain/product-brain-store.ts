import { appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import type { ProductBrain } from "@/lib/product-brain/product-brain-types";

const STORE_ROOT = resolve(process.cwd(), ".bootrise", "workspace");
const STORE_FILE = join(STORE_ROOT, "product-brain.jsonl");
const cache = new Map<string, ProductBrain>();
let loaded = false;

function ensureStore(): void {
  mkdirSync(STORE_ROOT, { recursive: true });
  if (!existsSync(STORE_FILE)) appendFileSync(STORE_FILE, "", "utf8");
}

function ensureLoaded(): void {
  if (loaded) return;
  ensureStore();
  const raw = readFileSync(STORE_FILE, "utf8").trim();
  if (raw) {
    for (const line of raw.split("\n")) {
      if (!line.trim()) continue;
      try {
        const entry = JSON.parse(line) as ProductBrain;
        cache.set(entry.projectId, entry);
      } catch {
        continue;
      }
    }
  }
  loaded = true;
}

export function getProductBrain(projectId: string): ProductBrain | null {
  ensureLoaded();
  return cache.get(projectId) ?? null;
}

export function upsertProductBrain(brain: ProductBrain): ProductBrain {
  ensureLoaded();
  cache.set(brain.projectId, brain);
  appendFileSync(STORE_FILE, `${JSON.stringify(brain)}\n`, "utf8");
  return brain;
}
