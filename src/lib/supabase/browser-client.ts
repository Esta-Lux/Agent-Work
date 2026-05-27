import { createBrowserClient } from "@supabase/ssr";

export type SupabaseBrowserClient = ReturnType<typeof createBrowserClient>;

export function getSupabaseBrowserClient(): SupabaseBrowserClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !key) return null;
  return createBrowserClient(url, key);
}

export function isSupabaseBrowserConfigured(): boolean {
  return getSupabaseBrowserClient() !== null;
}
