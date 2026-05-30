import { expect, type Page } from "playwright/test";

export class AdminPage {
  constructor(private readonly page: Page) {}

  async goto() {
    await this.page.goto("/admin");
  }

  async expectOverviewLoaded() {
    await expect(this.page.getByText("Launch readiness")).toBeVisible();
    await expect(this.page.getByText("Recent self-agent missions")).toBeVisible();
  }

  async navigateTo(label: string, heading: string) {
    await this.page.getByRole("link", { name: label }).click();
    await expect(this.page.getByRole("heading", { name: heading })).toBeVisible();
  }
}
