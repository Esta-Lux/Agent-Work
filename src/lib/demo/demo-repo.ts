import { buildRepoIntelligenceSnapshot } from "@/lib/intelligence/repo-intelligence";
import { createInitialChangePlan } from "@/lib/planning/planner";

export const demoRequest = "Add organization permissions";

export const demoRepo = buildRepoIntelligenceSnapshot(
  [
    {
      path: "src/app/(dashboard)/settings/page.tsx",
      content: "export default function SettingsPage() { return null; }"
    },
    {
      path: "src/lib/auth/session.ts",
      content: "export function getSession() { return null; }"
    },
    {
      path: "src/lib/auth/permissions.ts",
      content: "export function canAccess() { return true; }"
    },
    {
      path: "src/server/api/organizations/route.ts",
      content: "export async function GET() { return Response.json([]); }"
    },
    {
      path: "src/db/schema.ts",
      content: "export const users = {};"
    },
    {
      path: "src/components/org-switcher.tsx",
      content: "export function OrgSwitcher() { return null; }"
    },
    {
      path: "src/lib/billing/subscription.ts",
      content: "export function getPlan() { return 'pro'; }"
    }
  ],
  [
    {
      id: "adr_auth_boundary",
      title: "Auth remains server-authoritative",
      rationale: "Client permission helpers can optimize UX, but server routes must enforce access.",
      constraints: ["No client-only authorization", "Protected API routes require session checks"],
      createdAt: "2026-05-23T00:00:00.000Z"
    }
  ]
);

export const demoPlan = createInitialChangePlan(demoRequest, demoRepo);

