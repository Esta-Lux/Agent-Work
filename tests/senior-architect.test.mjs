import { describe, it } from "node:test";
import assert from "node:assert/strict";

const { classifyTaskIntent } = await import("../src/lib/ai/task-intent.ts");
const {
  buildEfficientModelContext,
  buildSeniorArchitectBrief,
  getContextDepthBudget,
  BOOTRISE_SENIOR_ARCHITECT_CONTRACT
} = await import("../src/lib/ai/senior-architect.ts");

const files = [
  { path: "src/a.ts", content: "export const a = 1;\n".repeat(200) },
  { path: "src/b.ts", content: "export const b = 2;" },
  { path: "src/c.ts", content: "export const c = 3;" }
];

describe("task intent", () => {
  it("classifies architecture and deep dive with senior mode", () => {
    const arch = classifyTaskIntent("What is the better architecture for billing and auth?");
    assert.equal(arch.kind, "architecture");
    assert.equal(arch.seniorArchitectMode, true);
    assert.equal(arch.depth, "deep");

    const dive = classifyTaskIntent("Deep dive root cause of checkout failures", { mode: "deep" });
    assert.equal(dive.kind, "deep_dive");
    assert.equal(dive.preferMultiPass, true);
  });

  it("uses light depth for short explain questions", () => {
    const explain = classifyTaskIntent("How does useRewards work?");
    assert.equal(explain.kind, "explain");
    assert.equal(explain.depth, "light");
  });

  it("maps security mode to security intent", () => {
    const sec = classifyTaskIntent("Add a button", { mode: "security" });
    assert.equal(sec.kind, "security");
    assert.equal(sec.suggestedMode, "security");
  });
});

describe("senior architect context", () => {
  it("builds brief with contract and brain rules", () => {
    const intent = classifyTaskIntent("Review entire codebase for risks");
    const brief = buildSeniorArchitectBrief({
      request: "Review entire codebase for risks",
      taskIntent: intent,
      brainRules: ["Never edit auth without approval"],
      scopeLockMessage: "Scope: rewards module only"
    });
    assert.ok(brief.includes(BOOTRISE_SENIOR_ARCHITECT_CONTRACT.slice(0, 40)));
    assert.ok(brief.includes("Never edit auth"));
    assert.ok(brief.includes("Scope:"));
  });

  it("efficient context respects depth budget and deep-read only", () => {
    const plan = {
      totalFilesInCorpus: 3,
      deepRead: [
        { path: "src/a.ts", mode: "deep_read", reason: "test" },
        { path: "src/b.ts", mode: "deep_read", reason: "test" }
      ],
      reference: [{ path: "src/c.ts", mode: "reference", reason: "test" }],
      excluded: [],
      injectedRules: [],
      estimatedChars: 1000,
      estimatedTokens: 250,
      confidence: 0.8,
      summary: "test"
    };
    const light = buildEfficientModelContext(files, plan, "light");
    assert.ok(light.block.includes("src/a.ts"));
    assert.ok(light.block.includes("src/b.ts"));
    assert.ok(!light.block.includes("export const c"));
    assert.ok(light.filesIncluded <= getContextDepthBudget("light").maxDeepFiles);
  });
});
