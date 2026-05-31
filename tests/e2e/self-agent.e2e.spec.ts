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
  await expect(page.getByText("Patch preview").first()).toBeVisible();
  await page.getByRole("button", { name: "Approve patch" }).click();
  await page.getByRole("button", { name: "Run verify" }).click();
  await expect(page.getByText("self-agent-guard (0)")).toBeVisible();
  await page.getByRole("button", { name: "Prepare draft PR" }).click();
  await expect(page.getByText("Draft PR created")).toBeVisible();
});
