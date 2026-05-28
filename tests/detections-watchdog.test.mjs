import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

function setupRepo() {
  const root = mkdtempSync(join(tmpdir(), "bootrise-watchdog-"));
  mkdirSync(join(root, ".bootrise", "admin"), { recursive: true });
  mkdirSync(join(root, ".bootrise", "runtime"), { recursive: true });
  return root;
}

test("watchdog tick emits runtime cluster + usage spike detections", async () => {
  const originalCwd = process.cwd();
  const root = setupRepo();
  process.env.BOOTRISE_SELF_REPO_ROOT = root;
  process.chdir(root);

  try {
    const { updateKillSwitches } = await import("../src/lib/admin/kill-switches.ts");
    updateKillSwitches({ disableDetectionsWatchdog: false });

    const nowIso = new Date().toISOString();
    const runtimeEvents = [
      {
        id: "rt_test_1",
        projectId: "proj_test",
        message: "TypeError: foo is undefined at handler",
        normalizedKey: "TypeError: foo is undefined at handler",
        count: 4,
        likelyFiles: ["src/app/api/foo.ts"],
        firstSeen: nowIso,
        lastSeen: nowIso
      }
    ];
    writeFileSync(join(root, ".bootrise", "runtime", "proj_test.json"), JSON.stringify(runtimeEvents));

    const usageRows = Array.from({ length: 4 }, (_, i) => ({
      id: `usage_${i}`,
      createdAt: nowIso,
      orgId: "org_test",
      userId: "user_test",
      projectId: "proj_test",
      provider: "bootrise",
      model: "test",
      mode: "fast",
      taskType: "test",
      risk: "low",
      estimatedInputTokens: 0,
      estimatedOutputTokens: 0,
      estimatedCostUsd: 0,
      creditsCharged: 0,
      premiumCreditsCharged: 0,
      status: "failed",
      failureReason: "test"
    }));
    const usagePath = join(root, ".bootrise", "admin", "usage-events.jsonl");
    writeFileSync(usagePath, usageRows.map((row) => JSON.stringify(row)).join("\n") + "\n");

    const { runWatchdogTickOnce } = await import("../src/lib/admin/detections/watchdog.ts");
    const result = await runWatchdogTickOnce();

    const kinds = new Set(result.detections.map((d) => d.kind));
    assert.ok(kinds.has("runtime_failure_cluster"), `expected runtime_failure_cluster, got: ${[...kinds].join(",")}`);
    assert.ok(kinds.has("usage_failure_spike"), `expected usage_failure_spike, got: ${[...kinds].join(",")}`);
    assert.ok(result.emitted >= 2);
  } finally {
    delete process.env.BOOTRISE_SELF_REPO_ROOT;
    process.chdir(originalCwd);
    rmSync(root, { recursive: true, force: true });
  }
});

test("watchdog tick yields zero detections when kill switch is set", async () => {
  const originalCwd = process.cwd();
  const root = setupRepo();
  process.env.BOOTRISE_SELF_REPO_ROOT = root;
  process.chdir(root);

  try {
    const { updateKillSwitches } = await import("../src/lib/admin/kill-switches.ts");
    updateKillSwitches({ disableDetectionsWatchdog: true });
    const { runWatchdogTickOnce } = await import("../src/lib/admin/detections/watchdog.ts");
    const result = await runWatchdogTickOnce();
    assert.equal(result.emitted, 0);
    assert.equal(result.detections.length, 0);
    updateKillSwitches({ disableDetectionsWatchdog: false });
  } finally {
    delete process.env.BOOTRISE_SELF_REPO_ROOT;
    process.chdir(originalCwd);
    rmSync(root, { recursive: true, force: true });
  }
});

test("startDetectionsWatchdog is idempotent", async () => {
  const originalCwd = process.cwd();
  const root = setupRepo();
  process.env.BOOTRISE_SELF_REPO_ROOT = root;
  process.chdir(root);

  try {
    const { updateKillSwitches } = await import("../src/lib/admin/kill-switches.ts");
    updateKillSwitches({ disableDetectionsWatchdog: false });
    const { startDetectionsWatchdog, stopDetectionsWatchdog, getWatchdogStatus } = await import(
      "../src/lib/admin/detections/watchdog.ts"
    );
    startDetectionsWatchdog({ intervalMs: 1000 });
    startDetectionsWatchdog({ intervalMs: 1000 });
    assert.equal(getWatchdogStatus().running, true);
    stopDetectionsWatchdog();
    assert.equal(getWatchdogStatus().running, false);
  } finally {
    delete process.env.BOOTRISE_SELF_REPO_ROOT;
    process.chdir(originalCwd);
    rmSync(root, { recursive: true, force: true });
  }
});
