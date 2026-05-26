import assert from "node:assert/strict";
import test from "node:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

test("kill switches persist and block fix", async () => {
  const cwd = mkdtempSync(join(tmpdir(), "bootrise-"));
  const prev = process.cwd();
  process.chdir(cwd);

  try {
    const { updateKillSwitches, getKillSwitches, assertKillSwitchAllowed } = await import(
      "../src/lib/admin/kill-switches.ts"
    );

    updateKillSwitches({ disableFixExecution: true });
    assert.equal(getKillSwitches().disableFixExecution, true);
    assert.throws(() => assertKillSwitchAllowed("fix"), /disabled/i);

    updateKillSwitches({ disableFixExecution: false });
    assert.doesNotThrow(() => assertKillSwitchAllowed("fix"));

    updateKillSwitches({ disableOpenAI: true, disableDraftPrCreation: true });
    assert.throws(() => assertKillSwitchAllowed("openai"), /OpenAI is disabled/i);
    assert.throws(() => assertKillSwitchAllowed("draft_pr"), /Draft PR creation is disabled/i);
  } finally {
    process.chdir(prev);
    rmSync(cwd, { recursive: true, force: true });
  }
});
