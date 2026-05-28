import { test } from "node:test";
import assert from "node:assert/strict";
import { computeNextAction } from "../src/lib/workspace/next-action.ts";

const BASE = {
  repoConnected: true,
  brainIndexed: true,
  briefReady: true,
  hasFixReport: false,
  fixPendingApproval: false,
  controlBlocked: false,
  patchApproved: false,
  verificationPassed: false,
  securityBlockers: 0,
  exportComplete: false,
  providerOffline: false
};

test("Next action: no repo connected → Connect", () => {
  const action = computeNextAction({ ...BASE, repoConnected: false, briefReady: false });
  assert.equal(action.targetTab, "connect");
  assert.equal(action.severity, "primary");
  assert.equal(action.disabled, false);
});

test("Next action: security blockers → Review security (critical)", () => {
  const action = computeNextAction({ ...BASE, securityBlockers: 3 });
  assert.equal(action.targetTab, "security");
  assert.equal(action.severity, "critical");
  assert.match(action.reason, /3 security blockers/);
});

test("Next action: brief missing → Complete brief", () => {
  const action = computeNextAction({ ...BASE, briefReady: false });
  assert.equal(action.targetTab, "files");
});

test("Next action: control blocked → Resolve control block (warning)", () => {
  const action = computeNextAction({
    ...BASE,
    controlBlocked: true,
    controlStopReason: "Context Gate: missing module owner"
  });
  assert.equal(action.severity, "warning");
  assert.equal(action.targetTab, "fix");
  assert.match(action.reason, /Context Gate/);
});

test("Next action: pending approval → Review approval", () => {
  const action = computeNextAction({ ...BASE, hasFixReport: true, fixPendingApproval: true });
  assert.equal(action.targetTab, "fix");
  assert.match(action.label, /Review approval/);
});

test("Next action: no report yet → Run Fix", () => {
  const action = computeNextAction(BASE);
  assert.equal(action.targetTab, "fix");
  assert.match(action.label, /Run Fix/);
});

test("Next action: provider offline message is reflected when running Fix", () => {
  const action = computeNextAction({ ...BASE, providerOffline: true });
  assert.match(action.reason, /offline/i);
});

test("Next action: patch approved, verification missing → Verify", () => {
  const action = computeNextAction({
    ...BASE,
    hasFixReport: true,
    patchApproved: true,
    verificationPassed: false
  });
  assert.equal(action.targetTab, "verify");
});

test("Next action: verification passed → PR/Export", () => {
  const action = computeNextAction({
    ...BASE,
    hasFixReport: true,
    patchApproved: true,
    verificationPassed: true
  });
  assert.equal(action.targetTab, "export");
});

test("Next action: export complete → Start next change (info)", () => {
  const action = computeNextAction({
    ...BASE,
    hasFixReport: true,
    patchApproved: true,
    verificationPassed: true,
    exportComplete: true
  });
  assert.equal(action.severity, "info");
});
