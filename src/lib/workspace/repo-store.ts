import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync
} from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import type { SourceFileInput } from "@/lib/intelligence/repo-intelligence";

export interface RepoFileEntry {
  sha256: string;
  sizeBytes: number;
  updatedAt: string;
}

export interface RepoManifest {
  repositoryId: string;
  remoteUrl: string | null;
  branch: string | null;
  commitSha: string | null;
  syncedAt: string;
  fileCount: number;
  files: Record<string, RepoFileEntry>;
}

export interface RepoSyncResult {
  repositoryId: string;
  manifest: RepoManifest;
  written: string[];
  unchanged: string[];
  removed: string[];
  totalFiles: number;
}

export interface RepoSnapshotMeta {
  id: string;
  repositoryId: string;
  createdAt: string;
  fileCount: number;
  label: string;
}

const storeRoot = resolve(process.cwd(), ".bootrise", "repos");

function repoRoot(repositoryId: string): string {
  return join(storeRoot, repositoryId);
}

function filesRoot(repositoryId: string): string {
  return join(repoRoot(repositoryId), "files");
}

function manifestPath(repositoryId: string): string {
  return join(repoRoot(repositoryId), "manifest.json");
}

function snapshotsRoot(repositoryId: string): string {
  return join(repoRoot(repositoryId), "snapshots");
}

export function computeFileHash(content: string): string {
  return createHash("sha256").update(content, "utf8").digest("hex");
}

function safeRelativePath(filePath: string): string {
  const normalized = filePath.replace(/\\/g, "/").replace(/^\/+/, "");
  if (normalized.split("/").some((segment) => segment === "..")) {
    throw new Error(`Unsafe path rejected: ${filePath}`);
  }
  return normalized;
}

function readManifestOrEmpty(repositoryId: string): RepoManifest {
  const path = manifestPath(repositoryId);
  if (!existsSync(path)) {
    return {
      repositoryId,
      remoteUrl: null,
      branch: null,
      commitSha: null,
      syncedAt: new Date(0).toISOString(),
      fileCount: 0,
      files: {}
    };
  }
  return JSON.parse(readFileSync(path, "utf8")) as RepoManifest;
}

function writeManifest(repositoryId: string, manifest: RepoManifest): void {
  mkdirSync(repoRoot(repositoryId), { recursive: true });
  writeFileSync(manifestPath(repositoryId), JSON.stringify(manifest, null, 2), "utf8");
}

function walkFiles(dir: string, base: string = dir): string[] {
  if (!existsSync(dir)) return [];
  const entries = readdirSync(dir, { withFileTypes: true });
  const paths: string[] = [];
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      paths.push(...walkFiles(full, base));
    } else if (entry.isFile()) {
      paths.push(relative(base, full).replace(/\\/g, "/"));
    }
  }
  return paths;
}

export function repoExists(repositoryId: string): boolean {
  return existsSync(manifestPath(repositoryId));
}

export function getRepoManifest(repositoryId: string): RepoManifest | null {
  if (!repoExists(repositoryId)) return null;
  return readManifestOrEmpty(repositoryId);
}

export function readRepoFiles(repositoryId: string): SourceFileInput[] {
  const root = filesRoot(repositoryId);
  if (!existsSync(root)) return [];

  return walkFiles(root).map((path) => {
    const content = readFileSync(join(root, path), "utf8");
    const stat = statSync(join(root, path));
    return { path, content, sizeBytes: stat.size };
  });
}

export function readRepoFile(repositoryId: string, filePath: string): SourceFileInput | null {
  const safe = safeRelativePath(filePath);
  const target = join(filesRoot(repositoryId), safe);
  if (!existsSync(target) || !statSync(target).isFile()) return null;
  const content = readFileSync(target, "utf8");
  return { path: safe, content, sizeBytes: statSync(target).size };
}

