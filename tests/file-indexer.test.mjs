import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { indexProjectFiles } from "../src/lib/project-brain/file-indexer.ts";

describe("file-indexer", () => {
  it("skips unchanged files on re-index", async () => {
    const input = {
      orgId: "org_test",
      projectId: `proj_test_${Date.now()}`,
      files: [{ path: "src/a.ts", content: "export const x = 1;" }]
    };
    const first = await indexProjectFiles(input);
    assert.equal(first.indexed, 1);
    assert.equal(first.skipped, 0);

    const second = await indexProjectFiles(input);
    assert.equal(second.indexed, 0);
    assert.equal(second.skipped, 1);
  });
});
