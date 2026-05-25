export interface BootRiseChatResult {
  model: "bootrise";
  text: string;
  actions: string[];
}

export function createBootRiseChatResponse(message: string): BootRiseChatResult {
  const normalized = message.toLowerCase();
  const actions = inferActions(normalized);

  return {
    model: "bootrise",
    text: [
      "BootRise response:",
      "",
      inferSummary(normalized),
      "",
      "Recommended build path:",
      ...actions.map((action, index) => `${index + 1}. ${action}`),
      "",
      "Execution rule: keep this approval-gated. Generate the plan first, preview the diff, verify the build, then publish."
    ].join("\n"),
    actions
  };
}

export function createUserFacingWebsitePlan(message: string) {
  const normalized = message.toLowerCase();
  const isPricing = normalized.includes("price") || normalized.includes("trial") || normalized.includes("cost");

  return {
    name: isPricing ? "Pricing and Trial Conversion Page" : "BootRise User-Facing Website",
    sections: [
      "Architecture-aware hero with direct repo connection CTA",
      "Trust workflow showing plan, blast radius, diff, sandbox, and verification",
      isPricing ? "Pricing tiers with 7-day capped trial and usage limits" : "Interactive product demo with admin-approved sample plan",
      "Security and reliability proof: rollback, audit logs, sandbox isolation",
      "Conversion footer with GitHub import and team demo actions"
    ],
    primaryCta: "Connect GitHub repository",
    secondaryCta: "View admin demo",
    risks: [
      "Do not promise autonomous production deployment until PR workflow is live.",
      "Show Claude/Codex as planned engines until provider adapters are implemented.",
      "Keep free trial capped to prevent runaway sandbox and model usage."
    ]
  };
}

function inferSummary(message: string): string {
  if (message.includes("website") || message.includes("landing")) {
    return "Build the user-facing website around proof, not hype: show how BootRise understands a repo, predicts impact, previews the diff, and verifies the result.";
  }

  if (message.includes("admin")) {
    return "The admin side should act as the operational command center: model status, sandbox pressure, cost, failures, and product readiness in one view.";
  }

  if (message.includes("pricing") || message.includes("trial") || message.includes("cost")) {
    return "Pricing should protect gross margin with capped verified tasks, paid overages, and strict trial limits.";
  }

  return "Treat the request as a product change: clarify the intent, map affected surfaces, define evidence, and keep execution behind approval.";
}

function inferActions(message: string): string[] {
  if (message.includes("pricing") || message.includes("trial") || message.includes("cost")) {
    return [
      "Keep Builder at $49/month with 30 verified tasks.",
      "Offer a 7-day trial with 3 capped verified tasks and 1 active sandbox.",
      "Add overage billing before opening high-volume signups."
    ];
  }

  if (message.includes("website") || message.includes("landing")) {
    return [
      "Create the hero around architecture-aware reliability.",
      "Show a live Mission Control product preview in the first screen.",
      "Add proof sections for diff preview, verification, rollback, and admin telemetry."
    ];
  }

  return [
    "Create a structured plan before editing UI or backend code.",
    "Identify what backend evidence proves the feature works.",
    "Add a clear admin control or status panel for the new workflow."
  ];
}
