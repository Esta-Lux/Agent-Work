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
            - paragraph [ref=e134]: Deploy readiness ready for production.
            - paragraph [ref=e135]: ×1 · no file mapping
            - button "Suggest scoped fix →" [ref=e136] [cursor=pointer]
          - generic [ref=e137]:
            - paragraph [ref=e138]: Provider duel comparison completed.
            - paragraph [ref=e139]: ×5 · src/app/page.tsx, src/components/status.tsx
            - button "Suggest scoped fix →" [ref=e140] [cursor=pointer]
          - generic [ref=e141]:
            - paragraph [ref=e142]: "Security scan complete. Critical findings: 0."
            - paragraph [ref=e143]: ×15 · no file mapping
            - button "Suggest scoped fix →" [ref=e144] [cursor=pointer]
      - complementary [ref=e145]:
        - generic [ref=e146]:
          - paragraph [ref=e147]: Context inspector
          - generic [ref=e148]:
            - heading "verify" [level=2] [ref=e149]
            - generic [ref=e150]: repo loaded
        - generic [ref=e152]:
          - generic [ref=e153]:
            - paragraph [ref=e154]: Agent council
            - generic [ref=e155]:
              - paragraph [ref=e156]: Agent status
              - paragraph [ref=e157]: "Active: Architect Agent"
            - generic [ref=e158]:
              - article [ref=e159]:
                - generic [ref=e160]:
                  - paragraph [ref=e161]: Architect Agent
                  - generic [ref=e162]: passed
                - paragraph [ref=e163]: Roadmap created and app type detected.
              - article [ref=e164]:
                - generic [ref=e165]:
                  - paragraph [ref=e166]: Project Brain Agent
                  - generic [ref=e167]: passed
                - paragraph [ref=e168]: Indexed 2 files with 0 routes.
              - article [ref=e169]:
                - generic [ref=e170]:
                  - paragraph [ref=e171]: Product Brain Agent
                  - generic [ref=e172]: passed
                - paragraph [ref=e173]: Tracking 4 workflow(s) and 1 policies.
              - article [ref=e174]:
                - generic [ref=e175]:
                  - paragraph [ref=e176]: Architect Conversation Agent
                  - generic [ref=e177]: idle
                - paragraph [ref=e178]: Describe the task in one scoped sentence before patching.
              - article [ref=e179]:
                - generic [ref=e180]:
                  - paragraph [ref=e181]: Scope Agent
                  - generic [ref=e182]: idle
                - paragraph [ref=e183]: Scope locks start after planning.
              - article [ref=e184]:
                - generic [ref=e185]:
                  - paragraph [ref=e186]: Builder Agent
                  - generic [ref=e187]: idle
                - paragraph [ref=e188]: Patch pending.
              - article [ref=e189]:
                - generic [ref=e190]:
                  - paragraph [ref=e191]: Security Agent
                  - generic [ref=e192]: passed
                - paragraph [ref=e193]: Security scan completed.
              - article [ref=e194]:
                - generic [ref=e195]:
                  - paragraph [ref=e196]: QA Agent
                  - generic [ref=e197]: idle
                - paragraph [ref=e198]: Verify is pending.
              - article [ref=e199]:
                - generic [ref=e200]:
                  - paragraph [ref=e201]: Deployment Agent
                  - generic [ref=e202]: passed
                - paragraph [ref=e203]: Deploy readiness not run.
          - generic [ref=e204]:
            - generic [ref=e205]:
              - paragraph [ref=e206]: Verification status
              - paragraph [ref=e207]: Security scan complete
            - generic [ref=e210]:
              - generic [ref=e211]: i
              - generic [ref=e212]:
                - paragraph [ref=e213]: Sandbox verification
                - paragraph [ref=e214]: Run Verify after importing code. Configure E2B or Fly for deeper sandbox proof.
            - generic [ref=e215]:
              - generic [ref=e216]:
                - generic [ref=e217]:
                  - generic [ref=e218]:
                    - paragraph [ref=e219]: Security center
                    - paragraph [ref=e220]: Repository security scan
                    - paragraph [ref=e221]: Run a deterministic scan before export or draft PR.
                  - generic [ref=e222]: 96/100
                - button "Run security scan" [ref=e223] [cursor=pointer]:
                  - generic [ref=e224]: Run security scan
                - paragraph [ref=e226]: No findings were returned by the scan.
              - generic [ref=e227]:
                - generic [ref=e228]:
                  - generic [ref=e229]:
                    - paragraph [ref=e230]: Deployment readiness
                    - paragraph [ref=e231]: Staging and production preflight
                    - paragraph [ref=e232]: Run readiness before relying on deploy status.
                  - generic [ref=e233]: not run
                - button "Run deploy readiness" [ref=e234] [cursor=pointer]:
                  - generic [ref=e235]: Run deploy readiness
                - paragraph [ref=e236]: No deployment readiness result yet.
          - generic [ref=e237]:
            - paragraph [ref=e238]: Project Brain v2
            - generic [ref=e239]:
              - generic [ref=e240]:
                - paragraph [ref=e241]: Files indexed
                - paragraph [ref=e242]: "2"
              - generic [ref=e243]:
                - paragraph [ref=e244]: Symbols
                - paragraph [ref=e245]: "1"
              - generic [ref=e246]:
                - paragraph [ref=e247]: API routes
                - paragraph [ref=e248]: "0"
              - generic [ref=e249]:
                - paragraph [ref=e250]: Unguarded routes
                - paragraph [ref=e251]: "0"
              - generic [ref=e252]:
                - paragraph [ref=e253]: Env vars
                - paragraph [ref=e254]: "0"
              - generic [ref=e255]:
                - paragraph [ref=e256]: Missing env docs
                - paragraph [ref=e257]: "0"
          - generic [ref=e258]:
            - paragraph [ref=e259]: Product Brain
            - paragraph [ref=e260]: BootRise command workspace
            - generic [ref=e261]:
              - paragraph [ref=e262]: Users
              - list [ref=e263]:
                - listitem [ref=e264]: "- Operators"
            - generic [ref=e265]:
              - paragraph [ref=e266]: Workflows
              - list [ref=e267]:
                - listitem [ref=e268]: "- import"
                - listitem [ref=e269]: "- fix"
                - listitem [ref=e270]: "- verify"
                - listitem [ref=e271]: "- draft_pr"
            - generic [ref=e272]:
              - paragraph [ref=e273]: Policies
              - list [ref=e274]:
                - listitem [ref=e275]: "- Approval required before PR"
            - generic [ref=e276]:
              - paragraph [ref=e277]: Roadmap
              - list [ref=e278]:
                - listitem [ref=e279]: "- Ship workspace E2E (in_progress)"
            - generic [ref=e280]:
              - paragraph [ref=e281]: Known risks
              - list [ref=e282]:
                - listitem [ref=e283]: "- Auth redirects need strict coverage"
            - generic [ref=e284]:
              - paragraph [ref=e285]: Definition of done
              - list [ref=e286]:
                - listitem [ref=e287]: "- Patch approved"
                - listitem [ref=e288]: "- Verify passed"
                - listitem [ref=e289]: "- Draft PR opened"
            - generic [ref=e290]:
              - 'textbox "Correct Product Brain: \"That policy is wrong\", \"Add this business rule\", ..." [ref=e291]'
              - button "Save correction" [disabled]:
                - generic: Save correction
          - generic [ref=e292]:
            - generic [ref=e293]:
              - paragraph [ref=e294]: Architecture roadmap
              - paragraph [ref=e295]: nextjs
              - paragraph [ref=e296]: Workspace and admin surfaces are wired for smoke coverage.
            - generic [ref=e297]:
              - paragraph [ref=e298]: Maturity
              - paragraph [ref=e299]: closed beta
            - generic [ref=e300]:
              - paragraph [ref=e301]: Production readiness
              - paragraph [ref=e302]: safe for staging
            - generic [ref=e303]:
              - paragraph [ref=e304]: Missing now
              - list [ref=e305]:
                - listitem [ref=e306]: • More edge-case coverage
            - generic [ref=e307]:
              - paragraph [ref=e308]: Security policies
              - list [ref=e309]:
                - listitem [ref=e310]: • Workspace auth gate
                - listitem [ref=e311]: • Admin authorization
            - generic [ref=e312]:
              - paragraph [ref=e313]: Suggested phases
              - list [ref=e314]:
                - listitem [ref=e315]: • Ship Playwright harness
            - generic [ref=e316]:
              - paragraph [ref=e317]: Acceptance criteria
              - list [ref=e318]:
                - listitem [ref=e319]: • Workspace flow covered
                - listitem [ref=e320]: • Admin routes covered
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
> 68  |     await expect(this.page.getByText("Security scan complete")).toBeVisible();
      |                                                                 ^ Error: expect(locator).toBeVisible() failed
  69  |   }
  70  | 
  71  |   async runDeployReadiness() {
  72  |     await this.page.getByRole("button", { name: "Run deploy readiness" }).click();
  73  |     await expect(
  74  |       this.page
  75  |         .getByText("Deploy readiness complete")
  76  |         .or(this.page.getByText("Deployment readiness: ready for production."))
  77  |     ).toBeVisible();
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