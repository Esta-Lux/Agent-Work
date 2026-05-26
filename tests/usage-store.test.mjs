import assert from "node:assert/strict";
import test from "node:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

test("usage events persist locally and summarize credits", async () => {
  const cwd = mkdtempSync(join(tmpdir(), "bootrise-usage-"));
  const prev = process.cwd();
  process.chdir(cwd);
  delete process.env.SUPABASE_URL;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;

  try {
    const { recordUsageEvent, listUsageEvents, summarizeUsage } = await import("../src/lib/usage/usage-store.ts");
    await recordUsageEvent({
      orgId: "org_usage",
      userId: "user_usage",
      projectId: "project_usage",
      provider: "bootrise",
      model: "nvidia/test",
      mode: "fast",
      taskType: "fix",
      risk: "low",
      estimatedInputTokens: 100,
      estimatedOutputTokens: 50,
      estimatedCostUsd: 0.001,
      creditsCharged: 25,
      premiumCreditsCharged: 0,
      status: "succeeded"
    });

    const events = await listUsageEvents({ orgId: "org_usage", userId: "user_usage" });
    const summary = summarizeUsage(events);

    assert.equal(events.length, 1);
    assert.equal(summary.credits, 25);
    assert.equal(summary.premiumCredits, 0);
    assert.equal(summary.byProvider[0].provider, "bootrise");
  } finally {
    process.chdir(prev);
    rmSync(cwd, { recursive: true, force: true });
  }
});
