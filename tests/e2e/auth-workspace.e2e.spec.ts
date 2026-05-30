import { expect, test } from "playwright/test";
import { mockWorkspaceApis } from "./support/mock-api";

test.beforeEach(async ({ page }) => {
  await mockWorkspaceApis(page);
});

test("strict-auth workspace storage state unlocks the main surface", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("BootRise Command Center")).toBeVisible();
  await expect(page.getByText("workspace-e2e@bootrise.local")).toBeVisible();
});

test("strict-auth workspace users are blocked from admin routes", async ({ page }) => {
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/\?error=admin_forbidden/);
  await expect(page.getByText("BootRise Command Center")).toBeVisible();
});
