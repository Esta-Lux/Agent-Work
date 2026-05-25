import { getSupabaseServiceClient } from "@/lib/db/supabase";
import { memoryStore, upsertRecord } from "@/lib/persistence/memory-store";
import type {
  GitSyncRecord,
  PreviewSessionRecord,
  RemoteStreamRecord,
  SandboxPoolRecord,
  VectorSyncJobRecord
} from "@/lib/persistence/schema";

export interface InfrastructureStatus {
  gitSyncs: GitSyncRecord[];
  previewSessions: PreviewSessionRecord[];
  sandboxPools: SandboxPoolRecord[];
  vectorSyncJobs: VectorSyncJobRecord[];
  remoteStreams: RemoteStreamRecord[];
  summary: {
    connectedRepos: number;
    readyPreviews: number;
    activeSandboxes: number;
    queuedSandboxJobs: number;
    vectorJobsInFlight: number;
    activeStreams: number;
  };
}

export async function createGitSync(input: {
  repositoryId: string;
  remoteUrl: string;
  defaultBranch?: string;
}): Promise<GitSyncRecord> {
  const record: GitSyncRecord = {
    id: `git_${Date.now()}_${randomId()}`,
    repositoryId: input.repositoryId,
    provider: "github",
    remoteUrl: input.remoteUrl,
    defaultBranch: input.defaultBranch ?? "main",
    status: "connected",
    lastSyncAt: new Date().toISOString(),
    pullRequestUrl: null,
    createdAt: new Date().toISOString()
  };

  upsertRecord(memoryStore.gitSyncs, record);
  await writeSupabase("bootrise_git_syncs", toSnakeRecord(record));
  return record;
}

export async function createPreviewSession(input: {
  repositoryId: string;
  mode?: PreviewSessionRecord["mode"];
  framework?: string;
}): Promise<PreviewSessionRecord> {
  const record: PreviewSessionRecord = {
    id: `preview_${Date.now()}_${randomId()}`,
    repositoryId: input.repositoryId,
    mode: input.mode ?? "webcontainer",
    framework: input.framework ?? "Next.js",
    previewUrl: input.mode === "remote-stream" ? null : "/api/previews",
    status: "booting",
    lastHeartbeatAt: new Date().toISOString(),
    createdAt: new Date().toISOString()
  };

  upsertRecord(memoryStore.previewSessions, record);
  await writeSupabase("bootrise_preview_sessions", toSnakeRecord(record));
  return record;
}

export async function upsertSandboxPool(input: Partial<SandboxPoolRecord>): Promise<SandboxPoolRecord> {
  const now = new Date().toISOString();
  const record: SandboxPoolRecord = {
    id: input.id ?? "pool_local_docker",
    provider: input.provider ?? "local-docker",
    region: input.region ?? "local",
    status: input.status ?? "online",
    activeSandboxes: input.activeSandboxes ?? 0,
    queuedJobs: input.queuedJobs ?? 0,
    maxSandboxes: input.maxSandboxes ?? 4,
    averageBootMs: input.averageBootMs ?? 1500,
    updatedAt: now
  };

  upsertRecord(memoryStore.sandboxPools, record);
  await writeSupabase("bootrise_sandbox_pools", toSnakeRecord(record));
  return record;
}

export async function createVectorSyncJob(input: {
  repositoryId: string;
  trigger?: VectorSyncJobRecord["trigger"];
}): Promise<VectorSyncJobRecord> {
  const record: VectorSyncJobRecord = {
    id: `vector_${Date.now()}_${randomId()}`,
    repositoryId: input.repositoryId,
    trigger: input.trigger ?? "manual",
    status: "queued",
    filesIndexed: 0,
    symbolsIndexed: 0,
    errorMessage: null,
    createdAt: new Date().toISOString(),
    completedAt: null
  };

  upsertRecord(memoryStore.vectorSyncJobs, record);
  await writeSupabase("bootrise_vector_sync_jobs", toSnakeRecord(record));
  return record;
}

export async function createRemoteStream(input: {
  repositoryId: string;
  runtime?: RemoteStreamRecord["runtime"];
  transport?: RemoteStreamRecord["transport"];
  exposedPorts?: number[];
}): Promise<RemoteStreamRecord> {
  const now = new Date().toISOString();
  const transport = input.transport ?? (input.runtime === "web" ? "webcontainer" : "novnc");
  const record: RemoteStreamRecord = {
    id: `stream_${Date.now()}_${randomId()}`,
    repositoryId: input.repositoryId,
    runtime: input.runtime ?? "web",
    transport,
    status: "provisioning",
    streamUrl: transport === "webcontainer" ? "/api/previews" : null,
    exposedPorts: input.exposedPorts ?? [3000],
    createdAt: now,
    updatedAt: now
  };

  upsertRecord(memoryStore.remoteStreams, record);
  await writeSupabase("bootrise_remote_streams", toSnakeRecord(record));
  return record;
}

export function getInfrastructureStatus(): InfrastructureStatus {
  const gitSyncs = memoryStore.gitSyncs.slice(-20).reverse();
  const previewSessions = memoryStore.previewSessions.slice(-20).reverse();
  const sandboxPools = memoryStore.sandboxPools.length > 0 ? memoryStore.sandboxPools : [defaultSandboxPool()];
  const vectorSyncJobs = memoryStore.vectorSyncJobs.slice(-20).reverse();
  const remoteStreams = memoryStore.remoteStreams.slice(-20).reverse();

  return {
    gitSyncs,
    previewSessions,
    sandboxPools,
    vectorSyncJobs,
    remoteStreams,
    summary: {
      connectedRepos: gitSyncs.filter((item) => item.status !== "failed").length,
      readyPreviews: previewSessions.filter((item) => item.status === "ready" || item.status === "booting").length,
      activeSandboxes: sandboxPools.reduce((sum, pool) => sum + pool.activeSandboxes, 0),
      queuedSandboxJobs: sandboxPools.reduce((sum, pool) => sum + pool.queuedJobs, 0),
      vectorJobsInFlight: vectorSyncJobs.filter((job) => job.status === "queued" || job.status === "indexing").length,
      activeStreams: remoteStreams.filter((stream) => stream.status === "streaming" || stream.status === "provisioning").length
    }
  };
}

function defaultSandboxPool(): SandboxPoolRecord {
  return {
    id: "pool_local_docker",
    provider: "local-docker",
    region: "local",
    status: "online",
    activeSandboxes: 0,
    queuedJobs: 0,
    maxSandboxes: 4,
    averageBootMs: 1500,
    updatedAt: new Date().toISOString()
  };
}

async function writeSupabase(table: string, record: Record<string, unknown>): Promise<void> {
  const supabase = getSupabaseServiceClient();
  if (!supabase) return;
  await supabase.from(table).upsert(record);
}

function toSnakeRecord(record: object): Record<string, unknown> {
  return Object.fromEntries(Object.entries(record).map(([key, value]) => [toSnakeCase(key), value]));
}

function toSnakeCase(value: string): string {
  return value.replace(/[A-Z]/g, (match) => `_${match.toLowerCase()}`);
}

function randomId(): string {
  return Math.random().toString(36).slice(2, 8);
}
