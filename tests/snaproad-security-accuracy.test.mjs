import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const { runDeterministicSecurityScan } = await import("../src/lib/security/security-scan.ts");
const { evaluateDeploymentReadiness } = await import("../src/lib/deployment/deployment-readiness.ts");

const SNAPROAD_ROOT = join(
  process.env.SNAPROAD_REPO_ROOT ?? join(process.env.HOME ?? "", "Desktop/SnapRoad-Beta-Functional-RyanPM 2")
);

function loadSnapRoadSamples() {
  const paths = [
    "app/backend/.env.example",
    "app/backend/config.py",
    "app/backend/routes/webhooks.py"
  ];
  const files = [];
  for (const rel of paths) {
    try {
      files.push({ path: rel, content: readFileSync(join(SNAPROAD_ROOT, rel), "utf8") });
    } catch {
      /* skip if repo not on disk */
    }
  }
  return files;
}

describe("SnapRoad security scan accuracy", () => {
  it("does not flag .env.example or verified webhooks.py as critical secrets", () => {
    const files = loadSnapRoadSamples();
    if (files.length < 2) return;

    const findings = runDeterministicSecurityScan(files);
    const envExample = findings.filter((f) => f.file?.includes(".env.example") && f.severity === "critical");
    const webhook = findings.filter(
      (f) => f.file?.includes("webhooks.py") && f.title?.includes("Stripe webhook")
    );

    assert.equal(envExample.length, 0, `env.example critical: ${JSON.stringify(envExample.map((f) => f.title))}`);
    assert.equal(webhook.length, 0, `webhooks false positive: ${JSON.stringify(webhook)}`);
  });
});
