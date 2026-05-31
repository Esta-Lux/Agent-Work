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

Locator: getByText('Security scan complete')
Expected: visible
Error: strict mode violation: getByText('Security scan complete') resolved to 3 elements:
    1) <p class="font-medium text-ink">Security scan complete. Critical findings: 0.</p> aka getByText('Security scan complete.')
    2) <p class="mt-1 text-xs leading-5 text-text-ws-2">Security scan completed.</p> aka getByText('Security scan completed.')
    3) <p class="mt-1 text-xs text-text-ws-2">Security scan complete</p> aka getByText('Security scan complete', { exact: true })

Call log:
  - Expect "toBeVisible" with timeout 10000ms
  - waiting for getByText('Security scan complete')

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - alert [ref=e2]
  - generic [ref=e3]:
    - banner [ref=e4]:
      - generic [ref=e5]:
        - generic [ref=e6]: BR
        - generic [ref=e7]: BootRise
        - paragraph [ref=e9]: "Project: Agent Work"
        - generic [ref=e10]: fast
      - generic [ref=e11]:
        - generic [ref=e12]: 128 credits
        - generic [ref=e13]: DEV
        - generic [ref=e14]:
          - generic [ref=e15]: workspace-e2e@bootrise.local
          - button "Sign out" [ref=e16] [cursor=pointer]
    - generic [ref=e17]:
      - generic [ref=e18]:
        - generic [ref=e19]:
          - paragraph [ref=e20]: BootRise Command Center
          - heading "Agent Work" [level=1] [ref=e21]
          - paragraph [ref=e22]: Run Verify is the next safe step.
        - generic [ref=e23]:
          - button "Guide" [ref=e24] [cursor=pointer]:
            - generic [ref=e25]: Guide
          - button "Mode" [ref=e27] [cursor=pointer]:
            - generic [ref=e28]: Mode
          - button "Run Verify" [ref=e29] [cursor=pointer]:
            - generic [ref=e30]: Run Verify
      - generic [ref=e31]:
        - generic [ref=e32]:
          - paragraph [ref=e33]: Brain
          - paragraph [ref=e34]: Indexed
        - generic [ref=e35]:
          - paragraph [ref=e36]: Control
          - paragraph [ref=e37]: Idle
        - generic [ref=e38]:
          - paragraph [ref=e39]: Security
          - paragraph [ref=e40]: Clear
        - generic [ref=e41]:
          - paragraph [ref=e42]: Safe to PR
          - paragraph [ref=e43]: Not yet
        - generic [ref=e44]:
          - paragraph [ref=e45]: Safe to deploy
          - paragraph [ref=e46]: Ready
        - generic [ref=e47]:
          - paragraph [ref=e48]: Credits
          - paragraph [ref=e49]: "128"
          - paragraph [ref=e50]: remaining
    - generic [ref=e51]:
      - complementary [ref=e52]:
        - generic [ref=e53]: Workflow
        - list [ref=e54]:
          - listitem [ref=e55]:
            - button "OK Connect Repo + import" [ref=e56] [cursor=pointer]:
              - generic [ref=e57]: OK
              - generic [ref=e58]:
                - generic [ref=e59]: Connect
                - generic [ref=e60]: Repo + import
          - listitem [ref=e62]:
            - button "OK Brain Context + roadmap" [ref=e63] [cursor=pointer]:
              - generic [ref=e64]: OK
              - generic [ref=e65]:
                - generic [ref=e66]: Brain
                - generic [ref=e67]: Context + roadmap
          - listitem [ref=e69]:
            - button "OK Fix Work units + patch" [ref=e70] [cursor=pointer]:
              - generic [ref=e71]: OK
              - generic [ref=e72]:
                - generic [ref=e73]: Fix
                - generic [ref=e74]: Work units + patch
          - listitem [ref=e76]:
            - button "4 Security Scan + verify" [ref=e77] [cursor=pointer]:
              - generic [ref=e78]: "4"
              - generic [ref=e79]:
                - generic [ref=e80]: Security
                - generic [ref=e81]: Scan + verify
          - listitem [ref=e83]:
            - button "5 PR Preflight + draft PR" [ref=e84] [cursor=pointer]:
              - generic [ref=e85]: "5"
              - generic [ref=e86]:
                - generic [ref=e87]: PR
                - generic [ref=e88]: Preflight + draft PR
        - generic [ref=e89]:
          - paragraph [ref=e90]: Operator focus
          - paragraph [ref=e91]: Security
          - paragraph [ref=e92]: Run Security Center and deployment checks before final verification.
      - main [ref=e93]:
        - generic [ref=e94]:
          - generic [ref=e95]:
            - generic [ref=e96]: Files
            - generic [ref=e98]:
              - button "- src" [ref=e99] [cursor=pointer]:
                - generic [ref=e100]: "-"
                - generic [ref=e101]: src
              - generic [ref=e102]:
                - button "- app" [ref=e103] [cursor=pointer]:
                  - generic [ref=e104]: "-"
                  - generic [ref=e105]: app
                - button "ts page.tsx" [ref=e107] [cursor=pointer]:
                  - generic [ref=e108]: ts
                  - generic [ref=e109]: page.tsx
              - generic [ref=e110]:
                - button "- components" [ref=e111] [cursor=pointer]:
                  - generic [ref=e112]: "-"
                  - generic [ref=e113]: components
                - button "ts status.tsx" [ref=e115] [cursor=pointer]:
                  - generic [ref=e116]: ts
                  - generic [ref=e117]: status.tsx
          - generic [ref=e119]:
            - generic [ref=e120]:
              - generic [ref=e121]:
                - paragraph [ref=e122]: src/app/page.tsx
                - paragraph [ref=e123]: Manual edits are included in safety checks.
              - generic [ref=e124]:
                - generic [ref=e125]: unchanged
                - generic [ref=e126]: normal risk
                - button "Reset" [disabled]:
                  - generic: Reset
            - textbox [ref=e127]: "export default function DemoPage() { return <main>BootRise demo workspace</main>; }"
        - generic [ref=e129]:
          - generic [ref=e130]:
            - paragraph [ref=e131]: Runtime monitor
            - button "Refresh" [ref=e132] [cursor=pointer]
          - generic [ref=e133]:
            - paragraph [ref=e134]: Provider duel comparison completed.
            - paragraph [ref=e135]: ×1 · src/app/page.tsx, src/components/status.tsx
            - button "Suggest scoped fix →" [ref=e136] [cursor=pointer]
          - generic [ref=e137]:
            - paragraph [ref=e138]: "Security scan complete. Critical findings: 0."
            - paragraph [ref=e139]: ×5 · no file mapping
            - button "Suggest scoped fix →" [ref=e140] [cursor=pointer]
      - complementary [ref=e141]:
        - generic [ref=e142]:
          - paragraph [ref=e143]: Context inspector
          - generic [ref=e144]:
            - heading "verify" [level=2] [ref=e145]
            - generic [ref=e146]: repo loaded
        - generic [ref=e148]:
          - generic [ref=e149]:
            - paragraph [ref=e150]: Agent council
            - generic [ref=e151]:
              - paragraph [ref=e152]: Agent status
              - paragraph [ref=e153]: "Active: Architect Agent"
            - generic [ref=e154]:
              - article [ref=e155]:
                - generic [ref=e156]:
                  - paragraph [ref=e157]: Architect Agent
                  - generic [ref=e158]: passed
                - paragraph [ref=e159]: Roadmap created and app type detected.
              - article [ref=e160]:
                - generic [ref=e161]:
                  - paragraph [ref=e162]: Project Brain Agent
                  - generic [ref=e163]: passed
                - paragraph [ref=e164]: Indexed 2 files with 0 routes.
              - article [ref=e165]:
                - generic [ref=e166]:
                  - paragraph [ref=e167]: Product Brain Agent
                  - generic [ref=e168]: passed
                - paragraph [ref=e169]: Tracking 4 workflow(s) and 1 policies.
              - article [ref=e170]:
                - generic [ref=e171]:
                  - paragraph [ref=e172]: Architect Conversation Agent
                  - generic [ref=e173]: idle
                - paragraph [ref=e174]: Describe the task in one scoped sentence before patching.
              - article [ref=e175]:
                - generic [ref=e176]:
                  - paragraph [ref=e177]: Scope Agent
                  - generic [ref=e178]: idle
                - paragraph [ref=e179]: Scope locks start after planning.
              - article [ref=e180]:
                - generic [ref=e181]:
                  - paragraph [ref=e182]: Builder Agent
                  - generic [ref=e183]: idle
                - paragraph [ref=e184]: Patch pending.
              - article [ref=e185]:
                - generic [ref=e186]:
                  - paragraph [ref=e187]: Security Agent
                  - generic [ref=e188]: passed
                - paragraph [ref=e189]: Security scan completed.
              - article [ref=e190]:
                - generic [ref=e191]:
                  - paragraph [ref=e192]: QA Agent
                  - generic [ref=e193]: idle
                - paragraph [ref=e194]: Verify is pending.
              - article [ref=e195]:
                - generic [ref=e196]:
                  - paragraph [ref=e197]: Deployment Agent
                  - generic [ref=e198]: passed
                - paragraph [ref=e199]: Deploy readiness not run.
          - generic [ref=e200]:
            - generic [ref=e201]:
              - paragraph [ref=e202]: Verification status
              - paragraph [ref=e203]: Security scan complete
            - generic [ref=e206]:
              - generic [ref=e207]: i
              - generic [ref=e208]:
                - paragraph [ref=e209]: Sandbox verification
                - paragraph [ref=e210]: Run Verify after importing code. Configure E2B or Fly for deeper sandbox proof.
            - generic [ref=e211]:
              - generic [ref=e212]:
                - generic [ref=e213]:
                  - generic [ref=e214]:
                    - paragraph [ref=e215]: Security center
                    - paragraph [ref=e216]: Repository security scan
                    - paragraph [ref=e217]: Run a deterministic scan before export or draft PR.
                  - generic [ref=e218]: 96/100
                - button "Run security scan" [ref=e219] [cursor=pointer]:
                  - generic [ref=e220]: Run security scan
                - paragraph [ref=e222]: No findings were returned by the scan.
              - generic [ref=e223]:
                - generic [ref=e224]:
                  - generic [ref=e225]:
                    - paragraph [ref=e226]: Deployment readiness
                    - paragraph [ref=e227]: Staging and production preflight
                    - paragraph [ref=e228]: Run readiness before relying on deploy status.
                  - generic [ref=e229]: not run
                - button "Run deploy readiness" [ref=e230] [cursor=pointer]:
                  - generic [ref=e231]: Run deploy readiness
                - paragraph [ref=e232]: No deployment readiness result yet.
          - generic [ref=e233]:
            - paragraph [ref=e234]: Project Brain v2
            - generic [ref=e235]:
              - generic [ref=e236]:
                - paragraph [ref=e237]: Files indexed
                - paragraph [ref=e238]: "2"
              - generic [ref=e239]:
                - paragraph [ref=e240]: Symbols
                - paragraph [ref=e241]: "1"
              - generic [ref=e242]:
                - paragraph [ref=e243]: API routes
                - paragraph [ref=e244]: "0"
              - generic [ref=e245]:
                - paragraph [ref=e246]: Unguarded routes
                - paragraph [ref=e247]: "0"
              - generic [ref=e248]:
                - paragraph [ref=e249]: Env vars
                - paragraph [ref=e250]: "0"
              - generic [ref=e251]:
                - paragraph [ref=e252]: Missing env docs
                - paragraph [ref=e253]: "0"
          - generic [ref=e254]:
            - paragraph [ref=e255]: Product Brain
            - paragraph [ref=e256]: BootRise command workspace
            - generic [ref=e257]:
              - paragraph [ref=e258]: Users
              - list [ref=e259]:
                - listitem [ref=e260]: "- Operators"
            - generic [ref=e261]:
              - paragraph [ref=e262]: Workflows
              - list [ref=e263]:
                - listitem [ref=e264]: "- import"
                - listitem [ref=e265]: "- fix"
                - listitem [ref=e266]: "- verify"
                - listitem [ref=e267]: "- draft_pr"
            - generic [ref=e268]:
              - paragraph [ref=e269]: Policies
              - list [ref=e270]:
                - listitem [ref=e271]: "- Approval required before PR"
            - generic [ref=e272]:
              - paragraph [ref=e273]: Roadmap
              - list [ref=e274]:
                - listitem [ref=e275]: "- Ship workspace E2E (in_progress)"
            - generic [ref=e276]:
              - paragraph [ref=e277]: Known risks
              - list [ref=e278]:
                - listitem [ref=e279]: "- Auth redirects need strict coverage"
            - generic [ref=e280]:
              - paragraph [ref=e281]: Definition of done
              - list [ref=e282]:
                - listitem [ref=e283]: "- Patch approved"
                - listitem [ref=e284]: "- Verify passed"
                - listitem [ref=e285]: "- Draft PR opened"
            - generic [ref=e286]:
              - 'textbox "Correct Product Brain: \"That policy is wrong\", \"Add this business rule\", ..." [ref=e287]'
              - button "Save correction" [disabled]:
                - generic: Save correction
          - generic [ref=e288]:
            - generic [ref=e289]:
              - paragraph [ref=e290]: Architecture roadmap
              - paragraph [ref=e291]: nextjs
              - paragraph [ref=e292]: Workspace and admin surfaces are wired for smoke coverage.
            - generic [ref=e293]:
              - paragraph [ref=e294]: Maturity
              - paragraph [ref=e295]: closed beta
            - generic [ref=e296]:
              - paragraph [ref=e297]: Production readiness
              - paragraph [ref=e298]: safe for staging
            - generic [ref=e299]:
              - paragraph [ref=e300]: Missing now
              - list [ref=e301]:
                - listitem [ref=e302]: • More edge-case coverage
            - generic [ref=e303]:
              - paragraph [ref=e304]: Security policies
              - list [ref=e305]:
                - listitem [ref=e306]: • Workspace auth gate
                - listitem [ref=e307]: • Admin authorization
            - generic [ref=e308]:
              - paragraph [ref=e309]: Suggested phases
              - list [ref=e310]:
                - listitem [ref=e311]: • Ship Playwright harness
            - generic [ref=e312]:
              - paragraph [ref=e313]: Acceptance criteria
              - list [ref=e314]:
                - listitem [ref=e315]: • Workspace flow covered
                - listitem [ref=e316]: • Admin routes covered
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
  19  |     await expect(this.page.getByText("src/app/page.tsx")).toBeVisible();
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
> 68  |     await expect(this.page.getByText("Security scan complete")).toBeVisible();
      |                                                                 ^ Error: expect(locator).toBeVisible() failed
  69  |   }
  70  | 
  71  |   async runDeployReadiness() {
  72  |     await this.page.getByRole("button", { name: "Run deploy readiness" }).click();
  73  |     await expect(this.page.getByText("Deploy readiness complete")).toBeVisible();
  74  |   }
  75  | 
  76  |   async exportBundle() {
  77  |     const exportButton = this.page.getByRole("button", { name: "Export bundle" }).first();
  78  |     if (await exportButton.isVisible().catch(() => false)) {
  79  |       await exportButton.click();
  80  |       await expect(this.page.getByText("Export bundle saved to /tmp/bootrise-export.zip")).toBeVisible();
  81  |     }
  82  |   }
  83  | 
  84  |   async openDraftPr() {
  85  |     await this.page.getByRole("button", { name: "Open draft PR" }).click();
  86  |     await expect(this.page.getByText("https://github.com/Esta-Lux/Agent-Work/pull/123")).toBeVisible();
  87  |   }
  88  | 
  89  |   async runMultiPass() {
  90  |     await this.page.getByRole("button", { name: "Run multi-pass" }).click();
  91  |     await expect(this.page.getByText("Work unit execution")).toBeVisible();
  92  |   }
  93  | 
  94  |   async rerunWorkUnit() {
  95  |     await this.page.getByRole("button", { name: "Re-run unit" }).first().click();
  96  |     await expect(this.page.getByText("Work unit rerun complete")).toBeVisible();
  97  |   }
  98  | 
  99  |   async saveProductBrainCorrection() {
  100 |     await this.page
  101 |       .getByPlaceholder('Correct Product Brain: "That policy is wrong", "Add this business rule", ...')
  102 |       .fill("Correction: add edge-case review.");
  103 |     await this.page.getByRole("button", { name: "Save correction" }).click();
  104 |   }
  105 | }
  106 | 
```