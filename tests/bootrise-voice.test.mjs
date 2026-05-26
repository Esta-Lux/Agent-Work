import assert from "node:assert/strict";
import test from "node:test";

test("BootRise voice builds code review prompt with persona", async () => {
  const { buildCodeReviewSystemPrompt, sanitizeUserFacingText, formatBootriseOpening, BOOTRISE_VOICE_PRINCIPLES } =
    await import("../src/lib/ai/bootrise-voice.ts");
  const prompt = buildCodeReviewSystemPrompt("SnapRoad", "devops");
  assert.match(prompt, /CI\/CD/i);
  assert.match(prompt, /ARCHITECTURAL READ/i);
  assert.match(formatBootriseOpening("test."), /architectural awareness/i);
  assert.match(BOOTRISE_VOICE_PRINCIPLES, /trusted architect/i);
  assert.equal(sanitizeUserFacingText("  hello  "), "hello");
});

test("BootRise voice sanitizes downstream impact wording", async () => {
  const { sanitizeUserFacingText } = await import("../src/lib/ai/bootrise-voice.ts");
  const out = sanitizeUserFacingText("Watch the blast radius on auth.");
  assert.match(out, /downstream impact/i);
});
