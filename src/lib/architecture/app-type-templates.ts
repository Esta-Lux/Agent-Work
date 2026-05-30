export type AppType =
  | "saas_workspace"
  | "marketplace"
  | "ai_app"
  | "ecommerce"
  | "internal_admin"
  | "developer_tool"
  | "social_community"
  | "navigation_location"
  | "health_coaching"
  | "unknown";

export interface BuildPhase {
  title: string;
  description: string;
  targetFiles: string[];
}

export interface AppTypeTemplate {
  appType: AppType;
  displayName: string;
  requiredRoles: string[];
  requiredPolicies: string[];
  securityExpectations: string[];
  dataModelExpectations: string[];
  billingExpectations: string[];
  deploymentExpectations: string[];
  monitoringExpectations: string[];
  legalWarnings: string[];
  suggestedBuildPhases: BuildPhase[];
}

const COMMON_POLICIES = [
  "Authenticated access boundary",
  "Role-aware authorization policy",
  "Audit trail for sensitive actions",
  "Environment secret ownership"
];

export const APP_TYPE_TEMPLATES: Record<AppType, AppTypeTemplate> = {
  saas_workspace: template("saas_workspace", "SaaS workspace", ["owner", "admin", "member"], ["Workspace membership isolation", "Invite and role policy"]),
  marketplace: template("marketplace", "Marketplace", ["buyer", "seller", "operator"], ["Seller onboarding policy", "Transaction dispute policy"], ["Payment and payout flows require legal review."]),
  ai_app: template("ai_app", "AI application", ["user", "operator", "admin"], ["Prompt data retention policy", "Model fallback policy"], ["AI output should be labeled and abuse handling documented."]),
  ecommerce: template("ecommerce", "Ecommerce", ["customer", "support", "admin"], ["Refund policy", "Order fulfillment policy"], ["Payments, tax, and refund handling require jurisdiction review."]),
  internal_admin: template("internal_admin", "Internal admin", ["operator", "reviewer", "admin"], ["Operator audit policy", "Privileged action approval policy"]),
  developer_tool: template("developer_tool", "Developer tool", ["developer", "maintainer", "admin"], ["Repository access policy", "Code execution policy"], ["Code execution and repository access should be opt-in and logged."]),
  social_community: template("social_community", "Social community", ["member", "moderator", "admin"], ["Moderation policy", "Content reporting policy"], ["User-generated content needs moderation and takedown handling."]),
  navigation_location: template("navigation_location", "Navigation/location app", ["traveler", "operator", "admin"], ["Location retention policy", "Safety alert policy"], ["Location data may be regulated and needs consent controls."]),
  health_coaching: template("health_coaching", "Health coaching", ["client", "coach", "admin"], ["Health data privacy policy", "Emergency disclaimer policy"], ["Health guidance must avoid diagnosis or emergency-care claims."]),
  unknown: template("unknown", "General web app", ["user", "operator", "admin"], ["Data retention policy", "Support escalation policy"])
};

export function getAppTypeTemplate(appType: AppType): AppTypeTemplate {
  return APP_TYPE_TEMPLATES[appType] ?? APP_TYPE_TEMPLATES.unknown;
}

function template(
  appType: AppType,
  displayName: string,
  roles: string[],
  policies: string[],
  legalWarnings: string[] = []
): AppTypeTemplate {
  return {
    appType,
    displayName,
    requiredRoles: roles,
    requiredPolicies: [...COMMON_POLICIES, ...policies],
    securityExpectations: [
      "Every privileged route has an explicit auth guard.",
      "Secrets are referenced through environment variables and documented.",
      "User-controlled input is validated before persistence or execution."
    ],
    dataModelExpectations: [
      "Core entities have ownership fields.",
      "Sensitive tables have access rules.",
      "Audit-relevant actions store actor and timestamp."
    ],
    billingExpectations: [
      "Paid capabilities are gated by entitlement state.",
      "Quota or credit usage has a failure-safe path.",
      "Billing state changes are reflected in operational telemetry."
    ],
    deploymentExpectations: [
      "Environment variables are documented before deploy.",
      "CI or sandbox verification runs before release.",
      "Rollback path is known for risky changes."
    ],
    monitoringExpectations: [
      "Critical actions emit audit or telemetry events.",
      "Provider failures have user-safe fallbacks.",
      "Operational dashboards distinguish warnings from blockers."
    ],
    legalWarnings,
    suggestedBuildPhases: [
      {
        title: "Lock access boundaries",
        description: "Make roles, auth guards, and owned records explicit before expanding features.",
        targetFiles: ["src/app", "src/lib/auth", "src/middleware.ts"]
      },
      {
        title: "Wire production proof",
        description: "Add verification, environment documentation, and deployment checks.",
        targetFiles: [".env.example", ".github/workflows", "src/lib/deployment"]
      },
      {
        title: "Add operational visibility",
        description: "Expose audit events, provider health, and critical workflow signals.",
        targetFiles: ["src/app/admin", "src/components/admin", "src/lib/admin"]
      }
    ]
  };
}
