import { afterEach, describe, it } from "node:test";
import assert from "node:assert/strict";

describe("security scan", () => {
  it("flags service role in client path", async () => {
    const { runSecurityScan } = await import("../src/lib/security/security-scan.ts");
    const findings = runSecurityScan([
      {
        path: "src/components/app.tsx",
        content:
          "import { createClient } from '@supabase/supabase-js';\nconst supabase = createClient(url, 'sb_secret_abcdefghijklmnopqrstuvwxyz');"
      }
    ]);
    assert.ok(findings.some((f) => f.severity === "critical"));
  });
});

describe("project brain file index", () => {
  it("skips unchanged files by hash", async () => {
    const { indexProjectFiles } = await import("../src/lib/project-brain/file-indexer.ts");
    const files = [{ path: "src/a.ts", content: "export const a = 1" }];
    const projectId = `proj_index_${Date.now()}`;
    const first = await indexProjectFiles({
      orgId: "org_test",
      projectId,
      files
    });
    assert.equal(first.indexed, 1);
    const second = await indexProjectFiles({
      orgId: "org_test",
      projectId,
      files
    });
    assert.equal(second.skipped, 1);
    assert.equal(second.indexed, 0);
  });
});

describe("credit store", () => {
  const originalCreditEnv = {
    BOOTRISE_ENFORCE_CREDITS: process.env.BOOTRISE_ENFORCE_CREDITS
  };

  afterEach(() => {
    restoreEnv("BOOTRISE_ENFORCE_CREDITS", originalCreditEnv.BOOTRISE_ENFORCE_CREDITS);
  });

  it("charges and reduces remaining balance", async () => {
    process.env.BOOTRISE_ENFORCE_CREDITS = "1";
    const { getCreditBalance, chargeCredits } = await import("../src/lib/usage/credit-store.ts");
    const orgId = `org_credit_test_${Date.now()}`;
    const before = await getCreditBalance(orgId);
    assert.ok(before.remaining > 0);
    const after = await chargeCredits({ orgId, userId: "u1", action: "context_gate" });
    assert.ok(after.remaining < before.remaining);
  });

  it("charges explicit credit amount from model route estimate", async () => {
    process.env.BOOTRISE_ENFORCE_CREDITS = "1";
    const { getCreditBalance, chargeCredits } = await import("../src/lib/usage/credit-store.ts");
    const orgId = `org_credit_exact_${Date.now()}`;
    const before = await getCreditBalance(orgId);
    const amount = 750;
    const after = await chargeCredits({
      orgId,
      userId: "u1",
      action: "code_review",
      credits: amount
    });
    assert.equal(before.usedCredits + amount, after.usedCredits);
    assert.equal(before.remaining - amount, after.remaining);
  });
});

function restoreEnv(key, value) {
  if (typeof value === "undefined") {
    delete process.env[key];
    return;
  }
  process.env[key] = value;
}

describe("context gate", () => {
  it("blocks vague feature requests", async () => {
    const { evaluateContextGate } = await import("../src/lib/control/context-gate.ts");
    const gate = evaluateContextGate({
      request: "add feature",
      files: [{ path: "a.ts", content: "" }]
    });
    assert.ok(gate.status === "needs_clarification" || gate.status === "blocked");
    assert.ok(gate.questions.length > 0);
  });
});

describe("deployment readiness", () => {
  it("returns score and status", async () => {
    const { evaluateDeploymentReadiness } = await import("../src/lib/deployment/deployment-readiness.ts");
    const report = evaluateDeploymentReadiness([{ path: "src/safe.ts", content: "export {}" }]);
    assert.ok(typeof report.score === "number");
    assert.ok(report.status);
  });
});

describe("architecture roadmap", () => {
  it("summarizes maturity and blockers from the workspace snapshot", async () => {
    const { buildArchitectureRoadmap } = await import("../src/lib/architecture/architecture-roadmap.ts");
    const roadmap = buildArchitectureRoadmap({
      files: [
        { path: "package.json", content: '{"dependencies":{"next":"14.2.30"}}' },
        { path: "src/app/page.tsx", content: "export default function Page() { return null; }" },
        { path: "src/app/api/demo/route.ts", content: "export async function GET() { return Response.json({ ok: true }); }" }
      ],
      brief: { authRequired: true, paymentsRequired: true, audience: "startup teams" }
    });
    assert.equal(roadmap.appType.includes("Next.js"), true);
    assert.ok(roadmap.securityPolicies.length > 0);
    assert.ok(roadmap.deploymentBlockers.length > 0);
  });
});

describe("control gate alignment guards", () => {
  it("blocks vague placeholder patches", async () => {
    const { runControlGate } = await import("../src/lib/control/control-gate.ts");
    const summary = await runControlGate({
      request: "add a real login flow",
      plan: {
        id: "plan_guard_1",
        intent: {
          request: "add a real login flow",
          interpretedGoal: "Add login flow",
          businessImpact: "Users can sign in"
        },
        impact: {
          files: ["src/components/login.tsx"],
          services: [],
          apis: [],
          databaseSchemas: [],
          blastRadius: []
        },
        risk: { level: "medium", reasons: ["auth"] },
        steps: [
          {
            id: "step_1",
            title: "Update login UI",
            domain: "frontend",
            summary: "Wire the login form",
            targetFiles: ["src/components/login.tsx"],
            dependsOn: []
          }
        ],
        validations: [],
        rollbackStrategy: "Revert login patch"
      },
      files: [{ path: "src/components/login.tsx", content: "export function Login() { return null; }" }],
      patches: [
        {
          path: "src/components/login.tsx",
          before: "export function Login() { return null; }",
          after: "export function Login() { /* TODO implement later */ return null; }",
          summary: "TODO implement later"
        }
      ]
    });
    assert.equal(summary.vagueOutput.blocked, true);
    assert.equal(summary.canApprove, false);
  });

  it("blocks end-to-end requests that only change one side", async () => {
    const { runControlGate } = await import("../src/lib/control/control-gate.ts");
    const summary = await runControlGate({
      request: "wire the frontend and backend end-to-end for login",
      plan: {
        id: "plan_guard_2",
        intent: {
          request: "wire the frontend and backend end-to-end for login",
          interpretedGoal: "Wire login end to end",
          businessImpact: "Users can sign in from UI"
        },
        impact: {
          files: ["src/app/api/login/route.ts", "src/components/login.tsx"],
          services: [],
          apis: [],
          databaseSchemas: [],
          blastRadius: []
        },
        risk: { level: "medium", reasons: ["cross-surface"] },
        steps: [
          {
            id: "step_1",
            title: "Wire login",
            domain: "backend",
            summary: "Connect frontend to backend",
            targetFiles: ["src/app/api/login/route.ts", "src/components/login.tsx"],
            dependsOn: []
          }
        ],
        validations: [],
        rollbackStrategy: "Revert login wiring"
      },
      files: [
        { path: "src/app/api/login/route.ts", content: "export async function POST() { return Response.json({ ok: true }); }" },
        { path: "src/components/login.tsx", content: "export function Login() { return null; }" }
      ],
      patches: [
        {
          path: "src/components/login.tsx",
          before: "export function Login() { return null; }",
          after: "export function Login() { return <button>Login</button>; }",
          summary: "Add login button"
        }
      ]
    });
    assert.equal(summary.taskCompletion.blocked, true);
    assert.equal(summary.canApprove, false);
  });
});
