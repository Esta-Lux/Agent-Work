export type BuilderTemplateId =
  | "landing-page"
  | "saas-dashboard"
  | "restaurant-site"
  | "booking-app"
  | "rewards-app"
  | "admin-portal";

export interface BuilderIntake {
  idea: string;
  appType: string;
  targetUsers: string;
  brandStyle: string;
  authNeeded: boolean;
  paymentsNeeded: boolean;
  databaseNeeded: boolean;
  adminPanelNeeded: boolean;
  deploymentTarget: "vercel" | "fly" | "render";
}

export interface BuilderBlueprint {
  projectType: string;
  templateId: BuilderTemplateId;
  pages: string[];
  components: string[];
  databaseTables: string[];
  apiRoutes: string[];
  authNeeded: boolean;
  paymentsNeeded: boolean;
  adminDashboardNeeded: boolean;
  deploymentTarget: string;
  testPlan: string[];
}

export interface GeneratedProjectFile {
  path: string;
  action: "create" | "edit";
  content: string;
  summary: string;
}

export interface ApprovalGate {
  name: string;
  status: "required" | "not-required";
  reason: string;
}

export interface AppQualityScore {
  design: number;
  codeQuality: number;
  security: number;
  performance: number;
  productionReadiness: number;
}

export interface BuilderRun {
  id: string;
  intake: BuilderIntake;
  blueprint: BuilderBlueprint;
  repoStructure: string[];
  files: GeneratedProjectFile[];
  approvalGates: ApprovalGate[];
  qaChecks: Array<{ name: string; status: "pass" | "pending"; evidence: string }>;
  qualityScore: AppQualityScore;
  nextActions: string[];
}

const templateMap: Array<{ id: BuilderTemplateId; match: RegExp; pages: string[]; components: string[] }> = [
  {
    id: "restaurant-site",
    match: /restaurant|cafe|food|menu/i,
    pages: ["Home", "Menu", "Reservations", "Contact", "Admin"],
    components: ["Hero", "MenuGrid", "ReservationForm", "LocationCard", "AdminOrders"]
  },
  {
    id: "booking-app",
    match: /booking|appointment|mechanic|salon|service/i,
    pages: ["Home", "Services", "Booking", "Dashboard", "Admin"],
    components: ["ServiceList", "BookingForm", "AvailabilityCalendar", "BookingTable", "AdminQueue"]
  },
  {
    id: "rewards-app",
    match: /reward|loyalty|points|mobile/i,
    pages: ["Home", "Rewards", "Account", "Dashboard", "Admin"],
    components: ["RewardCard", "PointsLedger", "QRCode", "OfferList", "AdminCampaigns"]
  },
  {
    id: "saas-dashboard",
    match: /saas|dashboard|crm|analytics|portal/i,
    pages: ["Home", "Pricing", "Dashboard", "Settings", "Admin"],
    components: ["MetricGrid", "Sidebar", "DataTable", "SettingsForm", "AdminConsole"]
  },
  {
    id: "admin-portal",
    match: /admin|internal|ops|operator/i,
    pages: ["Dashboard", "Users", "Reports", "Settings", "Audit Log"],
    components: ["CommandBar", "UserTable", "ReportPanel", "AuditFeed", "RoleEditor"]
  },
  {
    id: "landing-page",
    match: /.*/i,
    pages: ["Home", "Pricing", "Contact", "Dashboard", "Admin"],
    components: ["Hero", "FeatureGrid", "PricingCards", "ContactForm", "AdminOverview"]
  }
];

export function runAppBuilder(input: BuilderIntake): BuilderRun {
  const template = selectTemplate(input.idea, input.appType);
  const blueprint = createBlueprint(input, template);
  const files = generateProjectFiles(input, blueprint);

  return {
    id: `builder_${Date.now()}`,
    intake: input,
    blueprint,
    repoStructure: ["/app", "/components", "/lib", "/api", "/db", "/tests", "/public"],
    files,
    approvalGates: createApprovalGates(input),
    qaChecks: createQaChecks(input),
    qualityScore: scoreProject(input),
    nextActions: [
      "Review the blueprint and generated files.",
      "Approve database, payments, and deployment gates before real execution.",
      "Run sandbox install, route smoke tests, Playwright checks, and repair loop before opening a PR."
    ]
  };
}

