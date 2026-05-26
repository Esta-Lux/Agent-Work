import type {
  ArchitectureMemoryEntry,
  ChangePlan,
  DiffPreview,
  ExecutionResult,
  PreviewProject,
  RepoIntelligenceSnapshot,
  VerificationCheck
} from "@/lib/types/core";
import type { ModelMode, ProviderId, TaskRisk } from "@/lib/ai/providers";

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

export interface LivingLedgerSymbolRecord {
  id: string;
  repositoryId: string;
  symbolName: string;
  symbolKind: string;
  filePath: string;
  exportDependencies: string[];
  astNodeData: Record<string, unknown>;
  createdAt: string;
}

export interface EpistemicLedgerRecord {
  id: string;
  repositoryId: string;
  symbolName: string;
  filePath: string;
  architecturalIntent: string;
  rules: string[];
  scarTissue: string[];
  updatedAt: string;
}

export interface SandboxRunRecord {
  id: string;
  planId: string;
  repositoryId: string;
  status: "EXECUTING_IN_SANDBOX" | "SUCCESS" | "COMPILE_FAIL" | "TEST_FAIL" | "RUNTIME_FAIL";
  terminalLogs: string;
  modifiedFiles: string[];
  createdAt: string;
}

export interface DynamicPulseRecord {
  id: string;
  repositoryId: string;
  source: "terminal" | "test" | "runtime" | "database" | "network";
  severity: "info" | "warning" | "error";
  summary: string;
  rawPayload: Record<string, unknown>;
  createdAt: string;
}

export interface RollbackSnapshotRecord {
  id: string;
  executionId: string;
  planId: string;
  repositoryId: string;
  changedFiles: Array<{
    path: string;
    previousContent: string | null;
  }>;
  restoreNotes: string;
  createdAt: string;
}

export interface SelfHealingAttemptRecord {
  id: string;
  planId: string;
  repositoryId: string;
  failedRunId: string;
  diagnosis: string;
  proposedActions: string[];
  status: "proposed" | "applied" | "abandoned";
  createdAt: string;
}

export interface ProjectBlueprintRecord {
  id: string;
  name: string;
  productType: string;
  audience: string;
  coreEntities: string[];
  pages: string[];
  databaseTables: Array<{
    name: string;
    purpose: string;
    columns: string[];
  }>;
  securityRules: string[];
  testPlan: string[];
  createdAt: string;
}

export interface AdminTelemetryRecord {
  id: string;
  userId: string;
  projectId: string;
  sessionId: string;
  planningDurationMs: number;
  executionDurationMs: number;
  verificationDurationMs: number;
  selfHealingAttemptsCount: number;
  finalOutcome: "COMMITTED" | "ABANDONED" | "HARD_CRASH";
  stallingErrorLogs: string | null;
  tokenComputeCost: number;
  createdAt: string;
}

export interface GitSyncRecord {
  id: string;
  repositoryId: string;
  provider: "github";
  remoteUrl: string;
  defaultBranch: string;
  status: "connected" | "syncing" | "ready" | "failed";
  lastSyncAt: string | null;
  pullRequestUrl: string | null;
  createdAt: string;
}

export interface PreviewSessionRecord {
  id: string;
  repositoryId: string;
  mode: "webcontainer" | "remote-stream";
  framework: string;
  previewUrl: string | null;
  status: "booting" | "ready" | "failed" | "stopped";
  lastHeartbeatAt: string;
  createdAt: string;
}

export interface SandboxPoolRecord {
  id: string;
  provider: "local-docker" | "e2b" | "fly-machines" | "firecracker";
  region: string;
  status: "online" | "degraded" | "offline";
  activeSandboxes: number;
  queuedJobs: number;
  maxSandboxes: number;
  averageBootMs: number;
  updatedAt: string;
}

export interface VectorSyncJobRecord {
  id: string;
  repositoryId: string;
  trigger: "manual" | "github-webhook" | "scheduled";
  status: "queued" | "indexing" | "embedded" | "failed";
  filesIndexed: number;
  symbolsIndexed: number;
  errorMessage: string | null;
  createdAt: string;
  completedAt: string | null;
}

export interface RemoteStreamRecord {
  id: string;
  repositoryId: string;
  runtime: "web" | "android" | "python" | "docker-compose" | "native-linux";
  transport: "webcontainer" | "novnc" | "guacamole" | "webrtc";
  status: "provisioning" | "streaming" | "failed" | "stopped";
  streamUrl: string | null;
  exposedPorts: number[];
  createdAt: string;
  updatedAt: string;
}

export interface UsageEventRecord {
  id: string;
  orgId: string;
  userId: string;
  projectId: string;
  provider: ProviderId;
  model: string;
  mode: ModelMode;
  taskType: string;
  risk: TaskRisk;
  estimatedInputTokens: number;
  estimatedOutputTokens: number;
  estimatedCostUsd: number;
  creditsCharged: number;
  premiumCreditsCharged: number;
  status: "estimated" | "allowed" | "blocked" | "succeeded" | "failed";
  failureReason: string | null;
  createdAt: string;
}
