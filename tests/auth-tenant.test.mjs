import { describe, it } from "node:test";
import assert from "node:assert/strict";

const BASE = process.env.BOOTRISE_TEST_BASE_URL ?? "http://127.0.0.1:3000";

async function fetchJson(path, init) {
  const res = await fetch(`${BASE}${path}`, init);
  const data = await res.json().catch(() => ({}));
  return { res, data };
}

describe("tenant isolation (requires dev server with BOOTRISE_DEV_AUTH_BYPASS=0)", () => {
  it("projects GET returns 401 when unauthenticated", async () => {
    const { res } = await fetchJson("/api/workspace/projects");
    if (process.env.BOOTRISE_DEV_AUTH_BYPASS === "1") {
      assert.ok(res.status === 200 || res.status === 401);
      return;
    }
    assert.equal(res.status, 401);
  });

  it("admin kill-switches GET returns 401 or 403 when unauthenticated", async () => {
    const { res } = await fetchJson("/api/admin/kill-switches");
    assert.ok(res.status === 401 || res.status === 403);
  });
});