function selectTemplate(idea: string, appType: string) {
  const text = `${idea} ${appType}`;
  return templateMap.find((template) => template.match.test(text)) ?? templateMap[templateMap.length - 1];
}

function createBlueprint(input: BuilderIntake, template: (typeof templateMap)[number]): BuilderBlueprint {
  const apiRoutes = ["/api/health", "/api/contact"];
  if (input.authNeeded) apiRoutes.push("/api/auth/session");
  if (input.paymentsNeeded) apiRoutes.push("/api/billing/checkout", "/api/webhooks/stripe");
  if (input.databaseNeeded) apiRoutes.push("/api/records", "/api/search");
  if (input.adminPanelNeeded) apiRoutes.push("/api/admin/actions");

  return {
    projectType: input.appType || inferProjectType(template.id),
    templateId: template.id,
    pages: unique([...template.pages, ...(input.authNeeded ? ["Sign In", "Sign Up"] : [])]),
    components: unique([...template.components, "LoadingState", "EmptyState", "ErrorState", "MobileNav"]),
    databaseTables: input.databaseNeeded ? createTables(input, template.id) : [],
    apiRoutes,
    authNeeded: input.authNeeded,
    paymentsNeeded: input.paymentsNeeded,
    adminDashboardNeeded: input.adminPanelNeeded,
    deploymentTarget: input.deploymentTarget,
    testPlan: [
      "npm run typecheck",
      "npm run lint",
      "npm run build",
      "Route smoke test for every generated page",
      "Form submission test for contact/auth/payment flows",
      "Mobile and desktop Playwright screenshots",
      "Console error check and broken link scan"
    ]
  };
}

function generateProjectFiles(input: BuilderIntake, blueprint: BuilderBlueprint): GeneratedProjectFile[] {
  const brandName = titleCase(shorten(input.idea.replace(/^build\s+/i, ""), 54) || "BootRise App");
  const files: GeneratedProjectFile[] = [
    {
      path: "app/page.tsx",
      action: "create",
      summary: "Creates the public home page from the selected template.",
      content: `export default function HomePage() {\n  return <main><h1>${brandName}</h1><p>${input.targetUsers}</p></main>;\n}\n`
    },
    {
      path: "components/site-shell.tsx",
      action: "create",
      summary: "Defines the shared shell, navigation, and mobile layout.",
      content: `export function SiteShell({ children }: { children: React.ReactNode }) {\n  return <div className=\"min-h-screen\">{children}</div>;\n}\n`
    },
    {
      path: "lib/design-system.ts",
      action: "create",
      summary: "Stores brand tokens and component rules for future edits.",
      content: `export const designSystem = ${JSON.stringify(createDesignSystem(input), null, 2)} as const;\n`
    },
    {
      path: "api/health/route.ts",
      action: "create",
      summary: "Adds an API health check for preview and deployment smoke tests.",
      content: `export async function GET() {\n  return Response.json({ ok: true, template: \"${blueprint.templateId}\" });\n}\n`
    },
    {
      path: "tests/routes.spec.ts",
      action: "create",
      summary: "Creates route smoke checks for generated pages.",
      content: `import { test, expect } from \"@playwright/test\";\n\ntest(\"home loads\", async ({ page }) => {\n  await page.goto(\"/\");\n  await expect(page.locator(\"h1\")).toBeVisible();\n});\n`
    }
  ];

  if (input.databaseNeeded) {
    files.push({
      path: "db/schema.ts",
      action: "create",
      summary: "Creates initial database schema tables and ownership fields.",
      content: blueprint.databaseTables.map((table) => `export const ${camel(table)} = { id: \"uuid\", ownerId: \"uuid\" };`).join("\n")
    });
  }

  if (input.authNeeded) {
    files.push({
      path: "lib/auth/rules.ts",
      action: "create",
      summary: "Adds auth and role access rules.",
      content: `export const authRules = [\"login\", \"signup\", \"forgot-password\", \"roles\", \"admin-user-permissions\"];\n`
    });
  }

  if (input.paymentsNeeded) {
    files.push({
      path: "lib/billing/stripe-plan.ts",
      action: "create",
      summary: "Adds payment integration placeholder guarded by approval gate.",
      content: `export const billingApprovalRequired = true;\n`
    });
  }

  return files;
}

