# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: workspace.e2e.spec.ts >> workspace full loop: multi-pass rerun approve verify open draft PR
- Location: tests/e2e/workspace.e2e.spec.ts:36:5

# Error details

```
Test timeout of 60000ms exceeded.
```

```
Error: locator.click: Test timeout of 60000ms exceeded.
Call log:
  - waiting for getByRole('button', { name: 'Approve patch' })

```

# Page snapshot

```yaml
- generic [ref=e1]:
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
          - paragraph [ref=e23]: Run Fix is the next safe step.
        - generic [ref=e24]:
          - button "Guide" [ref=e25] [cursor=pointer]:
            - generic [ref=e26]: Guide
          - button "Mode" [ref=e28] [cursor=pointer]:
            - generic [ref=e29]: Mode
          - button "Run Fix" [active] [ref=e30] [cursor=pointer]:
            - generic [ref=e31]: Run Fix
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
            - button "3 Fix Work units + patch" [ref=e71] [cursor=pointer]:
              - generic [ref=e72]: "3"
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
          - paragraph [ref=e92]: Fix
          - paragraph [ref=e93]: Split complex tasks into work units and execute controlled patches.
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
            - paragraph [ref=e135]: Deploy readiness ready for production.
            - paragraph [ref=e136]: ×15 · no file mapping
            - button "Suggest scoped fix →" [ref=e137] [cursor=pointer]
          - generic [ref=e138]:
            - paragraph [ref=e139]: Provider duel comparison completed.
            - paragraph [ref=e140]: ×10 · src/app/page.tsx, src/components/status.tsx
            - button "Suggest scoped fix →" [ref=e141] [cursor=pointer]
          - generic [ref=e142]:
            - paragraph [ref=e143]: "Security scan complete. Critical findings: 0."
            - paragraph [ref=e144]: ×29 · no file mapping
            - button "Suggest scoped fix →" [ref=e145] [cursor=pointer]
      - complementary [ref=e146]:
        - generic [ref=e147]:
          - paragraph [ref=e148]: Context inspector
          - generic [ref=e149]:
            - heading "fix" [level=2] [ref=e150]
            - generic [ref=e151]: repo loaded
        - generic [ref=e152]:
          - generic [ref=e156]:
            - generic [ref=e157]: "!"
            - generic [ref=e158]:
              - paragraph [ref=e159]: Needs attention
              - paragraph [ref=e160]: Should access and billing changes apply globally, per workspace, or per project owner?
          - generic [ref=e161]:
            - generic [ref=e162]:
              - paragraph [ref=e163]: Agent council
              - generic [ref=e164]:
                - paragraph [ref=e165]: Agent status
                - paragraph [ref=e166]: "Active: Architect Conversation Agent"
              - generic [ref=e167]:
                - article [ref=e168]:
                  - generic [ref=e169]:
                    - paragraph [ref=e170]: Architect Agent
                    - generic [ref=e171]: passed
                  - paragraph [ref=e172]: Roadmap created and app type detected.
                - article [ref=e173]:
                  - generic [ref=e174]:
                    - paragraph [ref=e175]: Project Brain Agent
                    - generic [ref=e176]: passed
                  - paragraph [ref=e177]: Indexed 2 files with 0 routes.
                - article [ref=e178]:
                  - generic [ref=e179]:
                    - paragraph [ref=e180]: Product Brain Agent
                    - generic [ref=e181]: passed
                  - paragraph [ref=e182]: Tracking 4 workflow(s) and 1 policies.
                - article [ref=e183]:
                  - generic [ref=e184]:
                    - paragraph [ref=e185]: Architect Conversation Agent
                    - generic [ref=e186]: running
                  - paragraph [ref=e187]: This task touches high-risk boundaries, so assumptions must be confirmed before patching.
                - article [ref=e188]:
                  - generic [ref=e189]:
                    - paragraph [ref=e190]: Scope Agent
                    - generic [ref=e191]: running
                  - paragraph [ref=e192]: Scope locks start after planning.
                - article [ref=e193]:
                  - generic [ref=e194]:
                    - paragraph [ref=e195]: Builder Agent
                    - generic [ref=e196]: idle
                  - paragraph [ref=e197]: Patch pending.
                - article [ref=e198]:
                  - generic [ref=e199]:
                    - paragraph [ref=e200]: Security Agent
                    - generic [ref=e201]: idle
                  - paragraph [ref=e202]: Security scan not run.
                - article [ref=e203]:
                  - generic [ref=e204]:
                    - paragraph [ref=e205]: QA Agent
                    - generic [ref=e206]: idle
                  - paragraph [ref=e207]: Verify is pending.
                - article [ref=e208]:
                  - generic [ref=e209]:
                    - paragraph [ref=e210]: Deployment Agent
                    - generic [ref=e211]: passed
                  - paragraph [ref=e212]: Deploy readiness not run.
            - generic [ref=e213]:
              - generic [ref=e214]:
                - generic [ref=e215]: Fix request
                - textbox "Fix request" [ref=e216]:
                  - /placeholder: Describe one scoped change...
                  - text: Refactor workspace shell to use scoped work units.
              - generic [ref=e217]:
                - generic [ref=e218]:
                  - paragraph [ref=e219]: Plan summary
                  - generic [ref=e220]: fast
                - paragraph [ref=e221]: "Provider: BootRise. Approval gate remains required before workspace changes are applied."
                - button "Compare providers" [ref=e222] [cursor=pointer]:
                  - generic [ref=e223]: Compare providers
              - generic [ref=e224]:
                - generic [ref=e225]:
                  - paragraph [ref=e226]: Architect conversation
                  - generic [ref=e227]: high risk
                - paragraph [ref=e228]: This task touches high-risk boundaries, so assumptions must be confirmed before patching.
                - paragraph [ref=e229]: "Question: Should access and billing changes apply globally, per workspace, or per project owner?"
                - paragraph [ref=e230]: "Recommended: Prefer least-privilege scope and keep tenant boundaries explicit."
                - button "Approve assumptions" [ref=e231] [cursor=pointer]:
                  - generic [ref=e232]: Approve assumptions
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
  32  |     for (let attempt = 0; attempt < 2; attempt += 1) {
  33  |       if (!(await approveAssumptions.isVisible().catch(() => false))) break;
  34  |       await approveAssumptions.click();
  35  |       await this.page.getByRole("button", { name: "Run Fix" }).click();
  36  |     }
  37  |     const useSinglePass = this.page.getByRole("button", { name: "Use single-pass fix" });
  38  |     if (options?.autoSinglePass !== false && await useSinglePass.isVisible().catch(() => false)) {
  39  |       await useSinglePass.click();
  40  |     }
  41  |     if (options?.expectApprove !== false) {
  42  |       await expect(this.page.getByRole("button", { name: "Approve patch" })).toBeVisible();
  43  |     }
  44  |   }
  45  | 
  46  |   async openGuide() {
  47  |     await this.page.getByRole("button", { name: "Guide" }).click();
  48  |     await expect(this.page.getByRole("dialog", { name: "BootRise guided tour" })).toBeVisible();
  49  |     await this.page.getByRole("button", { name: "Skip tour" }).click();
  50  |   }
  51  | 
  52  |   async compareProviders() {
  53  |     await this.page.getByRole("button", { name: "Compare providers" }).click();
  54  |     await expect(this.page.getByText("Provider duel", { exact: true })).toBeVisible();
  55  |   }
  56  | 
  57  |   async approvePatch() {
> 58  |     await this.page.getByRole("button", { name: "Approve patch" }).click();
      |                                                                    ^ Error: locator.click: Test timeout of 60000ms exceeded.
  59  |     await expect(this.page.getByRole("button", { name: "Run Verify" })).toBeVisible();
  60  |   }
  61  | 
  62  |   async runVerify() {
  63  |     await this.page.getByRole("button", { name: "Run Verify" }).click();
  64  |     await this.page.waitForTimeout(500);
  65  |   }
  66  | 
  67  |   async runSecurityScan() {
  68  |     await this.page.getByRole("button", { name: "Run security scan" }).click();
  69  |     await expect(this.page.getByText("Security scan complete", { exact: true })).toBeVisible();
  70  |   }
  71  | 
  72  |   async runDeployReadiness() {
  73  |     await this.page.getByRole("button", { name: "Run deploy readiness" }).click();
  74  |     await expect(this.page.getByText("Deploy readiness complete", { exact: true })).toBeVisible();
  75  |   }
  76  | 
  77  |   async exportBundle() {
  78  |     const exportButton = this.page.getByRole("button", { name: "Export bundle" }).first();
  79  |     if (await exportButton.isVisible().catch(() => false)) {
  80  |       await exportButton.click();
  81  |       await expect(this.page.getByText("Export bundle saved to /tmp/bootrise-export.zip")).toBeVisible();
  82  |     }
  83  |   }
  84  | 
  85  |   async openDraftPr() {
  86  |     const openDraftPrButton = this.page.getByRole("button", { name: "Open draft PR" });
  87  |     await expect(openDraftPrButton).toBeEnabled();
  88  |     await openDraftPrButton.click();
  89  |     await expect(this.page.getByText("https://github.com/Esta-Lux/Agent-Work/pull/123")).toBeVisible();
  90  |   }
  91  | 
  92  |   async runMultiPass(): Promise<boolean> {
  93  |     const approveAssumptions = this.page.getByRole("button", { name: "Approve assumptions" });
  94  |     if (await approveAssumptions.isVisible().catch(() => false)) {
  95  |       await approveAssumptions.click();
  96  |       await this.page.getByRole("button", { name: "Run Fix" }).click();
  97  |     }
  98  |     const runMultiPassButton = this.page.getByRole("button", { name: "Run multi-pass" });
  99  |     if (!(await runMultiPassButton.isVisible().catch(() => false))) {
  100 |       const useSinglePass = this.page.getByRole("button", { name: "Use single-pass fix" });
  101 |       if (await useSinglePass.isVisible().catch(() => false)) {
  102 |         await useSinglePass.click();
  103 |       }
  104 |       return false;
  105 |     }
  106 |     await runMultiPassButton.click();
  107 |     await expect(this.page.getByText("Work unit execution")).toBeVisible();
  108 |     return true;
  109 |   }
  110 | 
  111 |   async rerunWorkUnit() {
  112 |     await this.page.getByRole("button", { name: "Re-run unit" }).first().click();
  113 |     await expect(this.page.getByText("Work unit rerun complete")).toBeVisible();
  114 |   }
  115 | 
  116 |   async saveProductBrainCorrection() {
  117 |     await this.page
  118 |       .getByPlaceholder('Correct Product Brain: "That policy is wrong", "Add this business rule", ...')
  119 |       .fill("Correction: add edge-case review.");
  120 |     await this.page.getByRole("button", { name: "Save correction" }).click();
  121 |   }
  122 | }
  123 | 
```