export function syncRepoFiles(
  repositoryId: string,
  incoming: SourceFileInput[],
  options: {
    remoteUrl?: string | null;
    branch?: string | null;
    commitSha?: string | null;
    fullReplace?: boolean;
    snapshotLabel?: string;
  } = {}
): RepoSyncResult {
  const previous = readManifestOrEmpty(repositoryId);
  const root = filesRoot(repositoryId);
  mkdirSync(root, { recursive: true });

  if (previous.fileCount > 0 && options.snapshotLabel !== "skip") {
    createRepoSnapshot(repositoryId, options.snapshotLabel ?? `pre-sync-${Date.now()}`);
  }

  const now = new Date().toISOString();
  const nextFiles: Record<string, RepoFileEntry> = { ...previous.files };
  const written: string[] = [];
  const unchanged: string[] = [];
  const incomingPaths = new Set<string>();

  for (const file of incoming) {
    const path = safeRelativePath(file.path);
    incomingPaths.add(path);
    const sha256 = computeFileHash(file.content);
    const existing = previous.files[path];

    if (existing?.sha256 === sha256) {
      unchanged.push(path);
      continue;
    }

    const target = join(root, path);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, file.content, "utf8");
    nextFiles[path] = { sha256, sizeBytes: file.content.length, updatedAt: now };
    written.push(path);
  }

  const removed: string[] = [];
  if (options.fullReplace) {
    for (const path of Object.keys(previous.files)) {
      if (!incomingPaths.has(path)) {
        const target = join(root, path);
        if (existsSync(target)) rmSync(target, { force: true });
        delete nextFiles[path];
        removed.push(path);
      }
    }
  }

  const manifest: RepoManifest = {
    repositoryId,
    remoteUrl: options.remoteUrl !== undefined ? options.remoteUrl : previous.remoteUrl,
    branch: options.branch !== undefined ? options.branch : previous.branch,
    commitSha: options.commitSha !== undefined ? options.commitSha : previous.commitSha,
    syncedAt: now,
    fileCount: Object.keys(nextFiles).length,
    files: nextFiles
  };

  writeManifest(repositoryId, manifest);

  return {
    repositoryId,
    manifest,
    written,
    unchanged,
    removed,
    totalFiles: manifest.fileCount
  };
}

export function createRepoSnapshot(repositoryId: string, label: string): RepoSnapshotMeta {
  const manifest = getRepoManifest(repositoryId);
  if (!manifest) {
    throw new Error(`Repository ${repositoryId} has no manifest.`);
  }

  const id = `snap_${Date.now()}`;
  const dir = join(snapshotsRoot(repositoryId), id);
  mkdirSync(dir, { recursive: true });

  const meta: RepoSnapshotMeta = {
    id,
    repositoryId,
    createdAt: new Date().toISOString(),
    fileCount: manifest.fileCount,
    label
  };

  writeFileSync(join(dir, "meta.json"), JSON.stringify(meta, null, 2), "utf8");
  writeFileSync(join(dir, "manifest.json"), JSON.stringify(manifest, null, 2), "utf8");

  const root = filesRoot(repositoryId);
  for (const path of Object.keys(manifest.files)) {
    const source = join(root, path);
    if (!existsSync(source)) continue;
    const target = join(dir, "files", path);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, readFileSync(source, "utf8"), "utf8");
  }

  return meta;
}

export function listRepoSnapshots(repositoryId: string): RepoSnapshotMeta[] {
  const root = snapshotsRoot(repositoryId);
  if (!existsSync(root)) return [];

  return readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => {
      const metaPath = join(root, entry.name, "meta.json");
      if (!existsSync(metaPath)) return null;
      try {
        return JSON.parse(readFileSync(metaPath, "utf8")) as RepoSnapshotMeta;
      } catch {
        return null;
      }
    })
    .filter((item): item is RepoSnapshotMeta => Boolean(item))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function restoreRepoSnapshot(repositoryId: string, snapshotId: string): RepoSyncResult {
  const snapDir = join(snapshotsRoot(repositoryId), snapshotId);
  const snapManifestPath = join(snapDir, "manifest.json");
  if (!existsSync(snapManifestPath)) {
    throw new Error(`Snapshot ${snapshotId} not found.`);
  }

  const snapManifest = JSON.parse(readFileSync(snapManifestPath, "utf8")) as RepoManifest;
  const files: SourceFileInput[] = [];
  const snapFilesRoot = join(snapDir, "files");

  for (const path of Object.keys(snapManifest.files)) {
    const source = join(snapFilesRoot, path);
    if (!existsSync(source)) continue;
    files.push({ path, content: readFileSync(source, "utf8") });
  }

  return syncRepoFiles(repositoryId, files, {
    remoteUrl: snapManifest.remoteUrl,
    branch: snapManifest.branch,
    commitSha: snapManifest.commitSha,
    fullReplace: true,
    snapshotLabel: "skip"
  });
}

export function resolveRepoFiles(
  repositoryId: string | null | undefined,
  fallbackFiles: SourceFileInput[]
): SourceFileInput[] {
  if (!repositoryId || !repoExists(repositoryId)) {
    return fallbackFiles;
  }
  const disk = readRepoFiles(repositoryId);
  return disk.length > 0 ? disk : fallbackFiles;
}
