import { expect, test } from "playwright/test";
import { WorkspacePage } from "./page-objects/workspace-page";
import { mockWorkspaceApis } from "./support/mock-api";

test.beforeEach(async ({ page }) => {
  await mockWorkspaceApis(page);
});

test("workspace covers onboarding import fix approval verify and PR composer", async ({ page }) => {
  const workspace = new WorkspacePage(page);
  await workspace.goto();
  await workspace.expectLoaded();
  await workspace.openGuide();
  await page.getByRole("button", { name: "Finish" }).click();
  await workspace.connectRepo();
  await workspace.completeBrief();
  await workspace.saveProductBrainCorrection();
  await workspace.runFix("Add Playwright coverage for the workspace and admin surfaces.");
  await workspace.compareProviders();
  await workspace.approvePatch();
  await workspace.runSecurityScan();
  await workspace.runDeployReadiness();
  await workspace.runVerify();
  await page.getByLabel("Commit message").fill("BootRise: ship e2e matrix");
  await page.getByLabel("PR title").fill("BootRise: ship e2e matrix");
  await workspace.openDraftPr();
});

test("workspace runs multi-pass and supports work-unit rerun", async ({ page }) => {
  const workspace = new WorkspacePage(page);
  await workspace.goto();
  await workspace.expectLoaded();
  await workspace.connectRepo();
  await workspace.completeBrief();
  await workspace.runFix("Run a multi-pass fix across frontend and tests.");
  await workspace.runMultiPass();
  await workspace.rerunWorkUnit();
});

test("workspace roadmap guidance remains visible while planning", async ({ page }) => {
  const workspace = new WorkspacePage(page);
  await workspace.goto();
  await workspace.expectLoaded();
  await workspace.connectRepo();
  await workspace.completeBrief();
  await expect(page.getByText("Architecture roadmap")).toBeVisible();
  await expect(page.getByText("Approval gate remains required")).toBeVisible();
});
