import type { SourceFileInput } from "@/lib/intelligence/repo-intelligence";
import { evaluateDeploymentReadiness } from "@/lib/deployment/deployment-readiness";
import type { ArchitectureRoadmap, ProjectBrief, WorkspaceFixReport } from "@/lib/workspace/workspace-types";

function hasPath(files: SourceFileInput[], pattern: RegExp): boolean {
  return files.some((file) => pattern.test(file.path));
}

function hasContent(files: SourceFileInput[], pattern: RegExp): boolean {
  return files.some((file) => pattern.test(file.content));
}

function toTitle(value: string): string {
  return value
    .replace(/[-_]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function detectAppType(files: SourceFileInput[], brief?: Partial<ProjectBrief>): string {
  const hasNextApp = hasPath(files, /(^|\/)(src\/app|app)\//) || hasContent(files, /"next"\s*:/);
  const hasSupabase = hasPath(files, /supabase/i) || hasContent(files, /supabase/i);
  const hasStripe = hasPath(files, /stripe|billing|payment/i) || Boolean(brief?.paymentsRequired);
  const hasAdmin = hasPath(files, /src\/app\/admin|src\/components\/admin/i);

  const parts = [hasNextApp ? "Next.js" : "Web", "application"];
  if (hasSupabase) parts.push("with Supabase");
  if (hasStripe) parts.push("and billing");
  if (hasAdmin) parts.push("plus admin operations");
  return parts.join(" ");
}

function detectMaturity(status: ReturnType<typeof evaluateDeploymentReadiness>["status"], files: SourceFileInput[]): ArchitectureRoadmap["currentMaturity"] {
  if (status === "production_ready") return "production_ready";
  if (status === "production_candidate") return "release_candidate";
  if (status === "safe_for_staging") return "closed_beta";
  if (hasPath(files, /tests?\//i) || hasPath(files, /\.test\./i)) return "controlled_alpha";
  return "prototype";
}

function detectCapabilities(files: SourceFileInput[]) {
  return {
    hasAuth: hasPath(files, /auth|session|middleware/i) || hasContent(files, /requireAuth|withWorkspaceAuth|createServerClient/i),
    hasBilling: hasPath(files, /billing|payment|stripe/i) || hasContent(files, /stripe|checkout/i),
    hasTests: hasPath(files, /(^|\/)tests?\//i) || hasPath(files, /\.test\./i),
    hasCi: hasPath(files, /^\.github\/workflows\//i),
    hasMonitoring: hasPath(files, /sentry|telemetry|monitor|logging/i) || hasContent(files, /recordAudit|telemetry|logger/i),
    hasEnvDocs: hasPath(files, /\.env\.example|docs\/.*env|README\.md/i) && hasContent(files, /env|environment|SUPABASE_URL|GITHUB_TOKEN/i),
    hasDeployConfig: hasPath(files, /vercel\.json|fly\.toml|dockerfile|docker-compose|render\.yaml/i) || hasContent(files, /next build|vercel/i)
  };
}

export function buildArchitectureRoadmap(input: {
  files: SourceFileInput[];
  brief?: Partial<ProjectBrief>;
  report?: Pick<WorkspaceFixReport, "approvalStatus" | "safeToPr" | "controlLayer"> | null;
}): ArchitectureRoadmap {
  const { files, brief, report } = input;
  const deployment = evaluateDeploymentReadiness(files);
  const capabilities = detectCapabilities(files);
  const appType = detectAppType(files, brief);
  const currentMaturity = detectMaturity(deployment.status, files);
  const deploymentBlockers = [
    ...deployment.missingProductionItems,
    ...deployment.blockers.map((finding) => `${finding.title}: ${finding.recommendedFix}`)
  ].slice(0, 6);

  const missingCapabilities = [
    !capabilities.hasAuth && brief?.authRequired ? "Authentication and role-aware session flow are still missing." : null,
    !capabilities.hasBilling && brief?.paymentsRequired ? "Billing and quota enforcement still need to be wired." : null,
    !capabilities.hasTests ? "Automated regression tests are too thin for safe multi-step delivery." : null,
    !capabilities.hasCi ? "CI workflow coverage is missing, so PR proof is incomplete." : null,
    !capabilities.hasMonitoring ? "Runtime monitoring and operational alerts need a first-class path." : null,
    !capabilities.hasDeployConfig ? "Deployment configuration needs a production-ready target definition." : null
  ].filter((value): value is string => Boolean(value));

  const securityPolicies = [
    brief?.authRequired ? "Enforce authenticated routes and role checks on every privileged surface." : null,
    brief?.paymentsRequired ? "Verify billing webhooks, usage accounting, and failure-safe downgrade rules." : null,
    deployment.warnings.some((finding) => finding.category === "deployment")
      ? "Document environment ownership and deployment secret handling before release."
      : null,
    deployment.warnings.some((finding) => finding.category === "logging")
      ? "Strip sensitive values from logs, previews, and audit exports."
      : null,
    deployment.warnings.some((finding) => finding.category === "database")
      ? "Review database access boundaries and row-level access rules."
      : null
  ].filter((value): value is string => Boolean(value));

  const recommendedIntegrations = [
    hasPath(files, /supabase/i) ? "Supabase for auth, data, and storage." : null,
    brief?.paymentsRequired || hasPath(files, /stripe/i) ? "Stripe for billing, subscriptions, and webhooks." : null,
    "GitHub App or token-backed draft PR flow for controlled delivery.",
    capabilities.hasMonitoring ? "Existing telemetry pipeline can anchor production monitoring." : "Add Sentry or equivalent monitoring before wider rollout."
  ].filter((value): value is string => Boolean(value));

  const suggestedPhases = [
    "Lock the core user workflow, ownership boundaries, and explicit acceptance criteria.",
    "Close production blockers in auth, deployment config, and verification coverage.",
    "Run scoped implementation work, verify in sandbox/CI, then move through draft PR review."
  ];

  const acceptanceCriteria = [
    `Primary workflow is shippable for ${brief?.audience?.trim() || "the target user"} without placeholder steps.`,
    "Security and deployment blockers are reduced to review-only warnings or better.",
    "Safe-to-PR status is positive after approval and verification proof is attached.",
    "Operational ownership is clear for auth, billing, data, and deployment."
  ];

  const deferUntilLater = [
    "Do not widen scope beyond the current workflow until blockers are cleared.",
    "Do not add premium integrations before auth, deployment, and rollback basics are solid.",
    report?.approvalStatus !== "approved" ? "Do not open a PR until the current patch set is approved and verified." : null
  ].filter((value): value is string => Boolean(value));

  const maturityLabel =
    currentMaturity === "production_ready"
      ? "production-ready"
      : currentMaturity === "release_candidate"
        ? "release candidate"
        : currentMaturity === "closed_beta"
          ? "closed beta"
          : currentMaturity === "controlled_alpha"
            ? "controlled alpha"
            : "prototype";

  const currentStateSummary = [
    `${toTitle(appType)} currently reads as a ${maturityLabel} system.`,
    deploymentBlockers.length > 0
      ? `${deploymentBlockers.length} deployment blocker(s) still need attention before production-style rollout.`
      : "No hard deployment blockers were detected in the current file snapshot.",
    report?.safeToPr?.label ? `Current delivery status: ${report.safeToPr.label}.` : null
  ]
    .filter((value): value is string => Boolean(value))
    .join(" ");

  return {
    appType,
    currentMaturity,
    productionReadiness: deployment.status,
    currentStateSummary,
    missingCapabilities,
    securityPolicies,
    recommendedIntegrations,
    deploymentBlockers,
    suggestedPhases,
    acceptanceCriteria,
    deferUntilLater
  };
}
