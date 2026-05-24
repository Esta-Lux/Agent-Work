import type {
  ArchitectureMemoryEntry,
  ChangePlan,
  DiffPreview,
  ExecutionResult,
  PreviewProject,
  RepoIntelligenceSnapshot,
  VerificationCheck
} from "@/lib/types/core";

export interface RepositoryRecord {
  id: string;
  name: string;
  source: "demo" | "uploaded" | "github" | "local";
  createdAt: string;
  updatedAt: string;
}

export interface SnapshotRecord {
  id: string;
  repositoryId: string;
  snapshot: RepoIntelligenceSnapshot;
  createdAt: string;
}

export interface PlanRecord {
  id: string;
  repositoryId: string;
  plan: ChangePlan;
  status: "draft" | "approved" | "rejected" | "executed";
  createdAt: string;
}

export interface DiffRecord {
  id: string;
  planId: string;
  preview: DiffPreview;
  createdAt: string;
}

export interface ExecutionRecord {
  id: string;
  planId: string;
  result: ExecutionResult;
  createdAt: string;
}

export interface VerificationRecord {
  id: string;
  planId: string;
  checks: VerificationCheck[];
  createdAt: string;
}

export interface ArchitectureMemoryRecord extends ArchitectureMemoryEntry {
  repositoryId: string;
}

export interface PreviewRecord {
  id: string;
  planId: string;
  preview: PreviewProject;
  createdAt: string;
}

