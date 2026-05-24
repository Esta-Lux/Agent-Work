import type { ChangePlan, RepoIntelligenceSnapshot, RiskLevel, VerificationKind } from "@/lib/types/core";

export function createInitialChangePlan(request: string, repo: RepoIntelligenceSnapshot): ChangePlan {
  const impactedFiles = inferImpactedFiles(request, repo);
  const riskLevel = inferRiskLevel(request, impactedFiles);

  return {
    id: `plan_${Date.now()}`,
    intent: {
      request,
      interpretedGoal: interpretGoal(request),
      businessImpact: "Improve the codebase while preserving existing behavior and architecture."
    },
    impact: {
      files: impactedFiles,
      services: inferImpactedServices(impactedFiles),
      apis: inferApiImpact(impactedFiles),
      databaseSchemas: inferDatabaseImpact(impactedFiles),
      blastRadius: inferBlastRadius(request, impactedFiles)
    },
    risk: {
      level: riskLevel,
      reasons: inferRiskReasons(request, impactedFiles, riskLevel)
    },
    steps: [
      {
        id: "step_intelligence_review",
        title: "Review repo intelligence",
        domain: "tests",
        summary: "Confirm impacted files, dependencies, and architecture constraints before editing.",
        targetFiles: impactedFiles,
        dependsOn: []
      },
      {
        id: "step_controlled_edit",
        title: "Apply controlled refactor",
        domain: inferPrimaryWorkerDomain(impactedFiles),
        summary: "Make the smallest scoped code change that satisfies the approved intent.",
        targetFiles: impactedFiles,
        dependsOn: ["step_intelligence_review"]
      },
      {
        id: "step_validation",
        title: "Run validation plan",
        domain: "tests",
        summary: "Run type, build, route, and targeted behavioral checks.",
        targetFiles: impactedFiles,
        dependsOn: ["step_controlled_edit"]
      }
    ],
    validations: buildValidations(impactedFiles),
    rollbackStrategy: "Capture changed file list and validation output before applying follow-up repairs or rollback."
  };
}

function interpretGoal(request: string): string {
  return request.trim().length > 0
    ? `Safely implement: ${request.trim()}`
    : "Safely evolve the repository with an approved refactor.";
}

function inferImpactedFiles(request: string, repo: RepoIntelligenceSnapshot): string[] {
  const normalized = request.toLowerCase();
  const sourceFiles = repo.files.filter((file) => file.role === "source" || file.role === "schema");

  if (normalized.includes("auth") || normalized.includes("permission")) {
    return sourceFiles.filter((file) => /auth|permission|session|middleware|schema/i.test(file.path)).map((file) => file.path);
  }

  if (normalized.includes("route")) {
    return sourceFiles.filter((file) => /route|page|api/i.test(file.path)).map((file) => file.path);
  }

  return sourceFiles.slice(0, 8).map((file) => file.path);
}

function inferImpactedServices(files: string[]): string[] {
  const services = new Set<string>();

  for (const file of files) {
    if (file.includes("auth")) services.add("auth");
    if (file.includes("billing")) services.add("billing");
    if (file.includes("api")) services.add("api");
    if (file.includes("db") || file.includes("schema")) services.add("database");
  }

  return Array.from(services);
}

function inferApiImpact(files: string[]): string[] {
  return files.filter((file) => file.includes("api") || file.includes("route"));
}

function inferDatabaseImpact(files: string[]): string[] {
  return files.filter((file) => file.includes("schema") || file.includes("migration") || file.includes("db"));
}

function inferBlastRadius(request: string, files: string[]): string[] {
  const blastRadius = new Set<string>();
  const normalized = request.toLowerCase();

  if (normalized.includes("auth") || normalized.includes("permission")) {
    blastRadius.add("Session validity");
    blastRadius.add("Protected routes");
    blastRadius.add("Role checks");
  }

  if (files.some((file) => file.includes("schema") || file.includes("migration"))) {
    blastRadius.add("Database migrations");
    blastRadius.add("Data compatibility");
  }

  if (files.some((file) => file.includes("page") || file.includes("component"))) {
    blastRadius.add("UI rendering");
  }

  return Array.from(blastRadius);
}

function inferRiskLevel(request: string, files: string[]): RiskLevel {
  const normalized = request.toLowerCase();

  if (normalized.includes("auth") || normalized.includes("billing") || files.some((file) => file.includes("migration"))) {
    return "high";
  }

  if (files.length > 4 || normalized.includes("route") || normalized.includes("state")) {
    return "medium";
  }

  return "low";
}

function inferRiskReasons(request: string, files: string[], level: RiskLevel): string[] {
  const reasons = [`Risk classified as ${level} from requested scope and impacted files.`];

  if (/auth|permission|session/i.test(request)) {
    reasons.push("Authorization changes can affect access boundaries and session behavior.");
  }

  if (files.some((file) => /schema|migration|db/i.test(file))) {
    reasons.push("Database-adjacent changes require migration and compatibility checks.");
  }

  if (files.length === 0) {
    reasons.push("No direct file impact was inferred yet; planner needs deeper repo intelligence.");
  }

  return reasons;
}

function inferPrimaryWorkerDomain(files: string[]): "frontend" | "backend" | "database" | "infra" | "tests" {
  if (files.some((file) => /schema|migration|db/i.test(file))) return "database";
  if (files.some((file) => /api|route|server/i.test(file))) return "backend";
  if (files.some((file) => /config|docker|infra/i.test(file))) return "infra";
  if (files.some((file) => /test|spec/i.test(file))) return "tests";
  return "frontend";
}

function buildValidations(files: string[]): ChangePlan["validations"] {
  const checks: Array<[VerificationKind, string, string | undefined]> = [
    ["typecheck", "Type safety", "npm run typecheck"],
    ["build", "Production build", "npm run build"],
    ["lint", "Lint rules", "npm run lint"],
    ["test", "Targeted tests", "npm test"]
  ];

  if (files.some((file) => /page|component|app/i.test(file))) {
    checks.push(["route", "Route smoke check", undefined]);
    checks.push(["visual", "Responsive UI smoke check", undefined]);
  }

  if (files.some((file) => /api|route/i.test(file))) {
    checks.push(["api-contract", "API contract smoke check", undefined]);
  }

  return checks.map(([kind, title, command], index) => ({
    id: `validation_${index + 1}`,
    kind,
    title,
    command,
    status: "pending"
  }));
}
