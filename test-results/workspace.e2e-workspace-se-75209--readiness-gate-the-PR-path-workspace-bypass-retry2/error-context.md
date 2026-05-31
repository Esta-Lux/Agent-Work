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
          - generic [ref=e15]: Dev
          - generic [ref=e16]: dev@bootrise.local
          - button "Sign out" [ref=e17] [cursor=pointer]
    - generic [ref=e18]:
      - generic [ref=e19]:
        - generic [ref=e20]:
          - paragraph [ref=e21]: BootRise Command Center
          - heading "Agent Work" [level=1] [ref=e22]
          - paragraph [ref=e23]: Run Verify is the next safe step.
        - generic [ref=e24]:
          - button "Guide" [ref=e25] [cursor=pointer]:
            - generic [ref=e26]: Guide
          - button "Mode" [ref=e28] [cursor=pointer]:
            - generic [ref=e29]: Mode
          - button "Run Verify" [ref=e30] [cursor=pointer]:
            - generic [ref=e31]: Run Verify
      - generic [ref=e32]:
        - generic [ref=e33]:
          - paragraph [ref=e34]: Brain
          - paragraph [ref=e35]: Indexed
        - generic [ref=e36]:
          - paragraph [ref=e37]: Control
          - paragraph [ref=e38]: Idle
        - generic [ref=e39]:
          - paragraph [ref=e40]: Security
          - paragraph [ref=e41]: Clear
        - generic [ref=e42]:
          - paragraph [ref=e43]: Safe to PR
          - paragraph [ref=e44]: Not yet
        - generic [ref=e45]:
          - paragraph [ref=e46]: Safe to deploy
          - paragraph [ref=e47]: Ready
        - generic [ref=e48]:
          - paragraph [ref=e49]: Credits
          - paragraph [ref=e50]: "128"
          - paragraph [ref=e51]: remaining
    - generic [ref=e52]:
      - complementary [ref=e53]:
        - generic [ref=e54]: Workflow
        - list [ref=e55]:
          - listitem [ref=e56]:
            - button "OK Connect Repo + import" [ref=e57] [cursor=pointer]:
              - generic [ref=e58]: OK
              - generic [ref=e59]:
                - generic [ref=e60]: Connect
                - generic [ref=e61]: Repo + import
          - listitem [ref=e63]:
            - button "OK Brain Context + roadmap" [ref=e64] [cursor=pointer]:
              - generic [ref=e65]: OK
              - generic [ref=e66]:
                - generic [ref=e67]: Brain
                - generic [ref=e68]: Context + roadmap
          - listitem [ref=e70]:
            - button "OK Fix Work units + patch" [ref=e71] [cursor=pointer]:
              - generic [ref=e72]: OK
              - generic [ref=e73]:
                - generic [ref=e74]: Fix
                - generic [ref=e75]: Work units + patch
          - listitem [ref=e77]:
            - button "4 Security Scan + verify" [ref=e78] [cursor=pointer]:
              - generic [ref=e79]: "4"
              - generic [ref=e80]:
                - generic [ref=e81]: Security
                - generic [ref=e82]: Scan + verify
          - listitem [ref=e84]:
            - button "5 PR Preflight + draft PR" [ref=e85] [cursor=pointer]:
              - generic [ref=e86]: "5"
              - generic [ref=e87]:
                - generic [ref=e88]: PR
                - generic [ref=e89]: Preflight + draft PR
        - generic [ref=e90]:
          - paragraph [ref=e91]: Operator focus
          - paragraph [ref=e92]: Security
          - paragraph [ref=e93]: Run Security Center and deployment checks before final verification.
      - main [ref=e94]:
        - generic [ref=e95]:
          - generic [ref=e96]:
            - generic [ref=e97]: Files
            - generic [ref=e99]:
              - button "- src" [ref=e100] [cursor=pointer]:
                - generic [ref=e101]: "-"
                - generic [ref=e102]: src
              - generic [ref=e103]:
                - button "- app" [ref=e104] [cursor=pointer]:
                  - generic [ref=e105]: "-"
                  - generic [ref=e106]: app
                - button "ts page.tsx" [ref=e108] [cursor=pointer]:
                  - generic [ref=e109]: ts
                  - generic [ref=e110]: page.tsx
              - generic [ref=e111]:
                - button "- components" [ref=e112] [cursor=pointer]:
                  - generic [ref=e113]: "-"
                  - generic [ref=e114]: components
                - button "ts status.tsx" [ref=e116] [cursor=pointer]:
                  - generic [ref=e117]: ts
                  - generic [ref=e118]: status.tsx
          - generic [ref=e120]:
            - generic [ref=e121]:
              - generic [ref=e122]:
                - paragraph [ref=e123]: src/app/page.tsx
                - paragraph [ref=e124]: Manual edits are included in safety checks.
              - generic [ref=e125]:
                - generic [ref=e126]: unchanged
                - generic [ref=e127]: normal risk
                - button "Reset" [disabled]:
                  - generic: Reset
            - textbox [ref=e128]: "export default function DemoPage() { return <main>BootRise demo workspace</main>; }"
        - generic [ref=e130]:
          - generic [ref=e131]:
            - paragraph [ref=e132]: Runtime monitor
            - button "Refresh" [ref=e133] [cursor=pointer]
          - generic [ref=e134]:
            - paragraph [ref=e135]: "Security scan complete. Critical findings: 0."
            - paragraph [ref=e136]: ×3 · no file mapping
            - button "Suggest scoped fix →" [ref=e137] [cursor=pointer]
      - complementary [ref=e138]:
        - generic [ref=e139]:
          - paragraph [ref=e140]: Context inspector
          - generic [ref=e141]:
            - heading "verify" [level=2] [ref=e142]
            - generic [ref=e143]: repo loaded
        - generic [ref=e145]:
          - generic [ref=e146]:
            - paragraph [ref=e147]: Agent council
            - generic [ref=e148]:
              - paragraph [ref=e149]: Agent status
              - paragraph [ref=e150]: "Active: Architect Agent"
            - generic [ref=e151]:
              - article [ref=e152]:
                - generic [ref=e153]:
                  - paragraph [ref=e154]: Architect Agent
                  - generic [ref=e155]: passed
                - paragraph [ref=e156]: Roadmap created and app type detected.
              - article [ref=e157]:
                - generic [ref=e158]:
                  - paragraph [ref=e159]: Project Brain Agent
                  - generic [ref=e160]: passed
                - paragraph [ref=e161]: Indexed 2 files with 0 routes.
              - article [ref=e162]:
                - generic [ref=e163]:
                  - paragraph [ref=e164]: Product Brain Agent
                  - generic [ref=e165]: passed
                - paragraph [ref=e166]: Tracking 4 workflow(s) and 1 policies.
              - article [ref=e167]:
                - generic [ref=e168]:
                  - paragraph [ref=e169]: Architect Conversation Agent
                  - generic [ref=e170]: idle
                - paragraph [ref=e171]: Describe the task in one scoped sentence before patching.
              - article [ref=e172]:
                - generic [ref=e173]:
                  - paragraph [ref=e174]: Scope Agent
                  - generic [ref=e175]: idle
                - paragraph [ref=e176]: Scope locks start after planning.
              - article [ref=e177]:
                - generic [ref=e178]:
                  - paragraph [ref=e179]: Builder Agent
                  - generic [ref=e180]: idle
                - paragraph [ref=e181]: Patch pending.
              - article [ref=e182]:
                - generic [ref=e183]:
                  - paragraph [ref=e184]: Security Agent
                  - generic [ref=e185]: passed
                - paragraph [ref=e186]: Security scan completed.
              - article [ref=e187]:
                - generic [ref=e188]:
                  - paragraph [ref=e189]: QA Agent
                  - generic [ref=e190]: idle
                - paragraph [ref=e191]: Verify is pending.
              - article [ref=e192]:
                - generic [ref=e193]:
                  - paragraph [ref=e194]: Deployment Agent
                  - generic [ref=e195]: passed
                - paragraph [ref=e196]: Deploy readiness not run.
          - generic [ref=e197]:
            - generic [ref=e198]:
              - paragraph [ref=e199]: Verification status
              - paragraph [ref=e200]: Security scan complete
            - generic [ref=e203]:
              - generic [ref=e204]: i
              - generic [ref=e205]:
                - paragraph [ref=e206]: Sandbox verification
                - paragraph [ref=e207]: Run Verify after importing code. Configure E2B or Fly for deeper sandbox proof.
            - generic [ref=e208]:
              - generic [ref=e209]:
                - generic [ref=e210]:
                  - generic [ref=e211]:
                    - paragraph [ref=e212]: Security center
                    - paragraph [ref=e213]: Repository security scan
                    - paragraph [ref=e214]: Run a deterministic scan before export or draft PR.
                  - generic [ref=e215]: 96/100
                - button "Run security scan" [ref=e216] [cursor=pointer]:
                  - generic [ref=e217]: Run security scan
                - paragraph [ref=e219]: No findings were returned by the scan.
              - generic [ref=e220]:
                - generic [ref=e221]:
                  - generic [ref=e222]:
                    - paragraph [ref=e223]: Deployment readiness
                    - paragraph [ref=e224]: Staging and production preflight
                    - paragraph [ref=e225]: Run readiness before relying on deploy status.
                  - generic [ref=e226]: not run
                - button "Run deploy readiness" [ref=e227] [cursor=pointer]:
                  - generic [ref=e228]: Run deploy readiness
                - paragraph [ref=e229]: No deployment readiness result yet.
          - generic [ref=e230]:
            - paragraph [ref=e231]: Project Brain v2
            - generic [ref=e232]:
              - generic [ref=e233]:
                - paragraph [ref=e234]: Files indexed
                - paragraph [ref=e235]: "2"
              - generic [ref=e236]:
                - paragraph [ref=e237]: Symbols
                - paragraph [ref=e238]: "1"
              - generic [ref=e239]:
                - paragraph [ref=e240]: API routes
                - paragraph [ref=e241]: "0"
              - generic [ref=e242]:
                - paragraph [ref=e243]: Unguarded routes
                - paragraph [ref=e244]: "0"
              - generic [ref=e245]:
                - paragraph [ref=e246]: Env vars
                - paragraph [ref=e247]: "0"
              - generic [ref=e248]:
                - paragraph [ref=e249]: Missing env docs
                - paragraph [ref=e250]: "0"
          - generic [ref=e251]:
            - paragraph [ref=e252]: Product Brain
            - paragraph [ref=e253]: BootRise command workspace
            - generic [ref=e254]:
              - paragraph [ref=e255]: Users
              - list [ref=e256]:
                - listitem [ref=e257]: "- Operators"
            - generic [ref=e258]:
              - paragraph [ref=e259]: Workflows
              - list [ref=e260]:
                - listitem [ref=e261]: "- import"
                - listitem [ref=e262]: "- fix"
                - listitem [ref=e263]: "- verify"
                - listitem [ref=e264]: "- draft_pr"
            - generic [ref=e265]:
              - paragraph [ref=e266]: Policies
              - list [ref=e267]:
                - listitem [ref=e268]: "- Approval required before PR"
            - generic [ref=e269]:
              - paragraph [ref=e270]: Roadmap
              - list [ref=e271]:
                - listitem [ref=e272]: "- Ship workspace E2E (in_progress)"
            - generic [ref=e273]:
              - paragraph [ref=e274]: Known risks
              - list [ref=e275]:
                - listitem [ref=e276]: "- Auth redirects need strict coverage"
            - generic [ref=e277]:
              - paragraph [ref=e278]: Definition of done
              - list [ref=e279]:
                - listitem [ref=e280]: "- Patch approved"
                - listitem [ref=e281]: "- Verify passed"
                - listitem [ref=e282]: "- Draft PR opened"
            - generic [ref=e283]:
              - 'textbox "Correct Product Brain: \"That policy is wrong\", \"Add this business rule\", ..." [ref=e284]'
              - button "Save correction" [disabled]:
                - generic: Save correction
          - generic [ref=e285]:
            - generic [ref=e286]:
              - paragraph [ref=e287]: Architecture roadmap
              - paragraph [ref=e288]: nextjs
              - paragraph [ref=e289]: Workspace and admin surfaces are wired for smoke coverage.
            - generic [ref=e290]:
              - paragraph [ref=e291]: Maturity
              - paragraph [ref=e292]: closed beta
            - generic [ref=e293]:
              - paragraph [ref=e294]: Production readiness
              - paragraph [ref=e295]: safe for staging
            - generic [ref=e296]:
              - paragraph [ref=e297]: Missing now
              - list [ref=e298]:
                - listitem [ref=e299]: • More edge-case coverage
            - generic [ref=e300]:
              - paragraph [ref=e301]: Security policies
              - list [ref=e302]:
                - listitem [ref=e303]: • Workspace auth gate
                - listitem [ref=e304]: • Admin authorization
            - generic [ref=e305]:
              - paragraph [ref=e306]: Suggested phases
              - list [ref=e307]:
                - listitem [ref=e308]: • Ship Playwright harness
            - generic [ref=e309]:
              - paragraph [ref=e310]: Acceptance criteria
              - list [ref=e311]:
                - listitem [ref=e312]: • Workspace flow covered
                - listitem [ref=e313]: • Admin routes covered
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