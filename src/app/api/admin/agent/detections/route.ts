import { NextResponse } from "next/server";
import { withAdminAuth } from "@/lib/auth/with-admin-auth";
import { DEFAULT_ORG_ID } from "@/lib/tenancy/org-context";
import { listDetections } from "@/lib/admin/detections/store";
import { runDetectionsScan } from "@/lib/admin/detections/scanner";
import type { DetectionKind, DetectionSeverity, DetectionStatus } from "@/lib/admin/detections/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const KINDS: DetectionKind[] = [
  "auth_missing",
  "org_scoping_missing",
  "client_server_boundary",
  "audit_log_missing",
  "kill_switch_bypass",
  "runtime_failure_cluster",
  "usage_failure_spike",
  "pending_fix_failure",
  "security_finding"
];
const SEVERITIES: DetectionSeverity[] = ["info", "warning", "critical"];
const STATUSES: DetectionStatus[] = ["new", "acknowledged", "resolved", "false_positive"];

function asEnum<T extends string>(raw: string | null, allowed: T[]): T | undefined {
  return raw && (allowed as string[]).includes(raw) ? (raw as T) : undefined;
}

export async function GET(request: Request) {
  return withAdminAuth(request, async (_user, req) => {
    const url = new URL(req.url);
    const limitRaw = url.searchParams.get("limit");
    const limit = limitRaw ? Math.min(Math.max(Number(limitRaw), 1), 500) : 100;
    const detections = listDetections({
      kind: asEnum(url.searchParams.get("kind"), KINDS),
      severity: asEnum(url.searchParams.get("severity"), SEVERITIES),
      status: asEnum(url.searchParams.get("status"), STATUSES),
      limit
    });
    return NextResponse.json({ product: "BootRise", detections });
  });
}

export async function POST(request: Request) {
  return withAdminAuth(request, async (user) => {
    try {
      const result = await runDetectionsScan({ user, orgId: DEFAULT_ORG_ID });
      return NextResponse.json({ product: "BootRise", ...result });
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Detections scan failed." },
        { status: 502 }
      );
    }
  });
}
