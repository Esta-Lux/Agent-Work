import { describe, it } from "node:test";
import assert from "node:assert/strict";

const {
  createSandboxSession,
  transitionSandbox,
  evaluateToolBoundary,
  isSandboxLifecycleEnabled
} = await import("../src/lib/sandbox/sandbox-lifecycle.ts");
const { supervisorAuthorizeTool } = await import("../src/lib/sandbox/sandbox-supervisor.ts");
const { isFixLoopV2Enabled } = await import("../src/lib/fix/issue-patch-loop.ts");

describe("phase 2 integration", () => {
  it("sandbox lifecycle transitions provisioning to ready", () => {
    const session = createSandboxSession("repo_test");
    assert.equal(session.state, "ready");
    assert.ok(session.workerId.startsWith("worker_"));
  });

  it("supervisor blocks disallowed shell commands", () => {
    const session = createSandboxSession("repo_cmd");
    const denied = supervisorAuthorizeTool({
      sessionId: session.sessionId,
      tool: "run_command",
      command: "curl https://evil.example"
    });
    assert.equal(denied.allowed, false);
    const allowed = supervisorAuthorizeTool({
      sessionId: session.sessionId,
      tool: "run_command",
      command: "npm run lint"
    });
    assert.equal(allowed.allowed, true);
  });

  it("tool boundary respects max calls", () => {
    const session = createSandboxSession("repo_budget");
    session.toolCalls = session.isolation.maxToolCalls;
    const boundary = evaluateToolBoundary(session, "read_file");
    assert.equal(boundary.allowed, false);
  });

  it("fix loop v2 flag defaults off", () => {
    const prev = process.env.BOOTRISE_FIX_LOOP_V2;
    delete process.env.BOOTRISE_FIX_LOOP_V2;
    assert.equal(isFixLoopV2Enabled(), false);
    if (prev) process.env.BOOTRISE_FIX_LOOP_V2 = prev;
  });

  it("sandbox lifecycle flag defaults off", () => {
    const prev = process.env.BOOTRISE_SANDBOX_LIFECYCLE;
    delete process.env.BOOTRISE_SANDBOX_LIFECYCLE;
    assert.equal(isSandboxLifecycleEnabled(), false);
    if (prev) process.env.BOOTRISE_SANDBOX_LIFECYCLE = prev;
  });

  it("invalid lifecycle transition lands in error", () => {
    const session = createSandboxSession("repo_err");
    transitionSandbox(session.sessionId, "executing");
    const after = transitionSandbox(session.sessionId, "provisioning");
    assert.equal(after?.state, "error");
  });
});
