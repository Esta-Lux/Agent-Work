import { getSupabaseServiceClient } from "@/lib/db/supabase";
import { memoryStore, upsertRecord } from "@/lib/persistence/memory-store";
import type { ProjectBlueprintRecord } from "@/lib/persistence/schema";

export interface ProjectInterviewInput {
  name: string;
  productType: string;
  audience: string;
  primaryWorkflow: string;
  authRequired?: boolean;
  paymentsRequired?: boolean;
  realtimeRequired?: boolean;
}

export async function createProjectBlueprint(input: ProjectInterviewInput): Promise<ProjectBlueprintRecord> {
  const entities = inferEntities(input);
  const blueprint: ProjectBlueprintRecord = {
    id: `blueprint_${Date.now()}`,
    name: input.name,
    productType: input.productType,
    audience: input.audience,
    coreEntities: entities,
    pages: inferPages(input),
    databaseTables: entities.map((entity) => ({
      name: entity.toLowerCase().replaceAll(" ", "_"),
      purpose: `Stores ${entity.toLowerCase()} records for ${input.primaryWorkflow}.`,
      columns: ["id uuid primary key", "created_at timestamptz", "updated_at timestamptz", "owner_id uuid"]
    })),
    securityRules: inferSecurityRules(input),
    testPlan: [
      "Build must pass before preview is trusted.",
      "Core workflow smoke test must pass.",
      "Auth boundary tests must pass when auth is enabled.",
      "Responsive preview must be checked at mobile and desktop widths."
    ],
    createdAt: new Date().toISOString()
  };

  upsertRecord(memoryStore.projectBlueprints, blueprint);
  const supabase = getSupabaseServiceClient();
  if (supabase) {
    await supabase.from("project_blueprints").insert({
      id: blueprint.id,
      name: blueprint.name,
      product_type: blueprint.productType,
      audience: blueprint.audience,
      core_entities: blueprint.coreEntities,
      pages: blueprint.pages,
      database_tables: blueprint.databaseTables,
      security_rules: blueprint.securityRules,
      test_plan: blueprint.testPlan,
      created_at: blueprint.createdAt
    });
  }

  return blueprint;
}

function inferEntities(input: ProjectInterviewInput): string[] {
  const entities = ["User", "Workspace"];
  if (input.paymentsRequired) entities.push("Subscription", "Invoice");
  if (input.realtimeRequired) entities.push("Event", "Notification");
  entities.push(input.productType.includes("marketplace") ? "Listing" : "Project");
  return Array.from(new Set(entities));
}

function inferPages(input: ProjectInterviewInput): string[] {
  const pages = ["Home", "Dashboard", "Settings"];
  if (input.authRequired) pages.push("Sign In", "Account");
  if (input.paymentsRequired) pages.push("Billing");
  if (input.realtimeRequired) pages.push("Activity");
  pages.push("Preview");
  return pages;
}

function inferSecurityRules(input: ProjectInterviewInput): string[] {
  const rules = ["All mutations require server-side validation.", "Every table must include owner or workspace scoping."];
  if (input.authRequired) rules.push("Protected pages require authenticated sessions.");
  if (input.paymentsRequired) rules.push("Billing state must be verified server-side before feature access.");
  if (input.realtimeRequired) rules.push("Realtime channels must filter by workspace membership.");
  return rules;
}
