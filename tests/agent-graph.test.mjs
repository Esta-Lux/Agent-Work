import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const USER = { id: "admin-test", email: "admin@bootrise.local" };

function setupRepo() {
  const root = mkdtempSync(join(tmpdir(), "bootrise-agent-graph-"));
  mkdirSync(join(root, "src", "lib"), { recursive: true });
  mkdirSync(join(root, "src", "app", "api", "foo"), { recursive: true });
  mkdirSync(join(root, ".bootrise", "admin"), { recursive: true });
  writeFileSync(
    join(root, "src", "app", "api", "foo", "route.ts"),
    "export async function GET() { return new Response('ok'); }\n"
  );
  writeFileSync(join(root, "src", "lib", "util.ts"), "export const helper = 1;\n");
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

test("runAgentGraph routes planner → coder → reviewer with stubbed provider and persists runs", async () => {
  await withRepo(async (root) => {
    const { updateKillSwitches } = await import("../src/lib/admin/kill-switches.ts");
    const { runAgentGraph, listAgentRuns } = await import("../src/lib/admin/agent-graph.ts");

    updateKillSwitches({
      disableAdvancedAdminAgent: false,
      disableAgentToolUse: false,
      disableAdminAgent: false,
      disableFixExecution: false
    });

    const plannerJson = JSON.stringify({
      interpretedGoal: "Add helper",
      businessImpact: "Improves clarity",
      impactedFiles: ["src/lib/util.ts"],
      steps: [{ title: "Edit util", summary: "Adjust constant", targetFiles: ["src/lib/util.ts"] }],
      rollbackStrategy: "Revert commit"
    });
    const coderJson = JSON.stringify({
      patches: [
        {
          path: "src/lib/util.ts",
          before: "export const helper = 1;\n",
          after: "export const helper = 2;\n",
          summary: "Bump helper constant"
        }
      ]
    });
    const reviewerJson = JSON.stringify({ verdict: "approve", findings: [] });

    const responses = new Map([
      ["planner", `\`\`\`json\n${plannerJson}\n\`\`\``],
      ["coder", `\`\`\`json\n${coderJson}\n\`\`\``],
      ["reviewer", `\`\`\`json\n${reviewerJson}\n\`\`\``]
    ]);
    const callOrder = [];
    const providerChat = async ({ system }) => {
      const which = system && system.includes("Planner")
        ? "planner"
        : system && system.includes("Coder")
        ? "coder"
        : "reviewer";
      callOrder.push(which);
      return { provider: "bootrise", model: "fake", text: responses.get(which) ?? "{}" };
    };

    const result = await runAgentGraph({
      user: USER,
      orgId: "org-test",
      request: "Update helper constant",
      provider: "bootrise",
      pendingFixId: "pf_test_123",
      providerChat
    });

    assert.deepEqual(callOrder.slice(0, 3), ["planner", "coder", "reviewer"]);
    assert.equal(result.runs.length, 3);
    assert.equal(result.runs[0].agent, "planner");
    assert.equal(result.runs[1].agent, "coder");
    assert.equal(result.runs[2].agent, "reviewer");
    assert.equal(result.review.verdict, "approve");
    assert.equal(result.patches.length, 1);
    assert.equal(result.patches[0].path, "src/lib/util.ts");
    assert.ok(result.plan.intent.interpretedGoal.includes("Add helper"));

    const persisted = listAgentRuns({ pendingFixId: "pf_test_123", limit: 10 });
    assert.equal(persisted.length, 3);
    assert.ok(persisted.every((row) => row.pendingFixId === "pf_test_123"));

    assert.ok(existsSync(join(root, ".bootrise", "admin", "agent-runs.jsonl")));
    const raw = readFileSync(join(root, ".bootrise", "admin", "agent-runs.jsonl"), "utf8");
    assert.ok(raw.includes("planner"));
    assert.ok(raw.includes("coder"));
    assert.ok(raw.includes("reviewer"));
  });
});

test("runAgentGraph refuses when disableAdvancedAdminAgent is set", async () => {
  await withRepo(async () => {
    const { updateKillSwitches } = await import("../src/lib/admin/kill-switches.ts");
    const { runAgentGraph } = await import("../src/lib/admin/agent-graph.ts");

    updateKillSwitches({ disableAdvancedAdminAgent: true });
    try {
      await assert.rejects(
        () =>
          runAgentGraph({
            user: USER,
            orgId: "org-test",
            request: "noop",
            provider: "bootrise",
            providerChat: async () => ({ provider: "bootrise", model: "fake", text: "{}" })
          }),
        /advanced admin agent/i
      );
    } finally {
      updateKillSwitches({ disableAdvancedAdminAgent: false });
    }
  });
});
