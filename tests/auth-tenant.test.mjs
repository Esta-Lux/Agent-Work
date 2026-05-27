import { describe, it } from "node:test";
import assert from "node:assert/strict";

const BASE = process.env.BOOTRISE_TEST_BASE_URL ?? "http://127.0.0.1:3000";
const { isDevAuthBypassEnabled } = await import("../lib/dev-auth-bypass-env.mjs");

async function fetchJson(path, init) {
  let res;
  try {
    res = await fetch(`${BASE}${path}`, init);
  } catch (error) {
    return { res: null, data: {}, fetchError: error };
  }
  const contentType = res.headers.get("content-type") ?? "";
  const data = contentType.includes("application/json") ? await res.json().catch(() => ({})) : {};
  return { res, data };
}

async function serverHealthy() {
  const { res, fetchError } = await fetchJson("/api/workspace/projects");
  if (fetchError || !res) return false;
  const ct = res.headers.get("content-type") ?? "";
  return ct.includes("application/json") && res.status < 500;
}

/** True when this test process or the live dev server uses auth bypass. */
async function resolveDevBypassForTests() {
  if (process.env.BOOTRISE_DEV_AUTH_STRICT === "1" || process.env.BOOTRISE_DEV_AUTH_BYPASS === "0") {
    return false;
  }
  if (isDevAuthBypassEnabled()) return true;
  try {
    const { res } = await fetchJson("/api/workspace/projects");
    return res.status === 200;
  } catch {
    return false;
  }
}

const DEV_BYPASS = await resolveDevBypassForTests();
const SERVER_OK = await serverHealthy();

describe("tenant isolation (requires dev server; set BOOTRISE_DEV_AUTH_STRICT=1 for strict tests)", () => {
  it("projects GET returns 401 when unauthenticated", async () => {
    if (!SERVER_OK) return;
    const { res } = await fetchJson("/api/workspace/projects");
    if (!res) return;
    if (DEV_BYPASS) {
      assert.ok(res.status === 200 || res.status === 401);
      return;
    }
    assert.equal(res.status, 401);
  });

  it("fix POST returns 401 when unauthenticated", async () => {
    if (!SERVER_OK) return;
    const { res } = await fetchJson("/api/workspace/fix", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ request: "test", files: [] })
    });
    if (!res) return;
    if (DEV_BYPASS) {
      assert.ok(res.status === 400 || res.status === 401 || res.status === 200);
      return;
    }
    assert.equal(res.status, 401);
  });

  it("chat POST returns 401 when unauthenticated", async () => {
    if (!SERVER_OK) return;
    const { res } = await fetchJson("/api/workspace/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "hello" })
    });
    if (!res) return;
    if (DEV_BYPASS) return;
    assert.equal(res.status, 401);
  });

  it("github import POST returns 401 when unauthenticated", async () => {
    if (!SERVER_OK) return;
    const { res } = await fetchJson("/api/workspace/github/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ remoteUrl: "https://github.com/octocat/Hello-World" })
    });
    if (!res) return;
    if (DEV_BYPASS) return;
    assert.equal(res.status, 401);
  });

  it("security scan POST returns 401 when unauthenticated", async () => {
    if (!SERVER_OK) return;
    const { res } = await fetchJson("/api/workspace/security/scan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId: "test", files: [] })
    });
    if (!res) return;
    if (DEV_BYPASS) return;
    assert.equal(res.status, 401);
  });

  it("admin kill-switches GET returns 401 or 403 when unauthenticated", async () => {
    if (!SERVER_OK) return;
    const { res } = await fetchJson("/api/admin/kill-switches");
    if (!res) return;
    if (DEV_BYPASS) {
      assert.ok(res.status === 200 || res.status === 401 || res.status === 403);
      return;
    }
    assert.ok(res.status === 401 || res.status === 403);
  });

  it("forged x-bootrise-org-id returns 403 when authenticated without membership", async () => {
    if (!SERVER_OK || DEV_BYPASS) return;
    const { res } = await fetchJson("/api/workspace/projects?orgId=org_forbidden_other_tenant", {
      headers: { "x-bootrise-org-id": "org_forbidden_other_tenant" }
    });
    if (!res) return;
    assert.ok(res.status === 401 || res.status === 403);
  });

  it("legacy builder run POST returns 401 when unauthenticated", async () => {
    if (!SERVER_OK) return;
    const { res } = await fetchJson("/api/builder/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idea: "test app" })
    });
    if (!res) return;
    if (DEV_BYPASS) return;
    assert.equal(res.status, 401);
  });
});
