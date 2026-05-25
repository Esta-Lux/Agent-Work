export type BuilderTemplateId =
  | "landing-page"
  | "saas-dashboard"
  | "restaurant-site"
  | "booking-app"
  | "marketplace"
  | "rewards-app"
  | "crm"
  | "ai-chatbot"
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

export interface TemplateDefinition {
  id: BuilderTemplateId;
  label: string;
  match: RegExp;
  pages: string[];
  components: string[];
  tables: string[];
  routes: string[];
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
  unifiedDiff: string;
  modelRouter: Array<{ task: string; tier: "small" | "medium" | "strong"; reason: string }>;
  costControls: string[];
  approvalGates: ApprovalGate[];
  qaChecks: Array<{ name: string; status: "pass" | "pending"; evidence: string }>;
  qualityScore: AppQualityScore;
  nextActions: string[];
}

const templateMap: TemplateDefinition[] = [
  {
    id: "restaurant-site",
    label: "Restaurant Site",
    match: /restaurant|cafe|food|menu/i,
    pages: ["Home", "Menu", "Reservations", "Contact", "Admin"],
    components: ["Hero", "MenuGrid", "ReservationForm", "LocationCard", "AdminOrders"],
    tables: ["menu_items", "reservations", "messages"],
    routes: ["/api/menu", "/api/reservations", "/api/contact"]
  },
  {
    id: "booking-app",
    label: "Booking App",
    match: /booking|appointment|mechanic|salon|service/i,
    pages: ["Home", "Services", "Booking", "Dashboard", "Admin"],
    components: ["ServiceList", "BookingForm", "AvailabilityCalendar", "BookingTable", "AdminQueue"],
    tables: ["services", "bookings", "availability_windows"],
    routes: ["/api/services", "/api/bookings", "/api/availability"]
  },
  {
    id: "marketplace",
    label: "Marketplace",
    match: /marketplace|seller|buyer|listing|commerce/i,
    pages: ["Home", "Browse", "Listing", "Checkout", "Dashboard", "Admin"],
    components: ["ListingGrid", "SellerCard", "CheckoutPanel", "ReviewList", "AdminListings"],
    tables: ["listings", "orders", "reviews", "seller_profiles"],
    routes: ["/api/listings", "/api/orders", "/api/reviews"]
  },
  {
    id: "rewards-app",
    label: "Rewards App",
    match: /reward|loyalty|points|mobile/i,
    pages: ["Home", "Rewards", "Account", "Dashboard", "Admin"],
    components: ["RewardCard", "PointsLedger", "QRCode", "OfferList", "AdminCampaigns"],
    tables: ["rewards", "points_ledger", "offers"],
    routes: ["/api/rewards", "/api/points", "/api/offers"]
  },
  {
    id: "saas-dashboard",
    label: "SaaS Dashboard",
    match: /saas|dashboard|crm|analytics|portal/i,
    pages: ["Home", "Pricing", "Dashboard", "Settings", "Admin"],
    components: ["MetricGrid", "Sidebar", "DataTable", "SettingsForm", "AdminConsole"],
    tables: ["projects", "events", "reports"],
    routes: ["/api/projects", "/api/events", "/api/reports"]
  },
  {
    id: "crm",
    label: "CRM",
    match: /crm|customer|lead|sales|pipeline/i,
    pages: ["Dashboard", "Leads", "Accounts", "Pipeline", "Reports", "Admin"],
    components: ["LeadTable", "PipelineBoard", "AccountPanel", "ActivityFeed", "AdminUsers"],
    tables: ["leads", "accounts", "deals", "activities"],
    routes: ["/api/leads", "/api/accounts", "/api/deals"]
  },
  {
    id: "ai-chatbot",
    label: "AI Chatbot App",
    match: /chatbot|ai chat|assistant|support bot/i,
    pages: ["Home", "Chat", "Knowledge Base", "Dashboard", "Admin"],
    components: ["ChatPanel", "PromptLibrary", "ConversationList", "KnowledgeUploader", "AdminPrompts"],
    tables: ["conversations", "messages", "knowledge_sources"],
    routes: ["/api/chat", "/api/conversations", "/api/knowledge"]
  },
  {
    id: "admin-portal",
    label: "Admin Portal",
    match: /admin|internal|ops|operator/i,
    pages: ["Dashboard", "Users", "Reports", "Settings", "Audit Log"],
    components: ["CommandBar", "UserTable", "ReportPanel", "AuditFeed", "RoleEditor"],
    tables: ["users", "roles", "audit_events"],
    routes: ["/api/users", "/api/reports", "/api/audit-events"]
  },
  {
    id: "landing-page",
    label: "Landing Page",
    match: /.*/i,
    pages: ["Home", "Pricing", "Contact", "Dashboard", "Admin"],
    components: ["Hero", "FeatureGrid", "PricingCards", "ContactForm", "AdminOverview"],
    tables: ["contacts"],
    routes: ["/api/contact"]
  }
];

