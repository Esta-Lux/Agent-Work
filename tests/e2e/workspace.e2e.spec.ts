import { test } from "playwright/test";
import { WorkspacePage } from "./page-objects/workspace-page";
import { mockWorkspaceApis } from "./support/mock-api";

test.beforeEach(async ({ page }) => {
  await mockWorkspaceApis(page);
});

test("workspace supports the repo-to-draft-pr flow", async ({ page }) => {
  const workspace = new WorkspacePage(page);
  await workspace.goto();
  await workspace.expectLoaded();
  await workspace.connectRepo();
  await workspace.completeBrief();
  await workspace.runFix("Add Playwright coverage for the workspace and admin surfaces.");
  await workspace.approvePatch();
  await workspace.runVerify();
  await workspace.exportBundle();
  await workspace.openDraftPr();
});
