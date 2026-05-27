/** Path/context helpers to reduce false positives in deterministic security scans. */

export function isEnvExampleOrTemplate(path: string): boolean {
  return /\.env(\.example|\.sample|\.template)?$/i.test(path) || /(^|\/)env\.example$/i.test(path);
}

export function isDocumentationPath(path: string): boolean {
  return (
    /(^|\/)(docs|memory|notes)\//i.test(path) ||
    (/\.md$/i.test(path) && !/(routes?|api)\//i.test(path)) ||
    /\.html$/i.test(path)
  );
}

export function isServerBackendPath(path: string): boolean {
  return (
    /(^|\/)app\/backend\//i.test(path) ||
    /(^|\/)backend\//i.test(path) ||
    /(^|\/)app\/api\//i.test(path) ||
    /\.sql$/i.test(path) ||
    /(^|\/)scripts\//i.test(path) ||
    /(^|\/)services\//i.test(path)
  );
}

export function isClientBundlePath(path: string): boolean {
  if (isServerBackendPath(path)) return false;
  return (
    /(^|\/)app\/frontend\//i.test(path) ||
    /(^|\/)app\/mobile\//i.test(path) ||
    /(^|\/)components\//i.test(path) ||
    /(^|\/)src\/pages\//i.test(path)
  );
}

/** Likely a real embedded secret (not a placeholder name in docs). */
export function containsLikelySecretValue(content: string): boolean {
  if (/(?:sk_live_|sk_test_)[a-zA-Z0-9]{16,}/.test(content)) return true;
  if (/AKIA[0-9A-Z]{16}/.test(content)) return true;
  if (/sb_secret_[a-zA-Z0-9_-]{12,}/.test(content)) return true;
  if (/eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/.test(content)) return true;
  if (/api[_-]?key\s*=\s*['"][^'"]{8,}['"]/i.test(content)) return true;
  return false;
}

export function mentionsSecretConfigOnly(content: string): boolean {
  return /service[_-]?role|SUPABASE_SERVICE_ROLE|SUPABASE_SECRET_KEY|STRIPE_WEBHOOK_SECRET/i.test(content);
}
