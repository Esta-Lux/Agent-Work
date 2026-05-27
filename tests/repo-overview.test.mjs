import { describe, it } from "node:test";
import assert from "node:assert/strict";

const { isRepoOverviewQuestion, buildRepoOverviewReply } = await import(
  "../src/lib/workspace/repo-overview.ts"
);
const { isProductCodeReviewQuestion } = await import(
  "../src/lib/workspace/workspace-code-context.ts"
);

const snaproadLike = [
  {
    path: "README.md",
    content: "# SnapRoad Beta Functional\n\nDriver rewards and navigation monorepo.\n\n## Stack\nMobile + FastAPI + Vite web."
  },
  { path: "AGENTS.md", content: "# SnapRoad\nMapbox MarkerView rules for POIs." },
  { path: "memory/application_overview.md", content: "SnapRoad connects drivers to offers and safe navigation." },
  { path: "app/backend/main.py", content: "from fastapi import FastAPI\napp = FastAPI()" },
  { path: "app/mobile/src/screens/MapScreen.tsx", content: "export function MapScreen() {}" },
  { path: "app/frontend/package.json", content: '{"name":"snaproad-web"}' }
];

describe("repo overview", () => {
  it("detects what-is-this-repo questions", () => {
    assert.ok(
      isRepoOverviewQuestion(
        "What is this repo about? https://github.com/Esta-Lux/SnapRoad-Beta-Functional"
      )
    );
    assert.equal(isProductCodeReviewQuestion("What is this repo about? https://github.com/foo/bar"), false);
  });

  it("does not treat fix requests as overview", () => {
    assert.equal(isRepoOverviewQuestion("Fix the rewards screen bug"), false);
  });

  it("builds a product-oriented overview from docs", () => {
    const { reply, overviewFiles } = buildRepoOverviewReply({
      message: "What is this repo about?",
      files: snaproadLike
    });
    assert.ok(overviewFiles.some((f) => f.path === "README.md"));
    assert.match(reply, /WHAT THIS IS/i);
    assert.match(reply, /SnapRoad/i);
    assert.match(reply, /TECH STACK/i);
    assert.doesNotMatch(reply, /MarkerView implementation checklist/i);
  });
});
