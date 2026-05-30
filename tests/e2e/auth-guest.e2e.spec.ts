import { expect, test } from "playwright/test";

test("strict-auth workspace shows the sign-in gate for guests", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Sign in to your workspace" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Sign in" })).toBeVisible();
});

test("strict-auth admin redirects guests to sign-in", async ({ page }) => {
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/auth\/sign-in\?next=\/admin/);
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
});
