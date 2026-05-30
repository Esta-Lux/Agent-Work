import { test } from "playwright/test";
import { AdminPage } from "./page-objects/admin-page";
import { mockAdminApis } from "./support/mock-api";

test.beforeEach(async ({ page }) => {
  await mockAdminApis(page);
});

test("admin surfaces load and navigate across core sections", async ({ page }) => {
  const admin = new AdminPage(page);
  await admin.goto();
  await admin.expectOverviewLoaded();
  await admin.navigateTo("Providers", "AI provider health");
  await admin.navigateTo("Control", "Control layer");
  await admin.navigateTo("Security", "Security detections");
  await admin.navigateTo("Audit", "Operational audit");
});
