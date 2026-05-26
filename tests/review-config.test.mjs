import test from "node:test";
import assert from "node:assert/strict";
import { getReviewConfig, shouldUseMultiPassReview } from "../src/lib/workspace/review-config.ts";

test("shouldUseMultiPassReview activates for large corpora on broad review", () => {
  const config = getReviewConfig();
  assert.equal(
    shouldUseMultiPassReview(1101, "Review this codebase and list all issues and risks", { ...config, mode: "auto" }),
    true
  );
  assert.equal(shouldUseMultiPassReview(40, "Review this codebase and list all issues", { ...config, mode: "auto" }), false);
  assert.equal(
    shouldUseMultiPassReview(1101, "Review this codebase", { ...config, mode: "single" }),
    false
  );
  assert.equal(
    shouldUseMultiPassReview(200, "Review HUD while navigating", { ...config, mode: "multi" }),
    true
  );
});
