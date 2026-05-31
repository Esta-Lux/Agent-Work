# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: workspace.e2e.spec.ts >> workspace security scan and deploy readiness gate the PR path
- Location: tests/e2e/workspace.e2e.spec.ts:50:5

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByText('Deploy readiness complete').or(getByText('Deployment readiness: ready for production.'))
Expected: visible
Timeout: 10000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 10000ms
  - waiting for getByText('Deploy readiness complete').or(getByText('Deployment readiness: ready for production.'))

```

```yaml
- dialog "Unhandled Runtime Error":
  - navigation:
    - button "previous" [disabled]:
      - img "previous"
    - button "next" [disabled]:
      - img "next"
    - text: 1 of 1 error
  - button "Close"
  - heading "Unhandled Runtime Error" [level=1]
  - paragraph: "TypeError: Cannot read properties of undefined (reading 'length')"
  - heading "Source" [level=2]
  - link "src/components/workspace/deployment-readiness-panel.tsx (55:13) @ length":
    - text: src/components/workspace/deployment-readiness-panel.tsx (55:13) @ length
    - img
  - text: "53 | 54 | function TextList({ title, items, tone }: { title: string; items: string[]; tone: \"red\" | \"amber\" | \"muted\" }) { > 55 | if (items.length === 0) return null; | ^ 56 | const color = tone === \"red\" ? \"text-red-300\" : tone === \"amber\" ? \"text-amber-300\" : \"text-text-ws-2\"; 57 | return ( 58 | <div>"
  - heading "Call Stack" [level=2]
  - button "Show collapsed frames"
```

# Test source

```ts
  1   | import { expect, type Page } from "playwright/test";
  2   | 
  3   | export class WorkspacePage {
  4   |   constructor(private readonly page: Page) {}
  5   | 
  6   |   async goto() {
  7   |     await this.page.goto("/");
  8   |   }
  9   | 
  10  |   async expectLoaded() {
  11  |     await expect(this.page.getByText("BootRise Command Center")).toBeVisible();
  12  |     await expect(this.page.getByRole("button", { name: "Connect repo", exact: true })).toBeVisible();
  13  |   }
  14  | 
  15  |   async connectRepo() {
  16  |     await this.page.getByLabel("GitHub URL").fill("https://github.com/Esta-Lux/Agent-Work");
  17  |     await this.page.getByRole("button", { name: "Connect repo", exact: true }).click();
  18  |     await expect(this.page.getByRole("button", { name: "Complete brief" })).toBeVisible();
  19  |     await expect(this.page.getByText("src/app/page.tsx", { exact: true })).toBeVisible();
  20  |   }
  21  | 
  22  |   async completeBrief() {
  23  |     await expect(this.page.getByLabel("Product name")).toHaveValue("Agent Work");
  24  |     await this.page.getByRole("button", { name: "Complete brief" }).click();
  25  |     await expect(this.page.getByLabel("Fix request")).toBeVisible();
  26  |   }
  27  | 
  28  |   async runFix(request: string, options?: { expectApprove?: boolean; autoSinglePass?: boolean }) {
  29  |     await this.page.getByLabel("Fix request").fill(request);
  30  |     await this.page.getByRole("button", { name: "Run Fix" }).click();
  31  |     const approveAssumptions = this.page.getByRole("button", { name: "Approve assumptions" });
  32  |     if (await approveAssumptions.isVisible().catch(() => false)) {
  33  |       await approveAssumptions.click();
  34  |       await this.page.getByRole("button", { name: "Run Fix" }).click();
  35  |     }
  36  |     const useSinglePass = this.page.getByRole("button", { name: "Use single-pass fix" });
  37  |     if (options?.autoSinglePass !== false && await useSinglePass.isVisible().catch(() => false)) {
  38  |       await useSinglePass.click();
  39  |     }
  40  |     if (options?.expectApprove !== false) {
  41  |       await expect(this.page.getByRole("button", { name: "Approve patch" })).toBeVisible();
  42  |     }
  43  |   }
  44  | 
  45  |   async openGuide() {
  46  |     await this.page.getByRole("button", { name: "Guide" }).click();
  47  |     await expect(this.page.getByRole("dialog", { name: "BootRise guided tour" })).toBeVisible();
  48  |     await this.page.getByRole("button", { name: "Skip tour" }).click();
  49  |   }
  50  | 
  51  |   async compareProviders() {
  52  |     await this.page.getByRole("button", { name: "Compare providers" }).click();
  53  |     await expect(this.page.getByText("Provider duel", { exact: true })).toBeVisible();
  54  |   }
  55  | 
  56  |   async approvePatch() {
  57  |     await this.page.getByRole("button", { name: "Approve patch" }).click();
  58  |     await expect(this.page.getByRole("button", { name: "Run Verify" })).toBeVisible();
  59  |   }
  60  | 
  61  |   async runVerify() {
  62  |     await this.page.getByRole("button", { name: "Run Verify" }).click();
  63  |     await this.page.waitForTimeout(500);
  64  |   }
  65  | 
  66  |   async runSecurityScan() {
  67  |     await this.page.getByRole("button", { name: "Run security scan" }).click();
  68  |     await expect(this.page.getByText("Security scan complete")).toBeVisible();
  69  |   }
  70  | 
  71  |   async runDeployReadiness() {
  72  |     await this.page.getByRole("button", { name: "Run deploy readiness" }).click();
  73  |     await expect(
  74  |       this.page
  75  |         .getByText("Deploy readiness complete")
  76  |         .or(this.page.getByText("Deployment readiness: ready for production."))
> 77  |     ).toBeVisible();
      |       ^ Error: expect(locator).toBeVisible() failed
  78  |   }
  79  | 
  80  |   async exportBundle() {
  81  |     const exportButton = this.page.getByRole("button", { name: "Export bundle" }).first();
  82  |     if (await exportButton.isVisible().catch(() => false)) {
  83  |       await exportButton.click();
  84  |       await expect(this.page.getByText("Export bundle saved to /tmp/bootrise-export.zip")).toBeVisible();
  85  |     }
  86  |   }
  87  | 
  88  |   async openDraftPr() {
  89  |     await this.page.getByRole("button", { name: "Open draft PR" }).click();
  90  |     await expect(this.page.getByText("https://github.com/Esta-Lux/Agent-Work/pull/123")).toBeVisible();
  91  |   }
  92  | 
  93  |   async runMultiPass() {
  94  |     await this.page.getByRole("button", { name: "Run multi-pass" }).click();
  95  |     await expect(this.page.getByText("Work unit execution")).toBeVisible();
  96  |   }
  97  | 
  98  |   async rerunWorkUnit() {
  99  |     await this.page.getByRole("button", { name: "Re-run unit" }).first().click();
  100 |     await expect(this.page.getByText("Work unit rerun complete")).toBeVisible();
  101 |   }
  102 | 
  103 |   async saveProductBrainCorrection() {
  104 |     await this.page
  105 |       .getByPlaceholder('Correct Product Brain: "That policy is wrong", "Add this business rule", ...')
  106 |       .fill("Correction: add edge-case review.");
  107 |     await this.page.getByRole("button", { name: "Save correction" }).click();
  108 |   }
  109 | }
  110 | 
```