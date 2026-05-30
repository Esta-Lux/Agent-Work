import { getSupabaseServiceClient } from "@/lib/db/supabase";
import { isServerDevAuthBypass } from "@/lib/auth/dev-bypass";
import { getServerE2EAuthRole } from "@/lib/auth/e2e-auth.server";
import { AuthError, type AuthUser, type UserOrgContext } from "@/lib/auth/types";
import { requireUser } from "@/lib/auth/server-auth";

function personalOrgId(userId: string): string {
  return `org_personal_${userId.replace(/-/g, "").slice(0, 24)}`;
}

async function ensurePersonalOrg(user: AuthUser): Promise<UserOrgContext> {
  const supabase = getSupabaseServiceClient();
  const orgId = personalOrgId(user.id);
  const orgName = user.email ? `${user.email.split("@")[0]}'s workspace` : "Personal workspace";
  const e2eRole = getServerE2EAuthRole();

  if (!supabase) {
    if (isServerDevAuthBypass() || e2eRole) {
      return {
        user,
        orgId: process.env.BOOTRISE_DEV_ORG_ID?.trim() || "org_default",
        orgName: e2eRole === "admin" ? "E2E admin workspace" : "Dev workspace",
        orgRole: e2eRole === "admin" ? "admin" : "owner",
        isPersonalOrg: true
      };
    }
    throw new AuthError("Supabase is not configured.", 401);
  }

  await supabase.from("bootrise_organizations").upsert(
    { id: orgId, name: orgName, slug: `personal-${user.id.slice(0, 8)}`, plan: "starter" },
    { onConflict: "id" }
  );

  const { data: existing } = await supabase
    .from("bootrise_org_members")
    .select("role")
    .eq("org_id", orgId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!existing) {
    await supabase.from("bootrise_org_members").upsert(
      { org_id: orgId, user_id: user.id, role: "owner" },
      { onConflict: "org_id,user_id" }
    );
  }

  return {
    user,
    orgId,
    orgName,
    orgRole: (existing?.role as UserOrgContext["orgRole"]) ?? "owner",
    isPersonalOrg: true
  };
}

export async function resolveUserOrgContext(orgId?: string | null): Promise<UserOrgContext> {
  const user = await requireUser();
  const supabase = getSupabaseServiceClient();
  const e2eRole = getServerE2EAuthRole();

  if (!orgId) {
    return ensurePersonalOrg(user);
  }

  if (!supabase) {
    if (isServerDevAuthBypass() || e2eRole) {
      return {
        user,
        orgId,
        orgName: e2eRole === "admin" ? "E2E admin workspace" : "Dev workspace",
        orgRole: e2eRole === "admin" ? "admin" : "owner",
        isPersonalOrg: false
      };
    }
    throw new AuthError("Supabase is not configured.", 401);
  }

  const { data: membership, error } = await supabase
    .from("bootrise_org_members")
    .select("role, org_id, bootrise_organizations(name)")
    .eq("org_id", orgId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error || !membership) {
    throw new AuthError("You are not a member of this organization.", 403);
  }

  const orgRow = membership.bootrise_organizations as { name?: string } | null;

  return {
    user,
    orgId: membership.org_id as string,
    orgName: orgRow?.name ?? orgId,
    orgRole: membership.role as UserOrgContext["orgRole"],
    isPersonalOrg: orgId.startsWith("org_personal_")
  };
}

export async function requireOrgMember(orgId?: string | null): Promise<UserOrgContext> {
  return resolveUserOrgContext(orgId);
}
