import type {
  ArchitectureMemoryRecord,
  DynamicPulseRecord,
  EpistemicLedgerRecord,
  DiffRecord,
  ExecutionRecord,
  LivingLedgerSymbolRecord,
  PlanRecord,
  PreviewRecord,
  ProjectBlueprintRecord,
  RepositoryRecord,
  RollbackSnapshotRecord,
  SandboxRunRecord,
  SelfHealingAttemptRecord,
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
  livingLedgerSymbols: LivingLedgerSymbolRecord[];
  epistemicLedger: EpistemicLedgerRecord[];
  sandboxRuns: SandboxRunRecord[];
  dynamicPulses: DynamicPulseRecord[];
  rollbackSnapshots: RollbackSnapshotRecord[];
  selfHealingAttempts: SelfHealingAttemptRecord[];
  projectBlueprints: ProjectBlueprintRecord[];
}

const globalStore = globalThis as typeof globalThis & {
  __bootriseStore?: MemoryStore;
};

export const memoryStore: MemoryStore =
  globalStore.__bootriseStore ??
  (globalStore.__bootriseStore = {
    repositories: [],
    snapshots: [],
    plans: [],
    diffs: [],
    executions: [],
    verifications: [],
    architectureMemory: [],
    previews: [],
    livingLedgerSymbols: [],
    epistemicLedger: [],
    sandboxRuns: [],
    dynamicPulses: [],
    rollbackSnapshots: [],
    selfHealingAttempts: [],
    projectBlueprints: []
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
