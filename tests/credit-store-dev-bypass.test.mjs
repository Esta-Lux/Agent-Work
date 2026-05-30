import { afterEach, describe, it } from "node:test";
import assert from "node:assert/strict";

const originalEnv = {
  NODE_ENV: process.env.NODE_ENV,
  VERCEL_ENV: process.env.VERCEL_ENV,
  BOOTRISE_PREVIEW_DEV: process.env.BOOTRISE_PREVIEW_DEV,
  BOOTRISE_DEV_AUTH_BYPASS: process.env.BOOTRISE_DEV_AUTH_BYPASS,
  BOOTRISE_DEV_AUTH_STRICT: process.env.BOOTRISE_DEV_AUTH_STRICT,
  BOOTRISE_DEV_BYPASS_INCLUDED_CREDITS: process.env.BOOTRISE_DEV_BYPASS_INCLUDED_CREDITS
};

afterEach(() => {
  restoreEnv("NODE_ENV", originalEnv.NODE_ENV);
  restoreEnv("VERCEL_ENV", originalEnv.VERCEL_ENV);
  restoreEnv("BOOTRISE_PREVIEW_DEV", originalEnv.BOOTRISE_PREVIEW_DEV);
  restoreEnv("BOOTRISE_DEV_AUTH_BYPASS", originalEnv.BOOTRISE_DEV_AUTH_BYPASS);
  restoreEnv("BOOTRISE_DEV_AUTH_STRICT", originalEnv.BOOTRISE_DEV_AUTH_STRICT);
  restoreEnv("BOOTRISE_DEV_BYPASS_INCLUDED_CREDITS", originalEnv.BOOTRISE_DEV_BYPASS_INCLUDED_CREDITS);
});

describe("credit store dev auth bypass", () => {
  it("skips credit enforcement and charging while dev auth bypass is active", async () => {
    process.env.NODE_ENV = "development";
    process.env.BOOTRISE_DEV_AUTH_BYPASS = "1";
    delete process.env.BOOTRISE_DEV_AUTH_STRICT;
    process.env.BOOTRISE_DEV_BYPASS_INCLUDED_CREDITS = "4321";

    const { assertCreditsAvailable, chargeCredits, getCreditBalance } = await import("../src/lib/usage/credit-store.ts");
    const orgId = `org_credit_dev_${Date.now()}`;

    const before = await getCreditBalance(orgId);
    const required = await assertCreditsAvailable(orgId, "deploy_readiness", 5000);
    const after = await chargeCredits({ orgId, userId: "dev-user", action: "deploy_readiness", credits: 5000 });

    assert.equal(before.remaining, 4321);
    assert.equal(required, 5000);
    assert.deepEqual(after, before);
  });

  it("restores credit enforcement when strict mode disables the bypass", async () => {
    process.env.NODE_ENV = "development";
    process.env.BOOTRISE_DEV_AUTH_BYPASS = "1";
    process.env.BOOTRISE_DEV_AUTH_STRICT = "1";

    const { assertCreditsAvailable } = await import("../src/lib/usage/credit-store.ts");
    const orgId = `org_credit_strict_${Date.now()}`;

    await assert.rejects(() => assertCreditsAvailable(orgId, "deploy_readiness", 20_001), /Insufficient credits/);
  });

  it("keeps credit enforcement open for preview builds", async () => {
    process.env.NODE_ENV = "production";
    process.env.VERCEL_ENV = "preview";
    delete process.env.BOOTRISE_DEV_AUTH_BYPASS;
    delete process.env.BOOTRISE_DEV_AUTH_STRICT;
    process.env.BOOTRISE_DEV_BYPASS_INCLUDED_CREDITS = "2500";

    const { assertCreditsAvailable, chargeCredits, getCreditBalance } = await import("../src/lib/usage/credit-store.ts");
    const orgId = `org_credit_preview_${Date.now()}`;

    const before = await getCreditBalance(orgId);
    const required = await assertCreditsAvailable(orgId, "deploy_readiness", 5000);
    const after = await chargeCredits({ orgId, userId: "preview-user", action: "deploy_readiness", credits: 5000 });

    assert.equal(before.remaining, 2500);
    assert.equal(required, 5000);
    assert.deepEqual(after, before);
  });
});

function restoreEnv(key, value) {
  if (typeof value === "undefined") {
    delete process.env[key];
    return;
  }
  process.env[key] = value;
}
