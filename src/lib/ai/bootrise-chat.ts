export interface BootRiseChatResult {
  model: "bootrise";
  text: string;
  actions: string[];
  operatorPlan: OperatorPlan;
}

export interface OperatorPlan {
  mission: string;
  operatingMode: "site-builder" | "pricing" | "admin-ops" | "quality-review";
  phases: Array<{
    name: string;
    objective: string;
    outputs: string[];
  }>;
  acceptanceChecks: string[];
  blockers: string[];
  immediateNextActions: string[];
}

export function createBootRiseChatResponse(message: string): BootRiseChatResult {
  const normalized = message.toLowerCase();
  const operatorPlan = createOperatorPlan(normalized);
  const actions = operatorPlan.immediateNextActions;

  return {
    model: "bootrise",
    text: [
      "BootRise operator readout:",
      "",
      operatorPlan.mission,
      "",
      "Execution sequence:",
      ...operatorPlan.phases.map((phase, index) => `${index + 1}. ${phase.name}: ${phase.objective}`),
      "",
      "Acceptance checks:",
      ...operatorPlan.acceptanceChecks.map((check) => `- ${check}`),
      "",
      "Immediate next actions:",
      ...actions.map((action, index) => `${index + 1}. ${action}`)
    ].join("\n"),
    actions,
    operatorPlan
  };
}

export function createUserFacingWebsitePlan(message: string) {
  const normalized = message.toLowerCase();
  const isPricing = normalized.includes("price") || normalized.includes("trial") || normalized.includes("cost");

  return {
    name: isPricing ? "Pricing and Trial Conversion Page" : "BootRise User-Facing Website",
    sections: createWebsiteSections(normalized, isPricing),
    primaryCta: "Connect GitHub repository",
    secondaryCta: "View admin demo",
    risks: [
      "Do not promise autonomous production deployment until PR workflow is live.",
      "Show Claude/Codex as planned engines until provider adapters are implemented.",
      "Keep free trial capped to prevent runaway sandbox and model usage."
    ]
  };
}

