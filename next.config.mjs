import { isDevAuthBypassEnabled } from "./lib/dev-auth-bypass-env.mjs";

/** @type {import('next').NextConfig} */
const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || process.env.SUPABASE_URL?.trim() || "";
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
  "";
const devAuthBypass = isDevAuthBypassEnabled();
const e2eAuth = process.env.NODE_ENV !== "production" && process.env.BOOTRISE_E2E_AUTH === "1";

const nextConfig = {
  reactStrictMode: true,
  allowedDevOrigins: ["127.0.0.1:3000", "localhost:3000", "127.0.0.1", "localhost"],
  env: {
    NEXT_PUBLIC_SUPABASE_URL: supabaseUrl,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: supabaseAnonKey,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: supabaseAnonKey,
    NEXT_PUBLIC_BOOTRISE_DEV_AUTH_BYPASS: devAuthBypass ? "1" : "0",
    NEXT_PUBLIC_BOOTRISE_E2E_AUTH: e2eAuth ? "1" : "0"
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Cross-Origin-Embedder-Policy", value: "require-corp" },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" }
        ]
      }
    ];
  }
};

export default nextConfig;
