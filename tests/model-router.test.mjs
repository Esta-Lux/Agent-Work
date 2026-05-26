import assert from "node:assert/strict";
import test from "node:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

test("model router keeps small work on BootRise fast mode", async () => {
  const cwd = mkdtempSync(join(tmpdir(), "bootrise-router-"));
  const prev = process.cwd();
  process.chdir(cwd);
  process.env.BOOTRISE_DEFAULT_PLAN = "internal";
  delete process.env.SUPABASE_URL;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;

  try {
    const { routeModel } = await import("../src/lib/ai/model-router.ts");
    const decision = await routeModel({
      requestedProvider: "bootrise",
      requestedMode: "fast",
      taskType: "fix",
      requestText: "Update button copy",
      filePaths: ["src/app/page.tsx"],
      fileCount: 1,
      orgId: "org_test",
      userId: "user_test",
      projectId: "project_test"
    });

    assert.equal(decision.allowed, true);
    assert.equal(decision.provider, "bootrise");
    assert.equal(decision.mode, "fast");
    assert.equal(decision.risk, "low");
    assert.equal(decision.premium, false);
  } finally {
    process.chdir(prev);
    rmSync(cwd, { recursive: true, force: true });
  }
});

test("model router maps OpenAI selection to premium mode", async () => {
  const cwd = mkdtempSync(join(tmpdir(), "bootrise-router-"));
  const prev = process.cwd();
  process.chdir(cwd);
  process.env.BOOTRISE_DEFAULT_PLAN = "internal";
  delete process.env.SUPABASE_URL;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;

  try {
    const { routeModel } = await import("../src/lib/ai/model-router.ts");
    const decision = await routeModel({
      requestedProvider: "openai",
      requestedMode: "fast",
      taskType: "code_review",
      requestText: "Review auth and billing before production",
      filePaths: ["src/lib/auth/session.ts", "src/lib/billing/stripe.ts"],
      fileCount: 2,
      premiumApproved: true,
      orgId: "org_test",
      userId: "user_test",
      projectId: "project_test"
    });

    assert.equal(decision.allowed, true);
    assert.equal(decision.provider, "openai");
    assert.equal(decision.mode, "premium");
    assert.equal(decision.risk, "high");
    assert.equal(decision.premium, true);
  } finally {
    process.chdir(prev);
    rmSync(cwd, { recursive: true, force: true });
  }
});

test("premium route blocks without explicit approval", async () => {
  const cwd = mkdtempSync(join(tmpdir(), "bootrise-router-"));
  const prev = process.cwd();
  process.chdir(cwd);
  process.env.BOOTRISE_DEFAULT_PLAN = "internal";
  delete process.env.SUPABASE_URL;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;

  try {
    const { routeModel } = await import("../src/lib/ai/model-router.ts");
    const decision = await routeModel({
      requestedProvider: "openai",
      requestedMode: "premium",
      taskType: "fix",
      requestText: "Refactor dashboard",
      fileCount: 4,
      premiumApproved: false,
      orgId: "org_test",
      userId: "user_test",
      projectId: "project_test"
    });

    assert.equal(decision.allowed, false);
    assert.match(decision.blockReason ?? "", /requires explicit approval/i);
  } finally {
    process.chdir(prev);
    rmSync(cwd, { recursive: true, force: true });
  }
});

test("free quota blocks premium credits", async () => {
  const cwd = mkdtempSync(join(tmpdir(), "bootrise-router-"));
  const prev = process.cwd();
  process.chdir(cwd);
  delete process.env.SUPABASE_URL;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;

  try {
    const { routeModel } = await import("../src/lib/ai/model-router.ts");
    const decision = await routeModel({
      requestedProvider: "openai",
      requestedMode: "premium",
      taskType: "fix",
      requestText: "Fix auth session bug",
      filePaths: ["src/auth/session.ts"],
      fileCount: 1,
      premiumApproved: true,
      orgId: "org_test",
      userId: "user_test",
      projectId: "project_test",
      plan: "free"
    });

    assert.equal(decision.allowed, false);
    assert.match(decision.blockReason ?? "", /premium model credit/i);
  } finally {
    process.chdir(prev);
    rmSync(cwd, { recursive: true, force: true });
  }
});