function createOperatorPlan(message: string): OperatorPlan {
  if (message.includes("pricing") || message.includes("trial") || message.includes("cost")) {
    return {
      mission: "Protect BootRise margin while making the trial feel generous enough to convert serious builders.",
      operatingMode: "pricing",
      phases: [
        {
          name: "Cost guardrails",
          objective: "Cap free usage before model and sandbox spend can run away.",
          outputs: ["3 verified trial tasks", "1 active sandbox", "no uncapped self-healing loops"]
        },
        {
          name: "Paid packaging",
          objective: "Tie plan value to verified engineering work instead of raw chat usage.",
          outputs: ["Builder, Team, Scale, Enterprise tiers", "overage prices", "usage warnings"]
        },
        {
          name: "Conversion proof",
          objective: "Show the user exactly what the trial produced and what paid unlocks.",
          outputs: ["verified diff report", "sandbox evidence", "upgrade CTA"]
        }
      ],
      acceptanceChecks: [
        "Trial cannot exceed the capped task count.",
        "Every paid plan has included verified tasks and overage pricing.",
        "The pricing UI explains sandbox and AI limits without looking punitive."
      ],
      blockers: ["Billing enforcement and quota middleware are not implemented yet."],
      immediateNextActions: [
        "Keep Builder at $49/month with 30 verified tasks.",
        "Offer a 7-day trial with 3 capped verified tasks and 1 active sandbox.",
        "Add overage billing before opening high-volume signups."
      ]
    };
  }

  if (message.includes("website") || message.includes("landing")) {
    return {
      mission: "Build the public BootRise site as a proof-driven product experience, not a generic AI landing page.",
      operatingMode: "site-builder",
      phases: [
        {
          name: "First viewport",
          objective: "Make the product instantly legible as architecture-aware AI engineering reliability.",
          outputs: ["specific headline", "GitHub import CTA", "Mission Control preview"]
        },
        {
          name: "Trust workflow",
          objective: "Show the safe loop from intent to plan to diff to sandbox verification.",
          outputs: ["blast radius visual", "approval gate", "verification evidence"]
        },
        {
          name: "Conversion system",
          objective: "Move serious users into a capped trial without overpromising production autonomy.",
          outputs: ["pricing cards", "trial limits", "demo request CTA"]
        }
      ],
      acceptanceChecks: [
        "The page does not claim GitHub PR creation or remote streaming as live until those providers are connected.",
        "The first screen shows the actual product category and not only abstract AI copy.",
        "The pricing/trial copy includes task and sandbox caps."
      ],
      blockers: ["Public auth, GitHub OAuth, and billing are still required before real signups."],
      immediateNextActions: [
        "Create the hero around architecture-aware reliability.",
        "Show a live Mission Control product preview in the first screen.",
        "Add proof sections for diff preview, verification, rollback, and admin telemetry."
      ]
    };
  }

  if (message.includes("test") || message.includes("weak") || message.includes("review")) {
    return {
      mission: "Turn weak assistant behavior into testable operator behavior with structured outputs and visible quality gates.",
      operatingMode: "quality-review",
      phases: [
        {
          name: "Behavior audit",
          objective: "Identify where responses are vague, unverifiable, or disconnected from product actions.",
          outputs: ["agent scorecard", "missing capabilities", "route smoke tests"]
        },
        {
          name: "Agent contract",
          objective: "Return mission, phases, acceptance checks, blockers, and immediate actions on every admin request.",
          outputs: ["structured response schema", "rendered operator panel", "fallback behavior"]
        },
        {
          name: "Regression gate",
          objective: "Prove both BootRise and GPT-5.5 paths still respond through the backend.",
          outputs: ["API smoke tests", "build result", "admin page status"]
        }
      ],
      acceptanceChecks: [
        "The admin chat returns structured operator data, not only prose.",
        "GPT-5.5 failure still produces a useful BootRise fallback.",
        "The admin page exposes blockers and next actions clearly."
      ],
      blockers: ["No browser E2E automation is committed yet for button-click regression testing."],
      immediateNextActions: [
        "Upgrade the BootRise agent response schema.",
        "Render acceptance checks and blockers in the admin chat UI.",
        "Add a deep QA endpoint that reports current stage readiness."
      ]
    };
  }

  return {
    mission: "Convert the request into an approval-gated product operation with explicit evidence and rollback safety.",
    operatingMode: "admin-ops",
    phases: [
      {
        name: "Intent lock",
        objective: "Clarify the requested outcome and define the affected product surfaces.",
        outputs: ["scope statement", "risk notes", "owner view"]
      },
      {
        name: "Implementation path",
        objective: "Create bounded work that can be previewed and verified.",
        outputs: ["planned files", "API evidence", "UI state"]
      },
      {
        name: "Verification",
        objective: "Prove the result works before it is treated as done.",
        outputs: ["typecheck", "build", "API smoke test"]
      }
    ],
    acceptanceChecks: [
      "Every button or CTA shown in the admin UI has a real handler or route.",
      "Every agent response includes next actions and blockers.",
      "The workflow remains useful when external AI providers are unavailable."
    ],
    blockers: ["Provider-specific Claude and Codex workers are still not implemented."],
    immediateNextActions: [
      "Create a structured plan before editing UI or backend code.",
      "Identify what backend evidence proves the feature works.",
      "Add a clear admin control or status panel for the new workflow."
    ]
  };
}

function createWebsiteSections(message: string, isPricing: boolean): string[] {
  const base = [
    "First viewport: architecture-aware AI engineering reliability with direct GitHub import CTA",
    "Mission Control demo: plan, blast radius, approval gate, diff preview, sandbox verification",
    "Proof wall: rollback snapshots, admin telemetry, runtime checks, architecture memory",
    "Operator workflow: how admins approve site changes before users see them",
    "Conversion footer: GitHub import, admin demo, and team sales call actions"
  ];

  if (isPricing) {
    return [
      base[0],
      "Pricing tiers: Builder, Team, Scale, Enterprise with verified task caps",
      "Trial limits: 7 days, 3 verified tasks, 1 active sandbox, no long-running streams",
      base[2],
      base[4]
    ];
  }

  if (message.includes("admin")) {
    return [
      base[0],
      "Admin build console: BootRise/GPT-5.5 model switcher and generated site plan",
      base[1],
      "Quality gate: production readiness, unit economics, provider status",
      base[4]
    ];
  }

  return base;
}
