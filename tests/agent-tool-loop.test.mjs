import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const USER = { id: "admin-test", email: "admin@bootrise.local" };

function setupRepo() {
  const root = mkdtempSync(join(tmpdir(), "bootrise-tool-loop-"));
  mkdirSync(join(root, "src", "app", "api", "foo"), { recursive: true });
  mkdirSync(join(root, ".bootrise", "admin"), { recursive: true });
  writeFileSync(
    join(root, "src", "app", "api", "foo", "route.ts"),
    "export async function GET() { return new Response('ok'); }\n"
  );
  return root;
}

async function withRepo(fn) {
  const originalCwd = process.cwd();
  const root = setupRepo();
  process.env.BOOTRISE_SELF_REPO_ROOT = root;
  process.chdir(root);
  try {
    return await fn(root);
  } finally {
    delete process.env.BOOTRISE_SELF_REPO_ROOT;
    process.chdir(originalCwd);
    rmSync(root, { recursive: true, force: true });
  }
}

test("runToolLoop drives a tool call then finalizes via stubbed provider", async () => {
  await withRepo(async () => {
    const { updateKillSwitches } = await import("../src/lib/admin/kill-switches.ts");
    const loop = await import("../src/lib/admin/agent-tool-loop.ts");

    updateKillSwitches({
      disableAdvancedAdminAgent: false,
      disableAgentToolUse: false,
      disableAdminAgent: false
    });

    const scripted = [
      `TOOL_CALL: {"id":"a1","name":"list-routes","arguments":{}}`,
      "All routes acknowledged. Final answer: 1 route discovered."
    ];
    let idx = 0;
    const providerChat = async () => ({
      provider: "bootrise",
      model: "fake-test-model",
      text: scripted[idx++] ?? "Final answer fallback."
    });

    const result = await loop.runToolLoop({
      user: USER,
      orgId: "org-test",
      provider: "bootrise",
      systemPrompt: "You are a test agent.",
      userMessage: "List the routes please.",
      maxSteps: 5,
      providerChat
    });
    assert.equal(result.stopReason, "final_answer");
    assert.equal(result.calls.length, 1);
    assert.equal(result.calls[0].name, "list-routes");
    assert.ok(result.results[0].ok);
    assert.ok(result.finalMessage.includes("Final answer"));
  });
});

test("runToolLoop refuses when disableAgentToolUse is set", async () => {
  await withRepo(async () => {
    const { updateKillSwitches } = await import("../src/lib/admin/kill-switches.ts");
    const loop = await import("../src/lib/admin/agent-tool-loop.ts");
    updateKillSwitches({ disableAgentToolUse: true });
    try {
      await assert.rejects(
        () =>
          loop.runToolLoop({
            user: USER,
            orgId: "org-test",
            provider: "bootrise",
            systemPrompt: "you are a test",
            userMessage: "go"
          }),
        /tool use is disabled/i
      );
    } finally {
      updateKillSwitches({ disableAgentToolUse: false });
    }
  });
});

test("redactSecrets strips known key patterns", async () => {
  const { redactSecrets } = await import("../src/lib/admin/agent-tool-loop.ts");
  const dirty = "Here is a key sk-ABCDEFGHIJKLMNOPQRSTUV and another nvapi-ZZZZZZZZZZZZZZZZZZZZZZ.";
  const clean = redactSecrets(dirty);
  assert.ok(!clean.includes("sk-ABCDEFGHIJKLMNOPQRSTUV"));
  assert.ok(!clean.includes("nvapi-ZZZZZZZZZZZZZZZZZZZZZZ"));
  assert.ok(clean.includes("[redacted]"));
});
