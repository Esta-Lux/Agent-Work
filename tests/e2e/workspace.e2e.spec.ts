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
  await workspace.connectRepo();
  await workspace.completeBrief();
  await workspace.saveProductBrainCorrection();
  await workspace.runFix("Add Playwright coverage for the workspace and admin surfaces.", { expectApprove: false });
  await workspace.compareProviders();
  await page.getByRole("button", { name: "Security" }).click();
  await expect(page.getByRole("button", { name: "Run security scan" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Run deploy readiness" })).toBeVisible();
  await page.getByRole("button", { name: "PR" }).click();
  await expect(page.getByText("PR composer")).toBeVisible();
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