export function runAppBuilder(input: BuilderIntake): BuilderRun {
  const template = selectTemplate(input.idea, input.appType);
  const blueprint = createBlueprint(input, template);
  const files = generateProjectFiles(input, blueprint);
  const gates = createApprovalGates(input);

  return {
    id: `builder_${Date.now()}`,
    intake: input,
    blueprint,
    repoStructure: ["/app", "/components", "/lib", "/api", "/db", "/tests", "/public"],
    files,
    unifiedDiff: createUnifiedDiff(files),
    modelRouter: createModelRouter(input),
    costControls: [
      "Template-first generation before AI code synthesis.",
      "Repo memory retrieval limited to relevant files and architecture rules.",
      "Patch-only repair prompts for failed checks.",
      "Small model for classification/copy, medium model for code, strong model only for architecture and hard failures.",
      "No full-repo prompt unless an explicit senior approval gate is cleared."
    ],
    approvalGates: gates,
    qaChecks: createQaChecks(input),
    qualityScore: scoreProject(input),
    nextActions: [
      "Review the blueprint, generated files, and diff preview.",
      "Click Build Project Workspace to write approved files into a controlled BootRise build folder.",
      "Run sandbox install, route smoke tests, Playwright checks, and repair loop before opening a PR."
    ]
  };
}

export function getTemplateMarketplace(): Array<Pick<TemplateDefinition, "id" | "label" | "pages" | "components">> {
  return templateMap.map(({ id, label, pages, components }) => ({ id, label, pages, components }));
}

function selectTemplate(idea: string, appType: string): TemplateDefinition {
  const text = `${idea} ${appType}`;
  return templateMap.find((template) => template.match.test(text)) ?? templateMap[templateMap.length - 1];
}

