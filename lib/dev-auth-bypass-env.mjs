/**
 * Used by next.config.mjs only — keep in sync with src/lib/auth/resolve-dev-auth-bypass.ts
 */
export function isDevAuthBypassEnabled(env = process.env) {
  if (env.NODE_ENV === "production") return false;
  if (env.BOOTRISE_DEV_AUTH_BYPASS === "0") return false;
  if (env.BOOTRISE_DEV_AUTH_STRICT === "1") return false;
  if (env.BOOTRISE_DEV_AUTH_BYPASS === "1") return true;
  if (env.NEXT_PUBLIC_BOOTRISE_DEV_AUTH_BYPASS === "1") return true;
  return env.NODE_ENV === "development";
}
