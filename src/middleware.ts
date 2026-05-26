import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const url = process.env.SUPABASE_URL?.trim();
  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  let response = NextResponse.next({ request });

  if (url && anonKey) {
    const supabase = createServerClient(url, anonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        }
      }
    });
    await supabase.auth.getUser();
  }

  const pathname = request.nextUrl.pathname;
  const devBypass = process.env.BOOTRISE_DEV_AUTH_BYPASS === "1" && process.env.NODE_ENV !== "production";

  if (pathname.startsWith("/admin") && !devBypass) {
    if (!url || !anonKey) {
      return NextResponse.redirect(new URL("/auth/sign-in?next=/admin", request.url));
    }
    const supabase = createServerClient(url, anonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll() {}
      }
    });
    const { data } = await supabase.auth.getUser();
    if (!data.user) {
      return NextResponse.redirect(new URL("/auth/sign-in?next=/admin", request.url));
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/api/admin/:path*",
    "/api/workspace/:path*",
    "/auth/:path*",
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"
  ]
};
