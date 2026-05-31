import { afterEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { existsSync, rmSync } from "node:fs";
import { resolve } from "node:path";

const cleanupPaths = new Set();

afterEach(() => {
  for (const path of cleanupPaths) {
    if (existsSync(path)) rmSync(path, { force: true });
  }
  cleanupPaths.clear();
});

describe("agent activity events", () => {
  it("upserts by id and returns newest events first", async () => {
    const { listAgentActivityEvents, recordAgentActivityEvent } = await import("../src/lib/workspace/agent-activity.ts");
    const projectId = `activity_${Date.now()}`;
    cleanupPaths.add(resolve(process.cwd(), ".bootrise", "activity", `${projectId}.json`));

    recordAgentActivityEvent({
      id: "evt-1",
      projectId,
      actor: "builder_agent",
      type: "diff_generated",
      status: "running",
      title: "Generating diff",
      timestamp: "2026-01-01T10:00:00.000Z"
    });
    recordAgentActivityEvent({
      id: "evt-1",
      projectId,
      actor: "builder_agent",
      type: "diff_generated",
      status: "success",
      title: "Diff ready for review",
      detail: "Edited 2 files",
      // Duplicate file paths verify normalization and deduplication before persistence.
      filePaths: ["src/a.ts", "src/a.ts", "src/b.ts"],
      timestamp: "2026-01-01T10:00:01.000Z"
    });
    recordAgentActivityEvent({
      id: "evt-2",
      projectId,
      actor: "security_agent",
      type: "security_scan_completed",
      status: "warning",
      title: "Security scan completed",
      timestamp: "2026-01-01T10:00:02.000Z"
    });

    const events = listAgentActivityEvents(projectId);
    assert.equal(events.length, 2);
    assert.equal(events[0].id, "evt-2");
    assert.equal(events[1].title, "Diff ready for review");
    assert.deepEqual(events[1].filePaths, ["src/a.ts", "src/b.ts"]);
    assert.equal(events[1].status, "success");
  });
});
