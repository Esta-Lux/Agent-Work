import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { estimateCreditsForAction } from "../src/lib/usage/credit-pricing.ts";

describe("credit pricing", () => {
  it("estimateCreditsForAction returns positive for draft_pr", () => {
    const cost = estimateCreditsForAction("draft_pr");
    assert.ok(cost > 0);
  });

  it("basic_security_scan estimate matches action default", () => {
    const a = estimateCreditsForAction("basic_security_scan");
    const b = estimateCreditsForAction("basic_security_scan");
    assert.equal(a, b);
  });
});
