import { expect, test } from "playwright/test";
import { mockAdminApis } from "./support/mock-api";

test.beforeEach(async ({ page }) => {
  await mockAdminApis(page);
});

test("self-agent scope to patch-preview flow is visible", async ({ page }) => {
  await page.goto("/admin/self-agent");
  await expect(page.getByText("BootRise improves itself")).toBeVisible();
  await page.getByRole("button", { name: "Plan mission scope" }).click();
  await expect(page.getByText("Planned scope")).toBeVisible();
  await page.getByRole("button", { name: "Generate patch preview" }).click();
  await expect(page.getByText("Patch preview")).toBeVisible();
});
