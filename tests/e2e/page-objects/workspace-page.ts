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
    await expect(this.page.getByText("src/app/page.tsx", { exact: true })).toBeVisible();
  }

  async completeBrief() {
    await expect(this.page.getByLabel("Product name")).toHaveValue("Agent Work");
    await this.page.getByRole("button", { name: "Complete brief" }).click();
    await expect(this.page.getByLabel("Fix request")).toBeVisible();
  }

  async runFix(request: string, options?: { expectApprove?: boolean; autoSinglePass?: boolean }) {
    await this.page.getByLabel("Fix request").fill(request);
    await this.page.getByRole("button", { name: "Run Fix" }).click();
    const approveAssumptions = this.page.getByRole("button", { name: "Approve assumptions" });
    const approvePatch = this.page.getByRole("button", { name: "Approve patch" });
    const runMultiPass = this.page.getByRole("button", { name: "Run multi-pass" });
    const useSinglePass = this.page.getByRole("button", { name: "Use single-pass fix" });
    for (let attempt = 0; attempt < 2; attempt += 1) {
      await Promise.race([
        approveAssumptions.waitFor({ state: "visible", timeout: 4000 }),
        approvePatch.waitFor({ state: "visible", timeout: 4000 }),
        runMultiPass.waitFor({ state: "visible", timeout: 4000 }),
        useSinglePass.waitFor({ state: "visible", timeout: 4000 })
      ]).catch(() => undefined);
      if (!(await approveAssumptions.isVisible().catch(() => false))) break;
      await approveAssumptions.click();
      await this.page.getByRole("button", { name: "Run Fix" }).click();
    }
    if (options?.autoSinglePass !== false && await useSinglePass.isVisible().catch(() => false)) {
      await useSinglePass.click();
    }
    if (options?.expectApprove !== false) {
      await expect(approvePatch).toBeVisible();
    }
  }

  async openGuide() {
    await this.page.getByRole("button", { name: "Guide" }).click();
    await expect(this.page.getByRole("dialog", { name: "BootRise guided tour" })).toBeVisible();
    await this.page.getByRole("button", { name: "Skip tour" }).click();
  }

  async compareProviders() {
    await this.page.getByRole("button", { name: "Compare providers" }).click();
    await expect(this.page.getByText("Provider duel", { exact: true })).toBeVisible();
  }

  async approvePatch() {
    const approvePatch = this.page.getByRole("button", { name: "Approve patch" });
    if (!(await approvePatch.isVisible().catch(() => false))) {
      const approveAssumptions = this.page.getByRole("button", { name: "Approve assumptions" });
      if (await approveAssumptions.isVisible().catch(() => false)) {
        await approveAssumptions.click();
        await this.page.getByRole("button", { name: "Run Fix" }).click();
      }
    }
    await expect(approvePatch).toBeVisible();
    await approvePatch.click();
    await expect(this.page.getByRole("button", { name: "Run Verify" })).toBeVisible();
  }

  async runVerify() {
    await this.page.getByRole("button", { name: "Run Verify" }).click();
    await this.page.waitForTimeout(500);
  }

  async runSecurityScan() {
    await this.page.getByRole("button", { name: "Run security scan" }).click();
    await expect(this.page.getByText("Security scan complete", { exact: true })).toBeVisible();
  }

  async runDeployReadiness() {
    await this.page.getByRole("button", { name: "Run deploy readiness" }).click();
    await expect(this.page.getByText("Deploy readiness complete", { exact: true })).toBeVisible();
  }

  async exportBundle() {
    const exportButton = this.page.getByRole("button", { name: "Export bundle" }).first();
    if (await exportButton.isVisible().catch(() => false)) {
      await exportButton.click();
      await expect(this.page.getByText("Export bundle saved to /tmp/bootrise-export.zip")).toBeVisible();
    }
  }

  async openDraftPr() {
    const openDraftPrButton = this.page.getByRole("button", { name: "Open draft PR" });
    await expect(openDraftPrButton).toBeEnabled();
    await openDraftPrButton.click();
    await expect(this.page.getByText("https://github.com/Esta-Lux/Agent-Work/pull/123")).toBeVisible();
  }

  async runMultiPass(): Promise<boolean> {
    const approveAssumptions = this.page.getByRole("button", { name: "Approve assumptions" });
    if (await approveAssumptions.isVisible().catch(() => false)) {
      await approveAssumptions.click();
      await this.page.getByRole("button", { name: "Run Fix" }).click();
    }
    const runMultiPassButton = this.page.getByRole("button", { name: "Run multi-pass" });
    if (!(await runMultiPassButton.isVisible().catch(() => false))) {
      const useSinglePass = this.page.getByRole("button", { name: "Use single-pass fix" });
      if (await useSinglePass.isVisible().catch(() => false)) {
        await useSinglePass.click();
      }
      return false;
    }
    await runMultiPassButton.click();
    await expect(this.page.getByText("Work unit execution")).toBeVisible();
    return true;
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
  }
}
