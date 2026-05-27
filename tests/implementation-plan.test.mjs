import { describe, it } from "node:test";
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
  it("charges and reduces remaining balance", async () => {
    const { getCreditBalance, chargeCredits } = await import("../src/lib/usage/credit-store.ts");
    const orgId = `org_credit_test_${Date.now()}`;
    const before = await getCreditBalance(orgId);
    assert.ok(before.remaining > 0);
    const after = await chargeCredits({ orgId, userId: "u1", action: "context_gate" });
    assert.ok(after.remaining < before.remaining);
  });

  it("charges explicit credit amount from model route estimate", async () => {
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
