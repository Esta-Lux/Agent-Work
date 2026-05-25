import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cachedServiceClient: SupabaseClient | null | undefined;

export interface SupabaseConfig {
  url: string;
  serviceRoleKey: string;
  publishableKey: string;
  projectRef: string;
  configured: boolean;
}

export function getSupabaseConfig(): SupabaseConfig | null {
  const url = process.env.SUPABASE_URL?.trim();
  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    process.env.SUPABASE_SECRET_KEY?.trim();
  const publishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (!url || !serviceRoleKey) return null;

  const projectRef = url.replace(/^https:\/\//, "").replace(/\.supabase\.co\/?$/, "");

  return {
    url,
    serviceRoleKey,
    publishableKey: publishableKey ?? "",
    projectRef,
    configured: true
  };
}

export function isSupabaseConfigured(): boolean {
  return Boolean(getSupabaseConfig());
}

export function getSupabaseServiceClient(): SupabaseClient | null {
  if (cachedServiceClient !== undefined) {
    return cachedServiceClient;
  }

  const config = getSupabaseConfig();
  if (!config) {
    cachedServiceClient = null;
    return cachedServiceClient;
  }

  cachedServiceClient = createClient(config.url, config.serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  return cachedServiceClient;
}

export function getSupabasePublishableKey(): string | null {
  return getSupabaseConfig()?.publishableKey || null;
}

export function getSupabaseDashboardUrl(): string | null {
  const config = getSupabaseConfig();
  if (!config) return null;
  return `https://supabase.com/dashboard/project/${config.projectRef}`;
}
