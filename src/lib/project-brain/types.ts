export type MemoryItemType =
  | "product"
  | "architecture"
  | "rule"
  | "decision"
  | "risk"
  | "security"
  | "deployment"
  | "module";

export type MemoryItemStatus = "active" | "stale" | "rejected";

export interface ProjectBrain {
  id: string;
  orgId: string;
  projectId: string;
  name: string;
  summary: string | null;
  status: string;
  updatedAt: string;
}

export interface ProjectMemoryItem {
  id: string;
  orgId: string;
  projectId: string;
  brainId: string;
  type: MemoryItemType;
  title: string;
  content: string;
  source: string;
  confidence: number;
  status: MemoryItemStatus;
  relatedPaths: string[];
  metadata: Record<string, unknown>;
  updatedAt: string;
}

export interface FileIndexEntry {
  id: string;
  orgId: string;
  projectId: string;
  repositoryId?: string;
  path: string;
  hash: string;
  language?: string;
  sizeBytes: number;
  moduleName?: string;
  summary?: string;
  riskLevel: string;
  lastIndexedAt: string;
}

export interface ModuleIndexEntry {
  id: string;
  orgId: string;
  projectId: string;
  name: string;
  purpose?: string;
  mainFiles: string[];
  summary?: string;
  confidence: number;
  risks: string[];
}

export interface ProjectBrainContextRequest {
  taskText?: string;
  maxItems?: number;
  types?: MemoryItemType[];
}

export interface ProjectBrainContext {
  brain: ProjectBrain;
  memoryItems: ProjectMemoryItem[];
  modules: ModuleIndexEntry[];
  rules: string[];
  decisions: string[];
  fileHints: FileIndexEntry[];
  summary: string;
}

export interface ProjectBrainSummary {
  brain: ProjectBrain;
  memoryCount: number;
  staleCount: number;
  moduleCount: number;
  fileCount: number;
  avgConfidence: number;
  recentLearning: ProjectMemoryItem[];
}
