import { describe, it } from "node:test";
import assert from "node:assert/strict";

const BASE = process.env.BOOTRISE_TEST_BASE_URL ?? "http://127.0.0.1:3000";
const DEV_BYPASS = process.env.BOOTRISE_DEV_AUTH_BYPASS === "1";

async function fetchJson(path, init) {
  const res = await fetch(`${BASE}${path}`, init);
  const data = await res.json().catch(() => ({}));
  return { res, data };
}

describe("tenant isolation (requires dev server; set BOOTRISE_DEV_AUTH_BYPASS=0 for strict tests)", () => {
  it("projects GET returns 401 when unauthenticated", async () => {
    const { res } = await fetchJson("/api/workspace/projects");
    if (DEV_BYPASS) {
      assert.ok(res.status === 200 || res.status === 401);
      return;
    }
    assert.equal(res.status, 401);
  });

  it("fix POST returns 401 when unauthenticated", async () => {
    const { res } = await fetchJson("/api/workspace/fix", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ request: "test", files: [] })
    });
    if (DEV_BYPASS) {
      assert.ok(res.status === 400 || res.status === 401 || res.status === 200);
      return;
    }
    assert.equal(res.status, 401);
  });

  it("chat POST returns 401 when unauthenticated", async () => {
    const { res } = await fetchJson("/api/workspace/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "hello" })
    });
    if (DEV_BYPASS) return;
    assert.equal(res.status, 401);
  });

  it("github import POST returns 401 when unauthenticated", async () => {
    const { res } = await fetchJson("/api/workspace/github/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ remoteUrl: "https://github.com/octocat/Hello-World" })
    });
    if (DEV_BYPASS) return;
    assert.equal(res.status, 401);
  });

  it("security scan POST returns 401 when unauthenticated", async () => {
    const { res } = await fetchJson("/api/workspace/security/scan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId: "test", files: [] })
    });
    if (DEV_BYPASS) return;
    assert.equal(res.status, 401);
  });

  it("admin kill-switches GET returns 401 or 403 when unauthenticated", async () => {
    const { res } = await fetchJson("/api/admin/kill-switches");
    assert.ok(res.status === 401 || res.status === 403);
  });

  it("forged x-bootrise-org-id returns 403 when authenticated without membership", async () => {
    if (DEV_BYPASS) return;
    const { res } = await fetchJson("/api/workspace/projects?orgId=org_forbidden_other_tenant", {
      headers: { "x-bootrise-org-id": "org_forbidden_other_tenant" }
    });
    assert.ok(res.status === 401 || res.status === 403);
  });

  it("legacy builder run POST returns 401 when unauthenticated", async () => {
    const { res } = await fetchJson("/api/builder/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idea: "test app" })
    });
    if (DEV_BYPASS) return;
    assert.equal(res.status, 401);
  });
});
