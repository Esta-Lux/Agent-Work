import type {
  ArchitectureMemoryRecord,
  DiffRecord,
  ExecutionRecord,
  PlanRecord,
  PreviewRecord,
  RepositoryRecord,
  SnapshotRecord,
  VerificationRecord
} from "@/lib/persistence/schema";

interface MemoryStore {
  repositories: RepositoryRecord[];
  snapshots: SnapshotRecord[];
  plans: PlanRecord[];
  diffs: DiffRecord[];
  executions: ExecutionRecord[];
  verifications: VerificationRecord[];
  architectureMemory: ArchitectureMemoryRecord[];
  previews: PreviewRecord[];
}

const globalStore = globalThis as typeof globalThis & {
  __verityStore?: MemoryStore;
};

export const memoryStore: MemoryStore =
  globalStore.__verityStore ??
  (globalStore.__verityStore = {
    repositories: [],
    snapshots: [],
    plans: [],
    diffs: [],
    executions: [],
    verifications: [],
    architectureMemory: [],
    previews: []
  });

export function upsertRecord<T extends { id: string }>(records: T[], record: T): T {
  const index = records.findIndex((item) => item.id === record.id);
  if (index >= 0) {
    records[index] = record;
  } else {
    records.push(record);
  }

  return record;
}