function createApprovalGates(input: BuilderIntake): ApprovalGate[] {
  return [
    {
      name: "Database migration",
      status: input.databaseNeeded ? "required" : "not-required",
      reason: input.databaseNeeded ? "Schema, RLS, seed data, and generated types must be approved." : "No database requested."
    },
    {
      name: "Payment setup",
      status: input.paymentsNeeded ? "required" : "not-required",
      reason: input.paymentsNeeded ? "Stripe keys, webhooks, and billing access must be reviewed." : "No payments requested."
    },
    {
      name: "Production deploy",
      status: "required",
      reason: "Preview must pass build, route, browser, and security checks first."
    },
    {
      name: "GitHub PR",
      status: "required",
      reason: "Generated files should be reviewed as a pull request before merge."
    }
  ];
}

function createQaChecks(input: BuilderIntake) {
  return [
    { name: "Blueprint complete", status: "pass" as const, evidence: "Pages, components, routes, tests, and deployment target selected." },
    { name: "Template selected", status: "pass" as const, evidence: "Template-first generation reduces token usage." },
    { name: "Sandbox preview", status: "pending" as const, evidence: "Requires actual install/dev server execution." },
    { name: "Self-repair loop", status: "pending" as const, evidence: "Requires failing test payload and patch-only repair worker." },
    {
      name: "Human approval gates",
      status: input.paymentsNeeded || input.databaseNeeded ? "pending" as const : "pass" as const,
      evidence: "Dangerous actions are separated from safe blueprint generation."
    }
  ];
}

function scoreProject(input: BuilderIntake): AppQualityScore {
  return {
    design: input.brandStyle ? 82 : 72,
    codeQuality: 78,
    security: input.authNeeded || input.databaseNeeded ? 68 : 76,
    performance: 84,
    productionReadiness: input.databaseNeeded || input.paymentsNeeded ? 58 : 66
  };
}

function createTables(input: BuilderIntake, templateId: BuilderTemplateId): string[] {
  const tables = ["users", "workspaces"];
  if (templateId === "booking-app") tables.push("services", "bookings", "availability_windows");
  if (templateId === "restaurant-site") tables.push("menu_items", "reservations", "messages");
  if (templateId === "rewards-app") tables.push("rewards", "points_ledger", "offers");
  if (templateId === "saas-dashboard") tables.push("projects", "events", "reports");
  if (input.paymentsNeeded) tables.push("subscriptions", "invoices");
  return unique(tables);
}

function createDesignSystem(input: BuilderIntake) {
  return {
    style: input.brandStyle || "clean, trustworthy, modern",
    colors: ["#101418", "#1f7a5b", "#f6f7f9", "#d9dee5"],
    buttons: "8px radius, clear primary and secondary hierarchy",
    forms: "labels, validation, loading, empty, and error states",
    mobile: "single-column first, thumb-friendly CTAs, no hidden core actions"
  };
}

function inferProjectType(templateId: BuilderTemplateId): string {
  return templateId.replaceAll("-", " ");
}

function titleCase(value: string): string {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function shorten(value: string, maxLength: number): string {
  const trimmed = value.trim();
  if (trimmed.length <= maxLength) return trimmed;
  const shortened = trimmed.slice(0, maxLength);
  return shortened.slice(0, shortened.lastIndexOf(" ")).trim();
}

function camel(value: string): string {
  return value.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase());
}

function unique<T>(items: T[]): T[] {
  return Array.from(new Set(items));
}
