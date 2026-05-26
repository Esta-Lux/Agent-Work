import test from "node:test";
import assert from "node:assert/strict";

process.env.BOOTRISE_SKIP_REGRESSION_EXEC = "1";
import { runControlGate, assertApproveAllowed } from "../src/lib/control/control-gate.ts";
import { runPatchGuard } from "../src/lib/control/patch-guard.ts";
import { buildScopeContract } from "../src/lib/control/scope-contract.ts";

const testRunId = Date.now().toString(36);

function minimalPlan(files, goal = "Fix rewards redemption history") {
  return {
    id: "plan_test",
    intent: {
      request: goal,
      interpretedGoal: goal,
      businessImpact: "Improve rewards flow."
    },
    impact: {
      files,
      services: [],
      apis: [],
      databaseSchemas: [],
      blastRadius: "low"
    },
    risk: { level: "low", reasons: [] },
    steps: [],
    validations: [],
    rollbackStrategy: "Revert changed files."
  };
}

const corpus = [
  {
    path: "app/mobile/src/screens/RewardsScreen.tsx",
    content: "export default function Rewards() { return null; }\n"
  },
  {
    path: "app/backend/routes/offers.py",
    content: "def list_offers():\n    pass\n"
  }
];

test("runPatchGuard blocks forbidden auth zone", () => {
  const plan = minimalPlan(["app/mobile/src/screens/RewardsScreen.tsx"]);
  const withAuth = [
    ...corpus,
    { path: "app/auth/login.tsx", content: "export function login() {}\n" }
  ];
  const contract = buildScopeContract({ request: "fix rewards small", plan, files: withAuth });
  const guard = runPatchGuard({
    patches: [
      {
        path: "app/auth/login.tsx",
        before: "export function login() {}\n",
        after: "export function login() { return true; }\n",
        summary: "auth tweak",
        applied: false
      }
    ],
    contract,
    corpus: withAuth,
    request: "fix rewards small"
  });
  assert.equal(guard.blocked, true);
  assert.ok(guard.findings.some((f) => f.category === "forbidden" || f.category === "scope"));
});

test("runPatchGuard enforces diff file budget on small fix", () => {
  const plan = minimalPlan(["app/mobile/src/screens/RewardsScreen.tsx"]);
  const contract = buildScopeContract({ request: "small fix rewards", plan, files: corpus });
  const manyPatches = Array.from({ length: 6 }, (_, i) => ({
    path: `app/mobile/src/screens/File${i}.tsx`,
    before: "",
    after: "export {}\n",
    summary: "new",
    applied: false
  }));
  const guard = runPatchGuard({
    patches: manyPatches,
    contract,
    corpus: [
      ...corpus,
      ...manyPatches.map((p) => ({ path: p.path, content: "" }))
    ],
    request: "small fix rewards"
  });
  assert.equal(guard.blocked, true);
  assert.ok(guard.findings.some((f) => f.category === "diff_budget"));
});

test("runControlGate sets canApprove false when diff budget exceeded", async () => {
  const plan = minimalPlan(["app/mobile/src/screens/RewardsScreen.tsx"]);
  const extra = Array.from({ length: 8 }, (_, i) => ({
    path: `app/mobile/src/extra/File${i}.tsx`,
    content: "export {}\n"
  }));
  const files = [...corpus, ...extra];
  const patches = extra.map((f) => ({
    path: f.path,
    before: f.content,
    after: `${f.content}// edit\n`,
    summary: "bulk",
    applied: false
  }));
  const summary = await runControlGate({
    request: "small fix rewards",
    plan,
    files,
    patches,
    repositoryId: `test-diff-budget-${testRunId}-1`
  });
  assert.equal(summary.canApprove, false);
  assert.equal(summary.patchGuard.blocked, true);
  assert.ok(summary.stopReason);
});

test("assertApproveAllowed throws when patch guard blocked", async () => {
  const plan = minimalPlan(["app/mobile/src/screens/RewardsScreen.tsx"]);
  const extra = Array.from({ length: 8 }, (_, i) => ({
    path: `app/mobile/src/extra/File${i}.tsx`,
    content: "export {}\n"
  }));
  const files = [...corpus, ...extra];
  const patches = extra.map((f) => ({
    path: f.path,
    before: f.content,
    after: `${f.content}// edit\n`,
    summary: "bulk",
    applied: false
  }));
  const summary = await runControlGate({
    request: "small fix rewards",
    plan,
    files,
    patches,
    repositoryId: `test-diff-budget-${testRunId}-2`
  });
  assert.throws(() => assertApproveAllowed(summary), /exceeds budget|blocked|Control layer|Stopped after|outside the allowed/i);
});

test("runControlGate allows clean in-scope patch", async () => {
  const plan = minimalPlan(["app/mobile/src/screens/RewardsScreen.tsx"]);
  const summary = await runControlGate({
    request: "fix rewards history not showing",
    plan,
    files: corpus,
    repositoryId: `test-clean-patch-${testRunId}`,
    patches: [
      {
        path: "app/mobile/src/screens/RewardsScreen.tsx",
        before: "export default function Rewards() { return null; }\n",
        after: 'export default function Rewards() { return null; /* history list */ }\n',
        summary: "show redemption history in rewards screen",
        applied: false
      }
    ]
  });
  assert.equal(summary.patchGuard.blocked, false);
  assert.equal(summary.canApprove, true);
  assert.equal(summary.contextGate.status, "proceed_with_assumptions");
  assert.equal(summary.agentCoordination.canApply, true);
});

test("context gate asks questions before ambiguous feature work", async () => {
  const { evaluateContextGate } = await import("../src/lib/control/context-gate.ts");
  const gate = evaluateContextGate({
    request: "Add rewards history",
    files: corpus
  });
  assert.equal(gate.status, "needs_clarification");
  assert.ok(gate.questions.some((q) => q.id === "reward_states"));
});

test("security agent blocks forbidden file touches", async () => {
  const plan = minimalPlan(["app/mobile/src/screens/RewardsScreen.tsx"]);
  const withAuth = [
    ...corpus,
    { path: "app/auth/login.tsx", content: "export function login() {}\n" }
  ];
  const summary = await runControlGate({
    request: "small fix rewards history",
    plan,
    files: withAuth,
    repositoryId: `test-agent-security-${testRunId}`,
    patches: [
      {
        path: "app/auth/login.tsx",
        before: "export function login() {}\n",
        after: "export function login() { return true; }\n",
        summary: "auth tweak",
        applied: false
      }
    ]
  });
  assert.equal(summary.agentCoordination.canApply, false);
  assert.ok(summary.agentCoordination.decisions.some((d) => d.agent === "security" && d.blocksPatch));
});

test("runPatchGuard blocks formatting-only patches", () => {
  const plan = minimalPlan(["app/mobile/src/screens/RewardsScreen.tsx"]);
  const contract = buildScopeContract({ request: "fix rewards", plan, files: corpus });
  const guard = runPatchGuard({
    patches: [
      {
        path: "app/mobile/src/screens/RewardsScreen.tsx",
        before: "export default function Rewards() { return null; }\n",
        after: "export default function Rewards(){return null;}\n",
        summary: "format",
        applied: false
      }
    ],
    contract,
    corpus,
    request: "fix rewards"
  });
  assert.equal(guard.blocked, true);
});
