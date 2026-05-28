import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { execSync } from "node:child_process";
import type { SourceFileInput } from "@/lib/intelligence/repo-intelligence";
import { syncRepoFiles, type RepoSyncResult } from "@/lib/workspace/repo-store";

export const SELF_REPOSITORY_ID = "bootrise-self";

const HARD_DENYLIST = new Set([
  "node_modules",
  ".next",
  ".bootrise",
  ".git",
  "dist",
  "build",
  "coverage",
  ".turbo",
  ".vercel",
  "supabase/.temp",
  ".tools"
]);

const BINARY_EXTENSIONS = new Set([
  ".png", ".jpg", ".jpeg", ".gif", ".webp", ".ico", ".pdf",
  ".zip", ".tar", ".gz", ".tgz", ".mp4", ".mov", ".woff", ".woff2",
  ".ttf", ".otf", ".eot", ".lock", ".map", ".log"
]);

const DEFAULT_MAX_BYTES = 256 * 1024;
const DEFAULT_MAX_FILES = 4000;

export function getSelfRepoRoot(): string {
  const override = process.env.BOOTRISE_SELF_REPO_ROOT?.trim();
  if (override) return resolve(override);
  return process.cwd();
}

export function getSelfRepoRemoteUrl(): string | null {
  const override = process.env.BOOTRISE_SELF_REPO_REMOTE_URL?.trim();
  if (override) return override;
  try {
    const out = execSync("git config --get remote.origin.url", {
      cwd: getSelfRepoRoot(),
      stdio: ["ignore", "pipe", "ignore"],
      encoding: "utf8"
    }).trim();
    return out || null;
  } catch {
    return null;
  }
}

export function getSelfRepoDefaultBranch(): string {
  const override = process.env.BOOTRISE_SELF_REPO_DEFAULT_BRANCH?.trim();
  if (override) return override;
  return "main";
}

function loadGitignorePatterns(root: string): string[] {
  const path = join(root, ".gitignore");
  if (!existsSync(path)) return [];
  return readFileSync(path, "utf8")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#") && !line.startsWith("!"));
}

function matchesGitignore(relPath: string, patterns: string[]): boolean {
  const segments = relPath.split("/");
  for (const raw of patterns) {
    const pattern = raw.replace(/^\/+/, "").replace(/\/+$/, "");
    if (!pattern) continue;
    if (pattern.includes("*")) {
      const regex = new RegExp(
        "^" + pattern.replace(/\./g, "\\.").replace(/\*\*/g, ".*").replace(/\*/g, "[^/]*") + "$"
      );
      if (regex.test(relPath) || segments.some((s) => regex.test(s))) return true;
      continue;
    }
    if (relPath === pattern || relPath.startsWith(`${pattern}/`)) return true;
    if (segments.includes(pattern)) return true;
  }
  return false;
}

function isDenied(relPath: string): boolean {
  const segments = relPath.split("/");
  for (const seg of segments) {
    if (HARD_DENYLIST.has(seg)) return true;
  }
  if (relPath.startsWith("supabase/.temp")) return true;
  const lower = relPath.toLowerCase();
  for (const ext of BINARY_EXTENSIONS) {
    if (lower.endsWith(ext)) return true;
  }
  if (lower.endsWith(".env") || /\.env\.[^/]+$/.test(lower)) {
    if (!lower.endsWith(".env.example")) return true;
  }
  return false;
}

function walk(root: string, dir: string, patterns: string[], out: string[], maxFiles: number): void {
  if (out.length >= maxFiles) return;
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    if (out.length >= maxFiles) return;
    const full = join(dir, entry.name);
    const rel = relative(root, full).replace(/\\/g, "/");
    if (isDenied(rel)) continue;
    if (matchesGitignore(rel, patterns)) continue;
    if (entry.isDirectory()) {
      walk(root, full, patterns, out, maxFiles);
    } else if (entry.isFile()) {
      out.push(rel);
    }
  }
}

export function loadSelfRepoSnapshot(opts?: { maxBytes?: number; maxFiles?: number }): SourceFileInput[] {
  const root = getSelfRepoRoot();
  const maxBytes = opts?.maxBytes ?? DEFAULT_MAX_BYTES;
  const maxFiles = opts?.maxFiles ?? DEFAULT_MAX_FILES;
  const patterns = loadGitignorePatterns(root);
  const paths: string[] = [];
  walk(root, root, patterns, paths, maxFiles);

  const files: SourceFileInput[] = [];
  for (const path of paths) {
    const full = join(root, path);
    let size = 0;
    try {
      size = statSync(full).size;
    } catch {
      continue;
    }
    if (size > maxBytes) continue;
    let content: string;
    try {
      content = readFileSync(full, "utf8");
    } catch {
      continue;
    }
    files.push({ path, content, sizeBytes: size });
  }
  return files;
}

export function syncSelfRepoSnapshot(opts?: { maxBytes?: number; maxFiles?: number }): RepoSyncResult {
  const files = loadSelfRepoSnapshot(opts);
  return syncRepoFiles(SELF_REPOSITORY_ID, files, {
    remoteUrl: getSelfRepoRemoteUrl(),
    branch: getSelfRepoDefaultBranch(),
    fullReplace: true,
    snapshotLabel: `self-sync-${Date.now()}`
  });
}
