export interface ReadinessItem {
  area: string;
  status: "ready" | "partial" | "missing";
  summary: string;
  nextStep: string;
}

export interface ReadinessReport {
  productionReady: boolean;
  score: number;
  items: ReadinessItem[];
}

export function getProductionReadinessReport(): ReadinessReport {
  const items: ReadinessItem[] = [
    {
      area: "OpenAI planner",
      status: process.env.OPENAI_API_KEY ? "partial" : "missing",
      summary: process.env.OPENAI_API_KEY
        ? "Server-side OpenAI planner route is configured with an API key."
        : "Server-side OpenAI route exists, but OPENAI_API_KEY is not configured in this runtime.",
      nextStep: "Rotate any exposed key, set OPENAI_API_KEY in the deployment secret store, and add request tracing."
    },
    {
      area: "GitHub sync",
      status: "partial",
      summary: "Control-plane records exist for GitHub repository links.",
      nextStep: "Add GitHub OAuth, installation tokens, clone workers, branch push, and pull request creation."
    },
    {
      area: "Sandbox runtime",
      status: "partial",
      summary: "Local/Docker sandbox execution contracts and fleet telemetry exist.",
      nextStep: "Connect E2B, Fly Machines, or Firecracker provisioning with per-user isolation and quotas."
    },
    {
      area: "Remote preview",
      status: "partial",
      summary: "WebContainer and remote-stream contracts are modeled.",
      nextStep: "Connect noVNC, Guacamole, or WebRTC streams to real sandbox display sessions."
    },
    {
      area: "Vector memory",
      status: "partial",
      summary: "pgvector schema and vector sync job records are present.",
      nextStep: "Add embedding generation workers and GitHub webhook refresh on every main-branch update."
    },
    {
      area: "Security",
      status: "missing",
      summary: "API routes are functional but do not yet enforce authenticated user tenancy.",
      nextStep: "Add auth, organization scoping, RLS policies, rate limits, audit logs, and secret scanning."
    },
    {
      area: "Observability",
      status: "partial",
      summary: "Admin telemetry records exist for timing, outcomes, cost, and hard failures.",
      nextStep: "Add persistent traces, alert routing, retention policies, and per-provider failure dashboards."
    },
    {
      area: "Billing and quotas",
      status: "missing",
      summary: "No production quota or billing enforcement exists yet.",
      nextStep: "Add plan limits for tokens, sandboxes, runtime minutes, repo count, and preview concurrency."
    }
  ];

  const score = Math.round(
    (items.reduce((sum, item) => sum + (item.status === "ready" ? 1 : item.status === "partial" ? 0.5 : 0), 0) /
      items.length) *
      100
  );

  return {
    productionReady: false,
    score,
    items
  };
}