function createBlueprint(input: BuilderIntake, template: TemplateDefinition): BuilderBlueprint {
  const apiRoutes = ["/api/health", ...template.routes];
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
  const slug = slugify(brandName);
  const pageFiles = blueprint.pages.map((page) => createPageFile(page, input, blueprint, brandName));
  const apiFiles = blueprint.apiRoutes.map((route) => createApiRouteFile(route, blueprint));
  const files: GeneratedProjectFile[] = [
    {
      path: "package.json",
      action: "create",
      summary: "Creates a runnable Next.js project manifest with validation scripts.",
      content: `${JSON.stringify(createPackageJson(slug), null, 2)}\n`
    },
    {
      path: "README.md",
      action: "create",
      summary: "Documents the generated project, approval gates, and next steps.",
      content: createGeneratedReadme(input, blueprint, brandName)
    },
    {
      path: "next.config.mjs",
      action: "create",
      summary: "Adds the generated Next.js app configuration.",
      content: `/** @type {import("next").NextConfig} */\nconst nextConfig = {};\n\nexport default nextConfig;\n`
    },
    {
      path: "tsconfig.json",
      action: "create",
      summary: "Adds TypeScript configuration for generated app validation.",
      content: `${JSON.stringify(createTsConfig(), null, 2)}\n`
    },
    {
      path: "app/layout.tsx",
      action: "create",
      summary: "Creates the root layout and metadata.",
      content: `import "./globals.css";\n\nexport const metadata = {\n  title: "${escapeText(brandName)}",\n  description: "${escapeText(input.targetUsers || "Generated by BootRise")}"\n};\n\nexport default function RootLayout({ children }: { children: React.ReactNode }) {\n  return (\n    <html lang="en">\n      <body>{children}</body>\n    </html>\n  );\n}\n`
    },
    {
      path: "app/globals.css",
      action: "create",
      summary: "Creates a clean responsive base style system.",
      content: createGlobalCss()
    },
    {
      path: "components/site-shell.tsx",
      action: "create",
      summary: "Defines the shared shell, navigation, and mobile layout.",
      content: createSiteShell(blueprint)
    },
    {
      path: "components/state-block.tsx",
      action: "create",
      summary: "Provides loading, empty, and error states for every generated screen.",
      content: `export function StateBlock({ title, body }: { title: string; body: string }) {\n  return <div className="state-block"><strong>{title}</strong><span>{body}</span></div>;\n}\n`
    },
    {
      path: "lib/design-system.ts",
      action: "create",
      summary: "Stores brand tokens and component rules for future edits.",
      content: `export const designSystem = ${JSON.stringify(createDesignSystem(input), null, 2)} as const;\n`
    },
    {
      path: "lib/model-router.ts",
      action: "create",
      summary: "Defines token-saving model routing rules for future AI work.",
      content: `export const modelRouter = ${JSON.stringify(createModelRouter(input), null, 2)} as const;\n`
    },
    {
      path: "lib/repo-memory-index.ts",
      action: "create",
      summary: "Creates the starter repo memory index shape so future prompts retrieve relevant slices only.",
      content: createRepoMemoryIndex(blueprint)
    },
    {
      path: "lib/deployment-plan.ts",
      action: "create",
      summary: "Captures deployment agent targets and required environment checks.",
      content: `export const deploymentPlan = ${JSON.stringify(createDeploymentPlan(input), null, 2)} as const;\n`
    },
    {
      path: "tests/routes.spec.ts",
      action: "create",
      summary: "Creates Playwright route smoke checks for generated pages.",
      content: createRouteSpec(blueprint)
    }
  ];

  files.push(...pageFiles, ...apiFiles);

  if (input.databaseNeeded) {
    files.push({
      path: "db/schema.ts",
      action: "create",
      summary: "Creates initial database schema tables and ownership fields.",
      content: createDbSchema(blueprint.databaseTables)
    });
    files.push({
      path: "db/migrations/0001_initial.sql",
      action: "create",
      summary: "Creates SQL migration with ownership columns and RLS.",
      content: createMigrationSql(blueprint.databaseTables)
    });
    files.push({
      path: "db/seed.sql",
      action: "create",
      summary: "Creates seed placeholders for preview data.",
      content: createSeedSql(blueprint.databaseTables)
    });
  }

  if (input.authNeeded) {
    files.push({
      path: "lib/auth/rules.ts",
      action: "create",
      summary: "Adds auth and role access rules.",
      content: `export const authRules = [\n  "login",\n  "signup",\n  "forgot-password",\n  "roles",\n  "organization-team-access",\n  "admin-user-permissions"\n] as const;\n\nexport function canAccessAdmin(role: string) {\n  return role === "owner" || role === "admin";\n}\n`
    });
  }

  if (input.paymentsNeeded) {
    files.push({
      path: "lib/billing/stripe-plan.ts",
      action: "create",
      summary: "Adds payment integration placeholder guarded by approval gate.",
      content: `export const billingApprovalRequired = true;\n\nexport const billingRoutes = ["/api/billing/checkout", "/api/webhooks/stripe"] as const;\n`
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
    { name: "File writer worker", status: "pending" as const, evidence: "Run the approved workspace build to write files to disk." },
    { name: "Sandbox preview", status: "pending" as const, evidence: "Requires install/dev server execution and browser checks." },
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
  const template = templateMap.find((item) => item.id === templateId);
  if (template) tables.push(...template.tables);
  if (input.paymentsNeeded) tables.push("subscriptions", "invoices");
  return unique(tables);
}

function createDesignSystem(input: BuilderIntake) {
  return {
    style: input.brandStyle || "clean, trustworthy, modern",
    colors: ["#101418", "#1f7a5b", "#f6f7f9", "#d9dee5"],
    font: "Inter or system sans-serif",
    spacing: "4px base scale with 16px section rhythm",
    cards: "8px radius, no nested cards, clear borders",
    buttons: "8px radius, clear primary and secondary hierarchy",
    forms: "labels, validation, loading, empty, and error states",
    mobile: "single-column first, thumb-friendly CTAs, no hidden core actions",
    accessibility: "visible focus states, semantic landmarks, contrast above WCAG AA"
  };
}

function createModelRouter(input: BuilderIntake): BuilderRun["modelRouter"] {
  return [
    { task: "Intent classification", tier: "small", reason: "Template matching and request summary do not need a frontier model." },
    { task: "Template customization", tier: "small", reason: "Brand copy and simple components are bounded by starter templates." },
    { task: "API/database/test generation", tier: "medium", reason: "Schema and route code need stronger code synthesis." },
    {
      task: "Security review and failed build repair",
      tier: input.authNeeded || input.paymentsNeeded ? "strong" : "medium",
      reason: "Auth, payments, and failed verification require higher reasoning."
    }
  ];
}

function createPageFile(page: string, input: BuilderIntake, blueprint: BuilderBlueprint, brandName: string): GeneratedProjectFile {
  const route = page === "Home" ? "app/page.tsx" : `app/${slugify(page)}/page.tsx`;
  const componentList = blueprint.components.slice(0, 4);
  return {
    path: route,
    action: "create",
    summary: `Creates the ${page} screen with ready loading, empty, error, and mobile states.`,
    content: `import { SiteShell } from "@/components/site-shell";\nimport { StateBlock } from "@/components/state-block";\n\nexport default function ${pascal(page)}Page() {\n  return (\n    <SiteShell>\n      <section className="hero-panel">\n        <p className="eyebrow">${escapeText(blueprint.templateId)}</p>\n        <h1>${escapeText(page === "Home" ? brandName : page)}</h1>\n        <p>${escapeText(input.targetUsers || "Built for focused teams")}</p>\n      </section>\n      <section className="screen-grid">\n        ${componentList.map((component) => `<StateBlock title="${escapeText(component)}" body="Ready state with loading, empty, error, and mobile behavior planned." />`).join("\n        ")}\n      </section>\n    </SiteShell>\n  );\n}\n`
  };
}

function createApiRouteFile(route: string, blueprint: BuilderBlueprint): GeneratedProjectFile {
  const path = `app${route}/route.ts`;
  const resource = route.split("/").filter(Boolean).pop() ?? "health";
  return {
    path,
    action: "create",
    summary: `Creates ${route} with a safe starter response.`,
    content: `export async function GET() {\n  return Response.json({ ok: true, resource: "${resource}", template: "${blueprint.templateId}" });\n}\n\nexport async function POST(request: Request) {\n  const body = await request.json().catch(() => ({}));\n  return Response.json({ ok: true, resource: "${resource}", received: body });\n}\n`
  };
}

function createPackageJson(slug: string) {
  return {
    name: slug,
    version: "0.1.0",
    private: true,
    scripts: {
      dev: "next dev",
      build: "next build",
      start: "next start",
      lint: "next lint",
      typecheck: "tsc --noEmit",
      test: "node --test"
    },
    dependencies: {
      "@types/node": "^20.14.10",
      "@types/react": "^18.3.3",
      "@types/react-dom": "^18.3.0",
      next: "^14.2.30",
      react: "^18.3.1",
      "react-dom": "^18.3.1",
      typescript: "^5.5.4"
    },
    devDependencies: {
      eslint: "^8.57.0",
      "eslint-config-next": "^14.2.30"
    }
  };
}

function createTsConfig() {
  return {
    compilerOptions: {
      target: "es2022",
      lib: ["dom", "dom.iterable", "es2022"],
      allowJs: false,
      skipLibCheck: true,
      strict: true,
      noEmit: true,
      esModuleInterop: true,
      module: "esnext",
      moduleResolution: "bundler",
      resolveJsonModule: true,
      isolatedModules: true,
      jsx: "preserve",
      incremental: true,
      paths: { "@/*": ["./*"] },
      plugins: [{ name: "next" }]
    },
    include: ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
    exclude: ["node_modules"]
  };
}

function createGeneratedReadme(input: BuilderIntake, blueprint: BuilderBlueprint, brandName: string): string {
  return `# ${brandName}\n\nGenerated by BootRise as a controlled ${blueprint.templateId} starter.\n\n## Intent\n${input.idea}\n\n## Pages\n${blueprint.pages.map((page) => `- ${page}`).join("\n")}\n\n## Approval Gates\n- Database migrations require review before applying.\n- Payment setup requires Stripe keys and webhook review.\n- Production deploy requires passing preview, route, and security checks.\n- GitHub PR must be reviewed before merge.\n`;
}

function createGlobalCss(): string {
  return `:root {\n  color: #101418;\n  background: #f6f7f9;\n  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;\n}\n\n* { box-sizing: border-box; }\nbody { margin: 0; }\na { color: inherit; text-decoration: none; }\n.shell { min-height: 100vh; }\n.nav { display: flex; gap: 12px; align-items: center; justify-content: space-between; padding: 16px 24px; border-bottom: 1px solid #d9dee5; background: #ffffff; }\n.nav-links { display: flex; gap: 10px; flex-wrap: wrap; }\n.nav-links a { border: 1px solid #d9dee5; border-radius: 8px; padding: 8px 10px; font-size: 14px; }\n.content { width: min(1120px, calc(100% - 32px)); margin: 0 auto; padding: 32px 0; }\n.hero-panel { display: grid; gap: 12px; padding: 32px; border: 1px solid #d9dee5; border-radius: 8px; background: #ffffff; }\n.hero-panel h1 { margin: 0; font-size: clamp(32px, 6vw, 64px); line-height: 1; letter-spacing: 0; }\n.hero-panel p { margin: 0; max-width: 760px; color: #52606d; line-height: 1.7; }\n.eyebrow { text-transform: uppercase; font-size: 12px; font-weight: 700; color: #1f7a5b; }\n.screen-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px; margin-top: 16px; }\n.state-block { display: grid; gap: 8px; min-height: 132px; border: 1px solid #d9dee5; border-radius: 8px; background: #ffffff; padding: 16px; }\n.state-block span { color: #52606d; line-height: 1.6; }\n@media (max-width: 720px) { .nav { align-items: flex-start; flex-direction: column; } .hero-panel { padding: 24px; } }\n`;
}

function createSiteShell(blueprint: BuilderBlueprint): string {
  const links = blueprint.pages
    .map((page) => ({ page, href: page === "Home" ? "/" : `/${slugify(page)}` }))
    .slice(0, 7);
  return `import Link from "next/link";\n\nconst links = ${JSON.stringify(links, null, 2)} as const;\n\nexport function SiteShell({ children }: { children: React.ReactNode }) {\n  return (\n    <div className="shell">\n      <nav className="nav" aria-label="Primary navigation">\n        <strong>Generated App</strong>\n        <div className="nav-links">\n          {links.map((link) => <Link href={link.href} key={link.href}>{link.page}</Link>)}\n        </div>\n      </nav>\n      <main className="content">{children}</main>\n    </div>\n  );\n}\n`;
}

function createRouteSpec(blueprint: BuilderBlueprint): string {
  const pages = blueprint.pages.map((page) => (page === "Home" ? "/" : `/${slugify(page)}`));
  return `import { test, expect } from "@playwright/test";\n\nconst routes = ${JSON.stringify(pages, null, 2)};\n\nfor (const route of routes) {\n  test(\`route \${route} loads\`, async ({ page }) => {\n    await page.goto(route);\n    await expect(page.locator("main")).toBeVisible();\n  });\n}\n`;
}

function createDbSchema(tables: string[]): string {
  return `${tables
    .map(
      (table) =>
        `export const ${camel(table)} = {\n  id: "uuid",\n  workspaceId: "uuid",\n  ownerId: "uuid",\n  createdAt: "timestamp",\n  updatedAt: "timestamp"\n} as const;`
    )
    .join("\n\n")}\n\nexport const tables = ${JSON.stringify(tables, null, 2)} as const;\n`;
}

function createMigrationSql(tables: string[]): string {
  return tables
    .map(
      (table) => `create table if not exists ${table} (\n  id uuid primary key default gen_random_uuid(),\n  workspace_id uuid,\n  owner_id uuid,\n  created_at timestamp with time zone default timezone('utc'::text, now()) not null,\n  updated_at timestamp with time zone default timezone('utc'::text, now()) not null\n);\n\nalter table ${table} enable row level security;\n\ncreate policy "${table}_owner_read" on ${table}\n  for select using (owner_id = auth.uid());\n`
    )
    .join("\n");
}

function createSeedSql(tables: string[]): string {
  return tables.map((table) => `-- insert into ${table} (workspace_id, owner_id) values (...);`).join("\n");
}

function createRepoMemoryIndex(blueprint: BuilderBlueprint): string {
  return `export const repoMemoryIndex = {\n  files: [],\n  symbols: ${JSON.stringify(blueprint.components, null, 2)},\n  routes: ${JSON.stringify(blueprint.apiRoutes, null, 2)},\n  tables: ${JSON.stringify(blueprint.databaseTables, null, 2)},\n  architectureRules: [\n    "Retrieve only the 3-10 files relevant to the requested change.",\n    "Use patch-only edits for repairs.",\n    "Do not send full project context unless explicitly approved."\n  ]\n} as const;\n`;
}

function createDeploymentPlan(input: BuilderIntake) {
  return {
    target: input.deploymentTarget,
    requiredEnv: [
      ...(input.databaseNeeded ? ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"] : []),
      ...(input.paymentsNeeded ? ["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET"] : [])
    ],
    previewUrl: null,
    productionUrl: null,
    approvalRequired: true
  };
}

function createUnifiedDiff(files: GeneratedProjectFile[]): string {
  return files
    .map((file) => {
      const lines = file.content.split("\n").map((line) => `+${line}`).join("\n");
      return `diff --git a/${file.path} b/${file.path}\nnew file mode 100644\n--- /dev/null\n+++ b/${file.path}\n@@ -0,0 +1,${file.content.split("\n").length} @@\n${lines}`;
    })
    .join("\n");
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

function pascal(value: string): string {
  const result = value.replace(/[^a-zA-Z0-9]+(.)/g, (_, letter: string) => letter.toUpperCase()).replace(/^[a-z]/, (letter) => letter.toUpperCase());
  return result.replace(/[^a-zA-Z0-9]/g, "") || "Generated";
}

function slugify(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "app";
}

function escapeText(value: string): string {
  return value.replaceAll("\\", "\\\\").replaceAll("\"", "\\\"").replaceAll("\n", " ");
}

function unique<T>(items: T[]): T[] {
  return Array.from(new Set(items));
}
