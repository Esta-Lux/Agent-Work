import { getSupabaseServiceClient } from "@/lib/db/supabase";
import { AuthError, type AuthUser } from "@/lib/auth/types";
import { requireUser } from "@/lib/auth/server-auth";
import { isServerDevAuthBypass } from "@/lib/auth/dev-bypass";

function parseAdminEmails(): Set<string> {
  const raw = process.env.BOOTRISE_ADMIN_EMAILS?.trim() ?? "";
  return new Set(
    raw
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean)
  );
}

async function isOrgAdmin(userId: string): Promise<boolean> {
  const supabase = getSupabaseServiceClient();
  if (!supabase) return false;

  const { data } = await supabase
    .from("bootrise_org_members")
    .select("role")
    .eq("user_id", userId)
    .in("role", ["owner", "admin"]);

  return (data?.length ?? 0) > 0;
}

export async function isAdminUser(user: AuthUser): Promise<boolean> {
  if (isServerDevAuthBypass()) return true;
  const allowlist = parseAdminEmails();
  if (user.email && allowlist.has(user.email.toLowerCase())) return true;
  return isOrgAdmin(user.id);
}

export async function requireAdmin(): Promise<AuthUser> {
  const user = await requireUser();
  const admin = await isAdminUser(user);
  if (!admin) {
    throw new AuthError("Admin access required.", 403);
  }
  return user;
}
