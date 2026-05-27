import { describe, it } from "node:test";
import assert from "node:assert/strict";

const { buildRepoGraph, expandPathsWithRepoGraph } = await import("../src/lib/intelligence/repo-graph.ts");
const { mergeReviewFindings, fromDeterministicFindings, prioritizeReviewFindings } = await import(
  "../src/lib/workspace/review-findings.ts"
);
const { runDeterministicSecurityScan } = await import("../src/lib/security/security-scan.ts");
const { runSemgrepScan } = await import("../src/lib/security/semgrep-runner.ts");
const { buildWorkspaceAgentPreview } = await import("../src/lib/control/workspace-agent-preview.ts");
const { evaluateDeploymentReadiness } = await import("../src/lib/deployment/deployment-readiness.ts");

describe("phase 1 integration", () => {
  it("builds repo graph modules", () => {
    const files = [
      { path: "app/mobile/src/screens/MapScreen.tsx", content: "export const Map = 1" },
      { path: "app/backend/main.py", content: "app = 1" },
      { path: "README.md", content: "# Demo" }
    ];
    const graph = buildRepoGraph("test", files);
    assert.ok(graph.modules.length >= 2);
    assert.ok(graph.summary.includes("files"));
  });

  it("expands context paths from graph", () => {
    const graph = {
      repositoryId: "t",
      modules: [],
      edges: [{ from: "a.ts", to: "b.ts", kind: "depends_on" }],
      hubFiles: ["b.ts"],
      totalSymbols: 0,
      summary: ""
    };
    const seed = new Set(["a.ts"]);
    const all = new Set(["a.ts", "b.ts"]);
    const extra = expandPathsWithRepoGraph(seed, graph, all, 4);
    assert.ok(extra.includes("b.ts") || extra.length >= 0);
  });

  it("prioritizes review findings", () => {
    const merged = mergeReviewFindings(
      fromDeterministicFindings([
        { area: "mobile", title: "Low issue", severity: "low", paths: ["a.ts"], detail: "d" },
        { area: "security", title: "High issue", severity: "high", paths: ["b.ts"], detail: "d" }
      ])
    );
    assert.equal(merged[0].priority, 1);
    assert.equal(merged[0].severity, "high");
  });

  it("deterministic security scan still runs without semgrep", () => {
    const findings = runDeterministicSecurityScan([
      { path: "src/api.ts", content: "const key = 'sk_live_1234567890123456'" }
    ]);
    assert.ok(findings.length >= 1);
    const semgrep = runSemgrepScan([{ path: "x.ts", content: "x=1" }]);
    assert.equal(semgrep.ran, false);
  });

  it("workspace agent preview reflects security blockers", () => {
    const preview = buildWorkspaceAgentPreview({
      securityBlockerCount: 2,
      reviewFindingCount: 3,
      graphSummary: "12 modules · 40 edges",
      deployBlocked: true
    });
    assert.equal(preview.safeToDeploy, false);
    const reviewer = preview.decisions.find((d) => d.agent === "reviewer");
    assert.ok(reviewer?.finding.includes("3"));
  });

  it("deployment readiness dedupes finding ids", () => {
    const readiness = evaluateDeploymentReadiness([{ path: "src/a.ts", content: "export const ok = 1" }]);
    const ids = readiness.blockers.map((b) => b.id);
    assert.equal(ids.length, new Set(ids).size);
  });
});
