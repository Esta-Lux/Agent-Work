import { createSupabaseServerClient } from "@/lib/db/supabase-server";
import { isSupabaseConfigured } from "@/lib/db/supabase";
import { AuthError, type AuthUser } from "@/lib/auth/types";

const DEV_BYPASS = process.env.BOOTRISE_DEV_AUTH_BYPASS === "1";

function devBypassUser(): AuthUser | null {
  if (!DEV_BYPASS || process.env.NODE_ENV === "production") return null;
  const id = process.env.BOOTRISE_DEV_USER_ID?.trim() || "dev-user";
  const email = process.env.BOOTRISE_DEV_USER_EMAIL?.trim() || "dev@bootrise.local";
  return { id, email };
}

export async function getServerUser(): Promise<AuthUser | null> {
  const bypass = devBypassUser();
  if (bypass) return bypass;

  if (!isSupabaseConfigured()) return null;

  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;

  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;

  return {
    id: data.user.id,
    email: data.user.email ?? null
  };
}

export async function requireUser(): Promise<AuthUser> {
  const user = await getServerUser();
  if (!user) {
    throw new AuthError("Authentication required. Sign in to continue.", 401);
  }
  return user;
}
