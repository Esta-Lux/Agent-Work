import { expect, type Page } from "playwright/test";

export class WorkspacePage {
  constructor(private readonly page: Page) {}

  async goto() {
    await this.page.goto("/");
  }

  async expectLoaded() {
    await expect(this.page.getByText("BootRise Command Center")).toBeVisible();
    await expect(this.page.getByRole("button", { name: "Connect repo", exact: true })).toBeVisible();
  }

  async connectRepo() {
    await this.page.getByLabel("GitHub URL").fill("https://github.com/Esta-Lux/Agent-Work");
    await this.page.getByRole("button", { name: "Connect repo", exact: true }).click();
    await expect(this.page.getByRole("button", { name: "Complete brief" })).toBeVisible();
    await expect(this.page.getByText("src/app/page.tsx")).toBeVisible();
  }

  async completeBrief() {
    await expect(this.page.getByLabel("Product name")).toHaveValue("Agent Work");
    await this.page.getByRole("button", { name: "Complete brief" }).click();
    await expect(this.page.getByLabel("Fix request")).toBeVisible();
  }

  async runFix(request: string) {
    await this.page.getByLabel("Fix request").fill(request);
    await this.page.getByRole("button", { name: "Run Fix" }).click();
    const useSinglePass = this.page.getByRole("button", { name: "Use single-pass fix" });
    if (await useSinglePass.isVisible().catch(() => false)) {
      await useSinglePass.click();
    }
    await expect(this.page.getByRole("button", { name: "Approve patch" })).toBeVisible();
  }

  async approvePatch() {
    await this.page.getByRole("button", { name: "Approve patch" }).click();
    await expect(this.page.getByRole("button", { name: "Run Verify" })).toBeVisible();
  }

  async runVerify() {
    await this.page.getByRole("button", { name: "Run Verify" }).click();
    await this.page.waitForTimeout(500);
  }

  async exportBundle() {
    const exportButton = this.page.getByRole("button", { name: "Export bundle" }).first();
    if (await exportButton.isVisible().catch(() => false)) {
      await exportButton.click();
      await expect(this.page.getByText("Export bundle saved to /tmp/bootrise-export.zip")).toBeVisible();
    }
  }

  async openDraftPr() {
    await this.page.getByRole("button", { name: "Open draft PR" }).click();
    await expect(this.page.getByText("https://github.com/Esta-Lux/Agent-Work/pull/123")).toBeVisible();
  }
}
