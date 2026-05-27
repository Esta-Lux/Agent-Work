import { describe, it } from "node:test";
import assert from "node:assert/strict";

const { buildTaskContextPack, formatContextPackSummary } = await import(
  "../src/lib/control/task-context-pack.ts"
);
const { userApprovedAssumptions, evaluateContextGate } = await import(
  "../src/lib/control/context-gate.ts"
);
const { evaluateTokenBudget, MAX_CONTEXT_CHARS } = await import(
  "../src/lib/control/token-waste-guard.ts"
);

const sampleFiles = [
  { path: "src/screens/RewardsScreen.tsx", content: "export function RewardsScreen() { return null; }" },
  { path: "src/hooks/useRewards.ts", content: "export function useRewards() { return []; }" },
  { path: "backend/routes/offers.py", content: "def list_offers(): pass" }
];

describe("task context pack", () => {
  it("builds a pack with scope and context plan", async () => {
    const pack = await buildTaskContextPack({
      request: "Fix rewards redemption history on RewardsScreen",
      files: sampleFiles,
      orgId: "org_test",
      projectId: "proj_test",
      repositoryId: "repo_test"
    });
    assert.ok(pack.taskKey);
    assert.ok(pack.contextPlan.deepRead.length >= 1);
    assert.ok(pack.scopeContract.allowedEditFiles.length >= 0);
    assert.match(formatContextPackSummary(pack), /Context:/);
    assert.ok(pack.taskIntent);
    assert.equal(pack.taskIntent.kind, "fix");
  });

  it("blocks when context exceeds budget", () => {
    const budget = evaluateTokenBudget(MAX_CONTEXT_CHARS + 1);
    assert.equal(budget.allowed, false);
    assert.ok(budget.reason);
  });

  it("proceeds when user approves assumptions on vague work intent", () => {
    const gate = evaluateContextGate({
      request: "Add subscription billing proceed with assumptions",
      files: sampleFiles,
      assumptionsApproved: true
    });
    assert.equal(gate.status, "proceed_with_assumptions");
    assert.ok(userApprovedAssumptions("proceed with assumptions"));
  });
});
