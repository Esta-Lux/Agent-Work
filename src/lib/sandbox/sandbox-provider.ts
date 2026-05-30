import type { SandboxProvider } from "@/lib/sandbox/sandbox-types";

export function getSandboxProviderReadiness(): { provider: SandboxProvider; missingEnvVars: string[]; warning: string } {
  if (process.env.E2B_API_KEY?.trim()) {
    return {
      provider: {
        name: "e2b",
        configured: true,
        supportsFrontendPreview: true,
        supportsBackendExecution: true,
        supportsNetworkIsolation: true
      },
      missingEnvVars: [],
      warning: "Never run untrusted user code in the main Next.js process."
    };
  }

  if (process.env.FLY_API_TOKEN?.trim()) {
    return {
      provider: {
        name: "fly",
        configured: true,
        supportsFrontendPreview: true,
        supportsBackendExecution: true,
        supportsNetworkIsolation: true
      },
      missingEnvVars: [],
      warning: "Never run untrusted user code in the main Next.js process."
    };
  }

  return {
    provider: {
      name: "none",
      configured: false,
      supportsFrontendPreview: false,
      supportsBackendExecution: false,
      supportsNetworkIsolation: false
    },
    missingEnvVars: ["E2B_API_KEY or FLY_API_TOKEN"],
    warning: "Never run untrusted user code in the main Next.js process."
  };
}
