import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getSupabaseConfig } from "@/lib/db/supabase";

export async function GET(request: Request) {
  const config = getSupabaseConfig();
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") ?? "/";

  if (!config?.publishableKey || !code) {
    return NextResponse.redirect(new URL("/auth/sign-in?error=auth", request.url));
  }

  const cookieStore = await cookies();
  const supabase = createServerClient(config.url, config.publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value, options } of cookiesToSet) {
          cookieStore.set(name, value, options);
        }
      }
    }
  });

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(new URL(`/auth/sign-in?error=${encodeURIComponent(error.message)}`, request.url));
  }

  return NextResponse.redirect(new URL(next, request.url));
}
