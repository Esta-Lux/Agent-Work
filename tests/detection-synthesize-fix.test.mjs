import test from "node:test";
import assert from "node:assert/strict";

const SECRET_REGEX = /(?:NVIDIA|OPENAI|GITHUB)_API_KEY|sk-[A-Za-z0-9]{16,}|ghp_[A-Za-z0-9]{20,}|nvapi-[A-Za-z0-9]{20,}/i;

const KINDS = [
  "auth_missing",
  "org_scoping_missing",
  "client_server_boundary",
  "audit_log_missing",
  "kill_switch_bypass",
  "runtime_failure_cluster",
  "usage_failure_spike",
  "pending_fix_failure",
  "security_finding"
];

function baseDetection(kind) {
  return {
    id: `det_${kind}`,
    kind,
    severity: kind === "client_server_boundary" || kind === "auth_missing" ? "critical" : "warning",
    title: `Test detection ${kind}`,
    description: `Synthetic ${kind} description used for unit test only.`,
    affectedPaths: ["src/app/api/workspace/foo/route.ts", "src/lib/workspace/bar.ts"],
    evidence: { route: "src/app/api/workspace/foo/route.ts" },
    suggestedAction: "Investigate scenario.",
    detectedAt: new Date().toISOString(),
    source: "scanner",
    status: "new"
  };
}

test("detectionToFixRequest produces clean request strings for every kind", async () => {
  const { detectionToFixRequest } = await import("../src/lib/admin/detections/synthesize-fix.ts");

  for (const kind of KINDS) {
    const detection = baseDetection(kind);
    const request = detectionToFixRequest(detection);
    assert.equal(typeof request, "string");
    assert.ok(request.length > 0);
    assert.ok(request.length < 600, `request too long for ${kind} (${request.length})`);
    const pathFreeKinds = new Set(["usage_failure_spike", "pending_fix_failure", "runtime_failure_cluster"]);
    if (!pathFreeKinds.has(kind)) {
      assert.ok(detection.affectedPaths.some((path) => request.includes(path)),
        `expected affectedPaths in request for ${kind}`);
    }
    assert.ok(!SECRET_REGEX.test(request), `secret regex unexpectedly matched output for ${kind}`);
  }
});

test("detectionToFixRequest redacts secret-looking strings", async () => {
  const { detectionToFixRequest } = await import("../src/lib/admin/detections/synthesize-fix.ts");
  const detection = baseDetection("security_finding");
  detection.description = "leaked sk-ABCDEFGHIJKLMNOPQR1234 in code";
  detection.suggestedAction = "rotate sk-ABCDEFGHIJKLMNOPQR1234 immediately";
  const request = detectionToFixRequest(detection);
  assert.ok(!request.includes("sk-ABCDEFGHIJKLMNOPQR1234"));
  assert.ok(request.includes("[redacted]"));
});
