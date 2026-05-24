import { existsSync, readFileSync } from "node:fs";
import { join, normalize } from "node:path";
import { getSupabaseServiceClient } from "@/lib/db/supabase";
import { memoryStore, upsertRecord } from "@/lib/persistence/memory-store";
import type { RollbackSnapshotRecord } from "@/lib/persistence/schema";

export async function createRollbackSnapshot(input: {
  executionId: string;
  planId: string;
  repositoryId: string;
  repoPath: string;
  filePaths: string[];
}): Promise<RollbackSnapshotRecord> {
  const changedFiles = input.filePaths.map((filePath) => {
    const safePath = normalize(filePath).replace(/^(\.\.(\/|\\|$))+/, "");
    const absolutePath = join(input.repoPath, safePath);

    return {
      path: safePath,
      previousContent: existsSync(absolutePath) ? readFileSync(absolutePath, "utf8") : null
    };
  });

  const snapshot: RollbackSnapshotRecord = {
    id: `rollback_${input.planId}_${Date.now()}`,
    executionId: input.executionId,
    planId: input.planId,
    repositoryId: input.repositoryId,
    changedFiles,
    restoreNotes: "Restore each previousContent value to its path. Null means the file did not exist before execution.",
    createdAt: new Date().toISOString()
  };

  upsertRecord(memoryStore.rollbackSnapshots, snapshot);
  const supabase = getSupabaseServiceClient();
  if (supabase) {
    await supabase.from("rollback_snapshots").insert({
      id: snapshot.id,
      execution_id: snapshot.executionId,
      plan_id: snapshot.planId,
      repository_id: snapshot.repositoryId,
      changed_files: snapshot.changedFiles,
      restore_notes: snapshot.restoreNotes,
      created_at: snapshot.createdAt
    });
  }

  return snapshot;
}
