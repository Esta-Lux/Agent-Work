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

  async openGuide() {
    await this.page.getByRole("button", { name: "Guide" }).click();
    await expect(this.page.getByRole("dialog", { name: "BootRise guided tour" })).toBeVisible();
  }

  async compareProviders() {
    await this.page.getByRole("button", { name: "Compare providers" }).click();
    await expect(this.page.getByText("Provider Duel")).toBeVisible();
  }

  async approvePatch() {
    await this.page.getByRole("button", { name: "Approve patch" }).click();
    await expect(this.page.getByRole("button", { name: "Run Verify" })).toBeVisible();
  }

  async runVerify() {
    await this.page.getByRole("button", { name: "Run Verify" }).click();
    await this.page.waitForTimeout(500);
  }

  async runSecurityScan() {
    await this.page.getByRole("button", { name: "Run security scan" }).click();
    await expect(this.page.getByText("Security scan complete")).toBeVisible();
  }

  async runDeployReadiness() {
    await this.page.getByRole("button", { name: "Run deploy readiness" }).click();
    await expect(this.page.getByText("Deploy readiness complete")).toBeVisible();
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

  async runMultiPass() {
    await this.page.getByRole("button", { name: "Run multi-pass" }).click();
    await expect(this.page.getByText("Work unit execution")).toBeVisible();
  }

  async rerunWorkUnit() {
    await this.page.getByRole("button", { name: "Re-run unit" }).first().click();
    await expect(this.page.getByText("Work unit rerun complete")).toBeVisible();
  }

  async saveProductBrainCorrection() {
    await this.page
      .getByPlaceholder('Correct Product Brain: "That policy is wrong", "Add this business rule", ...')
      .fill("Correction: add edge-case review.");
    await this.page.getByRole("button", { name: "Save correction" }).click();
    await expect(this.page.getByText("Product Brain updated")).toBeVisible();
  }
}
