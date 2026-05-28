import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const ADMIN_USER = { id: "admin-test", email: "admin@bootrise.local", role: "admin" };

function setupSelfRepo() {
  const root = mkdtempSync(join(tmpdir(), "bootrise-admin-agent-"));
  mkdirSync(join(root, "src"), { recursive: true });
  writeFileSync(join(root, "src", "hello.ts"), "export const hello = 'world';");
  writeFileSync(join(root, "README.md"), "# bootrise self-repo for tests");
  process.env.BOOTRISE_SELF_REPO_ROOT = root;
  return root;
}

test("runAdminAgentChat returns deterministic reply when no provider key is configured", async () => {
  const originalCwd = process.cwd();
  const previousNvidia = process.env.NVIDIA_API_KEY;
  const previousOpenAi = process.env.OPENAI_API_KEY;
  delete process.env.NVIDIA_API_KEY;
  delete process.env.OPENAI_API_KEY;

  const root = setupSelfRepo();
  process.chdir(root);

  try {
    const { runAdminAgentChat } = await import("../src/lib/admin/admin-agent.ts");
    const result = await runAdminAgentChat({
      user: ADMIN_USER,
      message: "What does src/hello.ts export?"
    });
    assert.equal(typeof result.reply, "string");
    assert.ok(result.reply.length > 0);
    assert.equal(result.stopReason, "provider_not_configured");
    assert.equal(result.model, "deterministic");
  } finally {
    if (previousNvidia !== undefined) process.env.NVIDIA_API_KEY = previousNvidia;
    if (previousOpenAi !== undefined) process.env.OPENAI_API_KEY = previousOpenAi;
    delete process.env.BOOTRISE_SELF_REPO_ROOT;
    process.chdir(originalCwd);
    rmSync(root, { recursive: true, force: true });
  }
});

test("runAdminAgentPlan returns deterministic plan when no provider key is configured", async () => {
  const originalCwd = process.cwd();
  const previousNvidia = process.env.NVIDIA_API_KEY;
  const previousOpenAi = process.env.OPENAI_API_KEY;
  delete process.env.NVIDIA_API_KEY;
  delete process.env.OPENAI_API_KEY;

  const root = setupSelfRepo();
  process.chdir(root);

  try {
    const { runAdminAgentPlan } = await import("../src/lib/admin/admin-agent.ts");
    const result = await runAdminAgentPlan({
      user: ADMIN_USER,
      request: "Rename hello to greeting in src/hello.ts."
    });
    assert.equal(typeof result.plan.id, "string");
    assert.ok(result.plan.id.length > 0);
    assert.equal(typeof result.plan.risk.level, "string");
    assert.equal(result.model, "deterministic");
    assert.ok(result.fileCount > 0);
  } finally {
    if (previousNvidia !== undefined) process.env.NVIDIA_API_KEY = previousNvidia;
    if (previousOpenAi !== undefined) process.env.OPENAI_API_KEY = previousOpenAi;
    delete process.env.BOOTRISE_SELF_REPO_ROOT;
    process.chdir(originalCwd);
    rmSync(root, { recursive: true, force: true });
  }
});

test("admin agent push refuses when pending fix is missing", async () => {
  const originalCwd = process.cwd();
  const root = setupSelfRepo();
  process.chdir(root);

  try {
    const { runAdminAgentPush } = await import("../src/lib/admin/admin-agent.ts");
    await assert.rejects(
      () =>
        runAdminAgentPush({
          user: ADMIN_USER,
          pendingFixId: "non-existent-fix-id"
        }),
      /Pending fix not found/i
    );
  } finally {
    delete process.env.BOOTRISE_SELF_REPO_ROOT;
    process.chdir(originalCwd);
    rmSync(root, { recursive: true, force: true });
  }
});

test("admin agent honors kill switch", async () => {
  const originalCwd = process.cwd();
  const root = setupSelfRepo();
  process.chdir(root);

  try {
    const { updateKillSwitches } = await import("../src/lib/admin/kill-switches.ts");
    const { runAdminAgentChat } = await import("../src/lib/admin/admin-agent.ts");

    updateKillSwitches({ disableAdminAgent: true });
    await assert.rejects(
      () => runAdminAgentChat({ user: ADMIN_USER, message: "hi" }),
      /Admin self-agent is disabled/i
    );
    updateKillSwitches({ disableAdminAgent: false });
  } finally {
    delete process.env.BOOTRISE_SELF_REPO_ROOT;
    process.chdir(originalCwd);
    rmSync(root, { recursive: true, force: true });
  }
});
