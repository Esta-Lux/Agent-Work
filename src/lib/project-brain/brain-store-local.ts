import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import type {
  FileIndexEntry,
  ModuleIndexEntry,
  ProjectBrain,
  ProjectMemoryItem
} from "@/lib/project-brain/types";

const root = resolve(process.cwd(), ".bootrise", "project-brain");

function brainDir(orgId: string, projectId: string) {
  return join(root, orgId, projectId);
}

function readJson<T>(path: string, fallback: T): T {
  if (!existsSync(path)) return fallback;
  try {
    return JSON.parse(readFileSync(path, "utf8")) as T;
  } catch {
    return fallback;
  }
}

function writeJson(path: string, data: unknown) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(data, null, 2), "utf8");
}

export function loadLocalBrain(orgId: string, projectId: string): ProjectBrain | null {
  return readJson<ProjectBrain | null>(join(brainDir(orgId, projectId), "brain.json"), null);
}

export function saveLocalBrain(brain: ProjectBrain) {
  const dir = brainDir(brain.orgId, brain.projectId);
  mkdirSync(dir, { recursive: true });
  writeJson(join(dir, "brain.json"), brain);
}

export function loadLocalMemory(orgId: string, projectId: string): ProjectMemoryItem[] {
  return readJson(join(brainDir(orgId, projectId), "memory.json"), []);
}

export function saveLocalMemory(orgId: string, projectId: string, items: ProjectMemoryItem[]) {
  writeJson(join(brainDir(orgId, projectId), "memory.json"), items);
}

export function loadLocalFileIndex(orgId: string, projectId: string): FileIndexEntry[] {
  return readJson(join(brainDir(orgId, projectId), "files.json"), []);
}

export function saveLocalFileIndex(orgId: string, projectId: string, files: FileIndexEntry[]) {
  writeJson(join(brainDir(orgId, projectId), "files.json"), files);
}

export function loadLocalModules(orgId: string, projectId: string): ModuleIndexEntry[] {
  return readJson(join(brainDir(orgId, projectId), "modules.json"), []);
}

export function saveLocalModules(orgId: string, projectId: string, modules: ModuleIndexEntry[]) {
  writeJson(join(brainDir(orgId, projectId), "modules.json"), modules);
}
